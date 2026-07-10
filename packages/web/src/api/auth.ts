import { post, get } from './request'
import type {
  LoginParams,
  LoginResult,
  User,
  ApiResponse,
  RegisterParams,
  ForgotPasswordParams,
  ResetPasswordParams,
} from '@/types'

/** 用户登录 */
export function login(data: LoginParams) {
  return post<ApiResponse<LoginResult>>('/auth/login', data)
}

/** 用户注册（注册成功后自动登录，返回与登录一致的结果） */
export function register(data: RegisterParams) {
  return post<ApiResponse<LoginResult>>('/auth/register', data)
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

/** 忘记密码：发送密码重置邮件 */
export function forgotPassword(data: ForgotPasswordParams) {
  return post<ApiResponse<{ sent: boolean }>>('/auth/forgot-password', data)
}

/** 重置密码：使用一次性令牌设置新密码 */
export function resetPassword(data: ResetPasswordParams) {
  return post<ApiResponse<{ reset: boolean }>>('/auth/reset-password', data)
}
