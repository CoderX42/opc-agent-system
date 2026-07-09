import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import { getRefreshToken, getToken, removeToken, setRefreshToken, setToken } from '@/utils'
import router from '@/router'
import { useDesktopStore } from '@/stores/desktop'

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

interface ApiEnvelope<T> {
  success: boolean
  data: T
  message: string
  timestamp: string
}

interface RefreshSession {
  token: string
  refreshToken: string
}

/**
 * 把 axios 错误归一化为带 code 的可桥接对象。
 * 在桌面端，错误会带有 code = 'DESKTOP_BACKEND_DOWN' / 'DESKTOP_TIMEOUT' 等前缀，
 * 便于 request.ts 拦截后转为可重试提示。
 */
function describeAxiosError(error: unknown): { code: string; message: string } {
  if (!error || typeof error !== 'object') return { code: 'UNKNOWN', message: '未知错误' }
  const err = error as { code?: string; message?: string; response?: { status?: number } }
  if (err.code === 'ECONNABORTED' || (typeof err.message === 'string' && err.message.includes('timeout'))) {
    return { code: 'DESKTOP_TIMEOUT', message: '请求超时，请稍后重试' }
  }
  if (err.code === 'ERR_NETWORK' || (typeof err.message === 'string' && err.message.includes('Network Error'))) {
    return { code: 'DESKTOP_BACKEND_DOWN', message: '后端连接失败' }
  }
  if (!err.response) {
    return { code: 'DESKTOP_BACKEND_DOWN', message: '后端不可用' }
  }
  return { code: `HTTP_${err.response.status ?? 'ERR'}`, message: err.message || '请求失败' }
}

const desktopApiBaseUrl = window.opcDesktop?.apiBaseUrl
const apiBaseUrl = desktopApiBaseUrl || import.meta.env.VITE_API_BASE_URL || '/api'

/** 创建Axios实例 */
const service: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

let refreshPromise: Promise<string> | null = null

function redirectToLogin() {
  removeToken()
  if (router.currentRoute.value.path !== '/login') void router.push('/login')
}

async function refreshAccessToken(): Promise<string> {
  const storedRefreshToken = getRefreshToken()
  if (!storedRefreshToken) throw new Error('缺少刷新令牌')

  const response = await axios.post<ApiEnvelope<RefreshSession>>(
    `${service.defaults.baseURL || ''}/auth/refresh`,
    { refreshToken: storedRefreshToken },
    { timeout: service.defaults.timeout },
  )
  const session = response.data.data
  setToken(session.token)
  setRefreshToken(session.refreshToken)
  return session.token
}

/** 请求拦截器 */
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // 兼容后端参数命名: pageSize -> limit
    if (config.params && 'pageSize' in config.params) {
      const { pageSize, ...rest } = config.params as Record<string, unknown>
      config.params = { ...rest, limit: pageSize } as InternalAxiosRequestConfig['params']
    }
    return config
  },
  (error) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

/** 响应拦截器 */
service.interceptors.response.use(
  (response: AxiosResponse) => {
    const res = response.data

    // 如果返回的状态码不是200，说明接口有问题
    if (res.code !== undefined && res.code !== 200) {
      ElMessage.error(res.message || '请求失败')

      // 401: Token过期或未登录
      if (res.code === 401) {
        removeToken()
        router.push('/login')
      }

      return Promise.reject(new Error(res.message || '请求失败'))
    }

    return res
  },
  async (error) => {
    const { response } = error

    if (response) {
      const requestConfig = error.config as RetryableRequestConfig | undefined
      const isAuthEndpoint = requestConfig?.url?.includes('/auth/login') || requestConfig?.url?.includes('/auth/refresh')

      if (response.status === 401 && requestConfig && !requestConfig._retry && !isAuthEndpoint) {
        requestConfig._retry = true
        try {
          refreshPromise ??= refreshAccessToken().finally(() => {
            refreshPromise = null
          })
          const token = await refreshPromise
          requestConfig.headers.Authorization = `Bearer ${token}`
          return service(requestConfig)
        } catch {
          ElMessage.error('登录已过期，请重新登录')
          redirectToLogin()
          return Promise.reject(error)
        }
      }

      switch (response.status) {
        case 401:
          ElMessage.error('登录已过期，请重新登录')
          redirectToLogin()
          break
        case 403:
          ElMessage.error('没有权限访问该资源')
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 500:
          ElMessage.error('服务器内部错误')
          break
        default:
          ElMessage.error(response.data?.message || `请求失败 (${response.status})`)
      }
    } else if (error.message.includes('timeout')) {
      ElMessage.error('请求超时，请稍后重试')
    } else if (error.message.includes('Network Error')) {
      ElMessage.error('网络错误，请检查网络连接')
    }

    // 桌面端错误码桥接：通知 desktop store
    try {
      const desktopStore = useDesktopStore()
      const info = describeAxiosError(error)
      if (info.code === 'DESKTOP_BACKEND_DOWN' || info.code === 'DESKTOP_TIMEOUT') {
        desktopStore.markBackendUnreachable(info.message)
      }
    } catch (_err) {
      // 非桌面端环境 / store 未初始化时静默忽略
    }

    return Promise.reject(error)
  }
)

/** 封装请求方法 */
export function get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return service.get(url, config)
}

export function post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return service.post(url, data, config)
}

export function put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return service.patch(url, data, config)
}

export function del<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return service.delete(url, config)
}

/**
 * 启动桌面端后端心跳。
 * 仅在 window.opcDesktop 可用时生效，每 5 秒调用一次 backend:get-status。
 * 该函数应当且仅当由 main.ts 在 app 挂载完成后调用一次。
 */
let heartbeatTimer: ReturnType<typeof setInterval> | null = null

export function startDesktopBackendHeartbeat(intervalMs = 5000) {
  if (typeof window === 'undefined' || !window.opcDesktop) return () => {}
  if (heartbeatTimer) return () => stopDesktopBackendHeartbeat()
  const tick = async () => {
    try {
      const desktopStore = useDesktopStore()
      const status = await window.opcDesktop!.getBackendStatus()
      desktopStore.applyBackendStatus(status)
    } catch (_err) {
      // 心跳失败时静默；用户行为触发的失败会走 axios 拦截器
    }
  }
  void tick()
  heartbeatTimer = setInterval(tick, intervalMs)
  return () => stopDesktopBackendHeartbeat()
}

export function stopDesktopBackendHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

export default service
