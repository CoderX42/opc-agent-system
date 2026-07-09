/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_TIMEOUT: string
}

/**
 * 通知选项（对应桌面端 IPC `notify:show`）。
 */
interface NotificationOptions {
  title: string
  body?: string
  icon?: string
  silent?: boolean
  urgency?: 'normal' | 'critical' | 'low'
  tag?: string
  timeoutType?: 'default' | 'never'
}

/**
 * 应用菜单描述。渲染层下发菜单模板，主进程构建原生菜单。
 */
interface AppMenuItemDescriptor {
  id?: string
  /** Electron MenuItemConstructorOptions.role */
  role?: string
  /** Electron MenuItemConstructorOptions.label */
  label?: string
  /** Electron MenuItemConstructorOptions.accelerator */
  accelerator?: string
  /** 子菜单 */
  submenu?: AppMenuItemDescriptor[]
  /** 是否禁用 */
  enabled?: boolean
  /** 是否可见 */
  visible?: boolean
  /** 自定义类型：separator / normal */
  type?: 'normal' | 'separator' | 'checkbox' | 'radio'
  /** checkbox/radio 初始状态 */
  checked?: boolean
}

/**
 * 全局快捷键描述。
 */
interface ShortcutDescriptor {
  accelerator: string
  commandId: string
  description?: string
}

/**
 * 最近文件条目。
 */
interface RecentFile {
  path: string
  /** 毫秒时间戳 */
  openedAt: number
  /** 文件大小（字节），可选 */
  size?: number
}

/**
 * 后端状态：与 main.cjs 的 `backend:get-status` 保持一致。
 */
interface BackendStatus {
  running: boolean
  apiBaseUrl: string
  pid: number | null
  /** 重启尝试次数 */
  restartCount?: number
  /** 最近一次错误信息 */
  lastError?: string | null
}

/**
 * 应用元信息：与 main.cjs 的 `app:get-info` 保持一致。
 */
interface AppInfo {
  name: string
  version: string
  locale: string
  userDataDir: string
  platform: NodeJS.Platform
  arch: string
  electronVersion: string
  nodeVersion: string
  chromeVersion: string
  packaged: boolean
}

/**
 * 桌面端完整 API 描述（与 packages/desktop/src/preload.cjs 一一对应）。
 */
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
  getAppInfo(): Promise<AppInfo>

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
  getBackendStatus(): Promise<BackendStatus>
  /** 主动触发一次后端重启（仅适用于桌面崩溃自动重启失败后的手动操作）。 */
  restartBackend(): Promise<{ success: boolean; apiBaseUrl?: string; message?: string }>

  // ── Notification ──
  showNotification(options: NotificationOptions): Promise<{ id: string }>

  // ── Clipboard ──
  readClipboardText(): Promise<string>
  writeClipboardText(text: string): Promise<void>
  readClipboardImage(): Promise<string | null>
  writeClipboardImage(dataUrl: string): Promise<void>

  // ── Theme ──
  getTheme(): Promise<{
    shouldUseDarkColors: boolean
    shouldUseHighContrastColors: boolean
    shouldUseInvertedColorScheme: boolean
    source: 'system' | 'manual'
  }>
  setThemeMode(mode: 'system' | 'light' | 'dark'): Promise<void>

  // ── Auto-launch ──
  getAutoLaunch(): Promise<{ enabled: boolean; openAsHidden: boolean; openAtLogin: boolean }>
  setAutoLaunch(enabled: boolean, options?: { openAsHidden?: boolean }): Promise<{ enabled: boolean; openAsHidden: boolean }>

  // ── Shortcut ──
  registerShortcut(descriptor: ShortcutDescriptor): Promise<{ ok: boolean; error?: string }>
  unregisterShortcut(commandId: string): Promise<void>
  listShortcuts(): Promise<ShortcutDescriptor[]>
  /** 渲染层在主进程调用了对应 accelerator 时收到通知。 */
  onShortcutCommand(callback: (info: { commandId: string; accelerator: string }) => void): () => void

  // ── Recent files ──
  addRecentFile(filePath: string): Promise<void>
  getRecentFiles(): Promise<RecentFile[]>
  clearRecentFiles(): Promise<void>

  // ── Progress / Badge ──
  setTaskbarProgress(progress: number): Promise<void>
  setBadgeCount(count: number): Promise<void>

  // ── Menu ──
  /** 渲染层下发完整菜单模板；主进程构建原生菜单，点击回传 commandId。 */
  setApplicationMenu(template: AppMenuItemDescriptor[]): Promise<void>
  /** 主进程菜单点击事件，回传 commandId + accelerator + 路径信息。 */
  onMenuCommand(callback: (info: { commandId: string; accelerator?: string; label?: string }) => void): () => void
  /** 主进程检测到需要重建菜单（如主题切换、locale 变更）时通知渲染层重新下发模板。 */
  onMenuRebuild(callback: () => void): () => void

  // ── Update ──
  checkForUpdate(): Promise<{ success: boolean; message?: string }>
  installUpdate(): Promise<void>
  /** 切换预发行通道：仅在 settings 启用。 */
  setUpdateChannel(channel: 'latest' | 'beta' | 'alpha'): Promise<void>
  /** 获取当前更新通道。 */
  getUpdateChannel(): Promise<'latest' | 'beta' | 'alpha'>
  /** 单独控制预发行版本是否允许检查/安装。 */
  setUpdatePrerelease(enabled: boolean): Promise<boolean>
  getUpdatePrerelease(): Promise<boolean>

  // ── Before-quit ──
  /** 主进程检测到用户尝试退出应用，渲染层可选择阻止并提示。 */
  onBeforeQuit(callback: (info: { quit: () => void; cancel: () => void }) => void): () => void
  confirmQuit(token: string): Promise<void>
  cancelQuit(token: string): Promise<void>

  // ── Backend crash ──
  onBackendCrashed(callback: (info: { reason: string; restartCount: number; retrying: boolean }) => void): () => void

  // ── Theme 事件 ──
  onThemeChanged(callback: (info: { shouldUseDarkColors: boolean; source: 'system' | 'manual' }) => void): () => void

  // ── Deep-link ──
  /** 一次性消费启动时的 deep link（来自 argv）。 */
  getInitialDeepLink(): Promise<string | null>
  /** 运行中通过 open-url / second-instance 派发的 deep link。 */
  onDeepLink(callback: (url: string) => void): () => void

  // ── Auto-update 事件 ──
  onUpdateAvailable(callback: (info: { version: string; releaseDate: string; releaseNotes?: string }) => void): () => void
  onUpdateNotAvailable(callback: () => void): () => void
  onUpdateDownloadProgress(callback: (progress: { percent: number; bytesPerSecond: number; total: number; transferred: number }) => void): () => void
  onUpdateDownloaded(callback: (info: { version: string }) => void): () => void
  onUpdateError(callback: (error: { message: string }) => void): () => void
}

interface Window {
  opcDesktop?: OpcDesktopAPI
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
