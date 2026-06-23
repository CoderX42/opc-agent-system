<template>
  <div class="office-dashboard" v-loading="loading">
    <div class="office-atmosphere" aria-hidden="true"></div>
    <div class="office-noise" aria-hidden="true"></div>

    <el-alert
      v-if="error"
      class="error-alert"
      :title="error"
      type="error"
      show-icon
      :closable="false"
    >
      <template #default>
        <el-button size="small" @click="store.retryInitialize">重新加载</el-button>
      </template>
    </el-alert>

    <section class="office-overview" aria-label="办公区总览">
      <article v-for="(item, index) in statItems" :key="item.label" :class="['overview-card', item.tone]" :style="{ '--i': index }">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <em>{{ item.note }}</em>
      </article>
    </section>

    <main class="office-workspace">
      <section class="floor-card" :class="{ 'is-focus-mode': Boolean(focusedAgent) }">
        <OfficeFocusMode
          v-if="focusedAgent"
          :agent="focusedAgent"
          @back="exitFocusMode"
          @view-logs="logDialogVisible = true"
          @append-command="commandDialogVisible = true"
          @toggle-pause="handleTogglePause"
          @rerun="handleRerun"
        />
        <OfficeMapPanel
          v-else
          :agents="agents"
          :selected-agent-id="selectedAgentId"
          :status-legend="statusLegend"
          @focus="enterFocusMode"
        />
      </section>
    </main>

    <section class="queue-dock">
      <TaskQueue
        :tasks="tasks"
        :agents="agents"
        :selected-agent-id="selectedAgentId"
        @select="handleTaskSelect"
      />
    </section>

    <OfficeLogDialog v-model="logDialogVisible" :agent="selectedAgent" />

    <OfficeCommandDialog
      v-model="commandDialogVisible"
      :agent="selectedAgent"
      :submitting="commandSubmitting"
      @submit="submitCommand"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import OfficeCommandDialog from './components/OfficeCommandDialog.vue'
import OfficeFocusMode from './components/OfficeFocusMode.vue'
import OfficeLogDialog from './components/OfficeLogDialog.vue'
import OfficeMapPanel from './components/OfficeMapPanel.vue'
import TaskQueue from './components/TaskQueue.vue'
import { useAgentOfficeStore } from '@/stores/agentOffice'
import type { OfficeAgentStatus } from '@/types/office'
import './styles/office.scss'

const store = useAgentOfficeStore()
const route = useRoute()
const router = useRouter()
const { agents, tasks, selectedAgentId, selectedAgent, stats, loading, error, commandSubmitting } = storeToRefs(store)

const logDialogVisible = ref(false)
const commandDialogVisible = ref(false)

const statusLegend: Array<{ status: OfficeAgentStatus, label: string }> = [
  { status: 'running', label: '运行中' },
  { status: 'waiting', label: '待确认' },
  { status: 'error', label: '异常' },
  { status: 'idle', label: '空闲' },
  { status: 'paused', label: '暂停' },
]

const statItems = computed(() => [
  { label: '今日完成任务', value: stats.value.completedToday, note: '较昨日 +12%', tone: 'success' },
  { label: '运行中', value: stats.value.running, note: '任务正在执行', tone: 'running' },
  { label: '待确认', value: stats.value.waiting, note: '需要人工处理', tone: 'waiting' },
  { label: '异常', value: stats.value.errors, note: '法务任务异常', tone: 'error' },
  { label: '节省工时', value: stats.value.savedHours, note: '今日累计', tone: 'neutral' },
  { label: '本月节省成本', value: stats.value.savedCost, note: '自动化估算', tone: 'cost' },
])

const runningCount = computed(() => agents.value.filter((agent) => agent.status === 'running').length)
const waitingCount = computed(() => agents.value.filter((agent) => agent.status === 'waiting').length)
const errorCount = computed(() => agents.value.filter((agent) => agent.status === 'error').length)
const issueAgent = computed(() => agents.value.find((agent) => agent.status === 'error') ?? agents.value.find((agent) => agent.status === 'waiting'))
const focusedAgent = computed(() => {
  const agentType = typeof route.params.agentType === 'string' ? route.params.agentType : ''
  if (!agentType) return undefined
  return agents.value.find((agent) => agent.type === agentType)
})

function handleTaskSelect(agentId: string) {
  store.selectAgent(agentId)
}

function enterFocusMode(agentId: string) {
  const agent = agents.value.find((item) => item.id === agentId)
  if (!agent) return
  store.selectAgent(agent.id)
  void router.push({ name: 'Office', params: { agentType: agent.type } })
}

function exitFocusMode() {
  void router.push({ name: 'Office' })
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && focusedAgent.value) exitFocusMode()
}

function handleTogglePause() {
  if (!selectedAgent.value) return
  const wasPaused = selectedAgent.value.status === 'paused'
  store.togglePause(selectedAgent.value.id)
  ElMessage.success(wasPaused ? '任务已继续运行' : '任务已暂停')
}

function handleRerun() {
  if (!selectedAgent.value) return
  store.rerun(selectedAgent.value.id)
  ElMessage.success('任务已重新运行，进度重置为 5%')
}

async function submitCommand(rawCommand: string) {
  const command = rawCommand.trim()
  if (!command) {
    ElMessage.warning('请输入要追加的指令')
    return
  }
  if (!selectedAgent.value) return

  try {
    await store.appendCommand(selectedAgent.value.id, command)
    ElMessage.success('指令已提交')
    commandDialogVisible.value = false
  } catch {
    ElMessage.error(store.error || '指令提交失败')
  }
}

onMounted(() => {
  void store.initialize()
  window.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEscape)
  store.stopRealtime()
})

watch(focusedAgent, (agent) => {
  if (agent) store.selectAgent(agent.id)
}, { immediate: true })
</script>
