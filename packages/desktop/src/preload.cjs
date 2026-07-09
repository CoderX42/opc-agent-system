'use strict';

/**
 * OPC Agent Desktop preload bridge.
 *
 * 该脚本在 web 端主进程（浏览器环境）执行，将所有受控 IPC 能力暴露为 window.opcDesktop。
 * 见 packages/web/src/env.d.ts 与 packages/desktop/src/main.cjs 的 IPC 实现保持一一对应。
 */

const { contextBridge, ipcRenderer } = require('electron');

// 一个工具：在 ipcRenderer 上注册监听并返回卸载函数（避免泄露）
function subscribe(channel, handler) {
  const wrapped = (_event, payload) => {
    try {
      handler(payload);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[opcDesktop] listener error for ${channel}:`, err);
    }
  };
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
}

// 带 token 的事件订阅：用于 before-quit / 一次性 deep-link 等。
const pendingQuitHandlers = new Map();

const api = {
  // ── 启动时已注入的常量 ──
  apiBaseUrl: process.env.OPC_DESKTOP_API_BASE_URL || '',
  version: process.env.npm_package_version || '',
  platform: process.platform,

  // ── App info ──
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getPlatform: () => ipcRenderer.invoke('app:get-platform'),
  getPaths: () => ipcRenderer.invoke('app:get-paths'),
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),

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
  restartBackend: () => ipcRenderer.invoke('backend:restart'),

  // ── Notification ──
  showNotification: (options) => ipcRenderer.invoke('notify:show', options),

  // ── Clipboard ──
  readClipboardText: () => ipcRenderer.invoke('clipboard:read-text'),
  writeClipboardText: (text) => ipcRenderer.invoke('clipboard:write-text', text),
  readClipboardImage: () => ipcRenderer.invoke('clipboard:read-image'),
  writeClipboardImage: (dataUrl) => ipcRenderer.invoke('clipboard:write-image', dataUrl),

  // ── Theme ──
  getTheme: () => ipcRenderer.invoke('theme:get'),
  setThemeMode: (mode) => ipcRenderer.invoke('theme:set-mode', mode),

  // ── Auto-launch ──
  getAutoLaunch: () => ipcRenderer.invoke('auto-launch:get'),
  setAutoLaunch: (enabled, options) => ipcRenderer.invoke('auto-launch:set', enabled, options),

  // ── Shortcut ──
  registerShortcut: (descriptor) => ipcRenderer.invoke('shortcut:register', descriptor),
  unregisterShortcut: (commandId) => ipcRenderer.invoke('shortcut:unregister', commandId),
  listShortcuts: () => ipcRenderer.invoke('shortcut:list'),

  // ── Recent files ──
  addRecentFile: (filePath) => ipcRenderer.invoke('recent:add', filePath),
  getRecentFiles: () => ipcRenderer.invoke('recent:list'),
  clearRecentFiles: () => ipcRenderer.invoke('recent:clear'),

  // ── Progress / Badge ──
  setTaskbarProgress: (progress) => ipcRenderer.invoke('progress:set', Number(progress)),
  setBadgeCount: (count) => ipcRenderer.invoke('badge:set', Math.max(0, Number(count) || 0)),

  // ── Menu ──
  setApplicationMenu: (template) => ipcRenderer.invoke('menu:set', template),

  // ── Update ──
  checkForUpdate: () => ipcRenderer.invoke('update:check'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  setUpdateChannel: (channel) => ipcRenderer.invoke('update:channel-set', channel),
  getUpdateChannel: () => ipcRenderer.invoke('update:channel-get'),
  setUpdatePrerelease: (enabled) => ipcRenderer.invoke('update:allow-prerelease', !!enabled),
  getUpdatePrerelease: () => ipcRenderer.invoke('update:allow-prerelease-get'),

  // ── 一次性 deep-link ──
  getInitialDeepLink: () => ipcRenderer.invoke('app:initial-deep-link-get'),

  // ── before-quit 控制 ──
  onBeforeQuit: (callback) => {
    const listener = (_event, payload) => {
      const token = payload && payload.token;
      if (!token) return;
      pendingQuitHandlers.set(token, callback);
      // 给回调透出 quit()/cancel() 函数；它们都通过 IPC 回执给主进程
      callback({
        quit: () => api.confirmQuit(token),
        cancel: () => api.cancelQuit(token),
      });
    };
    ipcRenderer.on('app:before-quit', listener);
    return () => ipcRenderer.removeListener('app:before-quit', listener);
  },
  confirmQuit: (token) => {
    pendingQuitHandlers.delete(token);
    return ipcRenderer.invoke('app:confirm-quit', token);
  },
  cancelQuit: (token) => {
    pendingQuitHandlers.delete(token);
    return ipcRenderer.invoke('app:cancel-quit', token);
  },

  // ── 事件订阅（统一返回清理函数） ──
  onShortcutCommand: (callback) => subscribe('shortcut:invoke', callback),
  onMenuCommand: (callback) => subscribe('menu:invoke', callback),
  onMenuRebuild: (callback) => subscribe('menu:rebuild', callback),
  onBackendCrashed: (callback) => subscribe('backend:crashed', callback),
  onThemeChanged: (callback) => subscribe('theme:changed', callback),
  onDeepLink: (callback) => subscribe('app:deep-link', callback),
  onUpdateAvailable: (callback) => subscribe('update:available', callback),
  onUpdateNotAvailable: (callback) => subscribe('update:not-available', callback),
  onUpdateDownloadProgress: (callback) => subscribe('update:download-progress', callback),
  onUpdateDownloaded: (callback) => subscribe('update:downloaded', callback),
  onUpdateError: (callback) => subscribe('update:error', callback),
};

contextBridge.exposeInMainWorld('opcDesktop', api);
