/**
 * 密码强度评估与校验工具。
 *
 * 策略：
 * - 长度 ≥ 8 为最低要求
 * - 包含字母 + 数字 为基本要求（与后端 DTO 一致）
 * - 强度等级：弱 / 中 / 强，用于前端可视化提示
 */

export type PasswordStrength = 'empty' | 'weak' | 'medium' | 'strong'

export interface PasswordAssessment {
  strength: PasswordStrength
  /** 0-100 的强度分值，便于驱动进度条 */
  score: number
  /** 反馈文案 */
  hint: string
  /** 是否满足最低可提交要求 */
  acceptable: boolean
}

/** 是否满足后端校验规则：8-32 位且同时包含字母与数字 */
export function isPasswordAcceptable(password: string): boolean {
  return /^(?=.*[A-Za-z])(?=.*\d).{8,32}$/.test(password)
}

/**
 * 评估密码强度。
 * 评分维度：长度、字符种类（小写、大写、数字、符号）。
 */
export function assessPassword(password: string): PasswordAssessment {
  if (!password) {
    return { strength: 'empty', score: 0, hint: '请输入密码', acceptable: false }
  }

  let score = 0
  if (password.length >= 8) score += 25
  if (password.length >= 12) score += 15
  if (password.length >= 16) score += 10

  let variety = 0
  if (/[a-z]/.test(password)) variety += 1
  if (/[A-Z]/.test(password)) variety += 1
  if (/\d/.test(password)) variety += 1
  if (/[^A-Za-z0-9]/.test(password)) variety += 1
  score += variety * 12

  // 组合奖励
  if (variety >= 3 && password.length >= 10) score += 5

  score = Math.min(100, score)

  let strength: PasswordStrength = 'weak'
  let hint = '密码强度：弱，建议加入字母与数字'
  if (score >= 70) {
    strength = 'strong'
    hint = '密码强度：强'
  } else if (score >= 45) {
    strength = 'medium'
    hint = '密码强度：中，可加入大写或符号'
  }

  return {
    strength,
    score,
    hint,
    acceptable: isPasswordAcceptable(password),
  }
}
