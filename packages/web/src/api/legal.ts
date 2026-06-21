import { get, post, put, del } from './request'
import type { Contract, ComplianceItem, ApiResponse, PaginatedResult, PaginationParams } from '@/types'

/** ==================== 合同管理 ==================== */

/** 获取合同列表 */
export function getContractList(params?: PaginationParams & { status?: string; type?: string }) {
  return get<ApiResponse<PaginatedResult<Contract>>>('/legal/contracts', { params })
}

/** 获取合同详情 */
export function getContractDetail(id: string) {
  return get<ApiResponse<Contract>>(`/legal/contracts/${id}`)
}

/** 创建合同 */
export function createContract(data: Partial<Contract>) {
  return post<ApiResponse<Contract>>('/legal/contracts', data)
}

/** 更新合同 */
export function updateContract(id: string, data: Partial<Contract>) {
  return put<ApiResponse<Contract>>(`/legal/contracts/${id}`, data)
}

/** 删除合同 */
export function deleteContract(id: string) {
  return del<ApiResponse<null>>(`/legal/contracts/${id}`)
}

/** 提交合同审核 */
export function submitContractForReview(id: string) {
  return post<ApiResponse<Contract>>(`/legal/contracts/${id}/submit-review`)
}

/** AI 审查合同 */
export function aiReviewContract(id: string) {
  return post<ApiResponse<Contract>>(`/legal/contracts/${id}/ai-review`)
}

/** 人工审核合同 */
export function reviewContract(id: string, approved: boolean, comment?: string) {
  return post<ApiResponse<Contract>>(`/legal/contracts/${id}/review`, { approved, comment })
}

/** ==================== 合规检查 ==================== */

/** 获取合规检查项列表 */
export function getComplianceList(params?: PaginationParams & { category?: string; status?: string }) {
  return get<ApiResponse<PaginatedResult<ComplianceItem>>>('/legal/compliance', { params })
}

/** 更新合规检查项状态 */
export function updateComplianceStatus(id: string, status: ComplianceItem['status']) {
  return put<ApiResponse<ComplianceItem>>(`/legal/compliance/${id}`, { status })
}

/** 执行合规检查 */
export function runComplianceCheck() {
  return post<ApiResponse<ComplianceItem[]>>('/legal/compliance/run-check')
}

/** ==================== 法务概览 ==================== */

/** 获取法务概览数据 */
export function getLegalOverview() {
  return get<ApiResponse<{
    activeContracts: number
    expiringContracts: number
    complianceRate: number
    pendingReviews: number
    monthlyStats: Array<{ month: string; created: number; expired: number }>
  }>>('/legal/overview')
}
