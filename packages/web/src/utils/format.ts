/**
 * 格式化金额
 */
export function formatMoney(amount: number, currency = 'CNY'): string {
  if (currency === 'CNY') {
    return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * 格式化百分比
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

/**
 * 格式化手机号（隐藏中间4位）
 */
export function formatPhone(phone: string): string {
  if (phone.length !== 11) return phone
  return `${phone.slice(0, 3)}****${phone.slice(7)}`
}

/**
 * 格式化银行卡号（每4位空格）
 */
export function formatBankCard(cardNo: string): string {
  return cardNo.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim()
}

/**
 * 截断文本
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

/**
 * Agent类型中文映射
 */
export const agentTypeMap: Record<string, string> = {
  finance: '财务Agent',
  customer_service: '客服Agent',
  legal: '法务Agent',
  admin: '行政Agent',
}

/**
 * 状态颜色映射
 */
export const statusColorMap: Record<string, string> = {
  active: '#67c23a',
  inactive: '#909399',
  error: '#f56c6c',
  draft: '#909399',
  pending: '#e6a23c',
  approved: '#67c23a',
  rejected: '#f56c6c',
  open: '#409eff',
  in_progress: '#e6a23c',
  resolved: '#67c23a',
  closed: '#909399',
  todo: '#909399',
  done: '#67c23a',
  cancelled: '#f56c6c',
  reviewing: '#e6a23c',
  expired: '#909399',
  terminated: '#f56c6c',
  pass: '#67c23a',
  fail: '#f56c6c',
  warning: '#e6a23c',
  low: '#909399',
  medium: '#e6a23c',
  high: '#f56c6c',
  urgent: '#f56c6c',
}

/**
 * 优先级中文映射
 */
export const priorityMap: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
}
