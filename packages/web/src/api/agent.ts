import { get, post, put, del } from './request'
import type { Agent, ApiResponse, PaginatedResult, PaginationParams } from '@/types'

export type AgentChatType = 'FINANCE' | 'CUSTOMER_SERVICE' | 'LEGAL' | 'ADMIN'

/** 获取Agent列表 */
export function getAgentList(params?: PaginationParams) {
  return get<ApiResponse<PaginatedResult<Agent>>>('/agents', { params })
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
