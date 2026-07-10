import type { AgentTaskStatus } from '@/api/agent-runtime'

export type ConversationRole = 'user' | 'assistant' | 'system'
export type ConversationStatus = 'idle' | 'responding' | 'cancelled' | 'failed'

export type ChatBlock =
  | { type: 'markdown'; text: string }
  | { type: 'tool-call'; name: string; state: 'completed'; output?: string }
  | { type: 'citations'; items: Array<{ id: string; title: string; category: string; relevanceScore: number }> }
  | { type: 'run'; taskId: string; status: AgentTaskStatus; tools: number; references: number }
  | { type: 'error'; message: string; retryable: boolean }

export interface ConversationMessage {
  id: string
  role: ConversationRole
  createdAt: string
  state: 'completed' | 'pending' | 'cancelled' | 'failed'
  blocks: ChatBlock[]
}

export interface ConversationRunSummary {
  taskId: string
  status: AgentTaskStatus
  tools: Array<{ name: string; output?: string }>
  references: Array<{ id: string; title: string; category: string; relevanceScore: number }>
  reply: string
}
