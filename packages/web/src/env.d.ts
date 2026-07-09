/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_TIMEOUT: string
}

interface OpcDesktopAPI {
  /** （已弃用）建议使用 getBackendUrl() 替代 */
  readonly apiBaseUrl?: string

  /** 桌面客户端版本号 */
  readonly version?: string

  /** 操作系统平台 */
  readonly platform?: NodeJS.Platform

  // ── App info ──
  getVersion(): Promise<string>
  getPlatform(): Promise<{ platform: string; arch: string; electronVersion: string; nodeVersion: string }>
  getPaths(): Promise<{
    userData: string
    home: string
    downloads: string
    desktop: string
    documents: string
    temp: string
    appData: string
  }>

  // ── Dialogs ──
  openFileDialog(options?: Electron.OpenDialogOptions): Promise<string[] | null>
  openMultiFileDialog(options?: Electron.OpenDialogOptions): Promise<string[] | null>
  saveFileDialog(options?: Electron.SaveDialogOptions): Promise<string | null>
  showMessageBox(options?: Electron.MessageBoxOptions): Promise<Electron.MessageBoxReturnValue>

  // ── Shell ──
  openExternal(url: string): Promise<void>
  showItemInFolder(filePath: string): Promise<void>
  openPath(filePath: string): Promise<string>

  // ── Window control ──
  minimizeWindow(): Promise<void>
  maximizeWindow(): Promise<void>
  unmaximizeWindow(): Promise<void>
  toggleMaximizeWindow(): Promise<void>
  closeWindow(): Promise<void>
  isWindowMaximized(): Promise<boolean>
  isWindowMinimized(): Promise<boolean>
  getWindowState(): Promise<{
    x: number
    y: number
    width: number
    height: number
    maximized: boolean
    minimized: boolean
    fullscreen: boolean
  } | null>

  // ── Backend ──
  getBackendUrl(): Promise<string>
  getBackendStatus(): Promise<{
    running: boolean
    apiBaseUrl: string
    pid: number | null
  }>

  // ── Update ──
  checkForUpdate(): Promise<{ success: boolean; message?: string }>
  installUpdate(): Promise<void>

  // ── Event listeners (returns cleanup function) ──
  onUpdateAvailable(callback: (info: { version: string; releaseDate: string; releaseNotes?: string }) => void): () => void
  onUpdateNotAvailable(callback: () => void): () => void
  onUpdateDownloadProgress(callback: (progress: { percent: number; bytesPerSecond: number; total: number; transferred: number }) => void): () => void
  onUpdateDownloaded(callback: (info: { version: string }) => void): () => void
  onUpdateError(callback: (error: { message: string }) => void): () => void
  onDeepLink(callback: (url: string) => void): () => void
}

interface Window {
  opcDesktop?: OpcDesktopAPI
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
