<template>
  <div class="office-v2" v-loading="loading">
    <header class="office-header">
      <div class="office-brand">
        <RouterLink to="/dashboard" class="office-logo"><img src="/brand/opc-cloud-logo.png" alt="OPC Agent" /></RouterLink>
        <span>数字员工办公区</span>
        <small>状态快照</small>
      </div>
      <div class="office-header-actions">
        <RouterLink to="/agents/copilot" class="outline-action">完整 Copilot</RouterLink>
        <button type="button" class="primary-action" @click="openCopilot">委派任务</button>
      </div>
    </header>

    <main class="office-main">
      <section class="office-intro">
        <div>
          <p>OPERATIONS / TODAY</p>
          <h1>先处理需要你介入的工作。</h1>
          <span>任务、Agent 与业务上下文集中在同一处；聊天仅在需要时出现。</span>
        </div>
        <div class="snapshot-note">
          <span>最后同步</span>
          <strong>{{ currentTime }}</strong>
          <small>当前接口为状态快照，不显示虚假实时状态。</small>
        </div>
      </section>

      <section class="metric-strip" aria-label="办公区概览">
        <button class="metric-card is-attention" :class="{ 'is-active': activeFilter === 'attention' }" type="button" @click="activeFilter = activeFilter === 'attention' ? 'all' : 'attention'">
          <span>需要处理</span>
          <strong>{{ attentionCount }}</strong>
          <small>异常与待确认</small>
        </button>
        <button class="metric-card" :class="{ 'is-active': activeFilter === 'running' }" type="button" @click="activeFilter = activeFilter === 'running' ? 'all' : 'running'">
          <span>运行中</span>
          <strong>{{ stats.running }}</strong>
          <small>正在执行</small>
        </button>
        <button class="metric-card" :class="{ 'is-active': activeFilter === 'completed' }" type="button" @click="activeFilter = activeFilter === 'completed' ? 'all' : 'completed'">
          <span>今日完成</span>
          <strong>{{ stats.completedToday }}</strong>
          <small>已完成任务</small>
        </button>
        <div class="metric-card is-muted">
          <span>节省时间</span>
          <strong>{{ stats.savedHours }}</strong>
          <small>{{ stats.savedCost }} 估算价值</small>
        </div>
      </section>

      <section class="office-switcher" aria-label="办公区视图">
        <div class="view-tabs" role="tablist">
          <button v-for="tab in tabs" :key="tab.id" type="button" role="tab" :aria-selected="view === tab.id" :class="{ 'is-active': view === tab.id }" @click="view = tab.id">
            {{ tab.label }}
          </button>
        </div>
        <label class="task-search">
          <span class="sr-only">搜索任务或 Agent</span>
          <input v-model="query" type="search" placeholder="搜索任务、Agent 或部门" />
        </label>
      </section>

      <div class="office-layout">
        <section class="office-content">
          <template v-if="view === 'tasks'">
            <div class="task-toolbar">
              <div class="task-filters" aria-label="任务状态筛选">
                <button v-for="filter in filters" :key="filter.id" type="button" :class="{ 'is-active': activeFilter === filter.id }" @click="activeFilter = filter.id">
                  {{ filter.label }} <span>{{ filter.count }}</span>
                </button>
              </div>
              <span>{{ filteredTasks.length }} 项任务</span>
            </div>
            <div class="task-list">
              <button
                v-for="task in filteredTasks"
                :key="task.id"
                type="button"
                class="task-row"
                :class="[{ 'is-active': selectedTask?.id === task.id }, `status-${task.status}`]"
                @click="selectTask(task.id)"
              >
                <span class="task-status"><i></i>{{ statusLabel(task.status) }}</span>
                <span class="task-title">
                  <strong>{{ task.name }}</strong>
                  <small>{{ agentForTask(task.id).name }} · {{ agentForTask(task.id).department }}</small>
                </span>
                <span class="task-progress"><b :style="{ width: `${task.progress}%` }"></b><em>{{ task.progress }}%</em></span>
                <span class="task-time">{{ task.updatedAt }}</span>
              </button>
              <div v-if="!filteredTasks.length" class="empty-tasks">没有匹配的任务。调整筛选或搜索条件后重试。</div>
            </div>
          </template>

          <div v-else-if="view === 'agents'" class="agent-roster">
            <button v-for="agent in filteredAgents" :key="agent.id" type="button" class="roster-card" :style="{ '--agent-color': getAgentPresentation(agent.type).accent, '--agent-soft': getAgentPresentation(agent.type).softAccent }" @click="openAgent(agent.id)">
              <span class="roster-code">{{ getAgentPresentation(agent.type).code }}</span>
              <strong>{{ agent.shortName }}</strong>
              <small>{{ agent.department }}</small>
              <p>{{ agent.currentTask }}</p>
              <div><i :class="`dot-${agent.status}`"></i>{{ statusLabel(agent.status) }} · {{ agent.progress }}%</div>
            </button>
          </div>

          <div v-else class="office-map">
            <header><span>OFFICE MAP</span><p>这是辅助观察视图，不承载任务管理。</p></header>
            <div class="room-grid">
              <button v-for="agent in filteredAgents" :key="agent.id" type="button" class="room-card" :style="{ '--agent-color': getAgentPresentation(agent.type).accent, '--agent-soft': getAgentPresentation(agent.type).softAccent }" @click="openAgent(agent.id)">
                <span>{{ agent.roomName }}</span>
                <strong>{{ agent.shortName }}</strong>
                <small>{{ agent.currentTask }}</small>
                <em>{{ statusLabel(agent.status) }}</em>
              </button>
            </div>
          </div>
        </section>

        <aside class="task-inspector" aria-label="任务检查器">
          <template v-if="selectedTask">
            <div class="inspector-kicker">TASK INSPECTOR</div>
            <div class="inspector-status" :class="`status-${selectedTask.status}`"><i></i>{{ statusLabel(selectedTask.status) }}</div>
            <h2>{{ selectedTask.name }}</h2>
            <p class="inspector-agent">{{ selectedTaskAgent?.shortName }} · {{ selectedTaskAgent?.department }}</p>
            <div class="inspector-progress"><span><b :style="{ width: `${selectedTask.progress}%` }"></b></span><strong>{{ selectedTask.progress }}%</strong></div>

            <section class="inspector-section">
              <h3>当前 Agent</h3>
              <p>{{ selectedTaskAgent?.roleDescription || '正在处理该任务。' }}</p>
            </section>
            <section class="inspector-section">
              <h3>最近活动</h3>
              <ul class="activity-list">
                <li v-for="log in (selectedTaskAgent?.logs || []).slice(0, 4)" :key="log.id"><time>{{ log.time }}</time><span>{{ log.content }}</span></li>
                <li v-if="!(selectedTaskAgent?.logs || []).length" class="muted">暂无活动记录。</li>
              </ul>
            </section>
            <div class="inspector-actions">
              <button class="secondary-action" type="button" @click="handlePause">{{ selectedAgent?.status === 'paused' ? '继续任务' : '暂停任务' }}</button>
              <button class="secondary-action" type="button" @click="handleRerun">重新执行</button>
              <button class="primary-action" type="button" @click="openCopilot">与 Copilot 讨论</button>
            </div>
          </template>
          <div v-else class="inspector-placeholder">选择一项任务，查看它的状态、活动和可执行操作。</div>
        </aside>
      </div>
    </main>

    <el-drawer v-model="copilotOpen" title="上下文 Copilot" direction="rtl" size="min(540px, 100vw)" class="office-chat-drawer">
      <div class="drawer-chat-shell">
        <div class="drawer-context">
          <div>
            <span>当前上下文</span>
            <strong>{{ selectedTask?.name || '新任务委派' }}</strong>
          </div>
          <AgentModelSettings :agent-type="chatAgent.type" />
        </div>
        <AgentChatWorkspace
          v-model="chatDraft"
          variant="embedded"
          :agent="chatAgent"
          :messages="chatMessages"
          :status="chatStatus"
          :context-label="selectedTask ? `任务 ${selectedTask.id}` : '新任务'"
          @send="sendChat"
          @cancel="cancelChat"
          @retry="retryChat"
        />
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import AgentChatWorkspace from '@/features/agent-workspace/components/AgentChatWorkspace.vue'
import AgentModelSettings from '@/features/agent-workspace/components/AgentModelSettings.vue'
import { getAgentPresentation, toAgentChatType } from '@/features/agent-workspace/domain/agentCatalog'
import { useAgentConversation } from '@/features/agent-workspace/composables/useAgentConversation'
import { useAgentOfficeStore } from '@/stores/agentOffice'
import type { OfficeAgentStatus } from '@/types/office'

type View = 'tasks' | 'agents' | 'map'
type Filter = 'all' | 'attention' | 'running' | 'completed'

const store = useAgentOfficeStore()
const { agents, tasks, stats, loading, error, selectedAgent } = storeToRefs(store)
const view = ref<View>('tasks')
const activeFilter = ref<Filter>('attention')
const query = ref('')
const selectedTaskId = ref('')
const copilotOpen = ref(false)
const now = ref(new Date())
let timer: number | undefined

const tabs: Array<{ id: View; label: string }> = [
  { id: 'tasks', label: '任务中心' },
  { id: 'agents', label: '数字员工' },
  { id: 'map', label: '办公室地图' },
]
const currentTime = computed(() => now.value.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))
const attentionCount = computed(() => tasks.value.filter((task) => task.status === 'error' || task.status === 'waiting').length)
const filters = computed(() => [
  { id: 'all' as Filter, label: '全部', count: tasks.value.length },
  { id: 'attention' as Filter, label: '需要处理', count: attentionCount.value },
  { id: 'running' as Filter, label: '运行中', count: tasks.value.filter((task) => task.status === 'running').length },
  { id: 'completed' as Filter, label: '已完成', count: tasks.value.filter((task) => task.status === 'completed').length },
])
const filteredTasks = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  const statusRank: Record<OfficeAgentStatus, number> = { error: 0, waiting: 1, running: 2, paused: 3, idle: 4, completed: 5 }
  return tasks.value
    .filter((task) => {
      if (activeFilter.value === 'attention' && !['error', 'waiting'].includes(task.status)) return false
      if (activeFilter.value === 'running' && task.status !== 'running') return false
      if (activeFilter.value === 'completed' && task.status !== 'completed') return false
      if (!keyword) return true
      const agent = agents.value.find((item) => item.id === task.agentId)
      return [task.name, agent?.name, agent?.shortName, agent?.department].filter(Boolean).some((value) => String(value).toLowerCase().includes(keyword))
    })
    .sort((a, b) => statusRank[a.status] - statusRank[b.status])
})
const filteredAgents = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  if (!keyword) return agents.value
  return agents.value.filter((agent) => [agent.name, agent.shortName, agent.department, agent.currentTask].some((value) => value.toLowerCase().includes(keyword)))
})
const selectedTask = computed(() => tasks.value.find((task) => task.id === selectedTaskId.value) || filteredTasks.value[0])
const selectedTaskAgent = computed(() => selectedTask.value ? agentForTask(selectedTask.value.id) : selectedAgent.value)
const chatAgent = computed(() => getAgentPresentation(selectedTaskAgent.value?.type || 'FINANCE'))
const chatSessionId = computed(() => `office-v2-${chatAgent.value.officeType}`)
const { messages: chatMessages, draft: chatDraft, status: chatStatus, send: sendChat, cancel: cancelChat, retry: retryChat } = useAgentConversation({
  sessionId: chatSessionId,
  title: computed(() => chatAgent.value.name),
  type: computed(() => chatAgent.value.type),
})

function agentForTask(taskId: string) {
  const task = tasks.value.find((item) => item.id === taskId)
  return agents.value.find((agent) => agent.id === task?.agentId) || agents.value[0]
}

function statusLabel(status: OfficeAgentStatus) {
  const labels: Record<OfficeAgentStatus, string> = { running: '运行中', waiting: '待确认', error: '异常', idle: '空闲', paused: '已暂停', completed: '已完成' }
  return labels[status]
}

function selectTask(id: string) {
  selectedTaskId.value = id
  const agent = agentForTask(id)
  if (agent) store.selectAgent(agent.id)
}

function openAgent(id: string) {
  store.selectAgent(id)
  const task = tasks.value.find((item) => item.agentId === id)
  if (task) selectedTaskId.value = task.id
  copilotOpen.value = true
}

function openCopilot() {
  if (selectedTask.value) selectTask(selectedTask.value.id)
  copilotOpen.value = true
}

function handlePause() {
  if (selectedTaskAgent.value) void store.togglePause(selectedTaskAgent.value.id)
}

function handleRerun() {
  if (selectedTaskAgent.value) void store.rerun(selectedTaskAgent.value.id)
}

watch(filteredTasks, (items) => {
  if (!items.some((item) => item.id === selectedTaskId.value)) {
    selectedTaskId.value = items[0]?.id || ''
    if (items[0]) store.selectAgent(agentForTask(items[0].id).id)
  }
}, { immediate: true })

onMounted(() => {
  void store.initialize()
  timer = window.setInterval(() => { now.value = new Date() }, 30_000)
})
onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
  store.stopRealtime()
})
</script>

<style scoped lang="scss">
.office-v2 { --ink:#17201c; --muted:#68736d; --line:#d8ded9; --canvas:#f4f5f1; --primary:#c7462b; min-height:100dvh; color:var(--ink); background:var(--canvas); font-family:'IBM Plex Sans','Noto Sans SC','PingFang SC',sans-serif; }
.office-header { display:flex; align-items:center; justify-content:space-between; gap:20px; min-height:68px; padding:0 28px; border-bottom:1px solid var(--line); background:#fff; }
.office-brand { display:flex; align-items:center; gap:10px; min-width:0; }
.office-brand a { color:var(--ink); text-decoration:none; font:700 15px/1 'IBM Plex Mono',monospace; }
.office-brand > span { font-size:14px; font-weight:700; }
.office-brand small { padding:4px 7px; color:var(--muted); border:1px solid var(--line); border-radius:999px; font:600 10px/1 'IBM Plex Mono',monospace; letter-spacing:.05em; }
.office-header-actions { display:flex; gap:8px; }
.outline-action, .primary-action, .secondary-action { display:inline-flex; align-items:center; justify-content:center; min-height:38px; padding:0 12px; border-radius:6px; cursor:pointer; font:650 13px/1 'IBM Plex Sans','Noto Sans SC',sans-serif; text-decoration:none; }
.outline-action, .secondary-action { color:var(--ink); border:1px solid var(--line); background:#fff; }
.primary-action { color:#fff; border:1px solid var(--primary); background:var(--primary); }
.office-main { max-width:1520px; margin:0 auto; padding:28px; }
.office-intro { display:flex; align-items:end; justify-content:space-between; gap:28px; margin-bottom:24px; }
.office-intro p, .snapshot-note span, .inspector-kicker { margin:0 0 8px; color:var(--muted); font:700 10px/1 'IBM Plex Mono',monospace; letter-spacing:.12em; text-transform:uppercase; }
.office-intro h1 { margin:0; font-size:clamp(28px,4vw,44px); line-height:1.04; letter-spacing:-.045em; }
.office-intro > div > span { display:block; max-width:600px; margin-top:10px; color:var(--muted); font-size:14px; line-height:1.6; }
.snapshot-note { min-width:170px; padding:14px; border-left:2px solid var(--ink); background:#fff; }
.snapshot-note strong { display:block; font:700 22px/1 'IBM Plex Mono',monospace; letter-spacing:-.06em; }
.snapshot-note small { display:block; margin-top:8px; color:var(--muted); font-size:11px; line-height:1.45; }
.metric-strip { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-bottom:22px; }
.metric-card { display:grid; gap:6px; min-height:112px; padding:15px; color:var(--ink); border:1px solid var(--line); border-radius:10px; background:#fff; text-align:left; }
button.metric-card { cursor:pointer; }
.metric-card span { color:var(--muted); font:700 10px/1 'IBM Plex Mono',monospace; letter-spacing:.1em; text-transform:uppercase; }
.metric-card strong { font-size:28px; line-height:1; letter-spacing:-.05em; }
.metric-card small { color:var(--muted); font-size:12px; }
.metric-card.is-attention { border-top:3px solid #c7462b; }
.metric-card.is-active { border-color:var(--ink); box-shadow:inset 0 0 0 1px var(--ink); }
.metric-card.is-muted { background:#edf0ec; }
.office-switcher { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:12px; }
.view-tabs { display:flex; gap:4px; padding:3px; border:1px solid var(--line); border-radius:8px; background:#fff; }
.view-tabs button { min-height:34px; padding:0 11px; color:var(--muted); border:0; border-radius:5px; background:transparent; cursor:pointer; font:650 12px/1 'IBM Plex Sans','Noto Sans SC',sans-serif; }
.view-tabs button.is-active { color:#fff; background:var(--ink); }
.task-search input { width:min(290px,48vw); min-height:38px; padding:0 12px; color:var(--ink); border:1px solid var(--line); border-radius:7px; background:#fff; font:13px/1 'IBM Plex Sans','Noto Sans SC',sans-serif; outline:none; }
.task-search input:focus { border-color:var(--ink); box-shadow:0 0 0 3px rgb(23 32 28 / .1); }
.office-layout { display:grid; grid-template-columns:minmax(0,1fr) 310px; gap:14px; min-height:620px; }
.office-content, .task-inspector { min-width:0; border:1px solid var(--line); border-radius:12px; background:#fff; }
.office-content { padding:14px; }
.task-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:0 0 14px; color:var(--muted); font-size:12px; }
.task-filters { display:flex; flex-wrap:wrap; gap:6px; }
.task-filters button { min-height:32px; padding:0 9px; color:var(--muted); border:1px solid var(--line); border-radius:999px; background:#fff; cursor:pointer; font:600 11px/1 'IBM Plex Sans','Noto Sans SC',sans-serif; }
.task-filters button span { margin-left:3px; font-family:'IBM Plex Mono',monospace; }
.task-filters button.is-active { color:#fff; border-color:var(--ink); background:var(--ink); }
.task-list { display:grid; gap:6px; }
.task-row { display:grid; grid-template-columns:92px minmax(0,1fr) minmax(92px,160px) 48px; gap:14px; align-items:center; width:100%; min-height:76px; padding:12px; color:var(--ink); border:1px solid transparent; border-radius:8px; background:#fff; cursor:pointer; text-align:left; }
.task-row:hover { background:#f6f7f4; }
.task-row.is-active { border-color:var(--ink); background:#f3f5f1; }
.task-status { display:inline-flex; align-items:center; gap:6px; color:var(--muted); font:650 10px/1 'IBM Plex Mono',monospace; white-space:nowrap; }
.task-status i, .inspector-status i { width:7px; height:7px; border-radius:50%; background:#98a29b; }
.status-running .task-status i, .status-running.inspector-status i { background:#2d6bb3; }
.status-error .task-status i, .status-error.inspector-status i { background:#b9382e; }
.status-waiting .task-status i, .status-waiting.inspector-status i { background:#bd7b19; }
.status-completed .task-status i, .status-completed.inspector-status i { background:#287a58; }
.task-title { display:grid; min-width:0; gap:5px; }
.task-title strong { overflow:hidden; font-size:14px; text-overflow:ellipsis; white-space:nowrap; }
.task-title small { color:var(--muted); font-size:11px; }
.task-progress { display:flex; align-items:center; gap:7px; }
.task-progress b, .inspector-progress span { display:block; flex:1; height:5px; overflow:hidden; border-radius:999px; background:#e4e8e4; }
.task-progress b::before, .inspector-progress b { content:''; display:block; width:inherit; height:100%; border-radius:inherit; background:var(--ink); }
.task-progress b { position:relative; overflow:hidden; background:var(--ink); }
.task-progress em, .task-time { color:var(--muted); font:600 10px/1 'IBM Plex Mono',monospace; font-style:normal; }
.task-time { text-align:right; }
.empty-tasks { padding:36px 14px; color:var(--muted); text-align:center; font-size:13px; }
.task-inspector { padding:18px; }
.inspector-status { display:inline-flex; align-items:center; gap:7px; padding:6px 8px; margin:10px 0 14px; color:var(--muted); border:1px solid var(--line); border-radius:999px; font-size:12px; font-weight:650; }
.task-inspector h2 { margin:0; font-size:20px; line-height:1.25; letter-spacing:-.025em; }
.inspector-agent { margin:7px 0 16px; color:var(--muted); font-size:12px; }
.inspector-progress { display:flex; align-items:center; gap:8px; padding-bottom:18px; border-bottom:1px solid var(--line); }
.inspector-progress span { height:7px; }
.inspector-progress span b { background:var(--primary); }
.inspector-progress strong { font:700 11px/1 'IBM Plex Mono',monospace; }
.inspector-section { padding:17px 0; border-bottom:1px solid var(--line); }
.inspector-section h3 { margin:0 0 8px; font-size:12px; }
.inspector-section p { margin:0; color:var(--muted); font-size:12px; line-height:1.55; }
.activity-list { display:grid; gap:9px; margin:0; padding:0; list-style:none; }
.activity-list li { display:grid; grid-template-columns:40px minmax(0,1fr); gap:7px; color:var(--muted); font-size:11px; line-height:1.45; }
.activity-list time { font-family:'IBM Plex Mono',monospace; font-size:10px; }
.activity-list .muted { display:block; }
.inspector-actions { display:grid; gap:8px; margin-top:18px; }
.inspector-actions .primary-action, .inspector-actions .secondary-action { width:100%; }
.inspector-placeholder { margin-top:150px; color:var(--muted); font-size:13px; line-height:1.6; text-align:center; }
.agent-roster { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
.roster-card { display:grid; gap:7px; min-height:190px; padding:16px; color:var(--ink); border:1px solid var(--line); border-radius:9px; background:var(--agent-soft); cursor:pointer; text-align:left; }
.roster-card:hover { border-color:var(--agent-color); }
.roster-code { color:var(--agent-color); font:700 10px/1 'IBM Plex Mono',monospace; letter-spacing:.08em; }
.roster-card strong { font-size:20px; letter-spacing:-.03em; }
.roster-card small, .roster-card p, .roster-card div { color:var(--muted); font-size:12px; }
.roster-card p { min-height:36px; margin:2px 0; line-height:1.5; }
.roster-card div { align-self:end; font:600 10px/1 'IBM Plex Mono',monospace; }
.roster-card i { display:inline-block; width:7px; height:7px; margin-right:6px; border-radius:50%; background:var(--agent-color); }
.office-map header { display:flex; align-items:baseline; justify-content:space-between; gap:12px; padding:4px 0 18px; border-bottom:1px solid var(--line); }
.office-map header span { font:700 10px/1 'IBM Plex Mono',monospace; letter-spacing:.12em; color:var(--muted); }
.office-map header p { margin:0; color:var(--muted); font-size:12px; }
.room-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; padding-top:14px; }
.room-card { display:grid; gap:10px; min-height:190px; padding:16px; color:var(--ink); border:1px solid var(--line); border-top:5px solid var(--agent-color); border-radius:8px; background:var(--agent-soft); cursor:pointer; text-align:left; }
.room-card span { color:var(--muted); font:700 10px/1 'IBM Plex Mono',monospace; letter-spacing:.09em; }
.room-card strong { font-size:22px; letter-spacing:-.035em; }
.room-card small { color:var(--muted); font-size:13px; line-height:1.5; }
.room-card em { align-self:end; color:var(--agent-color); font:650 11px/1 'IBM Plex Mono',monospace; font-style:normal; }
.drawer-chat-shell { display:flex; flex-direction:column; gap:12px; height:calc(100dvh - 105px); min-height:0; }
.drawer-context { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.drawer-context > div { display:grid; gap:4px; min-width:0; }
.drawer-context span { color:var(--muted); font:700 10px/1 'IBM Plex Mono',monospace; letter-spacing:.1em; text-transform:uppercase; }
.drawer-context strong { overflow:hidden; font-size:13px; text-overflow:ellipsis; white-space:nowrap; }
.drawer-chat-shell :deep(.agent-chat-workspace) { flex:1 1 auto; min-height:0; }
.sr-only { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; }
@media (max-width:1050px) { .office-layout { grid-template-columns:1fr; } .task-inspector { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; } .task-inspector h2, .inspector-kicker, .inspector-status, .inspector-agent, .inspector-progress { grid-column:1; } .inspector-section { padding:0; border:0; } .inspector-actions { margin:0; align-content:start; } }
@media (max-width:720px) { .office-header { min-height:60px; padding:0 14px; } .office-brand > span, .office-brand small, .outline-action { display:none; } .office-main { padding:18px 14px; } .office-intro { display:block; } .office-intro h1 { font-size:32px; } .snapshot-note { margin-top:18px; } .metric-strip { grid-template-columns:repeat(2,minmax(0,1fr)); } .metric-card { min-height:98px; } .office-switcher { align-items:stretch; flex-direction:column; } .task-search input { width:100%; } .office-layout { min-height:0; } .task-row { grid-template-columns:78px minmax(0,1fr) 42px; gap:9px; } .task-progress { display:none; } .task-time { grid-column:3; grid-row:1; } .task-inspector { display:block; } .task-inspector > * + * { margin-top:16px; } .inspector-section { padding:16px 0; border-bottom:1px solid var(--line); } .agent-roster, .room-grid { grid-template-columns:1fr; } .drawer-chat-shell { height:calc(100dvh - 98px); } .drawer-context :deep(.model-health) { max-width:120px; } }
@media (prefers-reduced-motion:reduce) { .office-v2 *, .office-v2 *::before, .office-v2 *::after { transition:none!important; animation:none!important; } }

/* Liquid Glass visual layer for the standalone operations workspace. */
.office-v2 { --ink:#092d68; --muted:#496f9f; --line:rgb(151 202 242 / .45); --canvas:transparent; --primary:#0866f7; background:transparent; font-family:var(--font-body); }
.office-header { min-height:78px; padding:0 26px; border:1px solid rgb(255 255 255 / .76); border-radius:0 0 24px 24px; background:rgb(255 255 255 / .52); box-shadow:0 8px 24px rgb(27 102 179 / .08); backdrop-filter:blur(28px) saturate(150%); }
.office-brand { gap:10px; }
.office-logo { display:grid; width:38px; height:38px; overflow:hidden; border:1px solid rgb(255 255 255 / .86); border-radius:13px; background:#fff; box-shadow:0 6px 16px rgb(0 107 216 / .16); }
.office-logo img { width:100%; height:100%; object-fit:cover; object-position:50% 46%; transform:scale(1.18); }
.office-brand > span { letter-spacing:-.02em; }.office-brand small { border-color:rgb(255 255 255 / .7); background:rgb(255 255 255 / .43); }
.office-main { max-width:1600px; padding:30px; }
.office-intro { padding:26px 28px; border:1px solid rgb(255 255 255 / .76); border-radius:28px; background:linear-gradient(130deg, rgb(5 83 224 / .94), rgb(0 154 242 / .84) 65%, rgb(0 201 235 / .7)); box-shadow:0 20px 54px rgb(0 102 208 / .2), inset 0 1px 0 rgb(255 255 255 / .4); color:#fff; }
.office-intro p, .snapshot-note span, .inspector-kicker { color:rgb(224 248 255 / .76); }.office-intro h1 { color:#fff; }.office-intro > div > span { color:rgb(238 252 255 / .8); }
.snapshot-note { padding:16px; border:1px solid rgb(255 255 255 / .26); border-left:0; border-radius:16px; background:rgb(255 255 255 / .12); backdrop-filter:blur(12px); }.snapshot-note strong, .snapshot-note small { color:#fff; }
.metric-card, .office-content, .task-inspector { border-color:rgb(255 255 255 / .76); background:linear-gradient(145deg, rgb(255 255 255 / .75), rgb(230 245 255 / .46)); box-shadow:$shadow-soft; backdrop-filter:blur(22px) saturate(145%); }
.metric-card { border-radius:20px; transition:transform .2s ease, box-shadow .2s ease; }.metric-card:hover { transform:translateY(-2px); box-shadow:$shadow-md; }.metric-card.is-attention { border-top:1px solid rgb(255 255 255 / .76); box-shadow:inset 0 3px 0 #087fff, $shadow-sm; }.metric-card.is-active { border-color:rgb(0 138 246 / .5); box-shadow:0 0 0 3px rgb(0 138 246 / .12), $shadow-sm; }.metric-card.is-muted { background:rgb(255 255 255 / .42); }
.view-tabs { padding:4px; border-color:rgb(255 255 255 / .78); border-radius:14px; background:rgb(255 255 255 / .48); box-shadow:$shadow-sm; backdrop-filter:blur(18px); }.view-tabs button { border-radius:10px; }.view-tabs button.is-active { background:linear-gradient(135deg, #0755e5, #0789fa, #00c6e7); box-shadow:0 6px 13px rgb(0 105 237 / .18); }
.task-search input { border-color:rgb(255 255 255 / .82); border-radius:14px; background:rgb(255 255 255 / .58); box-shadow:inset 0 1px 0 #fff; backdrop-filter:blur(14px); }.task-search input:focus { border-color:rgb(0 137 246 / .7); box-shadow:0 0 0 4px rgb(0 137 246 / .12); }
.office-content, .task-inspector { border-radius:24px; }.task-row { border-color:rgb(255 255 255 / .46); border-radius:16px; background:rgb(255 255 255 / .4); transition:background .18s ease, transform .18s ease, box-shadow .18s ease; }.task-row:hover { background:rgb(255 255 255 / .7); transform:translateY(-1px); }.task-row.is-active { border-color:rgb(0 137 246 / .34); background:linear-gradient(135deg, rgb(220 244 255 / .78), rgb(255 255 255 / .56)); box-shadow:0 8px 18px rgb(0 103 205 / .09); }
.task-filters button { border-color:rgb(255 255 255 / .76); background:rgb(255 255 255 / .5); }.task-filters button.is-active { border-color:transparent; background:linear-gradient(135deg, #0755e5, #00bde6); }
.roster-card, .room-card { border-color:rgb(255 255 255 / .76); border-radius:20px; background:linear-gradient(145deg, rgb(255 255 255 / .72), rgb(228 245 255 / .43)); box-shadow:$shadow-sm; backdrop-filter:blur(18px); }.inspector-section { border-bottom-color:rgb(var(--line) / .42); }
.office-chat-drawer :deep(.el-drawer__body) { padding:16px; }
@media (max-width:760px) { .office-header { padding:0 16px; border-radius:0; }.office-main { padding:16px; }.office-intro { padding:20px; align-items:flex-start; flex-direction:column; } }
</style>
