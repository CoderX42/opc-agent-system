import { get, post, put, del } from './request'
import type { Invoice, Transaction, ApiResponse, PaginatedResult, PaginationParams } from '@/types'

/** ==================== 发票管理 ==================== */

/** 获取发票列表 */
export function getInvoiceList(params?: PaginationParams & { type?: string; status?: string; startDate?: string; endDate?: string }) {
  return get<ApiResponse<PaginatedResult<Invoice>>>('/finance/invoices', { params })
}

/** 获取发票详情 */
export function getInvoiceDetail(id: string) {
  return get<ApiResponse<Invoice>>(`/finance/invoices/${id}`)
}

/** 创建发票 */
export function createInvoice(data: Partial<Invoice>) {
  return post<ApiResponse<Invoice>>('/finance/invoices', data)
}

/** 识别发票图片 */
export function recognizeInvoiceImage(filename: string) {
  return post<ApiResponse<{
    text: string
    fields: Partial<Invoice> & { taxAmount?: number }
  }>>('/finance/invoices/ocr', { filename })
}

/** 更新发票 */
export function updateInvoice(id: string, data: Partial<Invoice>) {
  return put<ApiResponse<Invoice>>(`/finance/invoices/${id}`, data)
}

/** 删除发票 */
export function deleteInvoice(id: string) {
  return del<ApiResponse<null>>(`/finance/invoices/${id}`)
}

/** 审批发票 */
export function approveInvoice(id: string, approved: boolean, reason?: string) {
  return post<ApiResponse<Invoice>>(`/finance/invoices/${id}/approve`, { approved, reason })
}

/** ==================== 记账管理 ==================== */

/** 获取交易记录列表 */
export function getTransactionList(params?: PaginationParams & { type?: string; category?: string }) {
  return get<ApiResponse<PaginatedResult<Transaction>>>('/finance/transactions', { params })
}

/** 创建交易记录 */
export function createTransaction(data: Partial<Transaction>) {
  return post<ApiResponse<Transaction>>('/finance/transactions', data)
}

/** 更新交易记录 */
export function updateTransaction(id: string, data: Partial<Transaction>) {
  return put<ApiResponse<Transaction>>(`/finance/transactions/${id}`, data)
}

/** 删除交易记录 */
export function deleteTransaction(id: string) {
  return del<ApiResponse<null>>(`/finance/transactions/${id}`)
}

/** ==================== 财务报表 ==================== */

/** 获取财务概览数据 */
export function getFinanceOverview() {
  return get<ApiResponse<{
    totalIncome: number
    totalExpense: number
    netProfit: number
    pendingInvoices: number
    monthlyTrend: Array<{ month: string; income: number; expense: number }>
    categoryDistribution: Array<{ category: string; amount: number }>
  }>>('/finance/overview')
}

/** 导出财务报表 */
export function exportFinanceReport(params: { startDate: string; endDate: string; format?: string }) {
  return post<ApiResponse<{ filename: string; count: number; downloadUrl: string }>>('/finance/report/export', params)
}
