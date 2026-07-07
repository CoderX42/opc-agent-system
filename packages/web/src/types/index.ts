/** 用户信息 */
export interface User {
  id: string
  username: string
  nickname?: string
  avatar?: string
  email: string
  phone?: string
  role: UserRole
  permissions?: string[]
  createdAt?: string
}

export type UserRole = 'ADMIN' | 'USER'

/** 登录参数 */
export interface LoginParams {
  username: string
  password: string
}

/** 登录响应 */
export interface LoginResult {
  token: string
  refreshToken: string
  user: User
}

/** Agent 信息 */
export interface Agent {
  id: string
  name: string
  type: AgentType
  status: AgentStatus
  config: AgentModelConfig
  createdAt: string
  updatedAt: string
}

export type AgentType = 'FINANCE' | 'CUSTOMER_SERVICE' | 'LEGAL' | 'ADMIN'
export type AgentStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'

export type AgentModelProvider =
  | 'deepseek'
  | 'openai'
  | 'anthropic'
  | 'minimax'
  | 'moonshot'
  | 'kimi-code'
  | 'qwen'
  | 'zhipu'
  | 'doubao'
  | 'hunyuan'
  | 'wenxin'
  | 'baichuan'
  | 'gemini'
  | 'siliconflow'
  | 'ollama'
  | 'local-openai'
  | 'custom-openai'

export interface AgentModelConfig {
  provider: AgentModelProvider
  model: string
  apiKey?: string
  baseUrl?: string
  temperature: number
  maxTokens: number
  systemPrompt?: string
  enableMemory: boolean
  enableTools: boolean
  apiKeyRequired?: boolean
}

export interface AgentProviderPreset {
  value: AgentModelProvider
  label: string
  region: 'domestic' | 'international' | 'local' | 'custom'
  protocol: 'openai-compatible' | 'anthropic' | 'ollama'
  defaultBaseUrl: string
  defaultModel: string
  apiKeyRequired: boolean
  models: Array<{ label: string; value: string }>
  description: string
}

/** 发票 */
export interface Invoice {
  id: string
  invoiceNo: string
  type: 'income' | 'expense'
  amount: number
  taxRate: number
  taxAmount: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  customerName: string
  invoiceDate: string
  date: string
  dueDate: string
  description: string
  imageUrl?: string
  attachments: string[]
  createdAt: string
  updatedAt: string
}

/** 交易记录 */
export interface Transaction {
  id: string
  type: 'INCOME' | 'EXPENSE'
  amount: number
  category: string
  account: string
  counterparty: string
  description: string
  transactionDate: string
  date: string
  attachments: string[]
  createdAt: string
}

/** 对话 */
export interface Conversation {
  id: string
  customerId: string
  customerName: string
  channel: 'WEB' | 'PHONE' | 'EMAIL' | 'WECHAT'
  status: 'ACTIVE' | 'CLOSED' | 'PENDING'
  summary: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}

/** 消息 */
export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'agent' | 'system'
  content: string
  timestamp?: string
  createdAt?: string
}

/** 工单 */
export interface Ticket {
  id: string
  title: string
  description?: string
  content: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  assignee?: string
  assignedTo?: string
  requester?: string
  tags?: string[]
  createdAt: string
  updatedAt: string
  resolvedAt?: string
}

/** 合同 */
export interface Contract {
  id: string
  title: string
  type: 'SALES' | 'PURCHASE' | 'SERVICE' | 'NDA' | 'EMPLOYMENT' | 'OTHER'
  partyA: string
  partyB: string
  amount: number
  content: string
  signDate?: string
  expiryDate?: string
  status: 'DRAFT' | 'REVIEWING' | 'APPROVED' | 'REJECTED' | 'SIGNED' | 'EXPIRED'
  reviewResult?: Record<string, unknown>
  attachments?: string[]
  createdAt: string
  updatedAt: string
}

/** 合规检查项 */
export interface ComplianceItem {
  id: string
  name?: string
  title: string
  category: string
  status: 'PASS' | 'FAIL' | 'PENDING' | 'WARNING'
  description: string
  lastChecked?: string
  dueDate?: string
}

/** 任务 */
export interface Task {
  id: string
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  assignee?: string
  assigneeId?: string
  dueDate?: string
  tags?: string[]
  createdAt: string
  updatedAt: string
}

/** 日程 */
export interface Schedule {
  id: string
  title: string
  description: string
  startTime: string
  endTime: string
  location: string
  attendees?: string[]
  type: string
  recurring?: boolean
  isAllDay: boolean
  createdAt: string
}

/** 会议纪要 */
export interface MeetingMinutes {
  id: string
  title: string
  startTime: string
  endTime?: string
  location?: string
  meetingLink?: string
  participants?: string[]
  agenda?: string
  minutes?: string
  status: string
  createdAt: string
}

export type Meeting = MeetingMinutes

/** 行动项 */
export interface ActionItem {
  id: string
  content: string
  assignee: string
  dueDate: string
  status: 'pending' | 'done'
}

/** 通用分页参数 */
export interface PaginationParams {
  page: number
  pageSize: number
}

/** 通用分页响应 */
export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

/** 通用API响应 */
export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data: T
  timestamp: string
}

/** 统计卡片数据 */
export interface StatsData {
  label: string
  value: number | string
  trend?: number
  icon?: string
  color?: string
}
