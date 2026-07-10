import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, LoginParams, RegisterParams } from '@/types'
import {
  login as loginApi,
  register as registerApi,
  logout as logoutApi,
  getCurrentUser,
} from '@/api/auth'
import { setToken, setRefreshToken, removeToken } from '@/utils'

export const useUserStore = defineStore('user', () => {
  // ==================== State ====================
  const user = ref<User | null>(null)
  const token = ref<string>('')

  // ==================== Getters ====================
  const isLoggedIn = computed(() => !!token.value)
  const username = computed(() => user.value?.username || '')
  const nickname = computed(() => user.value?.nickname || '')
  const avatar = computed(() => user.value?.avatar || '')
  const role = computed(() => user.value?.role || 'USER')
  const permissions = computed(() => user.value?.permissions || [])

  const hasPermission = computed(() => {
    return (permission: string) => {
      if (role.value === 'ADMIN') return true
      return permissions.value.includes(permission)
    }
  })

  // ==================== Actions ====================

  /** 登录 */
  async function login(params: LoginParams) {
    const res = await loginApi(params)
    const { token: accessToken, refreshToken, user: userInfo } = res.data
    token.value = accessToken
    user.value = userInfo
    setToken(accessToken)
    setRefreshToken(refreshToken)
    return userInfo
  }

  /** 注册（注册成功后自动登录） */
  async function register(params: RegisterParams) {
    const res = await registerApi(params)
    const { token: accessToken, refreshToken, user: userInfo } = res.data
    token.value = accessToken
    user.value = userInfo
    setToken(accessToken)
    setRefreshToken(refreshToken)
    return userInfo
  }

  /** 获取用户信息 */
  async function fetchUserInfo() {
    const res = await getCurrentUser()
    user.value = res.data
    return res.data
  }

  /** 登出 */
  async function logout() {
    try {
      await logoutApi()
    } catch (err) {
      // 接口失败也要抛出，让调用方知道
      console.warn('[Logout] API call failed:', err)
    }
    // 无条件清空本地状态（不论接口是否成功）
    resetState()
  }

  /** 重置状态 */
  function resetState() {
    token.value = ''
    user.value = null
    removeToken()
  }

  return {
    user,
    token,
    isLoggedIn,
    username,
    nickname,
    avatar,
    role,
    permissions,
    hasPermission,
    login,
    register,
    fetchUserInfo,
    logout,
    resetState,
  }
})
