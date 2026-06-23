import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { createOfficeEventSource, getOfficeState, parseOfficeStateEvent } from '@/api/office'
import { initialAgents, initialTasks, nowTime } from '@/views/office/data/mockOffice'
import type { OfficeAgentLog, OfficeStats } from '@/types/office'

export type {
  OfficeAgent,
  OfficeAgentLog,
  OfficeAgentStatus,
  OfficeAgentType,
  OfficeTask,
  TaskPriority,
} from '@/types/office'

const fallbackStats: OfficeStats = {
  completedToday: 18,
  running: 4,
  waiting: 3,
  errors: 1,
  savedHours: '7.5h',
  savedCost: '¥3,860',
}

let officeEventSource: EventSource | null = null

export const useAgentOfficeStore = defineStore('agentOffice', () => {
  const agents = ref(structuredClone(initialAgents))
  const tasks = ref(structuredClone(initialTasks))
  const officeStats = ref<OfficeStats>(fallbackStats)
  const selectedAgentId = ref('finance-agent')
  const loading = ref(false)
  const error = ref('')
  const commandSubmitting = ref(false)

  const selectedAgent = computed(() => {
    return agents.value.find((agent) => agent.id === selectedAgentId.value) ?? agents.value[0]
  })

  const stats = computed(() => officeStats.value)

  async function initialize() {
    loading.value = true
    error.value = ''
    try {
      const state = await getOfficeState()
      applyOfficeState(state)
    } catch {
      error.value = '办公区状态加载失败，请重试。'
    } finally {
      loading.value = false
    }
    startRealtime()
  }

  function applyOfficeState(state: Awaited<ReturnType<typeof getOfficeState>>) {
    agents.value = structuredClone(state.agents)
    tasks.value = structuredClone(state.tasks)
    officeStats.value = state.stats
  }

  function startRealtime() {
    if (officeEventSource) return
    officeEventSource = createOfficeEventSource()
    if (!officeEventSource) return

    officeEventSource.addEventListener('office-state', (event) => {
      const state = parseOfficeStateEvent(event)
      if (state) applyOfficeState(state)
    })
  }

  function stopRealtime() {
    officeEventSource?.close()
    officeEventSource = null
  }

  function selectAgent(agentId: string) {
    if (agents.value.some((agent) => agent.id === agentId)) selectedAgentId.value = agentId
  }

  function addLog(agentId: string, type: OfficeAgentLog['type'], content: string) {
    const agent = agents.value.find((item) => item.id === agentId)
    if (!agent) return
    agent.logs.unshift({
      id: `log-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      time: nowTime(),
      type,
      content,
    })
  }

  async function appendCommand(agentId: string, command: string) {
    const agent = agents.value.find((item) => item.id === agentId)
    if (!agent) throw new Error('Agent 不存在')

    commandSubmitting.value = true
    error.value = ''
    addLog(agentId, 'command', `已追加指令：${command}`)
    try {
      agent.currentTask = command
      agent.status = 'running'
      if (agent.progress >= 100) agent.progress = 5
    } finally {
      commandSubmitting.value = false
    }
  }

  function togglePause(agentId: string) {
    const agent = agents.value.find((item) => item.id === agentId)
    if (!agent) return

    if (agent.status === 'paused') {
      agent.status = agent.previousStatus && agent.previousStatus !== 'paused' ? agent.previousStatus : 'running'
      agent.previousStatus = undefined
      addLog(agentId, 'system', '任务已继续运行')
      return
    }

    agent.previousStatus = agent.status
    agent.status = 'paused'
    addLog(agentId, 'system', '任务已暂停')
  }

  function rerun(agentId: string) {
    const agent = agents.value.find((item) => item.id === agentId)
    if (!agent) return
    agent.status = 'running'
    agent.previousStatus = undefined
    agent.progress = 5
    addLog(agentId, 'task', '任务已重新运行')

    tasks.value.forEach((task) => {
      if (task.agentId === agentId && task.status !== 'completed') {
        task.status = 'running'
        task.progress = 5
        task.updatedAt = nowTime()
      }
    })
  }

  function retryInitialize() {
    void initialize()
  }

  return {
    agents,
    tasks,
    selectedAgentId,
    selectedAgent,
    stats,
    loading,
    error,
    commandSubmitting,
    initialize,
    retryInitialize,
    startRealtime,
    stopRealtime,
    selectAgent,
    appendCommand,
    togglePause,
    rerun,
  }
})
