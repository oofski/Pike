import { app, BrowserWindow } from 'electron'
import pkg from 'electron-updater'
import type { UpdateStatus } from '@shared/types'

const { autoUpdater } = pkg

let initialized = false
let lastStatus: UpdateStatus = { state: 'idle' }

function send(win: BrowserWindow | null, status: UpdateStatus): void {
  lastStatus = status
  if (win && !win.isDestroyed()) win.webContents.send('update:status', status)
}

export function getLastStatus(): UpdateStatus {
  return lastStatus
}

export function initUpdater(getWindow: () => BrowserWindow | null): void {
  if (initialized) return
  initialized = true

  autoUpdater.autoDownload = false // we trigger download on demand
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = null

  autoUpdater.on('checking-for-update', () => send(getWindow(), { state: 'checking' }))

  autoUpdater.on('update-available', (info) => {
    send(getWindow(), { state: 'available', version: info.version, notes: stringifyNotes(info.releaseNotes) })
    // Begin downloading right away so the user just has to click "Restart".
    autoUpdater.downloadUpdate().catch((err) => send(getWindow(), { state: 'error', message: String(err?.message || err) }))
  })

  autoUpdater.on('update-not-available', (info) =>
    send(getWindow(), { state: 'not-available', version: info.version })
  )

  autoUpdater.on('download-progress', (p) =>
    send(getWindow(), {
      state: 'downloading',
      percent: Math.round(p.percent),
      transferred: p.transferred,
      total: p.total,
      bytesPerSecond: p.bytesPerSecond
    })
  )

  autoUpdater.on('update-downloaded', (info) =>
    send(getWindow(), { state: 'downloaded', version: info.version })
  )

  autoUpdater.on('error', (err) =>
    send(getWindow(), { state: 'error', message: String(err?.message || err) })
  )
}

/** Triggered by the in-app "Check for Updates" refresh button. */
export async function checkForUpdates(getWindow: () => BrowserWindow | null): Promise<UpdateStatus> {
  if (!app.isPackaged) {
    // No published feed in dev — report cleanly instead of throwing.
    const status: UpdateStatus = { state: 'not-available', version: app.getVersion() }
    send(getWindow(), status)
    return status
  }
  try {
    await autoUpdater.checkForUpdates()
    return lastStatus
  } catch (err) {
    const status: UpdateStatus = { state: 'error', message: String((err as Error)?.message || err) }
    send(getWindow(), status)
    return status
  }
}

export function quitAndInstall(): void {
  setImmediate(() => autoUpdater.quitAndInstall(false, true))
}

function stringifyNotes(notes: unknown): string | null {
  if (!notes) return null
  if (typeof notes === 'string') return notes
  if (Array.isArray(notes)) return notes.map((n: { note?: string }) => n.note || '').join('\n')
  return null
}
