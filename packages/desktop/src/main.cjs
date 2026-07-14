'use strict';

// Dev 模式下 Vite HMR 依赖 unsafe-eval，会触发 Electron CSP 安全警告。
// 该警告仅在开发期出现（打包后不会显示），在此显式关闭以保持控制台整洁。
if (process.env.NODE_ENV !== 'production') {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
}

/**
 * OPC Agent Desktop main process entry.
 *
 * 职责分层：
 *  - lib/log.js        ：结构化日志
 *  - lib/menu.js       ：渲染层下发的菜单构建
 *  - lib/backend.js    ：NestJS 子进程生命周期（含自动重启）
 *  - lib/security.js   ：导航 / 外链 / 协议白名单
 *  - lib/shortcuts.js  ：globalShortcut 注册管理
 *  - lib/recent.js     ：最近文件持久化
 *
 * IPC 命名规范：`{领域}:{动作}`，事件命名 `{领域}:{状态}`，全部由本文件统一登记。
 */

const {
  app,
  BrowserWindow,
  dialog,
  shell,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  Notification,
  nativeTheme,
  clipboard,
  globalShortcut,
} = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { autoUpdater } = require('electron-updater');

const log = require('./lib/log');
const { createBackend } = require('./lib/backend');
const menuLib = require('./lib/menu');
const security = require('./lib/security');
const { createShortcutManager } = require('./lib/shortcuts');
const { createRecentFilesManager } = require('./lib/recent');

// ── Constants & State ────────────────────────────────────────────────────────
const CONFIG_FILE = 'window-state.json';
const TRAY_ICON_SIZE = 22;
const UPDATE_CHECK_DELAY_MS = 5000;
const UPDATE_CHANNEL_FILE = 'update-channel.json';
const MAX_QUIT_GRACE_MS = 8000;
const DEFAULT_OPEN_AT_LOGIN_ARGS = ['--launched-by-login'];

let mainWindow = null;
let tray = null;
let isQuitting = false;
let beforeQuitToken = null;
let beforeQuitTimer = null;
let backendManager = null;
let shortcutManager = null;
let recentFiles = null;
let pendingInitialDeepLink = null;

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveResourcePath(...segments) {
  if (app.isPackaged) return path.join(process.resourcesPath, ...segments);
  return path.resolve(__dirname, '..', '..', ...segments);
}

function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function sendToWeb(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
    mainWindow.webContents.send(channel, payload);
  }
}

function getProcessDefaultDeepLink() {
  // 启动时如果 argv 中带有 opc-agent:// 协议，作为 initial deep link
  return process.argv.find((a) => typeof a === 'string' && a.startsWith('opc-agent://')) || null;
}

function safeJSONParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch (_err) {
    return fallback;
  }
}

// ── Window state ─────────────────────────────────────────────────────────────

function getConfigPath() {
  return path.join(app.getPath('userData'), CONFIG_FILE);
}

function loadWindowState() {
  try {
    const file = getConfigPath();
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
  } catch (err) {
    log.warn('window', 'load state failed:', err && err.message ? err.message : err);
  }
  return null;
}

function saveWindowState(state) {
  try {
    fs.writeFileSync(getConfigPath(), JSON.stringify(state, null, 2));
  } catch (err) {
    log.warn('window', 'save state failed:', err && err.message ? err.message : err);
  }
}

// ── Tray ─────────────────────────────────────────────────────────────────────

function createTrayIcon() {
  const iconPaths = [
    path.join(__dirname, '..', 'assets', 'brand', 'opc-cloud-logo.png'),
    resolveResourcePath('icon.png'),
    path.join(__dirname, '..', 'assets', 'icon.png'),
  ];
  for (const iconPath of iconPaths) {
    if (fs.existsSync(iconPath)) {
      const img = nativeImage.createFromPath(iconPath);
      return img.resize({ width: TRAY_ICON_SIZE, height: TRAY_ICON_SIZE });
    }
  }
  const size = TRAY_ICON_SIZE;
  const buf = Buffer.alloc(size * size * 4, 0);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius) {
        const idx = (y * size + x) * 4;
        const alpha = Math.min(255, Math.max(0, Math.round((radius - dist + 0.5) * 255)));
        buf[idx] = 0xb7;
        buf[idx + 1] = 0x99;
        buf[idx + 2] = 0x6e;
        buf[idx + 3] = alpha;
      }
    }
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size });
}

function setupTray() {
  const icon = createTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('OPC Agent System');
  const contextMenu = Menu.buildFromTemplate([
    { label: '显示窗口', click: () => mainWindow && mainWindow.show() && mainWindow.focus() },
    { label: '隐藏窗口', click: () => mainWindow && mainWindow.hide() },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => mainWindow && mainWindow.show() && mainWindow.focus());
}

// ── Notifications ────────────────────────────────────────────────────────────

function setupNotifications() {
  // 保证 macOS / Windows 通知带 AppUserModelID
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.opc.agent-system');
  }
  if (Notification.isSupported && !Notification.isSupported()) {
    log.warn('boot', 'system notifications not supported on this platform');
  }
}

// ── Theme ────────────────────────────────────────────────────────────────────

let themeMode = 'system'; // 'system' | 'light' | 'dark'

function nativeThemeSnapshot(source) {
  return {
    shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
    shouldUseHighContrastColors: nativeTheme.shouldUseInvertedColorScheme ? false : false,
    shouldUseInvertedColorScheme: nativeTheme.shouldUseInvertedColorScheme,
    source,
  };
}

function broadcastThemeChange(source) {
  sendToWeb('theme:changed', {
    shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
    source,
  });
}

function setupThemeListener() {
  nativeTheme.on('updated', () => {
    broadcastThemeChange(themeMode === 'system' ? 'system' : 'manual');
  });
}

function setManualThemeMode(mode) {
  if (mode === 'light') {
    nativeTheme.themeSource = 'light';
  } else if (mode === 'dark') {
    nativeTheme.themeSource = 'dark';
  } else {
    nativeTheme.themeSource = 'system';
  }
  themeMode = mode;
  broadcastThemeChange(mode === 'system' ? 'system' : 'manual');
}

// ── Auto-launch ──────────────────────────────────────────────────────────────

function getOpenAtLogin() {
  try {
    return app.getLoginItemSettings();
  } catch (err) {
    log.warn('boot', 'getLoginItemSettings failed:', err && err.message ? err.message : err);
    return { openAtLogin: false, openAsHidden: false };
  }
}

function setOpenAtLogin(enabled, openAsHidden) {
  const opts = {
    openAtLogin: !!enabled,
    openAsHidden: !!openAsHidden,
  };
  if (process.platform === 'win32') {
    // Windows 启动参数：让登录启动时立即隐藏窗口
    opts.args = enabled && openAsHidden ? ['--hidden'] : [];
  } else if (process.platform === 'linux') {
    // Linux electron.setLoginItemSettings 通过 .desktop autostart 文件实现
    opts.args = enabled && openAsHidden ? ['--hidden'] : [];
  }
  try {
    app.setLoginItemSettings(opts);
  } catch (err) {
    log.warn('boot', 'setLoginItemSettings failed:', err && err.message ? err.message : err);
  }
  return getOpenAtLogin();
}

// ── Before-quit negotiation ──────────────────────────────────────────────────

function requestRendererQuit() {
  // 给 web 端一次机会阻止退出（保存草稿等）。
  if (!mainWindow || mainWindow.isDestroyed()) {
    app.exit(0);
    return;
  }
  if (beforeQuitToken) {
    log.warn('boot', 'duplicate before-quit request, force exiting');
    app.exit(0);
    return;
  }
  beforeQuitToken = crypto.randomUUID();
  log.info('boot', `requesting renderer confirm with token ${beforeQuitToken}`);
  sendToWeb('app:before-quit', { token: beforeQuitToken });

  if (beforeQuitTimer) clearTimeout(beforeQuitTimer);
  beforeQuitTimer = setTimeout(() => {
    if (!beforeQuitToken) return;
    log.warn('boot', 'renderer did not respond to before-quit, force exit');
    beforeQuitToken = null;
    app.exit(0);
  }, MAX_QUIT_GRACE_MS);
}

function resolveRendererQuit(token, allow) {
  if (token !== beforeQuitToken) {
    log.warn('boot', `stale quit confirmation token=${token}`);
    return;
  }
  beforeQuitToken = null;
  if (beforeQuitTimer) {
    clearTimeout(beforeQuitTimer);
    beforeQuitTimer = null;
  }
  if (allow) {
    isQuitting = true;
    app.quit();
  } else {
    log.info('boot', 'renderer cancelled quit');
  }
}

// ── Window ───────────────────────────────────────────────────────────────────

function createWindow(apiBaseUrl) {
  process.env.OPC_DESKTOP_API_BASE_URL = apiBaseUrl;

  const savedState = loadWindowState();
  const windowOptions = {
    width: savedState?.width ?? 1440,
    height: savedState?.height ?? 960,
    minWidth: 1100,
    minHeight: 760,
    title: 'OPC Agent System',
    icon: path.join(__dirname, '..', 'assets', 'brand', 'opc-cloud-logo.png'),
    backgroundColor: '#eaf5ff',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  };

  // Keep native window controls while giving macOS the same material depth as
  // the web Liquid Glass shell. Other platforms retain their native chrome.
  if (process.platform === 'darwin') {
    windowOptions.titleBarStyle = 'hiddenInset';
    windowOptions.vibrancy = 'under-window';
    windowOptions.visualEffectState = 'active';
  } else if (process.platform === 'win32') {
    windowOptions.titleBarOverlay = {
      color: '#eff8ff',
      symbolColor: '#092d68',
      height: 38,
    };
  }

  if (savedState?.x !== undefined && savedState?.y !== undefined) {
    windowOptions.x = savedState.x;
    windowOptions.y = savedState.y;
  }
  if (savedState?.maximized) {
    delete windowOptions.width;
    delete windowOptions.height;
  }

  mainWindow = new BrowserWindow(windowOptions);
  if (savedState?.maximized) mainWindow.maximize();
  mainWindow.once('ready-to-show', () => mainWindow.show());

  security.registerNavigationGuards(mainWindow, {
    allowHosts: [
      process.env.OPC_DESKTOP_WEB_URL ? new URL(process.env.OPC_DESKTOP_WEB_URL).hostname : null,
    ].filter(Boolean),
  });

  const debouncedSave = debounce(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const bounds = mainWindow.getBounds();
    const maximized = mainWindow.isMaximized();
    saveWindowState({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      maximized,
    });
  }, 500);
  mainWindow.on('resize', debouncedSave);
  mainWindow.on('move', debouncedSave);
  mainWindow.on('maximize', debouncedSave);
  mainWindow.on('unmaximize', debouncedSave);

  mainWindow.on('close', (event) => {
    if (!isQuitting && process.platform === 'darwin') {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.webContents.on('did-finish-load', () => {
    // 1) devtools
    if (!app.isPackaged) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    // 2) 推送启动时 deep-link
    if (pendingInitialDeepLink) {
      const url = pendingInitialDeepLink;
      pendingInitialDeepLink = null;
      sendToWeb('app:deep-link', url);
      log.info('boot', `dispatched initial deep link ${url}`);
    }
    // 3) 提示 web 应用菜单模板可下发
    sendToWeb('menu:rebuild', {});
  });

  // dev mode: vite dev server
  if (!app.isPackaged && process.env.OPC_DESKTOP_WEB_URL) {
    log.info('boot', `loading dev URL: ${process.env.OPC_DESKTOP_WEB_URL}`);
    void mainWindow.loadURL(process.env.OPC_DESKTOP_WEB_URL);
    return;
  }

  const indexHtml = app.isPackaged
    ? resolveResourcePath('web', 'index.html')
    : resolveResourcePath('web', 'dist', 'index.html');
  void mainWindow.loadFile(indexHtml);
}

// ── IPC handler registration ─────────────────────────────────────────────────

function broadcastToRenderer(channel, payload) {
  sendToWeb(channel, payload);
}

function registerIpcHandlers() {
  // ── App info ──
  ipcMain.handle('app:get-version', () => app.getVersion());
  ipcMain.handle('app:get-platform', () => ({
    platform: process.platform,
    arch: process.arch,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
  }));
  ipcMain.handle('app:get-paths', () => ({
    userData: app.getPath('userData'),
    home: app.getPath('home'),
    downloads: app.getPath('downloads'),
    desktop: app.getPath('desktop'),
    documents: app.getPath('documents'),
    temp: app.getPath('temp'),
    appData: app.getPath('appData'),
  }));
  ipcMain.handle('app:get-info', () => ({
    name: app.getName(),
    version: app.getVersion(),
    locale: app.getLocale(),
    userDataDir: app.getPath('userData'),
    platform: process.platform,
    arch: process.arch,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    chromeVersion: process.versions.chrome,
    packaged: app.isPackaged,
  }));
  ipcMain.handle('app:initial-deep-link-get', () => {
    const url = pendingInitialDeepLink;
    pendingInitialDeepLink = null;
    return url;
  });
  ipcMain.handle('app:confirm-quit', (_event, token) => {
    resolveRendererQuit(token, true);
  });
  ipcMain.handle('app:cancel-quit', (_event, token) => {
    resolveRendererQuit(token, false);
  });

  // ── Dialogs ──
  ipcMain.handle('dialog:open-file', async (_event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      ...options,
    });
    return result.canceled ? null : result.filePaths;
  });
  ipcMain.handle('dialog:open-multi-file', async (_event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      ...options,
    });
    return result.canceled ? null : result.filePaths;
  });
  ipcMain.handle('dialog:save-file', async (_event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result.canceled ? null : result.filePath;
  });
  ipcMain.handle('dialog:show-message', async (_event, options) =>
    dialog.showMessageBox(mainWindow, options),
  );

  // ── Shell ──
  ipcMain.handle('shell:open-external', async (_event, url) => {
    if (!url || typeof url !== 'string') return false;
    return shell.openExternal(url);
  });
  ipcMain.handle('shell:show-item-in-folder', async (_event, filePath) => {
    if (!filePath) return false;
    shell.showItemInFolder(filePath);
    return true;
  });
  ipcMain.handle('shell:open-path', async (_event, filePath) => {
    if (!filePath) return Promise.reject(new Error('missing filePath'));
    const result = await shell.openPath(filePath);
    if (result) return Promise.reject(new Error(result));
    return '';
  });

  // ── Window control ──
  ipcMain.handle('window:minimize', () => mainWindow && mainWindow.minimize());
  ipcMain.handle('window:maximize', () => mainWindow && mainWindow.maximize());
  ipcMain.handle('window:unmaximize', () => mainWindow && mainWindow.unmaximize());
  ipcMain.handle('window:toggle-maximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.handle('window:close', () => mainWindow && mainWindow.close());
  ipcMain.handle('window:is-maximized', () => (mainWindow ? mainWindow.isMaximized() : false));
  ipcMain.handle('window:is-minimized', () => (mainWindow ? mainWindow.isMinimized() : false));
  ipcMain.handle('window:get-state', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return null;
    const bounds = mainWindow.getBounds();
    return {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      maximized: mainWindow.isMaximized(),
      minimized: mainWindow.isMinimized(),
      fullscreen: mainWindow.isFullScreen(),
    };
  });

  // ── Backend ──
  ipcMain.handle('backend:get-url', () => (backendManager ? backendManager.getApiBaseUrl() : ''));
  ipcMain.handle('backend:get-status', () => (backendManager ? backendManager.getStatus() : {
    running: false,
    apiBaseUrl: '',
    pid: null,
    restartCount: 0,
    lastError: 'backend manager not initialized',
  }));
  ipcMain.handle('backend:restart', async () => {
    if (!backendManager) return { success: false, message: 'backend manager not initialized' };
    try {
      const apiBaseUrl = await backendManager.restart();
      return { success: true, apiBaseUrl };
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      log.error('backend', 'manual restart failed:', message);
      return { success: false, message };
    }
  });

  // ── Notification ──
  ipcMain.handle('notify:show', (_event, options) => {
    if (!options || !options.title) {
      throw new Error('notify:show requires options.title');
    }
    if (!Notification.isSupported || !Notification.isSupported()) {
      log.warn('boot', 'notification dropped: not supported');
      return { id: 'unsupported' };
    }
    const note = new Notification({
      title: options.title,
      body: options.body,
      icon: options.icon ? path.resolve(options.icon) : undefined,
      silent: !!options.silent,
      urgency: options.urgency,
      timeoutType: options.timeoutType,
    });
    const id = crypto.randomUUID();
    note.on('click', () => sendToWeb('notify:click', { id, payload: { title: options.title } }));
    note.on('close', () => sendToWeb('notify:close', { id }));
    note.show();
    return { id };
  });

  // ── Clipboard ──
  ipcMain.handle('clipboard:read-text', () => clipboard.readText());
  ipcMain.handle('clipboard:write-text', (_event, text) => clipboard.writeText(String(text || '')));
  ipcMain.handle('clipboard:read-image', () => {
    const img = clipboard.readImage();
    if (img.isEmpty()) return null;
    try {
      return img.toDataURL();
    } catch (err) {
      log.warn('boot', 'clipboard readImage failed:', err && err.message ? err.message : err);
      return null;
    }
  });
  ipcMain.handle('clipboard:write-image', (_event, dataUrl) => {
    if (!dataUrl || typeof dataUrl !== 'string') return;
    const img = nativeImage.createFromDataURL(dataUrl);
    clipboard.writeImage(img);
  });

  // ── Theme ──
  ipcMain.handle('theme:get', () => nativeThemeSnapshot(themeMode === 'system' ? 'system' : 'manual'));
  ipcMain.handle('theme:set-mode', (_event, mode) => {
    if (!['system', 'light', 'dark'].includes(mode)) {
      throw new Error('invalid theme mode: ' + mode);
    }
    setManualThemeMode(mode);
    return nativeThemeSnapshot(mode === 'system' ? 'system' : 'manual');
  });

  // ── Auto-launch ──
  ipcMain.handle('auto-launch:get', () => {
    const settings = getOpenAtLogin();
    return {
      enabled: settings.openAtLogin,
      openAsHidden: settings.openAsHidden,
      openAtLogin: settings.openAtLogin,
    };
  });
  ipcMain.handle('auto-launch:set', (_event, enabled, options) => {
    const settings = setOpenAtLogin(!!enabled, !!(options && options.openAsHidden));
    return {
      enabled: settings.openAtLogin,
      openAsHidden: settings.openAsHidden,
    };
  });

  // ── Shortcut ──
  ipcMain.handle('shortcut:register', (_event, descriptor) => {
    if (!shortcutManager) return { ok: false, error: 'shortcut manager unavailable' };
    return shortcutManager.register(descriptor);
  });
  ipcMain.handle('shortcut:unregister', (_event, commandId) => {
    if (shortcutManager) shortcutManager.unregister(commandId);
  });
  ipcMain.handle('shortcut:list', () => (shortcutManager ? shortcutManager.list() : []));

  // ── Recent files ──
  ipcMain.handle('recent:add', (_event, p) => {
    if (recentFiles) recentFiles.add(p);
  });
  ipcMain.handle('recent:list', () => (recentFiles ? recentFiles.list() : []));
  ipcMain.handle('recent:clear', () => {
    if (recentFiles) recentFiles.clear();
  });

  // ── Progress / Badge ──
  ipcMain.handle('progress:set', (_event, value) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (typeof value !== 'number' || Number.isNaN(value)) {
      mainWindow.setProgressBar(-1);
      return;
    }
    if (value < 0) {
      mainWindow.setProgressBar(-1);
    } else {
      mainWindow.setProgressBar(Math.max(0, Math.min(1, value)));
    }
  });
  ipcMain.handle('badge:set', (_event, count) => {
    const safeCount = Math.max(0, Number(count) || 0);
    try {
      app.setBadgeCount(safeCount);
    } catch (err) {
      log.warn('boot', 'setBadgeCount failed:', err && err.message ? err.message : err);
    }
  });

  // ── Menu ──
  ipcMain.handle('menu:set', (_event, template) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    menuLib.installApplicationMenu(mainWindow.webContents, template);
  });

  // ── Update ──
  ipcMain.handle('update:check', async () => {
    if (!app.isPackaged) {
      return { success: false, message: 'auto-update is only available in production builds' };
    }
    try {
      await autoUpdater.checkForUpdates();
      return { success: true };
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      return { success: false, message };
    }
  });
  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall(false, true);
  });
  ipcMain.handle('update:channel-get', () => getUpdateChannel());
  ipcMain.handle('update:channel-set', (_event, channel) => {
    if (!['latest', 'beta', 'alpha'].includes(channel)) {
      throw new Error('invalid update channel: ' + channel);
    }
    setUpdateChannel(channel);
    return channel;
  });
  ipcMain.handle('update:allow-prerelease', (_event, enabled) => {
    const next = !!enabled;
    autoUpdater.allowPrerelease = next;
    setUpdatePrerelease(next);
    return next;
  });
  ipcMain.handle('update:allow-prerelease-get', () => getUpdatePrerelease());
}

// ── Update channel persistence (beta/alpha/lateset) ─────────────────────────

function getUpdateChannelFile() {
  return path.join(app.getPath('userData'), UPDATE_CHANNEL_FILE);
}

function getUpdateChannel() {
  try {
    const file = getUpdateChannelFile();
    if (!fs.existsSync(file)) return 'latest';
    const parsed = safeJSONParse(fs.readFileSync(file, 'utf-8'), {});
    return ['latest', 'beta', 'alpha'].includes(parsed.channel) ? parsed.channel : 'latest';
  } catch (err) {
    return 'latest';
  }
}

function setUpdateChannel(channel) {
  try {
    fs.mkdirSync(path.dirname(getUpdateChannelFile()), { recursive: true });
    fs.writeFileSync(getUpdateChannelFile(), JSON.stringify({ channel, updatedAt: Date.now() }, null, 2), 'utf-8');
  } catch (err) {
    log.warn('updater', 'persist channel failed:', err && err.message ? err.message : err);
  }
  autoUpdater.channel = channel;
  if (channel === 'beta' || channel === 'alpha') {
    autoUpdater.allowPrerelease = true;
  } else {
    autoUpdater.allowPrerelease = false;
  }
}

// ── Prerelease toggle persistence ─────────────────────────────────────────────

function getPrereleaseFile() {
  return path.join(app.getPath('userData'), 'update-prerelease.json');
}

function getUpdatePrerelease() {
  try {
    const file = getPrereleaseFile();
    if (!fs.existsSync(file)) return false;
    const parsed = safeJSONParse(fs.readFileSync(file, 'utf-8'), {});
    return parsed.allowPrerelease === true;
  } catch (err) {
    return false;
  }
}

function setUpdatePrerelease(allow) {
  try {
    fs.mkdirSync(path.dirname(getPrereleaseFile()), { recursive: true });
    fs.writeFileSync(
      getPrereleaseFile(),
      JSON.stringify({ allowPrerelease: !!allow, updatedAt: Date.now() }, null, 2),
      'utf-8',
    );
  } catch (err) {
    log.warn('updater', 'persist prerelease failed:', err && err.message ? err.message : err);
  }
}

// ── Auto-update ──────────────────────────────────────────────────────────────

function setupAutoUpdater() {
  if (!app.isPackaged) return;
  // Linux 上 AppImage 自带 AppImageKit 处理更新，不再注册 electron-updater
  // 其他平台（mac/win）保留 electron-updater；Linux 用户可手动通过发行包升级。
  if (process.platform === 'linux') {
    log.info('updater', 'auto-update skipped on linux (AppImage handles its own updates)');
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.channel = getUpdateChannel();
  if (autoUpdater.channel !== 'latest') autoUpdater.allowPrerelease = true;
  // 恢复用户上次选择的预发布开关
  if (getUpdatePrerelease()) autoUpdater.allowPrerelease = true;

  autoUpdater.on('checking-for-update', () => log.info('updater', 'checking for update'));
  autoUpdater.on('update-available', (info) => {
    log.info('updater', 'available:', info.version);
    sendToWeb('update:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    });
  });
  autoUpdater.on('update-not-available', () => {
    log.info('updater', 'not available');
    sendToWeb('update:not-available', {});
  });
  autoUpdater.on('download-progress', (progress) => {
    sendToWeb('update:download-progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      total: progress.total,
      transferred: progress.transferred,
    });
  });
  autoUpdater.on('update-downloaded', (info) => {
    log.info('updater', 'downloaded:', info.version);
    sendToWeb('update:downloaded', { version: info.version });
  });
  autoUpdater.on('error', (err) => {
    log.error('updater', 'error:', err && err.message ? err.message : err);
    sendToWeb('update:error', { message: err && err.message ? err.message : 'unknown' });
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log.warn('updater', 'check failed:', err && err.message ? err.message : err);
    });
  }, UPDATE_CHECK_DELAY_MS);
}

// ── Backend / Shortcut / Recent managers wiring ──────────────────────────────

function setupManagers() {
  recentFiles = createRecentFilesManager();
  shortcutManager = createShortcutManager((info) => {
    sendToWeb('shortcut:invoke', info);
  });
}

function setupBackend(apiBaseUrlPromise) {
  const backend = createBackend({
    app,
    resourceRoot: resolveResourcePath(),
    onEvent: (info) => {
      if (info.type === 'started') {
        // 若启动落后于窗口创建（一般不会），把 url 同步过去
        if (process.env.OPC_DESKTOP_API_BASE_URL !== info.apiBaseUrl) {
          process.env.OPC_DESKTOP_API_BASE_URL = info.apiBaseUrl;
        }
        return;
      }
      if (info.type === 'exit') {
        if (mainWindow && !mainWindow.isDestroyed() && !isQuitting) {
          const reason = `code=${info.code ?? 'null'}, signal=${info.signal ?? 'null'}`;
          try {
            dialog.showErrorBox('后端服务已退出', `OPC Agent 后端服务异常退出。${reason}`);
          } catch (_err) {
            // 静默降级
          }
          sendToWeb('backend:crashed', {
            reason,
            restartCount: backend.getStatus().restartCount ?? 0,
            retrying: true,
          });
        }
        // 自动重启一次
        (async () => {
          try {
            await new Promise((r) => setTimeout(r, 1000));
            const newUrl = await backend.restart();
            log.info('backend', `auto-restarted at ${newUrl}`);
          } catch (err) {
            log.error('backend', 'auto-restart failed:', err && err.message ? err.message : err);
          }
        })();
      }
      if (info.type === 'error') {
        const message = info.err && info.err.message ? info.err.message : 'unknown';
        log.error('backend', 'event error:', message);
        sendToWeb('backend:crashed', {
          reason: message,
          restartCount: backend.getStatus().restartCount ?? 0,
          retrying: false,
        });
      }
    },
  });

  backendManager = backend;
  return apiBaseUrlPromise(backend);
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

async function bootstrap() {
  // 启动前 deep link 入队
  pendingInitialDeepLink = getProcessDefaultDeepLink();

  // dev 模式未注入 dev URL 时打印提示，便于 Vite HMR 联调
  if (!app.isPackaged && !process.env.OPC_DESKTOP_WEB_URL) {
    log.info(
      'boot',
      'hint: Use OPC_DESKTOP_WEB_URL=http://localhost:5173 for hot reload',
    );
  }

  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('opc-agent', process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient('opc-agent');
  }

  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    return;
  }

  app.on('second-instance', (_event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
    const url = argv.find((a) => typeof a === 'string' && a.startsWith('opc-agent://'));
    if (url) {
      log.info('boot', 'second-instance deep link:', url);
      sendToWeb('app:deep-link', url);
    }
  });

  // macOS: open-url
  app.on('open-url', (event, url) => {
    event.preventDefault();
    log.info('boot', 'open-url deep link:', url);
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      sendToWeb('app:deep-link', url);
    } else {
      pendingInitialDeepLink = url;
    }
  });

  try {
    setupManagers();
    setupNotifications();
    setupThemeListener();

    // 启动后端并拿到 url
    const apiBaseUrl = await setupBackend(async () => {
      const url = await backendManager.start();
      return url;
    });
    log.info('backend', 'listening at', apiBaseUrl);

    registerIpcHandlers();
    createWindow(apiBaseUrl);

    if (process.platform === 'darwin') {
      setupTray();
    }

    setupAutoUpdater();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error('boot', 'bootstrap failed:', message);
    try {
      dialog.showErrorBox('OPC Agent System 启动失败', message);
    } catch (_err) {
      process.stderr.write(`[desktop] bootstrap failed: ${message}\n`);
    }
    app.exit(1);
  }
}

// ── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(bootstrap);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && process.env.OPC_DESKTOP_API_BASE_URL) {
    createWindow(process.env.OPC_DESKTOP_API_BASE_URL);
  } else if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', (event) => {
  if (isQuitting) return;
  event.preventDefault();
  if (mainWindow && !mainWindow.isDestroyed()) {
    saveWindowState({
      x: mainWindow.getBounds().x,
      y: mainWindow.getBounds().y,
      width: mainWindow.getBounds().width,
      height: mainWindow.getBounds().height,
      maximized: mainWindow.isMaximized(),
    });
  }
  if (backendManager && !backendManager.isDisposed()) {
    log.info('boot', 'disposing backend manager');
    backendManager.dispose();
  }
  if (shortcutManager) {
    shortcutManager.unregisterAll();
  }
  // 仅在仍有窗口时与渲染层协商退出；否则直接退出
  if (mainWindow && !mainWindow.isDestroyed()) {
    requestRendererQuit();
  } else {
    isQuitting = true;
    app.quit();
  }
});
