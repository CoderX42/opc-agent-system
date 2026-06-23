import { initialAgents, initialTasks } from '@/views/office/data/mockOffice'
import type { OfficeAgent, OfficeStats, OfficeTask } from '@/types/office'

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

export async function getOfficeState(): Promise<OfficeStateResponse> {
  await new Promise((resolve) => window.setTimeout(resolve, 240))
  return {
    agents: structuredClone(initialAgents),
    tasks: structuredClone(initialTasks),
    stats: mockOfficeStats,
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
