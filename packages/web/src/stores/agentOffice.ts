import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createOfficeEventSource,
  getOfficeState,
  parseOfficeStateEvent,
  pauseAgent,
  resumeAgent,
  rerunAgent,
  appendAgentCommand,
  updateTaskStatus,
  bulkUpdateTasks,
} from '@/api/office'
import { initialAgents, initialTasks, nowTime } from '@/views/office/data/mockOffice'
import type { OfficeAgentLog, OfficeStats, OfficeAgentStatus } from '@/types/office'

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

  // For efficiency workbench task table
  const selectedTaskIds = ref<string[]>([])
  const taskSort = ref<{ prop: string; order: 'ascending' | 'descending' | null }>({ prop: 'updatedAt', order: 'descending' })

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
      await appendAgentCommand(agentId, command)
      // refresh local state from latest if needed; optimistic update
      agent.currentTask = command
      agent.status = 'running'
      if (agent.progress >= 100) agent.progress = 5
      // sync matching task
      const t = tasks.value.find((x) => x.agentId === agentId)
      if (t) { t.name = command; t.status = 'running'; t.progress = agent.progress; t.updatedAt = nowTime() }
    } catch (e: any) {
      error.value = '指令提交失败'
      throw e
    } finally {
      commandSubmitting.value = false
    }
  }

  async function togglePause(agentId: string) {
    const agent = agents.value.find((item) => item.id === agentId)
    if (!agent) return

    const wasPaused = agent.status === 'paused'
    try {
      if (wasPaused) {
        await resumeAgent(agentId)
        agent.status = agent.previousStatus && agent.previousStatus !== 'paused' ? agent.previousStatus : 'running'
        agent.previousStatus = undefined
        addLog(agentId, 'system', '任务已继续运行')
      } else {
        await pauseAgent(agentId)
        agent.previousStatus = agent.status
        agent.status = 'paused'
        addLog(agentId, 'system', '任务已暂停')
      }
    } catch {
      // local only fallback already done in api
      if (wasPaused) {
        agent.status = agent.previousStatus && agent.previousStatus !== 'paused' ? agent.previousStatus : 'running'
        agent.previousStatus = undefined
      } else {
        agent.previousStatus = agent.status
        agent.status = 'paused'
      }
    }
  }

  async function rerun(agentId: string) {
    const agent = agents.value.find((item) => item.id === agentId)
    if (!agent) return
    try {
      await rerunAgent(agentId)
    } catch {}
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

  async function setTaskStatus(taskId: string, status: OfficeAgentStatus, progress?: number) {
    try {
      await updateTaskStatus(taskId, status, progress)
      const task = tasks.value.find(t => t.id === taskId)
      if (task) {
        task.status = status
        if (typeof progress === 'number') task.progress = progress
        task.updatedAt = nowTime()
        const agent = agents.value.find(a => a.id === task.agentId)
        if (agent) {
          agent.status = status
          if (typeof progress === 'number') agent.progress = progress
        }
      }
    } catch {}
  }

  async function bulkAction(action: 'pause' | 'resume' | 'rerun' | 'complete') {
    const ids = selectedTaskIds.value.length ? [...selectedTaskIds.value] : []
    if (!ids.length) return
    try {
      await bulkUpdateTasks(ids, action)
    } catch {}
    // optimistic apply on current
    const nowStr = nowTime()
    ids.forEach(id => {
      const task = tasks.value.find(t => t.id === id)
      if (!task) return
      const agent = agents.value.find(a => a.id === task.agentId)
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
      task.updatedAt = nowStr
    })
    selectedTaskIds.value = []
  }

  function setSelectedTasks(ids: string[]) {
    selectedTaskIds.value = ids
  }

  function setTaskSort(prop: string, order: 'ascending' | 'descending' | null) {
    taskSort.value = { prop, order }
  }

  // Compute sorted tasks (client side, for table)
  const sortedTasks = computed(() => {
    const arr = [...tasks.value]
    const { prop, order } = taskSort.value
    if (!order || !prop) return arr
    const dir = order === 'ascending' ? 1 : -1
    return arr.sort((a: any, b: any) => {
      let va = a[prop], vb = b[prop]
      if (prop === 'priority') {
        const rank: Record<string, number> = { high: 3, medium: 2, low: 1 }
        va = rank[va] ?? 0; vb = rank[vb] ?? 0
      } else if (prop === 'progress' || prop === 'updatedAt') {
        // numeric or time string fallback to string compare
      }
      if (va < vb) return -1 * dir
      if (va > vb) return 1 * dir
      return 0
    })
  })

  return {
    agents,
    tasks,
    sortedTasks,
    selectedAgentId,
    selectedAgent,
    stats,
    loading,
    error,
    commandSubmitting,
    selectedTaskIds,
    taskSort,
    initialize,
    retryInitialize,
    startRealtime,
    stopRealtime,
    selectAgent,
    appendCommand,
    togglePause,
    rerun,
    setTaskStatus,
    bulkAction,
    setSelectedTasks,
    setTaskSort,
  }
})
