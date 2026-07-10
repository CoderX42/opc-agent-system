import { computed, ref, shallowRef, toValue, watch, type MaybeRef, type Ref } from 'vue'
import { chatWithAgent, chatWithAgentType, type AgentChatType } from '@/api/agent'
import { executeAgentTask } from '@/api/agent-runtime'
import type { ConversationMessage, ConversationRunSummary, ConversationStatus } from '../domain/chat'

interface SessionState {
  messages: Ref<ConversationMessage[]>
  draft: Ref<string>
  status: Ref<ConversationStatus>
  run: Ref<ConversationRunSummary | null>
  requestVersion: number
}

const sessions = new Map<string, SessionState>()

function clock() {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function newId() {
  return crypto.randomUUID()
}

function createSession(title: string): SessionState {
  return {
    messages: ref([
      {
        id: newId(),
        role: 'system',
        createdAt: clock(),
        state: 'completed',
        blocks: [{ type: 'markdown', text: `已连接 ${title}。描述目标、补充上下文，或从下方建议开始。` }],
      },
    ]),
    draft: ref(''),
    status: ref('idle'),
    run: ref(null),
    requestVersion: 0,
  }
}

function sessionFor(key: string, title: string) {
  const existing = sessions.get(key)
  if (existing) return existing
  const session = createSession(title)
  sessions.set(key, session)
  return session
}

export function useAgentConversation(options: {
  sessionId: MaybeRef<string>
  title: MaybeRef<string>
  type: MaybeRef<AgentChatType>
  agentId?: MaybeRef<string | undefined>
  runtimeEnabled?: MaybeRef<boolean>
}) {
  const sessionKey = computed(() => toValue(options.sessionId))
  const active = shallowRef(sessionFor(sessionKey.value, toValue(options.title)))

  watch(sessionKey, (nextKey) => {
    active.value = sessionFor(nextKey, toValue(options.title))
  })

  const messages = computed(() => active.value.messages.value)
  const draft = computed({
    get: () => active.value.draft.value,
    set: (value: string) => { active.value.draft.value = value },
  })
  const status = computed(() => active.value.status.value)
  const run = computed(() => active.value.run.value)

  async function send(raw: string) {
    const content = raw.trim()
    const session = active.value
    if (!content || session.status.value === 'responding') return

    session.messages.value.push({
      id: newId(),
      role: 'user',
      createdAt: clock(),
      state: 'completed',
      blocks: [{ type: 'markdown', text: content }],
    })
    session.draft.value = ''
    session.status.value = 'responding'
    const requestVersion = ++session.requestVersion

    try {
      const runtimeEnabled = toValue(options.runtimeEnabled) ?? true
      const agentId = options.agentId ? toValue(options.agentId) : undefined
      const type = toValue(options.type)
      if (runtimeEnabled) {
        const response = await executeAgentTask({
            agentId,
            agentType: agentId ? undefined : type,
            taskType: 'agent_workspace_v2',
            message: content,
            sessionId: sessionKey.value,
          })
        if (session.requestVersion !== requestVersion) return
        const result = response.data
        const tools = result.toolResults.map((item) => ({
          name: item.tool,
          output: typeof item.output === 'string' ? item.output : undefined,
        }))
        const references = result.references
        session.run.value = {
          taskId: result.task.id,
          status: result.task.status,
          tools,
          references,
          reply: result.reply,
        }
        session.messages.value.push({
          id: newId(),
          role: 'assistant',
          createdAt: clock(),
          state: 'completed',
          blocks: [
            { type: 'markdown', text: result.reply || '这次没有生成有效回复，请稍后再试。' },
            { type: 'run', taskId: result.task.id, status: result.task.status, tools: tools.length, references: references.length },
            ...tools.map((tool) => ({ type: 'tool-call' as const, name: tool.name, state: 'completed' as const, output: tool.output })),
            ...(references.length ? [{ type: 'citations' as const, items: references }] : []),
          ],
        })
      } else {
        const response = agentId
          ? await chatWithAgent(agentId, content)
          : await chatWithAgentType(type, content)
        if (session.requestVersion !== requestVersion) return
        session.messages.value.push({
          id: newId(),
          role: 'assistant',
          createdAt: clock(),
          state: 'completed',
          blocks: [{ type: 'markdown', text: response.data.reply || '这次没有生成有效回复，请稍后再试。' }],
        })
      }
      session.status.value = 'idle'
    } catch (error: any) {
      if (session.requestVersion !== requestVersion) return
      const apiMessage = error?.response?.data?.message
      const message = Array.isArray(apiMessage)
        ? apiMessage.join('；')
        : apiMessage || error?.message || '服务暂时不可用，请稍后重试。'
      session.messages.value.push({
        id: newId(),
        role: 'assistant',
        createdAt: clock(),
        state: 'failed',
        blocks: [{ type: 'error', message, retryable: true }],
      })
      session.status.value = 'failed'
    }
  }

  function cancel() {
    const session = active.value
    if (session.status.value !== 'responding') return
    session.requestVersion += 1
    session.status.value = 'cancelled'
    session.messages.value.push({
      id: newId(),
      role: 'system',
      createdAt: clock(),
      state: 'cancelled',
      blocks: [{ type: 'markdown', text: '已停止等待本次回复。同步任务仍可能在服务端完成。' }],
    })
  }

  function retry() {
    const lastUser = [...active.value.messages.value].reverse().find((message) => message.role === 'user')
    if (lastUser) {
      const block = lastUser.blocks.find((item) => item.type === 'markdown')
      if (block?.type === 'markdown') void send(block.text)
    }
  }

  function reset() {
    const next = createSession(toValue(options.title))
    sessions.set(sessionKey.value, next)
    active.value = next
  }

  return { messages, draft, status, run, send, cancel, retry, reset }
}
