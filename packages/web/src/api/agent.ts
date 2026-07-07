import { get, post, put, del } from './request'
import type { Agent, AgentModelConfig, AgentProviderPreset, ApiResponse, PaginatedResult, PaginationParams } from '@/types'

export type AgentChatType = 'FINANCE' | 'CUSTOMER_SERVICE' | 'LEGAL' | 'ADMIN'

/** 获取Agent列表 */
export function getAgentList(params?: PaginationParams) {
  return get<ApiResponse<PaginatedResult<Agent>>>('/agents', { params })
}

/** 获取当前在线的 Agent 列表（办公区顶部使用） */
export function getActiveAgents() {
  return get<ApiResponse<Agent[]>>('/agents/active')
}

/** 获取可配置的四类默认 Agent */
export function getConfigurableAgents() {
  return get<ApiResponse<Agent[]>>('/agents/configurable')
}

/** 获取大模型服务商预设 */
export function getAgentModelPresets() {
  return get<ApiResponse<AgentProviderPreset[]>>('/agents/model-presets')
}

/** 获取Agent详情 */
export function getAgentDetail(id: string) {
  return get<ApiResponse<Agent>>(`/agents/${id}`)
}

/** 创建Agent */
export function createAgent(data: Partial<Agent>) {
  return post<ApiResponse<Agent>>('/agents', data)
}

/** 更新Agent */
export function updateAgent(id: string, data: Partial<Agent>) {
  return put<ApiResponse<Agent>>(`/agents/${id}`, data)
}

/** 更新 Agent 大模型接入配置 */
export function updateAgentModelConfig(id: string, data: AgentModelConfig) {
  return put<ApiResponse<Agent>>(`/agents/${id}/model-config`, data)
}

/** 测试 AI 模型连接（不入库，按入参配置直接探测） */
export function testAgentConnection(data: {
  provider: string
  model: string
  apiKey?: string
  baseUrl?: string
  maxTokens?: number
  temperature?: number
}) {
  return post<ApiResponse<{
    ok: boolean
    latencyMs: number
    reply?: string
    error?: string
    provider: string
    model: string
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
    tokensPerSec?: number
  }>>('/agents/test-connection', data)
}

/** 删除Agent */
export function deleteAgent(id: string) {
  return del<ApiResponse<null>>(`/agents/${id}`)
}

/** 启动Agent */
export function startAgent(id: string) {
  return post<ApiResponse<Agent>>(`/agents/${id}/start`)
}

/** 停止Agent */
export function stopAgent(id: string) {
  return post<ApiResponse<Agent>>(`/agents/${id}/stop`)
}

/** 与Agent对话 */
export function chatWithAgent(id: string, message: string) {
  return post<ApiResponse<{ reply: string }>>(`/agents/${id}/chat`, { message })
}

/** 按业务类型与Agent对话 */
export function chatWithAgentType(type: AgentChatType, message: string) {
  return post<ApiResponse<{ reply: string }>>(`/agents/type/${type}/chat`, { message })
}
