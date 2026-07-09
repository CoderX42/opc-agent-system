const {
  app, BrowserWindow, dialog, shell, ipcMain, Tray, Menu, nativeImage,
} = require('electron')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const net = require('node:net')
const path = require('node:path')
const { autoUpdater } = require('electron-updater')

// ── Constants ────────────────────────────────────────────────────────────────
const CONFIG_FILE = 'window-state.json'
const TRAY_ICON_SIZE = 22
const LOG_PREFIX = '[desktop]'

// ── State ────────────────────────────────────────────────────────────────────
let mainWindow = null
let serverProcess = null
let tray = null
let isQuitting = false

// ── Helpers ──────────────────────────────────────────────────────────────────

function log(...args) {
  console.log(LOG_PREFIX, ...args)
}

function resolveResourcePath(...segments) {
  if (app.isPackaged) return path.join(process.resourcesPath, ...segments)
  return path.resolve(__dirname, '..', '..', ...segments)
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
}

function waitForServer(url, timeoutMs = 30000) {
  const startedAt = Date.now()
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const response = await fetch(url)
        if (response.ok || response.status < 500) {
          resolve()
          return
        }
      } catch (error) {
        if (Date.now() - startedAt >= timeoutMs) {
          reject(error)
          return
        }
      }
      setTimeout(poll, 400)
    }
    void poll()
  })
}

// ── Window State Persistence ─────────────────────────────────────────────────

function getConfigPath() {
  return path.join(app.getPath('userData'), CONFIG_FILE)
}

function loadWindowState() {
  try {
    const file = getConfigPath()
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8'))
    }
  } catch (err) {
    log('Failed to load window state:', err.message)
  }
  return null
}

function saveWindowState(state) {
  try {
    fs.writeFileSync(getConfigPath(), JSON.stringify(state, null, 2))
  } catch (err) {
    log('Failed to save window state:', err.message)
  }
}

// ── Tray Icon ────────────────────────────────────────────────────────────────

function createTrayIcon() {
  // Try to load a custom icon from the app resources; fall back to a generated one
  const iconPaths = [
    resolveResourcePath('icon.png'),
    path.join(__dirname, '..', 'assets', 'icon.png'),
  ]

  for (const iconPath of iconPaths) {
    if (fs.existsSync(iconPath)) {
      const img = nativeImage.createFromPath(iconPath)
      return img.resize({ width: TRAY_ICON_SIZE, height: TRAY_ICON_SIZE })
    }
  }

  // Fallback: generate a simple 22×22 PNG (brass-colour circle)
  const size = TRAY_ICON_SIZE
  const buf = Buffer.alloc(size * size * 4, 0)
  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - 1
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= radius) {
        const idx = (y * size + x) * 4
        // Brass colour #b7996e with slight antialiasing
        const alpha = Math.min(255, Math.max(0, Math.round((radius - dist + 0.5) * 255)))
        buf[idx] = 0xb7       // R
        buf[idx + 1] = 0x99   // G
        buf[idx + 2] = 0x6e   // B
        buf[idx + 3] = alpha  // A
      }
    }
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size })
}

function setupTray() {
  const icon = createTrayIcon()
  tray = new Tray(icon)
  tray.setToolTip('OPC Agent System')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      },
    },
    {
      label: '隐藏窗口',
      click: () => {
        if (mainWindow) mainWindow.hide()
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

// ── Backend ──────────────────────────────────────────────────────────────────

async function startBackend() {
  const serverEntry = app.isPackaged
    ? resolveResourcePath('server', 'main.js')
    : resolveResourcePath('server', 'dist', 'main.js')

  if (!fs.existsSync(serverEntry)) {
    throw new Error(`Server bundle not found: ${serverEntry}. Run pnpm build:server first.`)
  }

  // Server directory (for .env resolution)
  const serverDir = app.isPackaged
    ? resolveResourcePath('server')
    : resolveResourcePath('server')

  const port = await getFreePort()
  const apiBaseUrl = `http://127.0.0.1:${port}/api`
  const userData = app.getPath('userData')

  // Load defaults from packages/server/.env
  const envPath = path.join(serverDir, '.env')
  let envDefaults = {}
  try {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8')
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim()
          const val = trimmed.slice(eqIdx + 1).trim()
          envDefaults[key] = val
        }
      }
    }
  } catch (err) {
    log('Failed to read server .env:', err.message)
  }

  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: serverDir,
    env: {
      ...process.env,
      ...envDefaults,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: app.isPackaged ? 'production' : (process.env.NODE_ENV || 'development'),
      OPC_DESKTOP: 'true',
      APP_PORT: String(port),
      PORT: String(port),
      CORS_ORIGIN: '*',
      OPC_USER_DATA_DIR: userData,
    },
    stdio: app.isPackaged ? 'ignore' : 'inherit',
  })

  serverProcess.once('exit', (code, signal) => {
    if (mainWindow && !mainWindow.isDestroyed() && !isQuitting) {
      dialog.showErrorBox(
        '后端服务已退出',
        `OPC Agent 后端服务异常退出。code=${code ?? 'null'}, signal=${signal ?? 'null'}`,
      )
    }
  })

  await waitForServer(`${apiBaseUrl.replace(/\/api$/, '')}/api`)
  return apiBaseUrl
}

// ── Window ───────────────────────────────────────────────────────────────────

function createWindow(apiBaseUrl) {
  process.env.OPC_DESKTOP_API_BASE_URL = apiBaseUrl
  const savedState = loadWindowState()

  const windowOptions = {
    width: savedState?.width ?? 1440,
    height: savedState?.height ?? 960,
    minWidth: 1100,
    minHeight: 760,
    title: 'OPC Agent System',
    show: false, // show after ready-to-show to prevent flash
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  }

  // Restore position if saved; otherwise let the OS place it
  if (savedState?.x !== undefined && savedState?.y !== undefined) {
    windowOptions.x = savedState.x
    windowOptions.y = savedState.y
  }

  if (savedState?.maximized) {
    // Don't set width/height when restoring maximized; just create then maximise
    delete windowOptions.width
    delete windowOptions.height
  }

  mainWindow = new BrowserWindow(windowOptions)

  if (savedState?.maximized) {
    mainWindow.maximize()
  }

  // Show window when ready to prevent white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  // Save window state on resize/move
  const debouncedSave = debounce(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    const bounds = mainWindow.getBounds()
    const maximized = mainWindow.isMaximized()
    saveWindowState({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      maximized,
    })
  }, 500)

  mainWindow.on('resize', debouncedSave)
  mainWindow.on('move', debouncedSave)
  mainWindow.on('maximize', debouncedSave)
  mainWindow.on('unmaximize', debouncedSave)

  // macOS: hide instead of close
  mainWindow.on('close', (event) => {
    if (!isQuitting && process.platform === 'darwin') {
      event.preventDefault()
      mainWindow.hide()
      return
    }
  })

  // Dev mode: load from URL or file
  if (!app.isPackaged && process.env.OPC_DESKTOP_WEB_URL) {
    void mainWindow.loadURL(process.env.OPC_DESKTOP_WEB_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
    return
  }

  const indexHtml = app.isPackaged
    ? resolveResourcePath('web', 'index.html')
    : resolveResourcePath('web', 'dist', 'index.html')

  void mainWindow.loadFile(indexHtml)
}

// ── IPC Handlers ─────────────────────────────────────────────────────────────

function registerIpcHandlers(apiBaseUrl) {
  // ── App info ──
  ipcMain.handle('app:get-version', () => app.getVersion())

  ipcMain.handle('app:get-platform', () => ({
    platform: process.platform,
    arch: process.arch,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
  }))

  ipcMain.handle('app:get-paths', () => ({
    userData: app.getPath('userData'),
    home: app.getPath('home'),
    downloads: app.getPath('downloads'),
    desktop: app.getPath('desktop'),
    documents: app.getPath('documents'),
    temp: app.getPath('temp'),
    appData: app.getPath('appData'),
  }))

  // ── Dialogs ──
  ipcMain.handle('dialog:open-file', async (_event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      ...options,
    })
    return result.canceled ? null : result.filePaths
  })

  ipcMain.handle('dialog:open-multi-file', async (_event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      ...options,
    })
    return result.canceled ? null : result.filePaths
  })

  ipcMain.handle('dialog:save-file', async (_event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options)
    return result.canceled ? null : result.filePath
  })

  ipcMain.handle('dialog:show-message', async (_event, options) => {
    return dialog.showMessageBox(mainWindow, options)
  })

  // ── Shell ──
  ipcMain.handle('shell:open-external', async (_event, url) => {
    return shell.openExternal(url)
  })

  ipcMain.handle('shell:show-item-in-folder', async (_event, filePath) => {
    return shell.showItemInFolder(filePath)
  })

  ipcMain.handle('shell:open-path', async (_event, filePath) => {
    return shell.openPath(filePath)
  })

  // ── Window control ──
  ipcMain.handle('window:minimize', () => {
    if (mainWindow) mainWindow.minimize()
  })

  ipcMain.handle('window:maximize', () => {
    if (mainWindow) mainWindow.maximize()
  })

  ipcMain.handle('window:unmaximize', () => {
    if (mainWindow) mainWindow.unmaximize()
  })

  ipcMain.handle('window:toggle-maximize', () => {
    if (!mainWindow) return
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })

  ipcMain.handle('window:close', () => {
    if (mainWindow) mainWindow.close()
  })

  ipcMain.handle('window:is-maximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false
  })

  ipcMain.handle('window:is-minimized', () => {
    return mainWindow ? mainWindow.isMinimized() : false
  })

  ipcMain.handle('window:get-state', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return null
    const bounds = mainWindow.getBounds()
    return {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      maximized: mainWindow.isMaximized(),
      minimized: mainWindow.isMinimized(),
      fullscreen: mainWindow.isFullScreen(),
    }
  })

  // ── Backend ──
  ipcMain.handle('backend:get-url', () => apiBaseUrl)

  ipcMain.handle('backend:get-status', () => {
    return {
      running: serverProcess !== null && !serverProcess.killed,
      apiBaseUrl,
      pid: serverProcess?.pid ?? null,
    }
  })
}

// ── Auto-update ──────────────────────────────────────────────────────────────

function setupAutoUpdater() {
  if (!app.isPackaged) return // only in production

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    log('Checking for update...')
  })

  autoUpdater.on('update-available', (info) => {
    log('Update available:', info.version)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update:available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      })
    }
  })

  autoUpdater.on('update-not-available', () => {
    log('No update available')
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update:not-available')
    }
  })

  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update:download-progress', {
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        total: progress.total,
        transferred: progress.transferred,
      })
    }
  })

  autoUpdater.on('update-downloaded', (info) => {
    log('Update downloaded:', info.version)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update:downloaded', {
        version: info.version,
      })
    }
  })

  autoUpdater.on('error', (err) => {
    log('Auto-update error:', err.message)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update:error', { message: err.message })
    }
  })

  // Check for updates after a short delay (let the app settle)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log('Auto-update check failed:', err.message)
    })
  }, 5000)

  // IPC handler for manual update checks and install
  ipcMain.handle('update:check', async () => {
    try {
      await autoUpdater.checkForUpdates()
      return { success: true }
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall(false, true)
  })
}

// ── Utility ──────────────────────────────────────────────────────────────────

function debounce(fn, delay) {
  let timer = null
  return (...args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

async function bootstrap() {
  // Prevent multiple instances (single-instance lock)
  const gotLock = app.requestSingleInstanceLock()
  if (!gotLock) {
    app.quit()
    return
  }

  // Second instance launches → focus the existing window
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  try {
    // Start server first, then create window
    const apiBaseUrl = await startBackend()
    log('Backend running at', apiBaseUrl)

    registerIpcHandlers(apiBaseUrl)
    createWindow(apiBaseUrl)

    // Tray (macOS always shows tray; other platforms optional)
    if (process.platform === 'darwin') {
      setupTray()
    }

    // Setup auto-updater
    setupAutoUpdater()

    // Register custom protocol for deep linking
    if (process.defaultApp) {
      if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('opc-agent', process.execPath, [path.resolve(process.argv[1])])
      }
    } else {
      app.setAsDefaultProtocolClient('opc-agent')
    }
  } catch (error) {
    dialog.showErrorBox(
      'OPC Agent System 启动失败',
      error instanceof Error ? error.message : String(error),
    )
    app.quit()
  }
}

// ── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(bootstrap)

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && process.env.OPC_DESKTOP_API_BASE_URL) {
    createWindow(process.env.OPC_DESKTOP_API_BASE_URL)
  } else if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  }
})

app.on('window-all-closed', () => {
  // macOS: keep app running in background (tray)
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  isQuitting = true
  saveWindowState({
    ...loadWindowState(),
    maximized: mainWindow ? mainWindow.isMaximized() : false,
  })
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGTERM')
  }
})

// macOS: handle open-url (deep link)
app.on('open-url', (_event, url) => {
  log('Deep link:', url)
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
    mainWindow.webContents.send('app:deep-link', url)
  }
})

// Handle protocol on Windows/Linux (second-instance)
app.on('second-instance', (_event, argv) => {
  const url = argv.find((a) => a.startsWith('opc-agent://'))
  if (url && mainWindow) {
    mainWindow.webContents.send('app:deep-link', url)
  }
})

