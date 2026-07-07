<template>
  <div class="workbench-office" v-loading="loading">
    <!-- 工具栏：搜索 · 状态筛选 · 视图[列表|看板|地图] -->
    <OfficeToolbar
      :search-term="searchTerm"
      :active-filters="activeFilters"
      :view-mode="viewMode"
      :status-legend="statusLegend"
      @update:searchTerm="searchTerm = $event"
      @update:activeFilters="activeFilters = $event"
      @update:viewMode="viewMode = $event"
      @focus-issue="focusFirstIssue"
      @refresh="store.retryInitialize"
    />

    <el-alert
      v-if="error"
      class="theater-error"
      :title="error"
      type="error"
      show-icon
      :closable="false"
    >
      <template #default>
        <el-button size="small" @click="store.retryInitialize">重新加载</el-button>
      </template>
    </el-alert>

    <!-- 主区域：左侧 Agent 区（列表/看板/地图） + 右侧常驻 Copilot -->
    <div class="main-split">
      <div class="agent-area">
        <!-- 列表视图 -->
        <AgentList
          v-if="viewMode === 'list'"
          :agents="filteredAgents"
          :selected-agent-id="selectedAgentId"
          @select="selectAndFocus"
          @toggle-pause="handleQuickPause"
          @append-command="handleQuickCommand"
        />

        <!-- 看板视图（默认推荐） -->
        <AgentKanban
          v-else-if="viewMode === 'kanban'"
          :agents="filteredAgents"
          :selected-agent-id="selectedAgentId"
          @select="selectAndFocus"
          @toggle-pause="handleQuickPause"
          @append-command="handleQuickCommand"
          @view-logs="openLogs"
          @open-copilot="openCopilotForAgent"
          @move-agent="handleMoveAgent"
        />

        <!-- 地图视图（彩蛋） -->
        <OfficeMapViewport
          v-else
          :focus-agent-id="selectedAgent?.id ?? ''"
          :overlay-open="false"
          :pan-enabled="true"
          compact
          style="height: 100%; min-height: 420px;"
          class="glass-card"
        >
          <OfficeScene
            :agents="filteredAgents"
            :selected-agent-id="selectedAgentId"
            :highlight-status="null"
            :dimmed-agent-ids="[]"
            @select="selectAndFocus"
          />
        </OfficeMapViewport>
      </div>

      <!-- 右侧常驻：Copilot 对话 + 日志流（复用 AgentAssistantPanel） -->
      <div class="copilot-area">
        <OfficeCopilotPanel
          :agents="agents"
          :selected-agent-id="selectedAgentId"
          @select-agent="selectAndFocus"
          @view-full-logs="logDialogVisible = true"
        />
      </div>
    </div>

    <!-- 底部：可排序任务表格 + 批量操作 + 跳转业务详情 -->
    <div class="task-dock">
      <TaskTable
        :tasks="filteredTasks"
        :agents="agents"
        :selected-agent-id="selectedAgentId"
        @select="selectAndFocus"
        @bulk-action="handleBulkAction"
        @update-task="handleQuickTaskUpdate"
      />
    </div>

    <!-- 保留原有对话/日志/指令浮层（必要时使用） -->
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
import AgentList from './components/AgentList.vue'
import AgentKanban from './components/AgentKanban.vue'
import OfficeCopilotPanel from './components/OfficeCopilotPanel.vue'
import OfficeCommandDialog from './components/OfficeCommandDialog.vue'
import OfficeLogDialog from './components/OfficeLogDialog.vue'
import OfficeMapViewport from './components/OfficeMapViewport.vue'
import OfficeScene from './components/OfficeScene.vue'
import OfficeToolbar from './components/OfficeToolbar.vue'
import TaskTable from './components/TaskTable.vue'
import { useAgentOfficeStore } from '@/stores/agentOffice'
import type { OfficeAgent, OfficeAgentStatus } from '@/types/office'
import './styles/office.scss'

const store = useAgentOfficeStore()
const route = useRoute()
const router = useRouter()

const {
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
} = storeToRefs(store)

const viewMode = ref<'list' | 'kanban' | 'map'>('kanban')
const searchTerm = ref('')
const activeFilters = ref<OfficeAgentStatus[]>([])
const logDialogVisible = ref(false)
const commandDialogVisible = ref(false)

const statusLegend: Array<{ status: OfficeAgentStatus; label: string }> = [
  { status: 'running', label: '运行中' },
  { status: 'waiting', label: '待确认' },
  { status: 'error', label: '异常' },
  { status: 'paused', label: '已暂停' },
]

const filteredAgents = computed(() => {
  let res = agents.value
  const q = searchTerm.value.trim().toLowerCase()
  if (q) {
    res = res.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.currentTask.toLowerCase().includes(q) ||
      a.shortName.toLowerCase().includes(q)
    )
  }
  if (activeFilters.value.length) {
    res = res.filter(a => activeFilters.value.includes(a.status))
  }
  return res
})

const filteredTasks = computed(() => {
  let res = sortedTasks.value.length ? sortedTasks.value : tasks.value
  const q = searchTerm.value.trim().toLowerCase()
  if (q) {
    res = res.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.assignee || '').toLowerCase().includes(q)
    )
  }
  return res
})

function selectAndFocus(agentId: string) {
  store.selectAgent(agentId)
}

async function handleQuickPause(agentId: string) {
  await store.togglePause(agentId)
  ElMessage.success('状态已切换')
}

function handleQuickCommand(agentId: string) {
  store.selectAgent(agentId)
  commandDialogVisible.value = true
}

function openLogs(agentId?: string) {
  if (agentId) store.selectAgent(agentId)
  logDialogVisible.value = true
}

function openCopilotForAgent(agentId: string) {
  store.selectAgent(agentId)
  // The right panel is already the copilot; selection will sync via watch if implemented
  ElMessage.success('已在右侧 Copilot 面板激活对应 Agent')
}

function focusFirstIssue() {
  const issue = agents.value.find((agent) => agent.status === 'error')
    || agents.value.find((agent) => agent.status === 'waiting')
  if (issue) {
    selectAndFocus(issue.id)
  } else {
    ElMessage.info('当前没有需要优先处理的异常或待确认项')
  }
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
    ElMessage.error(error.value || '指令提交失败')
  }
}

async function handleBulkAction(action: 'pause' | 'resume' | 'rerun' | 'complete', ids?: string[]) {
  if (ids && ids.length) {
    store.setSelectedTasks(ids)
  }
  await store.bulkAction(action)
  ElMessage.success('批量操作已执行')
}

async function handleQuickTaskUpdate(taskId: string, status: OfficeAgentStatus) {
  await store.setTaskStatus(taskId, status)
}

function handleMoveAgent(agentId: string, targetStatus: OfficeAgentStatus) {
  // For demo: just set status via store (will call api in real)
  const agent = agents.value.find(a => a.id === agentId)
  if (!agent) return
  agent.status = targetStatus
  ElMessage.info(`Agent 状态调整为 ${targetStatus}（演示）`)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
  if (event.key.toLowerCase() === 'e') {
    focusFirstIssue()
  }
}

onMounted(() => {
  void store.initialize()
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  store.stopRealtime()
})

watch(() => route.params.agentType, (t) => {
  if (t && typeof t === 'string') {
    const match = agents.value.find(a => a.type === t)
    if (match) store.selectAgent(match.id)
  }
}, { immediate: true })
</script>