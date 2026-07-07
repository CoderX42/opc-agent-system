export type OfficeAgentStatus = 'running' | 'waiting' | 'error' | 'idle' | 'paused' | 'completed'
export type TaskPriority = 'high' | 'medium' | 'low'
export type OfficeAgentType = 'finance' | 'service' | 'legal' | 'admin'
export type OfficeAgentLogType = 'system' | 'task' | 'tool' | 'command' | 'error'

export interface OfficeAgentLog {
  id: string
  time: string
  type: OfficeAgentLogType
  content: string
}

export interface OfficeAgent {
  id: string
  type: OfficeAgentType
  name: string
  shortName: string
  department: string
  roleDescription: string
  status: OfficeAgentStatus
  previousStatus?: OfficeAgentStatus
  currentTask: string
  progress: number
  completedToday: number
  pendingItems: number
  inputData: string[]
  outputResults: string[]
  accent: string
  roomName: string
  logs: OfficeAgentLog[]
}

export interface OfficeTask {
  id: string
  agentId: string
  name: string
  priority: TaskPriority
  status: OfficeAgentStatus
  progress: number
  updatedAt: string
  // Extended for efficiency workbench table
  assignee?: string
  duration?: string // e.g. '1h 20m' or '45m'
  businessPath?: string // e.g. '/finance/report'
}

export interface OfficeStats {
  completedToday: number
  running: number
  waiting: number
  errors: number
  savedHours: string
  savedCost: string
}
