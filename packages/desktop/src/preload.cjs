const { contextBridge, ipcRenderer } = require('electron')

/**
 * OPC Agent Desktop API
 *
 * Exposed as `window.opcDesktop` in the renderer process.
 * See packages/web/src/env.d.ts for the TypeScript interface.
 */
contextBridge.exposeInMainWorld('opcDesktop', {
  // ── App info ──
  apiBaseUrl: process.env.OPC_DESKTOP_API_BASE_URL,
  version: process.env.npm_package_version,
  platform: process.platform,

  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getPlatform: () => ipcRenderer.invoke('app:get-platform'),
  getPaths: () => ipcRenderer.invoke('app:get-paths'),

  // ── Dialogs ──
  openFileDialog: (options) => ipcRenderer.invoke('dialog:open-file', options),
  openMultiFileDialog: (options) => ipcRenderer.invoke('dialog:open-multi-file', options),
  saveFileDialog: (options) => ipcRenderer.invoke('dialog:save-file', options),
  showMessageBox: (options) => ipcRenderer.invoke('dialog:show-message', options),

  // ── Shell ──
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  showItemInFolder: (filePath) => ipcRenderer.invoke('shell:show-item-in-folder', filePath),
  openPath: (filePath) => ipcRenderer.invoke('shell:open-path', filePath),

  // ── Window control ──
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  unmaximizeWindow: () => ipcRenderer.invoke('window:unmaximize'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('window:toggle-maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isWindowMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  isWindowMinimized: () => ipcRenderer.invoke('window:is-minimized'),
  getWindowState: () => ipcRenderer.invoke('window:get-state'),

  // ── Backend ──
  getBackendUrl: () => ipcRenderer.invoke('backend:get-url'),
  getBackendStatus: () => ipcRenderer.invoke('backend:get-status'),

  // ── Update ──
  checkForUpdate: () => ipcRenderer.invoke('update:check'),
  installUpdate: () => ipcRenderer.invoke('update:install'),

  // ── Event listeners ──
  onUpdateAvailable: (callback) => {
    const handler = (_event, info) => callback(info)
    ipcRenderer.on('update:available', handler)
    return () => ipcRenderer.removeListener('update:available', handler)
  },
  onUpdateNotAvailable: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('update:not-available', handler)
    return () => ipcRenderer.removeListener('update:not-available', handler)
  },
  onUpdateDownloadProgress: (callback) => {
    const handler = (_event, progress) => callback(progress)
    ipcRenderer.on('update:download-progress', handler)
    return () => ipcRenderer.removeListener('update:download-progress', handler)
  },
  onUpdateDownloaded: (callback) => {
    const handler = (_event, info) => callback(info)
    ipcRenderer.on('update:downloaded', handler)
    return () => ipcRenderer.removeListener('update:downloaded', handler)
  },
  onUpdateError: (callback) => {
    const handler = (_event, error) => callback(error)
    ipcRenderer.on('update:error', handler)
    return () => ipcRenderer.removeListener('update:error', handler)
  },
  onDeepLink: (callback) => {
    const handler = (_event, url) => callback(url)
    ipcRenderer.on('app:deep-link', handler)
    return () => ipcRenderer.removeListener('app:deep-link', handler)
  },
})
