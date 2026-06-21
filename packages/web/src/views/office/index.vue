<template>
  <div class="office-dashboard" v-loading="loading">
    <header class="dashboard-header">
      <div class="header-title">
        <span class="page-kicker">OPC PIXEL OFFICE · LIVE</span>
        <h1>数字员工像素办公室</h1>
      </div>
      <section class="stats-bar" aria-label="今日运营统计">
        <article v-for="item in statItems" :key="item.label" :class="item.tone" :title="item.note">
          <span>{{ item.label }}</span><strong>{{ item.value }}</strong>
        </article>
      </section>
      <div class="header-clock">
        <span class="live-dot"></span>
        <div><strong>{{ currentTime }}</strong><small>实时办公中</small></div>
      </div>
    </header>

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

    <main class="workspace-grid">
      <section class="map-panel">
        <div class="panel-titlebar">
          <div>
            <span>2D OFFICE MAP</span>
            <h2>OPC 总部 · 四室一厅</h2>
          </div>
          <div class="map-legend">
            <span v-for="item in statusLegend" :key="item.status" :class="item.status"><i></i>{{ item.label }}</span>
          </div>
        </div>

        <div class="map-scroll">
          <OfficeScene
            :agents="agents"
            :selected-agent-id="selectedAgentId"
            @select="store.selectAgent"
          />
        </div>
      </section>

      <AgentDetailPanel
        :agent="selectedAgent"
        @view-logs="logDialogVisible = true"
        @append-command="commandDialogVisible = true"
        @toggle-pause="handleTogglePause"
        @rerun="handleRerun"
      />
    </main>

    <TaskQueue
      :tasks="tasks"
      :agents="agents"
      :selected-agent-id="selectedAgentId"
      @select="handleTaskSelect"
    />

    <el-dialog v-model="logDialogVisible" width="680px" class="office-dialog" destroy-on-close>
      <template #header>
        <div class="dialog-heading">
          <span>RUN LOGS</span>
          <h2>{{ selectedAgent?.name }} · 完整运行日志</h2>
        </div>
      </template>

      <div v-if="selectedAgent?.logs.length" class="full-log-list">
        <div v-for="log in selectedAgent.logs" :key="log.id" class="full-log-row" :class="`log-${log.type}`">
          <time>{{ log.time }}</time>
          <el-tag size="small" effect="plain">{{ logTypeLabel(log.type) }}</el-tag>
          <p>{{ log.content }}</p>
        </div>
      </div>
      <el-empty v-else description="暂无运行日志" />
    </el-dialog>

    <el-dialog v-model="commandDialogVisible" width="520px" class="office-dialog" destroy-on-close>
      <template #header>
        <div class="dialog-heading">
          <span>APPEND COMMAND</span>
          <h2>向 {{ selectedAgent?.name }} 追加指令</h2>
        </div>
      </template>

      <div class="command-form">
        <p>指令会立即写入前端日志，并提交到 Agent Control Room 后端。</p>
        <el-input
          v-model="commandText"
          type="textarea"
          :rows="5"
          maxlength="300"
          show-word-limit
          placeholder="例如：优先核对大额异常支出，并在完成后生成摘要。"
          @keyup.ctrl.enter="submitCommand"
        />
        <div class="command-presets">
          <button v-for="preset in commandPresets" :key="preset" type="button" @click="commandText = preset">
            {{ preset }}
          </button>
        </div>
      </div>

      <template #footer>
        <el-button @click="commandDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="commandSubmitting" @click="submitCommand">提交指令</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import OfficeScene from './components/OfficeScene.vue'
import AgentDetailPanel from './components/AgentDetailPanel.vue'
import TaskQueue from './components/TaskQueue.vue'
import { useAgentOfficeStore, type OfficeAgentLog } from '@/stores/agentOffice'

const store = useAgentOfficeStore()
const { agents, tasks, selectedAgentId, selectedAgent, stats, loading, error, commandSubmitting } = storeToRefs(store)

const now = ref(new Date())
const logDialogVisible = ref(false)
const commandDialogVisible = ref(false)
const commandText = ref('')
let clockTimer: number | null = null

const commandPresets = ['生成当前任务摘要', '标记风险并等待人工确认', '优先处理高优先级事项']

const statusLegend = [
  { status: 'running', label: '运行中' },
  { status: 'waiting', label: '待确认' },
  { status: 'error', label: '异常' },
  { status: 'idle', label: '空闲' },
  { status: 'paused', label: '暂停' },
]

const currentTime = computed(() => now.value.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))

const statItems = computed(() => [
  { label: '今日完成任务', value: stats.value.completedToday, note: '较昨日 +12%', tone: 'success' },
  { label: '运行中', value: stats.value.running, note: '任务正在执行', tone: 'running' },
  { label: '待确认', value: stats.value.waiting, note: '需要人工处理', tone: 'waiting' },
  { label: '异常', value: stats.value.errors, note: '法务任务异常', tone: 'error' },
  { label: '节省工时', value: stats.value.savedHours, note: '今日累计', tone: 'neutral' },
  { label: '本月节省成本', value: stats.value.savedCost, note: '自动化估算', tone: 'cost' },
])

function handleTaskSelect(agentId: string) {
  store.selectAgent(agentId)
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

async function submitCommand() {
  const command = commandText.value.trim()
  if (!command) {
    ElMessage.warning('请输入要追加的指令')
    return
  }
  if (!selectedAgent.value) return

  try {
    await store.appendCommand(selectedAgent.value.id, command)
    ElMessage.success('指令已提交')
    commandDialogVisible.value = false
    commandText.value = ''
  } catch {
    ElMessage.error(store.error || '指令提交失败')
  }
}

function logTypeLabel(type: OfficeAgentLog['type']) {
  return { system: '系统', task: '任务', tool: '工具', command: '指令', error: '异常' }[type]
}

onMounted(() => {
  void store.initialize()
  clockTimer = window.setInterval(() => {
    now.value = new Date()
  }, 30_000)
})

onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer)
})
</script>

<style lang="scss" scoped>
.office-dashboard {
  --page-bg: #f5efe6;
  --ink: #1f2a24;
  --forest: #26372f;
  --sand: #b7996e;
  --danger: #d66b52;
  min-height: calc(100vh - 72px);
  margin: -20px -22px -32px;
  padding: 16px;
  color: var(--ink);
  background:
    linear-gradient(rgba(183, 153, 110, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(183, 153, 110, 0.08) 1px, transparent 1px),
    var(--page-bg);
  background-size: 24px 24px;
  font-family: 'Avenir Next', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.dashboard-header {
  display: grid;
  grid-template-columns: minmax(230px, auto) minmax(560px, 1fr) auto;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
  padding: 11px 14px;
  color: #fff9f0;
  border: 3px solid var(--forest);
  background:
    linear-gradient(90deg, rgba(255, 249, 240, 0.05) 1px, transparent 1px),
    var(--forest);
  background-size: 18px 18px;
  box-shadow: 7px 8px 0 rgba(38, 55, 47, 0.16);
}

.page-kicker { color: #d9bf95; font-size: 10px; font-weight: 900; letter-spacing: 0.16em; }
.dashboard-header h1 { margin-top: 2px; font-family: Georgia, 'STSong', serif; font-size: 22px; font-weight: 900; letter-spacing: 0; white-space: nowrap; }

.header-clock { display: flex; align-items: center; gap: 11px; min-width: 150px; padding: 9px 11px; border: 2px solid rgba(255, 249, 240, 0.24); background: rgba(255, 249, 240, 0.06); }
.live-dot { width: 12px; height: 12px; background: #85c391; box-shadow: 0 0 0 3px rgba(133, 195, 145, 0.22); animation: live-pulse 1.7s ease-out infinite; }
.header-clock strong,
.header-clock small { display: block; }
.header-clock strong { font-size: 18px; font-variant-numeric: tabular-nums; }
.header-clock small { color: rgba(255, 249, 240, 0.62); font-size: 10px; }

.stats-bar { display: grid; grid-template-columns: repeat(6, minmax(76px, 1fr)); gap: 5px; min-width: 0; }
.stats-bar article { position: relative; min-width: 0; padding: 7px 8px 7px 10px; border-left: 3px solid #b7996e; background: rgba(255, 249, 240, 0.08); overflow: hidden; }
.stats-bar span,
.stats-bar strong { display: block; }
.stats-bar span { overflow: hidden; color: rgba(255, 249, 240, 0.58); font-size: 9px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.stats-bar strong { margin-top: 2px; color: #fff9f0; font-size: 16px; font-variant-numeric: tabular-nums; }
.stats-bar .success { border-left-color: #6faa7b; }
.stats-bar .running { border-left-color: #69a9db; }
.stats-bar .waiting { border-left-color: #d9a441; }
.stats-bar .error { border-left-color: #d66b52; }
.stats-bar .cost { border-left-color: #b7996e; }

.error-alert { margin-bottom: 14px; }
.workspace-grid { display: grid; grid-template-columns: minmax(720px, 1fr) minmax(300px, 340px); gap: 12px; align-items: start; margin-bottom: 12px; }
.map-panel { min-width: 0; padding: 10px; border: 3px solid var(--forest); background: #fff9f0; box-shadow: 5px 7px 0 rgba(38, 55, 47, 0.11); }
.panel-titlebar { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 8px; }
.panel-titlebar span { color: var(--sand); font-size: 9px; font-weight: 900; letter-spacing: 0.13em; }
.panel-titlebar h2 { display: inline; margin-left: 6px; font-size: 15px; }
.map-legend { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.map-legend span { display: inline-flex; align-items: center; gap: 4px; color: #6e766f; font-size: 10px; letter-spacing: 0; }
.map-legend i { width: 8px; height: 8px; background: #89918c; }
.map-legend .running i { background: #4b8fcb; }
.map-legend .waiting i { background: #d9a441; }
.map-legend .error i { background: #d66b52; }
.map-legend .idle i { background: #4f8f68; }
.map-scroll { overflow-x: auto; padding: 5px 5px 9px; }
.map-scroll::-webkit-scrollbar { height: 9px; }
.map-scroll::-webkit-scrollbar-thumb { background: var(--sand); border: 2px solid #fff9f0; }

.office-dashboard :deep(.office-dialog) { border: 3px solid #26372f; border-radius: 2px; background: #fff9f0; box-shadow: 10px 12px 0 rgba(38, 55, 47, 0.18); }
.office-dashboard :deep(.office-dialog .el-dialog__header) { margin: 0; padding: 16px 18px 12px; border-bottom: 3px solid #26372f; }
.dialog-heading span { color: #b7996e; font-size: 9px; font-weight: 900; letter-spacing: 0.14em; }
.dialog-heading h2 { margin-top: 3px; color: #1f2a24; font-size: 20px; }
.full-log-list { max-height: 480px; overflow-y: auto; }
.full-log-row { display: grid; grid-template-columns: 48px 58px 1fr; gap: 9px; align-items: start; padding: 10px 0; border-bottom: 1px solid rgba(38, 55, 47, 0.14); }
.full-log-row time { color: #6e766f; font-size: 11px; }
.full-log-row p { color: #445049; font-size: 12px; line-height: 1.5; }
.full-log-row.log-error p { color: #b34e39; }
.command-form > p { margin-bottom: 12px; color: #6e766f; font-size: 12px; line-height: 1.55; }
.command-presets { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 10px; }
.command-presets button { padding: 6px 9px; color: #445049; border: 1px solid #b7996e; background: #f5efe6; font-size: 11px; cursor: pointer; }
.command-presets button:hover { color: #fff9f0; background: #26372f; }

@keyframes live-pulse { 0%, 100% { box-shadow: 0 0 0 3px rgba(133, 195, 145, 0.22); } 60% { box-shadow: 0 0 0 8px rgba(133, 195, 145, 0); } }

@media (max-width: 1450px) {
  .dashboard-header { grid-template-columns: auto 1fr; }
  .header-clock { display: none; }
  .workspace-grid { grid-template-columns: minmax(690px, 1fr) 310px; }
}

@media (max-width: 1120px) {
  .workspace-grid { grid-template-columns: 1fr; }
  .map-scroll { overflow-x: auto; }
  .workspace-grid :deep(.agent-detail) { min-height: 600px; }
}

@media (max-width: 760px) {
  .office-dashboard { margin: -18px -18px -28px; padding: 12px; }
  .dashboard-header { align-items: flex-start; flex-direction: column; }
  .dashboard-header { display: flex; }
  .stats-bar { grid-template-columns: repeat(3, 1fr); width: 100%; }
  .panel-titlebar { align-items: flex-start; flex-direction: column; }
  .map-legend { justify-content: flex-start; }
}
</style>
