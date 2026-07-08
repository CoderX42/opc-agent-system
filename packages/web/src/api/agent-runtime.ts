import { get, post } from './request'
import type { AgentType, ApiResponse } from '@/types'

export type AgentTaskStatus = 'WAITING' | 'PLANNING' | 'RUNNING' | 'TOOL_CALLING' | 'COMPLETED' | 'FAILED'
export type AgentMemoryType =
  | 'USER_PREFERENCE'
  | 'ENTERPRISE_INFO'
  | 'HISTORICAL_DECISION'
  | 'CUSTOMER_RELATIONSHIP'
  | 'CONVERSATION_SUMMARY'

export interface AgentRuntimeReference {
  id: string
  title: string
  category: string
  relevanceScore: number
}

export interface AgentToolResult {
  tool: string
  output: unknown
}

export interface AgentTask {
  id: string
  agentId?: string | null
  userId: string
  taskType: string
  status: AgentTaskStatus
  agentType?: AgentType | null
  input: Record<string, unknown>
  plan?: Record<string, unknown> | null
  result?: Record<string, unknown> | null
  error?: string | null
  createdAt: string
  updatedAt: string
}

export interface ExecuteAgentTaskPayload {
  agentId?: string
  agentType?: AgentType
  taskType: string
  message: string
  sessionId?: string
  metadata?: Record<string, unknown>
  tools?: string[]
}

export interface AgentExecutionResult {
  task: AgentTask
  reply: string
  agentType: AgentType | null
  toolResults: AgentToolResult[]
  references: AgentRuntimeReference[]
}

export interface SupervisorPlan {
  intent: string
  agents: AgentType[]
  steps: Array<{ agentType: AgentType; taskType: string; reason: string }>
}

export interface SupervisorPayload {
  message: string
  sessionId?: string
  metadata?: Record<string, unknown>
}

export interface SupervisorResult {
  plan: SupervisorPlan
  results: AgentExecutionResult[]
  reply: string
}

export interface UpsertAgentMemoryPayload {
  memoryType: AgentMemoryType
  agentId?: string
  scope?: string
  key: string
  content: string
  importance?: number
  metadata?: Record<string, unknown>
}

export interface AgentMemory {
  id: string
  userId: string
  agentId?: string | null
  memoryType: AgentMemoryType
  scope: string
  key: string
  content: string
  metadata?: Record<string, unknown> | null
  importance: number
  lastAccessedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface VoiceChatPayload {
  text?: string
  audioUrl?: string
  sessionId?: string
  metadata?: Record<string, unknown>
}

export interface VoiceChatResult {
  asrText: string
  reply: string
  plan: SupervisorPlan
  tts: { provider: string; audioUrl: string | null; text: string }
}

export function executeAgentTask(data: ExecuteAgentTaskPayload) {
  return post<ApiResponse<AgentExecutionResult>>('/agent-runtime/tasks', data)
}

export function getAgentTask(id: string) {
  return get<ApiResponse<AgentTask>>(`/agent-runtime/tasks/${id}`)
}

export function superviseAgentTask(data: SupervisorPayload) {
  return post<ApiResponse<SupervisorResult>>('/agent-runtime/supervise', data)
}

export function upsertAgentMemory(data: UpsertAgentMemoryPayload) {
  return post<ApiResponse<AgentMemory>>('/agent-runtime/memories', data)
}

export function voiceChat(data: VoiceChatPayload) {
  return post<ApiResponse<VoiceChatResult>>('/voice/chat', data)
}
