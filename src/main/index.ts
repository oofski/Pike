import { app, shell, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import os from 'node:os'
import { startServer, type RunningServer } from './server'
import { initUpdater, checkForUpdates, quitAndInstall, getLastStatus } from './updater'
import type { ServerInfo } from '@shared/types'

let mainWindow: BrowserWindow | null = null
let server: RunningServer | null = null

function lanIp(): string {
  const ifaces = os.networkInterfaces()
  const candidates: string[] = []
  for (const name of Object.keys(ifaces)) {
    for (const net of ifaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) candidates.push(net.address)
    }
  }
  // Prefer private LAN ranges
  const preferred = candidates.find(
    (a) => a.startsWith('192.168.') || a.startsWith('10.') || /^172\.(1[6-9]|2\d|3[01])\./.test(a)
  )
  return preferred || candidates[0] || '127.0.0.1'
}

function serverInfo(): ServerInfo {
  const port = server?.port ?? 0
  const ip = lanIp()
  return {
    port,
    baseUrl: `http://127.0.0.1:${port}`,
    lanUrl: `http://${ip}:${port}`,
    lanIp: ip,
    version: app.getVersion(),
    platform: process.platform
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    backgroundColor: '#0a0b10',
    title: 'PIKE Rush',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => (mainWindow = null))
}

function registerIpc(): void {
  ipcMain.handle('app:server-info', () => serverInfo())
  ipcMain.handle('app:version', () => app.getVersion())
  ipcMain.handle('updates:check', () => checkForUpdates(() => mainWindow))
  ipcMain.handle('updates:status', () => getLastStatus())
  ipcMain.handle('updates:install', () => {
    quitAndInstall()
  })
}

app.whenReady().then(async () => {
  app.setName('PIKE Rush')
  try {
    server = await startServer()
    // eslint-disable-next-line no-console
    console.log(`[PIKE Rush] server listening on ${serverInfo().lanUrl}`)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[PIKE Rush] failed to start local server:', err)
  }

  registerIpc()
  createWindow()
  initUpdater(() => mainWindow)

  // Auto-check for updates shortly after launch (packaged builds only).
  if (app.isPackaged) {
    setTimeout(() => checkForUpdates(() => mainWindow), 4000)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', async () => {
  await server?.close()
})
