// send-imessage.js — AppleScript wrapper around Messages.app.
//
// Exports a single async function that drives macOS Messages.app via
// `osascript`. It is intentionally dependency-free: only Node's built-in
// child_process is used.

import { spawn } from 'node:child_process'

/**
 * Escape a string so it can be embedded safely inside an AppleScript
 * double-quoted literal. Backslashes MUST be escaped first, otherwise we would
 * double-escape the backslashes we add for the quotes.
 *
 * @param {string} value
 * @returns {string}
 */
function escapeForAppleScript(value) {
  return String(value)
    .replace(/\\/g, '\\\\') // backslash -> \\  (do this FIRST)
    .replace(/"/g, '\\"') // double quote -> \"
}

/**
 * Run osascript, feeding the AppleScript source over stdin (`osascript -`).
 * Feeding via stdin avoids any second layer of shell-quote escaping, so message
 * bodies containing single quotes, $, backticks, etc. are handled safely.
 *
 * @param {string} script
 * @returns {Promise<void>}
 */
function runOsascript(script) {
  return new Promise((resolve, reject) => {
    const child = spawn('osascript', ['-'], { stdio: ['pipe', 'pipe', 'pipe'] })

    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`osascript exited with code ${code}: ${stderr.trim()}`))
    })

    child.stdin.write(script)
    child.stdin.end()
  })
}

/**
 * Send a single iMessage to `phone` with the text `body` using Messages.app.
 *
 * Throws if osascript exits non-zero (e.g. Messages.app not running, the
 * number is not reachable over iMessage, or the user denied automation
 * permission), so the caller can mark the message 'failed'.
 *
 * @param {string} phone  Destination phone number / Apple ID handle.
 * @param {string} body   Message text.
 * @returns {Promise<void>}
 */
export async function sendIMessage(phone, body) {
  const safePhone = escapeForAppleScript(phone)
  const safeBody = escapeForAppleScript(body)

  const script = [
    'tell application "Messages"',
    '  set targetService to 1st service whose service type = iMessage',
    `  set targetBuddy to buddy "${safePhone}" of targetService`,
    `  send "${safeBody}" to targetBuddy`,
    'end tell'
  ].join('\n')

  await runOsascript(script)
}
