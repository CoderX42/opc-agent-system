const { app, BrowserWindow, dialog, shell } = require('electron')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const net = require('node:net')
const path = require('node:path')

let mainWindow = null
let serverProcess = null

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
      const address = server.address()
      server.close(() => resolve(address.port))
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

async function startBackend() {
  const serverEntry = app.isPackaged
    ? resolveResourcePath('server', 'main.js')
    : resolveResourcePath('server', 'dist', 'main.js')

  if (!fs.existsSync(serverEntry)) {
    throw new Error(`Server bundle not found: ${serverEntry}. Run pnpm build:server first.`)
  }

  const port = await getFreePort()
  const apiBaseUrl = `http://127.0.0.1:${port}/api`
  const userData = app.getPath('userData')

  serverProcess = spawn(process.execPath, [serverEntry], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: app.isPackaged ? 'production' : process.env.NODE_ENV || 'development',
      OPC_DESKTOP: 'true',
      APP_PORT: String(port),
      PORT: String(port),
      CORS_ORIGIN: '*',
      OPC_USER_DATA_DIR: userData,
    },
    stdio: app.isPackaged ? 'ignore' : 'inherit',
  })

  serverProcess.once('exit', (code, signal) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showErrorBox('后端服务已退出', `OPC Agent 后端服务异常退出。code=${code ?? 'null'}, signal=${signal ?? 'null'}`)
    }
  })

  await waitForServer(`${apiBaseUrl.replace(/\/api$/, '')}/api`)
  return apiBaseUrl
}

function createWindow(apiBaseUrl) {
  process.env.OPC_DESKTOP_API_BASE_URL = apiBaseUrl

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 760,
    title: 'OPC Agent System',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

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

async function bootstrap() {
  try {
    const apiBaseUrl = await startBackend()
    createWindow(apiBaseUrl)
  } catch (error) {
    dialog.showErrorBox('OPC Agent System 启动失败', error instanceof Error ? error.message : String(error))
    app.quit()
  }
}

app.whenReady().then(bootstrap)

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && process.env.OPC_DESKTOP_API_BASE_URL) {
    createWindow(process.env.OPC_DESKTOP_API_BASE_URL)
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGTERM')
  }
})
