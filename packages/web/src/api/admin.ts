import { get, post, put, del } from './request'
import type { Task, Schedule, MeetingMinutes, ApiResponse, PaginatedResult, PaginationParams } from '@/types'

/** ==================== 任务管理 ==================== */

/** 获取任务列表 */
export function getTaskList(params?: PaginationParams & { status?: string; priority?: string }) {
  return get<ApiResponse<PaginatedResult<Task>>>('/admin/tasks', { params })
}

/** 获取任务详情 */
export function getTaskDetail(id: string) {
  return get<ApiResponse<Task>>(`/admin/tasks/${id}`)
}

/** 创建任务 */
export function createTask(data: Partial<Task>) {
  return post<ApiResponse<Task>>('/admin/tasks', data)
}

/** 更新任务 */
export function updateTask(id: string, data: Partial<Task>) {
  return put<ApiResponse<Task>>(`/admin/tasks/${id}`, data)
}

/** 删除任务 */
export function deleteTask(id: string) {
  return del<ApiResponse<null>>(`/admin/tasks/${id}`)
}

/** 更新任务状态 */
export function updateTaskStatus(id: string, status: Task['status']) {
  return put<ApiResponse<Task>>(`/admin/tasks/${id}/status`, { status })
}

/** ==================== 日程管理 ==================== */

/** 获取日程列表 */
export function getScheduleList(params?: PaginationParams) {
  return get<ApiResponse<PaginatedResult<Schedule>>>('/admin/schedules', { params })
}

/** 创建日程 */
export function createSchedule(data: Partial<Schedule>) {
  return post<ApiResponse<Schedule>>('/admin/schedules', data)
}

/** 更新日程 */
export function updateSchedule(id: string, data: Partial<Schedule>) {
  return put<ApiResponse<Schedule>>(`/admin/schedules/${id}`, data)
}

/** 删除日程 */
export function deleteSchedule(id: string) {
  return del<ApiResponse<null>>(`/admin/schedules/${id}`)
}

/** ==================== 会议纪要 ==================== */

/** 获取会议纪要列表 */
export function getMeetingMinutesList(params?: PaginationParams) {
  return get<ApiResponse<PaginatedResult<MeetingMinutes>>>('/admin/meeting-minutes', { params })
}

/** 获取会议纪要详情 */
export function getMeetingMinutesDetail(id: string) {
  return get<ApiResponse<MeetingMinutes>>(`/admin/meeting-minutes/${id}`)
}

/** 创建会议纪要 */
export function createMeetingMinutes(data: Partial<MeetingMinutes>) {
  return post<ApiResponse<MeetingMinutes>>('/admin/meeting-minutes', data)
}

/** 更新会议纪要 */
export function updateMeetingMinutes(id: string, data: Partial<MeetingMinutes>) {
  return put<ApiResponse<MeetingMinutes>>(`/admin/meeting-minutes/${id}`, data)
}

/** 删除会议纪要 */
export function deleteMeetingMinutes(id: string) {
  return del<ApiResponse<null>>(`/admin/meeting-minutes/${id}`)
}

/** ==================== 行政概览 ==================== */

/** 获取行政概览数据 */
export function getAdminOverview() {
  return get<ApiResponse<{
    pendingTasks: number
    todaySchedules: number
    upcomingMeetings: number
    overdueTasks: number
    todoTasks: number
    inProgressTasks: number
    doneTasks: number
    weeklyTaskStats: Array<{ day: string; completed: number; created: number }>
  }>>('/admin/overview')
}
