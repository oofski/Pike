import { contextBridge, ipcRenderer } from 'electron'
import type { ServerInfo, UpdateStatus } from '@shared/types'

const api = {
  getServerInfo: (): Promise<ServerInfo> => ipcRenderer.invoke('app:server-info'),
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),

  // Auto-update ("Check for Updates" refresh button)
  checkForUpdates: (): Promise<UpdateStatus> => ipcRenderer.invoke('updates:check'),
  getUpdateStatus: (): Promise<UpdateStatus> => ipcRenderer.invoke('updates:status'),
  installUpdate: (): Promise<void> => ipcRenderer.invoke('updates:install'),
  onUpdateStatus: (cb: (status: UpdateStatus) => void): (() => void) => {
    const listener = (_e: unknown, status: UpdateStatus): void => cb(status)
    ipcRenderer.on('update:status', listener)
    return () => ipcRenderer.removeListener('update:status', listener)
  }
}

export type PikeApi = typeof api

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('pike', api)
} else {
  // @ts-ignore — fallback for non-isolated contexts
  window.pike = api
}
