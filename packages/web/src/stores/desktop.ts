import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/**
 * 桌面端（Electron）响应式状态。
 *
 * - 仅当 `window.opcDesktop` 存在时该 store 才有实际意义；浏览器环境下 `isDesktop` 为 false。
 * - `applyBackendStatus` 由 `api/request.ts` 的心跳调用，把 IPC 返回值落到响应式 ref 上。
 * - 通知 / 主题 / 自动启动等偏好通过 IPC 双向同步。
 */

interface AppInfo {
  name: string
  version: string
  locale: string
  userDataDir: string
  platform: string
  arch: string
  electronVersion: string
  nodeVersion: string
  chromeVersion: string
  packaged: boolean
}

interface BackendStatus {
  running: boolean
  apiBaseUrl: string
  pid: number | null
  restartCount?: number
  lastError?: string | null
}

interface AutoLaunchState {
  enabled: boolean
  openAsHidden: boolean
  openAtLogin: boolean
}

interface ThemeState {
  shouldUseDarkColors: boolean
  source: 'system' | 'manual'
}

interface RecentFile {
  path: string
  openedAt: number
  size?: number
}

interface ShortcutDescriptor {
  accelerator: string
  commandId: string
  description?: string
}

interface UpdateInfo {
  version?: string
  releaseDate?: string
  percent?: number
  bytesPerSecond?: number
  transferred?: number
  total?: number
  available?: boolean
  downloaded?: boolean
  error?: string
}

export const useDesktopStore = defineStore('desktop', () => {
  // ==================== Capability flags ====================
  const isDesktop = ref(Boolean(typeof window !== 'undefined' && window.opcDesktop))

  // ==================== App metadata ====================
  const appInfo = ref<AppInfo | null>(null)
  const paths = ref<{ userData: string; home: string; downloads: string; desktop: string; documents: string; temp: string; appData: string } | null>(null)

  // ==================== Backend status ====================
  const backend = ref<BackendStatus>({
    running: false,
    apiBaseUrl: '',
    pid: null,
    restartCount: 0,
    lastError: null,
  })
  const backendChecking = ref(false)
  const backendUnreachable = ref(false)
  const backendLastCheckedAt = ref<number | null>(null)

  // ==================== Theme ====================
  const theme = ref<ThemeState>({
    shouldUseDarkColors: false,
    source: 'system',
  })

  // ==================== Auto launch ====================
  const autoLaunch = ref<AutoLaunchState>({ enabled: false, openAsHidden: false, openAtLogin: false })

  // ==================== Recent files ====================
  const recentFiles = ref<RecentFile[]>([])
  const shortcuts = ref<ShortcutDescriptor[]>([])

  // ==================== Update ====================
  const updateChannel = ref<'latest' | 'beta' | 'alpha'>('latest')
  const updatePrerelease = ref<boolean>(false)
  const updateAvailable = ref<UpdateInfo | null>(null)
  const updateDownloaded = ref<UpdateInfo | null>(null)
  const updateProgress = ref<UpdateInfo | null>(null)
  const updateError = ref<string | null>(null)

  // ==================== Toast queue ====================
  const toasts = ref<Array<{ id: string; type: 'info' | 'success' | 'warning' | 'error'; title: string; message?: string; createdAt: number }>>([])

  // ==================== Computed ====================
  const backendStatusLabel = computed(() => {
    if (backendUnreachable.value) return '后端不可达'
    if (!backend.value.running) return '后端未启动'
    if (backend.value.restartCount && backend.value.restartCount > 0) return `已重启 ${backend.value.restartCount} 次`
    return '运行中'
  })
  const platformLabel = computed(() => appInfo.value?.platform || (typeof navigator !== 'undefined' ? navigator.platform : 'web'))

  // ==================== Actions ====================
  function applyBackendStatus(status: BackendStatus) {
    backend.value = { ...backend.value, ...status }
    backendChecking.value = false
    backendLastCheckedAt.value = Date.now()
    if (status.running) {
      backendUnreachable.value = false
      backend.value.lastError = null
    }
  }

  function markBackendUnreachable(message: string) {
    backendUnreachable.value = true
    backend.value = { ...backend.value, running: false, lastError: message }
    backendChecking.value = false
  }

  function markBackendCrashed(info: { reason: string; restartCount: number; retrying: boolean }) {
    backend.value = {
      ...backend.value,
      running: false,
      restartCount: info.restartCount,
      lastError: info.reason,
    }
    pushToast({
      type: 'error',
      title: '后端服务已退出',
      message: `${info.reason}${info.retrying ? '（已尝试自动重启）' : ''}`,
    })
  }

  function setAppInfo(info: AppInfo) {
    appInfo.value = info
  }

  function setPaths(p: typeof paths.value) {
    paths.value = p
  }

  function setTheme(t: ThemeState) {
    theme.value = t
  }

  function setAutoLaunchState(s: AutoLaunchState) {
    autoLaunch.value = s
  }

  function setRecentFiles(list: RecentFile[]) {
    recentFiles.value = list
  }

  function setShortcuts(list: ShortcutDescriptor[]) {
    shortcuts.value = list
  }

  function setUpdateChannel(channel: 'latest' | 'beta' | 'alpha') {
    updateChannel.value = channel
  }

  function setUpdatePrerelease(enabled: boolean) {
    updatePrerelease.value = !!enabled
  }

  function setUpdateAvailable(info: UpdateInfo | null) {
    updateAvailable.value = info
    if (info) pushToast({ type: 'info', title: '检测到新版本', message: info.version })
  }

  function setUpdateNotAvailable() {
    updateAvailable.value = null
  }

  function setUpdateDownloaded(info: UpdateInfo) {
    updateDownloaded.value = info
    pushToast({ type: 'success', title: '更新已下载', message: `版本 ${info.version}，重启应用以安装` })
  }

  function setUpdateProgress(info: UpdateInfo) {
    updateProgress.value = info
  }

  function setUpdateError(message: string) {
    updateError.value = message
    pushToast({ type: 'error', title: '自动更新失败', message })
  }

  function pushToast(toast: { type: 'info' | 'success' | 'warning' | 'error'; title: string; message?: string }) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    toasts.value = [{ id, createdAt: Date.now(), ...toast }, ...toasts.value].slice(0, 6)
  }

  function dismissToast(id: string) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return {
    // state
    isDesktop,
    appInfo,
    paths,
    backend,
    backendChecking,
    backendUnreachable,
    backendLastCheckedAt,
    theme,
    autoLaunch,
    recentFiles,
    shortcuts,
    updateChannel,
    updatePrerelease,
    updateAvailable,
    updateDownloaded,
    updateProgress,
    updateError,
    toasts,
    // computed
    backendStatusLabel,
    platformLabel,
    // actions
    applyBackendStatus,
    markBackendUnreachable,
    markBackendCrashed,
    setAppInfo,
    setPaths,
    setTheme,
    setAutoLaunchState,
    setRecentFiles,
    setShortcuts,
    setUpdateChannel,
    setUpdatePrerelease,
    setUpdateAvailable,
    setUpdateNotAvailable,
    setUpdateDownloaded,
    setUpdateProgress,
    setUpdateError,
    pushToast,
    dismissToast,
  }
})