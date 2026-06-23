import type { TagProps } from 'element-plus'
import type { OfficeAgentLogType, OfficeAgentStatus, TaskPriority } from '@/types/office'

export type OfficeAvatarStatus = 'working' | 'waiting' | 'error' | 'idle' | 'offline'

export const OFFICE_STATUS_LABEL: Record<OfficeAgentStatus, string> = {
  running: '运行中',
  waiting: '等待确认',
  error: '异常',
  idle: '空闲',
  paused: '已暂停',
  completed: '已完成',
}

export const OFFICE_STATUS_SHORT_LABEL: Record<OfficeAgentStatus, string> = {
  ...OFFICE_STATUS_LABEL,
  waiting: '待确认',
}

export const OFFICE_STATUS_META: Record<OfficeAgentStatus, string> = {
  running: '正在处理任务 · 上次心跳刚刚',
  waiting: '等待人工确认 · 已停留 02:14',
  error: '异常中断 · 需要立即介入',
  idle: '空闲待命 · 随时接受任务',
  paused: '已被人工暂停',
  completed: '今日工作已收尾',
}

export const OFFICE_STATUS_COLOR: Record<OfficeAgentStatus, string> = {
  running: '#4B8FCB',
  waiting: '#D9A441',
  error: '#D66B52',
  idle: '#4F8F68',
  paused: '#89918C',
  completed: '#26372F',
}

export const OFFICE_AVATAR_STATUS: Record<OfficeAgentStatus, OfficeAvatarStatus> = {
  running: 'working',
  waiting: 'waiting',
  error: 'error',
  idle: 'idle',
  paused: 'offline',
  completed: 'idle',
}

export const OFFICE_STATUS_TAG_TYPE: Record<OfficeAgentStatus, TagProps['type']> = {
  running: 'primary',
  waiting: 'warning',
  error: 'danger',
  idle: 'success',
  paused: 'info',
  completed: 'success',
}

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
}

export const TASK_PRIORITY_TAG_TYPE: Record<TaskPriority, TagProps['type']> = {
  high: 'danger',
  medium: 'warning',
  low: 'info',
}

export const OFFICE_LOG_TYPE_LABEL: Record<OfficeAgentLogType, string> = {
  system: '系统',
  task: '任务',
  tool: '工具',
  command: '指令',
  error: '异常',
}
