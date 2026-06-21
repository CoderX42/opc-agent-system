import { post, get } from './request'
import type { LoginParams, LoginResult, User, ApiResponse } from '@/types'

/** 用户登录 */
export function login(data: LoginParams) {
  return post<ApiResponse<LoginResult>>('/auth/login', data)
}

/** 用户登出 */
export function logout() {
  return post<ApiResponse<null>>('/auth/logout')
}

/** 获取当前用户信息 */
export function getCurrentUser() {
  return get<ApiResponse<User>>('/auth/me')
}

/** 刷新Token */
export function refreshToken(refreshToken: string) {
  return post<ApiResponse<LoginResult>>('/auth/refresh', { refreshToken })
}

/** 修改密码 */
export function changePassword(data: { oldPassword: string; newPassword: string }) {
  return post<ApiResponse<null>>('/auth/change-password', data)
}
