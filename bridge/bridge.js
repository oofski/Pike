// bridge.js — PIKE Rush Mac iMessage bridge.
//
// Polls the PIKE Rush app's bridge API for pending text messages, sends each
// one through Messages.app (iMessage), and reports the result back. Designed to
// run on a Rush Chair's MacBook with Messages.app signed into iMessage.
//
// Zero dependencies: uses Node 18+ built-in fetch and a tiny .env loader.
//
//   node bridge.js
//
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sendIMessage } from './send-imessage.js'

const POLL_INTERVAL = 5000 // poll for pending messages every 5 seconds
const SEND_GAP = 1000 // wait 1 second between sends (Apple rate-limit safety)

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ---------------------------------------------------------------------------
// Tiny .env loader — no dotenv dependency. Reads KEY=VALUE lines from the .env
// file next to this script. Lines that are blank or start with `#` are skipped.
// Values already present in process.env take precedence (so you can override on
// the command line). Surrounding single/double quotes are stripped.
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = path.join(__dirname, '.env')
  if (!fs.existsSync(envPath)) return
  const text = fs.readFileSync(envPath, 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (key && process.env[key] === undefined) process.env[key] = value
  }
}

loadEnv()

const API_URL = (process.env.RUSHMANAGER_API_URL || '').replace(/\/+$/, '')
const API_KEY = process.env.RUSHMANAGER_API_KEY || ''

function ts() {
  return new Date().toLocaleTimeString()
}
function log(msg) {
  console.log(`[${ts()}] ${msg}`)
}
function logErr(msg) {
  console.error(`[${ts()}] ${msg}`)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

if (!API_URL || !API_KEY) {
  logErr('Missing configuration.')
  logErr('  RUSHMANAGER_API_URL and RUSHMANAGER_API_KEY must be set in bridge/.env')
  logErr('  Copy .env.example to .env and fill in the values from the app Settings page.')
  process.exit(1)
}

const authHeaders = { Authorization: `Bearer ${API_KEY}` }

/** Fetch the queue of pending messages from the app. */
async function fetchPending() {
  const res = await fetch(`${API_URL}/api/messages/pending`, { headers: authHeaders })
  if (!res.ok) {
    throw new Error(`GET /api/messages/pending -> ${res.status} ${res.statusText}`)
  }
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

/** Report a message result back to the app. */
async function markStatus(id, status) {
  const res = await fetch(`${API_URL}/api/messages/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  })
  if (!res.ok) {
    throw new Error(`PATCH /api/messages/${id} -> ${res.status} ${res.statusText}`)
  }
}

let polling = false

async function pollAndSend() {
  // Guard against overlapping runs if a batch takes longer than POLL_INTERVAL.
  if (polling) return
  polling = true
  try {
    const messages = await fetchPending()
    if (messages.length === 0) return

    log(`Found ${messages.length} pending message(s).`)
    let sent = 0
    let failed = 0

    for (const msg of messages) {
      const to = msg.phone || '(unknown)'
      try {
        await sendIMessage(msg.phone, msg.body)
        await markStatus(msg.id, 'sent')
        sent++
        log(`  ✓ sent  -> ${to}`)
      } catch (err) {
        failed++
        logErr(`  ✗ failed -> ${to}: ${err && err.message ? err.message : err}`)
        // Best-effort: tell the app this one failed. Swallow reporting errors
        // so one bad PATCH doesn't abort the whole batch.
        try {
          await markStatus(msg.id, 'failed')
        } catch (markErr) {
          logErr(`    (could not report failure: ${markErr && markErr.message ? markErr.message : markErr})`)
        }
      }
      // Rate-limit: one message per second to avoid Apple flagging the account.
      await sleep(SEND_GAP)
    }

    log(`Batch complete — ${sent} sent, ${failed} failed.`)
  } catch (err) {
    logErr(`Poll error: ${err && err.message ? err.message : err}`)
  } finally {
    polling = false
  }
}

log('PIKE Rush iMessage bridge starting…')
log(`API URL: ${API_URL}`)
log(`Polling every ${POLL_INTERVAL / 1000}s. Leave this Terminal window open while sending. Press Ctrl+C to stop.`)

// Run once immediately, then on the interval.
pollAndSend()
setInterval(pollAndSend, POLL_INTERVAL)

process.on('SIGINT', () => {
  log('Shutting down. Goodbye! 🤙')
  process.exit(0)
})
