<template>
  <div class="office-dashboard" v-loading="loading">
    <div class="paper-grain" aria-hidden="true"></div>
    <div class="paper-vignette" aria-hidden="true"></div>

    <header class="dashboard-header">
      <div class="masthead-left">
        <div class="edition-stamp">
          <span class="edition-num">N°042</span>
          <span class="edition-rule"></span>
          <span class="edition-date">{{ editionDate }}</span>
        </div>
        <div class="title-block">
          <span class="page-kicker">OPC · PIXEL OFFICE · LIVE</span>
          <h1>
            数字员工<span class="title-amp">×</span>像素办公室
            <i class="title-asterisk" aria-hidden="true">✻</i>
          </h1>
          <p class="lede">四间值班室 · 二十四小时运转的<br />无纸化数字员工总部</p>
        </div>
      </div>

      <section class="stats-bar" aria-label="今日运营统计">
        <article
          v-for="(item, i) in statItems"
          :key="item.label"
          :class="item.tone"
          :title="item.note"
          :style="{ '--i': i }"
        >
          <span class="stat-label">{{ item.label }}</span>
          <strong class="stat-value">{{ item.value }}</strong>
          <em class="stat-note">{{ item.note }}</em>
          <i class="stat-bar"></i>
        </article>
      </section>

      <div class="header-clock">
        <div class="clock-meta">
          <span class="live-pill"><i></i>LIVE</span>
          <small>实时办公中</small>
        </div>
        <strong class="clock-time">{{ currentTime }}</strong>
        <div class="clock-day">{{ dayOfWeek }} · 今日 24h 运转</div>
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
        <header class="panel-titlebar">
          <div>
            <span class="kicker">2D OFFICE MAP</span>
            <h2>
              <span class="map-title-num">01</span>
              OPC 总部 · 四室一厅
              <small>SEISMIC · LIVE FEED</small>
            </h2>
          </div>
          <div class="map-legend">
            <span v-for="item in statusLegend" :key="item.status" :class="item.status">
              <i></i>{{ item.label }}
            </span>
          </div>
        </header>

        <div class="map-frame">
          <div class="map-scroll">
            <OfficeScene
              :agents="agents"
              :selected-agent-id="selectedAgentId"
              @select="store.selectAgent"
            />
          </div>
          <span class="map-corner tl"></span>
          <span class="map-corner tr"></span>
          <span class="map-corner bl"></span>
          <span class="map-corner br"></span>
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

    <el-dialog v-model="logDialogVisible" width="720px" class="office-dialog" destroy-on-close>
      <template #header>
        <div class="dialog-heading">
          <span class="kicker">RUN LOGS · FULL STREAM</span>
          <h2>
            <em>{{ selectedAgent?.name }}</em> 完整运行日志
          </h2>
          <small>{{ selectedAgent?.logs.length || 0 }} 条记录 · 按时间倒序</small>
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

    <el-dialog v-model="commandDialogVisible" width="540px" class="office-dialog" destroy-on-close>
      <template #header>
        <div class="dialog-heading">
          <span class="kicker">APPEND COMMAND</span>
          <h2>
            向 <em>{{ selectedAgent?.name }}</em> 追加指令
          </h2>
          <small>指令会立即写入前端日志，并提交到 Agent Control Room 后端</small>
        </div>
      </template>

      <div class="command-form">
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
          <span class="presets-label">快捷指令</span>
          <button v-for="preset in commandPresets" :key="preset" type="button" @click="commandText = preset">
            {{ preset }}
          </button>
        </div>
      </div>

      <template #footer>
        <el-button @click="commandDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="commandSubmitting" @click="submitCommand">
          提交指令 ↵
        </el-button>
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

const editionDate = computed(() => {
  const d = now.value
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
})

const dayOfWeek = computed(() =>
  ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.value.getDay()],
)

const currentTime = computed(() =>
  now.value.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
)

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
/* === DESIGN TOKENS === */
.office-dashboard {
  /* Editorial palette */
  --page-bg: #efe6d2;
  --page-bg-deep: #e5d8be;
  --cream: #faf3e2;
  --cream-warm: #f5ebd3;
  --ink: #1a221d;
  --forest: #1f2a24;
  --forest-soft: #2c3a32;
  --brass: #b7996e;
  --brass-deep: #8d704a;
  --rule: rgba(31, 42, 36, 0.18);
  --rule-strong: rgba(31, 42, 36, 0.42);

  /* Status */
  --s-running: #2f6f8f;
  --s-waiting: #c98a2c;
  --s-error: #b94c34;
  --s-idle: #4f8f68;
  --s-paused: #6f7a72;
  --s-completed: #1f2a24;

  /* Fonts */
  --font-display: 'Fraunces', 'STSong', 'Songti SC', 'Georgia', serif;
  --font-body: 'Bricolage Grotesque', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', 'Menlo', monospace;

  position: relative;
  min-height: calc(100vh - 72px);
  margin: -20px -22px -32px;
  padding: 22px 22px 28px;
  color: var(--ink);
  background:
    radial-gradient(ellipse at 20% 0%, rgba(183, 153, 110, 0.18) 0%, transparent 55%),
    radial-gradient(ellipse at 95% 95%, rgba(31, 42, 36, 0.08) 0%, transparent 60%),
    linear-gradient(180deg, #f1e8d4 0%, #e9debf 100%);
  font-family: var(--font-body);
  font-feature-settings: 'ss01', 'ss02', 'cv11';
  overflow: hidden;
}

/* Subtle paper grain — adds analog texture */
.paper-grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.42;
  mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.12  0 0 0 0 0.14  0 0 0 0 0.16  0 0 0 0.42 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}

.paper-vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse at center, transparent 55%, rgba(31, 42, 36, 0.12) 100%);
}

.office-dashboard > * { position: relative; z-index: 1; }

/* === KICKER (mono label) === */
.kicker {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--brass-deep);
}

/* === MASTHEAD === */
.dashboard-header {
  display: grid;
  grid-template-columns: minmax(280px, 0.85fr) minmax(620px, 1.6fr) auto;
  align-items: stretch;
  gap: 0;
  margin-bottom: 18px;
  color: var(--cream);
  border: 2px solid var(--forest);
  background:
    linear-gradient(180deg, rgba(255, 250, 234, 0.04) 0%, transparent 40%),
    repeating-linear-gradient(
      90deg,
      rgba(255, 250, 234, 0.05) 0 1px,
      transparent 1px 28px
    ),
    var(--forest);
  box-shadow:
    0 1px 0 var(--brass) inset,
    0 10px 0 -2px rgba(31, 42, 36, 0.22),
    0 22px 40px -16px rgba(31, 42, 36, 0.4);
  overflow: hidden;
  animation: header-rise 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

.masthead-left {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 20px 16px;
  border-right: 1px solid rgba(255, 250, 234, 0.14);
}

.edition-stamp {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--brass);
  letter-spacing: 0.14em;
}

.edition-num { font-weight: 700; }
.edition-rule {
  display: block;
  flex: 1;
  height: 1px;
  background:
    repeating-linear-gradient(90deg, var(--brass) 0 4px, transparent 4px 8px);
}
.edition-date { font-weight: 500; }

.title-block { position: relative; }
.title-block .page-kicker {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.22em;
  color: var(--brass);
}

.dashboard-header h1 {
  position: relative;
  display: block;
  margin: 6px 0 8px;
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 400;
  font-style: italic;
  line-height: 1.05;
  letter-spacing: -0.01em;
  color: var(--cream);
  font-variation-settings: 'opsz' 96, 'SOFT' 50, 'WONK' 0;
}

.title-amp {
  font-style: italic;
  font-weight: 300;
  color: var(--brass);
  margin: 0 4px;
}

.title-asterisk {
  position: absolute;
  top: -10px;
  right: -18px;
  font-size: 18px;
  font-style: normal;
  color: var(--brass);
  transform: rotate(15deg);
}

.lede {
  margin: 0;
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 300;
  line-height: 1.45;
  color: rgba(250, 243, 226, 0.62);
  max-width: 240px;
}

/* === STATS TICKER === */
.stats-bar {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  align-items: stretch;
  min-width: 0;
}

.stats-bar article {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 4px;
  min-width: 0;
  padding: 16px 14px 12px;
  border-right: 1px solid rgba(255, 250, 234, 0.1);
  background: transparent;
  overflow: hidden;
  animation: stat-rise 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) both;
  animation-delay: calc(120ms * var(--i, 0) + 180ms);
  cursor: default;
  transition: background 220ms ease;
}

.stats-bar article:last-child { border-right: 0; }

.stats-bar article::before {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 100%;
  height: 2px;
  background: var(--bar, var(--brass));
  transform-origin: left;
  transform: scaleX(0.18);
  transition: transform 320ms cubic-bezier(0.2, 0.7, 0.2, 1);
}

.stats-bar article:hover { background: rgba(255, 250, 234, 0.04); }
.stats-bar article:hover::before { transform: scaleX(1); }

.stats-bar .success { --bar: #6faa7b; }
.stats-bar .running { --bar: #5da2d2; }
.stats-bar .waiting { --bar: #d9a441; }
.stats-bar .error   { --bar: #d66b52; }
.stats-bar .neutral { --bar: #b7996e; }
.stats-bar .cost    { --bar: #d9a441; }

.stat-label {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(250, 243, 226, 0.56);
}

.stat-value {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 400;
  font-style: italic;
  font-variation-settings: 'opsz' 144, 'SOFT' 30;
  line-height: 1;
  color: var(--cream);
  font-variant-numeric: tabular-nums;
}

.stat-note {
  font-family: var(--font-body);
  font-size: 10px;
  font-weight: 400;
  font-style: italic;
  color: rgba(250, 243, 226, 0.52);
  letter-spacing: 0.01em;
}

.stat-bar { display: none; }

/* === CLOCK === */
.header-clock {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  min-width: 168px;
  padding: 16px 18px;
  border-left: 1px solid rgba(255, 250, 234, 0.14);
  background: linear-gradient(180deg, rgba(183, 153, 110, 0.06) 0%, transparent 100%);
}

.clock-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.live-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--forest);
  background: #8dd8a3;
  border: 1.5px solid var(--cream);
  box-shadow: 1.5px 1.5px 0 rgba(31, 42, 36, 0.32);
}

.live-pill i {
  width: 5px;
  height: 5px;
  background: var(--forest);
  border-radius: 50%;
  animation: live-pulse 1.6s ease-in-out infinite;
}

.clock-meta small {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  color: rgba(250, 243, 226, 0.5);
  text-transform: uppercase;
}

.clock-time {
  font-family: var(--font-display);
  font-size: 38px;
  font-weight: 300;
  font-style: italic;
  font-variation-settings: 'opsz' 144, 'SOFT' 0;
  line-height: 1;
  color: var(--cream);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.clock-day {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.16em;
  color: rgba(250, 243, 226, 0.5);
  text-transform: uppercase;
}

/* === ERROR ALERT === */
.error-alert { margin-bottom: 14px; }

/* === WORKSPACE === */
.workspace-grid {
  display: grid;
  grid-template-columns: minmax(720px, 1fr) minmax(320px, 360px);
  gap: 16px;
  align-items: start;
  margin-bottom: 16px;
  animation: panel-rise 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) 0.15s both;
}

.map-panel {
  position: relative;
  min-width: 0;
  padding: 16px 18px 18px;
  background: var(--cream);
  border: 2px solid var(--forest);
  box-shadow:
    0 1px 0 var(--brass) inset,
    6px 8px 0 -1px rgba(31, 42, 36, 0.16),
    12px 22px 40px -16px rgba(31, 42, 36, 0.32);
}

.panel-titlebar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--rule);
}

.panel-titlebar h2 {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px;
  margin: 4px 0 0;
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 400;
  font-style: italic;
  font-variation-settings: 'opsz' 96, 'SOFT' 30;
  letter-spacing: -0.01em;
  color: var(--forest);
}

.map-title-num {
  font-family: var(--font-mono);
  font-size: 11px;
  font-style: normal;
  font-weight: 500;
  color: var(--brass-deep);
  letter-spacing: 0.1em;
  padding: 2px 6px;
  border: 1px solid var(--brass);
  background: var(--cream-warm);
}

.panel-titlebar small {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.18em;
  color: var(--brass-deep);
  text-transform: uppercase;
}

.map-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px 10px;
}

.map-legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.1em;
  color: var(--forest-soft);
  text-transform: uppercase;
}

.map-legend i {
  width: 8px;
  height: 8px;
  background: #89918c;
  box-shadow: 1px 1px 0 var(--forest);
}

.map-legend .running i { background: #4b8fcb; }
.map-legend .waiting i { background: #d9a441; }
.map-legend .error   i { background: #d66b52; }
.map-legend .idle    i { background: #4f8f68; }
.map-legend .paused  i { background: #89918c; }

.map-frame {
  position: relative;
  padding: 6px;
  background: var(--cream-warm);
  border: 1.5px solid var(--forest);
}

.map-scroll {
  overflow-x: auto;
  padding: 4px;
}

.map-scroll::-webkit-scrollbar { height: 10px; }
.map-scroll::-webkit-scrollbar-track { background: var(--cream-warm); }
.map-scroll::-webkit-scrollbar-thumb {
  background: var(--brass);
  border: 2px solid var(--cream-warm);
}

.map-corner {
  position: absolute;
  width: 12px;
  height: 12px;
  border: 2px solid var(--forest);
  z-index: 2;
}
.map-corner.tl { top: -2px; left: -2px; border-right: 0; border-bottom: 0; }
.map-corner.tr { top: -2px; right: -2px; border-left: 0; border-bottom: 0; }
.map-corner.bl { bottom: -2px; left: -2px; border-right: 0; border-top: 0; }
.map-corner.br { bottom: -2px; right: -2px; border-left: 0; border-top: 0; }

/* === DIALOGS === */
.office-dashboard :deep(.office-dialog) {
  border: 2px solid var(--forest);
  border-radius: 0;
  background: var(--cream);
  box-shadow: 10px 12px 0 -2px rgba(31, 42, 36, 0.16), 16px 28px 60px -16px rgba(31, 42, 36, 0.42);
  overflow: hidden;
}

.office-dashboard :deep(.office-dialog .el-dialog__header) {
  margin: 0;
  padding: 18px 22px 14px;
  border-bottom: 1.5px solid var(--forest);
  background: var(--cream-warm);
}

.office-dashboard :deep(.office-dialog .el-dialog__body) { padding: 20px 22px; }
.office-dashboard :deep(.office-dialog .el-dialog__footer) {
  padding: 14px 22px;
  border-top: 1px solid var(--rule);
  background: var(--cream-warm);
}

.dialog-heading { position: relative; }
.dialog-heading .kicker { display: block; margin-bottom: 6px; }
.dialog-heading h2 {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 400;
  font-style: italic;
  font-variation-settings: 'opsz' 96;
  letter-spacing: -0.01em;
  color: var(--forest);
}
.dialog-heading h2 em {
  font-style: italic;
  color: var(--brass-deep);
  font-weight: 500;
}
.dialog-heading small {
  display: block;
  margin-top: 6px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.16em;
  color: var(--brass-deep);
  text-transform: uppercase;
}

.full-log-list { max-height: 480px; overflow-y: auto; padding-right: 6px; }
.full-log-list::-webkit-scrollbar { width: 6px; }
.full-log-list::-webkit-scrollbar-thumb { background: var(--brass); }

.full-log-row {
  display: grid;
  grid-template-columns: 56px 64px 1fr;
  gap: 12px;
  align-items: start;
  padding: 10px 0;
  border-bottom: 1px solid var(--rule);
}
.full-log-row time {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--brass-deep);
  letter-spacing: 0.04em;
  padding-top: 2px;
}
.full-log-row p { margin: 0; color: #445049; font-size: 12px; line-height: 1.5; }
.full-log-row.log-error p { color: var(--s-error); }

.command-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
  align-items: center;
}
.presets-label {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.16em;
  color: var(--brass-deep);
  text-transform: uppercase;
  margin-right: 4px;
}
.command-presets button {
  padding: 5px 9px;
  color: var(--forest);
  border: 1px solid var(--forest);
  background: var(--cream-warm);
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 160ms ease;
}
.command-presets button:hover {
  color: var(--cream);
  background: var(--forest);
  transform: translateY(-1px);
}

/* === ANIMATIONS === */
@keyframes live-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.8); }
}
@keyframes header-rise {
  0% { opacity: 0; transform: translateY(-12px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes stat-rise {
  0% { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes panel-rise {
  0% { opacity: 0; transform: translateY(14px); }
  100% { opacity: 1; transform: translateY(0); }
}

/* === RESPONSIVE === */
@media (max-width: 1480px) {
  .dashboard-header { grid-template-columns: minmax(260px, 1fr) minmax(540px, 1.6fr); }
  .header-clock { display: none; }
  .stats-bar { grid-template-columns: repeat(3, 1fr); }
  .stats-bar article { border-bottom: 1px solid rgba(255, 250, 234, 0.1); }
}

@media (max-width: 1120px) {
  .workspace-grid { grid-template-columns: 1fr; }
  .map-scroll { overflow-x: auto; }
  :deep(.agent-detail) { min-height: 600px; }
}

@media (max-width: 760px) {
  .office-dashboard { margin: -18px -18px -28px; padding: 14px; }
  .dashboard-header { grid-template-columns: 1fr; }
  .masthead-left { border-right: 0; border-bottom: 1px solid rgba(255, 250, 234, 0.14); }
  .dashboard-header h1 { font-size: 26px; }
  .stats-bar { grid-template-columns: repeat(2, 1fr); }
  .panel-titlebar { flex-direction: column; align-items: flex-start; gap: 10px; }
  .map-legend { justify-content: flex-start; }
}
</style>
