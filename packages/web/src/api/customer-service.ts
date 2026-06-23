import { get, post, put, del } from './request'
import type { Conversation, Ticket, Message, ApiResponse, PaginatedResult, PaginationParams } from '@/types'

/** ==================== 对话管理 ==================== */

/** 创建对话 */
export function createConversation(data: {
  channel: Conversation['channel']
  customerName: string
  summary?: string
}) {
  return post<ApiResponse<Conversation>>('/customer-service/conversations', data)
}

/** 获取对话列表 */
export function getConversationList(params?: PaginationParams & { status?: string; channel?: string }) {
  return get<ApiResponse<PaginatedResult<Conversation>>>('/customer-service/conversations', { params })
}

/** 获取对话详情 */
export function getConversationDetail(id: string) {
  return get<ApiResponse<Conversation>>(`/customer-service/conversations/${id}`)
}

/** 获取对话消息 */
export function getConversationMessages(id: string, params?: PaginationParams) {
  return get<ApiResponse<PaginatedResult<Message>>>(`/customer-service/conversations/${id}/messages`, { params })
}

/** 发送消息 */
export function sendMessage(conversationId: string, content: string) {
  return post<ApiResponse<{ userMessage: Message; reply: Message; ticket?: Ticket | null }>>(`/customer-service/conversations/${conversationId}/messages`, { content })
}

/** 从对话创建工单 */
export function createTicketFromConversation(conversationId: string, data?: Partial<Ticket>) {
  return post<ApiResponse<Ticket>>(`/customer-service/conversations/${conversationId}/ticket`, data || {})
}

/** 关闭对话 */
export function closeConversation(id: string) {
  return put<ApiResponse<Conversation>>(`/customer-service/conversations/${id}/close`)
}

/** ==================== 工单管理 ==================== */

/** 获取工单列表 */
export function getTicketList(params?: PaginationParams & { status?: string; priority?: string }) {
  return get<ApiResponse<PaginatedResult<Ticket>>>('/customer-service/tickets', { params })
}

/** 获取工单详情 */
export function getTicketDetail(id: string) {
  return get<ApiResponse<Ticket>>(`/customer-service/tickets/${id}`)
}

/** 创建工单 */
export function createTicket(data: Partial<Ticket>) {
  return post<ApiResponse<Ticket>>('/customer-service/tickets', data)
}

/** 更新工单 */
export function updateTicket(id: string, data: Partial<Ticket>) {
  return put<ApiResponse<Ticket>>(`/customer-service/tickets/${id}`, data)
}

/** 分配工单 */
export function assignTicket(id: string, assignee: string) {
  return post<ApiResponse<Ticket>>(`/customer-service/tickets/${id}/assign`, { assignee })
}

/** 解决工单 */
export function resolveTicket(id: string, resolution: string) {
  return post<ApiResponse<Ticket>>(`/customer-service/tickets/${id}/resolve`, { resolution })
}

/** 删除工单 */
export function deleteTicket(id: string) {
  return del<ApiResponse<null>>(`/customer-service/tickets/${id}`)
}

/** ==================== 客服概览 ==================== */

/** 获取客服概览数据 */
export function getCustomerServiceOverview() {
  return get<ApiResponse<{
    activeConversations: number
    pendingTickets: number
    inProgressTickets: number
    avgResponseTime: number
    satisfactionRate: number
    todayMessages: number
    resolvedToday: number
  }>>('/customer-service/overview')
}
