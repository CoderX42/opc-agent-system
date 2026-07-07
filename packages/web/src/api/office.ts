import { get, post } from './request'
import { initialAgents, initialTasks } from '@/views/office/data/mockOffice'
import type { OfficeAgent, OfficeStats, OfficeTask, OfficeAgentStatus } from '@/types/office'

export interface OfficeStateResponse {
  agents: OfficeAgent[]
  tasks: OfficeTask[]
  stats: OfficeStats
}

const mockOfficeStats: OfficeStats = {
  completedToday: 18,
  running: 4,
  waiting: 3,
  errors: 1,
  savedHours: '7.5h',
  savedCost: '¥3,860',
}

// ---- internal mock fallback state (only used when API fails or for local dev) ----
let mockAgents = structuredClone(initialAgents)
let mockTasks = structuredClone(initialTasks)
let mockStats = { ...mockOfficeStats }

function resetMockState() {
  mockAgents = structuredClone(initialAgents)
  mockTasks = structuredClone(initialTasks)
  mockStats = { ...mockOfficeStats }
}

function syncMockStats() {
  mockStats.running = mockAgents.filter(a => a.status === 'running').length
  mockStats.waiting = mockAgents.filter(a => a.status === 'waiting').length
  mockStats.errors = mockAgents.filter(a => a.status === 'error').length
}

export async function getOfficeState(): Promise<OfficeStateResponse> {
  try {
    // Attempt real backend first
    const res = await get<OfficeStateResponse>('/office/state')
    return res
  } catch {
    // fallback to mock
    await new Promise((resolve) => window.setTimeout(resolve, 120))
    return {
      agents: structuredClone(mockAgents),
      tasks: structuredClone(mockTasks),
      stats: { ...mockStats },
    }
  }
}

export async function pauseAgent(agentId: string): Promise<void> {
  try {
    await post(`/office/agents/${agentId}/pause`)
  } catch {
    // mock fallback
    const agent = mockAgents.find(a => a.id === agentId)
    if (agent && agent.status !== 'paused') {
      agent.previousStatus = agent.status
      agent.status = 'paused'
      syncMockStats()
    }
  }
}

export async function resumeAgent(agentId: string): Promise<void> {
  try {
    await post(`/office/agents/${agentId}/resume`)
  } catch {
    const agent = mockAgents.find(a => a.id === agentId)
    if (agent && agent.status === 'paused') {
      agent.status = agent.previousStatus || 'running'
      agent.previousStatus = undefined
      syncMockStats()
    }
  }
}

export async function rerunAgent(agentId: string): Promise<void> {
  try {
    await post(`/office/agents/${agentId}/rerun`)
  } catch {
    const agent = mockAgents.find(a => a.id === agentId)
    if (agent) {
      agent.status = 'running'
      agent.previousStatus = undefined
      agent.progress = Math.max(5, Math.min(agent.progress, 10))
      mockTasks.forEach(t => {
        if (t.agentId === agentId && t.status !== 'completed') {
          t.status = 'running'
          t.progress = Math.max(5, Math.min(t.progress, 10))
          t.updatedAt = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        }
      })
      syncMockStats()
    }
  }
}

export async function appendAgentCommand(agentId: string, command: string): Promise<void> {
  try {
    await post(`/office/agents/${agentId}/command`, { command })
  } catch {
    const agent = mockAgents.find(a => a.id === agentId)
    if (agent) {
      agent.currentTask = command
      agent.status = 'running'
      if (agent.progress >= 100) agent.progress = 5
      const task = mockTasks.find(t => t.agentId === agentId)
      if (task) {
        task.name = command
        task.status = 'running'
        task.progress = agent.progress
        task.updatedAt = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      }
      syncMockStats()
    }
  }
}

export async function updateTaskStatus(taskId: string, status: OfficeAgentStatus, progress?: number): Promise<void> {
  try {
    await post(`/office/tasks/${taskId}/status`, { status, progress })
  } catch {
    const task = mockTasks.find(t => t.id === taskId)
    if (task) {
      task.status = status
      if (typeof progress === 'number') task.progress = progress
      task.updatedAt = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      // sync agent if needed
      const agent = mockAgents.find(a => a.id === task.agentId)
      if (agent) {
        agent.status = status
        if (typeof progress === 'number') agent.progress = progress
      }
      syncMockStats()
    }
  }
}

export async function bulkUpdateTasks(taskIds: string[], action: 'pause' | 'resume' | 'rerun' | 'complete'): Promise<void> {
  try {
    await post('/office/tasks/bulk', { ids: taskIds, action })
  } catch {
    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    taskIds.forEach(id => {
      const task = mockTasks.find(t => t.id === id)
      if (!task) return
      const agent = mockAgents.find(a => a.id === task.agentId)
      if (action === 'pause') {
        if (agent) { agent.previousStatus = agent.status; agent.status = 'paused' }
        task.status = 'paused'
      } else if (action === 'resume') {
        if (agent) { agent.status = agent.previousStatus || 'running'; agent.previousStatus = undefined }
        task.status = agent?.status || 'running'
      } else if (action === 'rerun') {
        if (agent) { agent.status = 'running'; agent.progress = 5 }
        task.status = 'running'
        task.progress = 5
      } else if (action === 'complete') {
        if (agent) { agent.status = 'completed'; agent.progress = 100 }
        task.status = 'completed'
        task.progress = 100
      }
      task.updatedAt = now
    })
    syncMockStats()
  }
}

export function createOfficeEventSource(): EventSource | null {
  if (!import.meta.env.VITE_OFFICE_EVENTS_URL) return null
  return new EventSource(import.meta.env.VITE_OFFICE_EVENTS_URL)
}

export function parseOfficeStateEvent(event: Event): OfficeStateResponse | null {
  if (!(event instanceof MessageEvent) || typeof event.data !== 'string') return null
  try {
    return JSON.parse(event.data) as OfficeStateResponse
  } catch {
    return null
  }
}

// For dev/testing only
export function _resetOfficeMock() {
  resetMockState()
}
