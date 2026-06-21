<template>
  <aside v-if="agent" class="agent-detail" :style="{ '--accent': agent.accent }">
    <header class="detail-header">
      <div class="detail-avatar">
        <span class="avatar-tag">LIVE</span>
        <AgentAvatar :type="agent.type" :status="avatarStatus(agent.status)" :size="60" />
        <span class="avatar-pulse" aria-hidden="true"></span>
      </div>
      <div class="detail-identity">
        <span class="dept-line">{{ agent.department }} · {{ agent.roomName }}</span>
        <h2>{{ agent.name }}</h2>
        <em class="role-line">{{ agent.roleDescription }}</em>
      </div>
    </header>

    <div class="status-strip" :class="`status-${agent.status}`">
      <span class="strip-dot"><i></i></span>
      <span class="strip-label">{{ statusLabel(agent.status) }}</span>
      <span class="strip-meta">{{ statusMeta(agent.status) }}</span>
    </div>

    <el-tabs v-model="activeTab" class="detail-tabs" stretch>
      <el-tab-pane name="overview">
        <template #label>
          <span class="tab-label"><i>01</i>概览</span>
        </template>
        <section class="current-task">
          <div class="task-card-top">
            <span class="kicker">CURRENT TASK</span>
            <strong class="task-name">{{ agent.currentTask }}</strong>
          </div>
          <div class="task-card-bottom">
            <b class="task-percent">{{ agent.progress }}%</b>
            <div class="progress-track">
              <el-progress :percentage="agent.progress" :show-text="false" :stroke-width="6" :color="progressColor(agent.status)" />
              <small>已完成 {{ agent.progress }}% · 预计 {{ etaFromProgress(agent.progress) }}</small>
            </div>
          </div>
        </section>

        <div class="detail-metrics">
          <div class="metric">
            <span class="metric-label">今日完成</span>
            <strong class="metric-value">{{ agent.completedToday }}</strong>
            <i class="metric-bar metric-bar-success"></i>
          </div>
          <div class="metric">
            <span class="metric-label">待处理</span>
            <strong class="metric-value">{{ agent.pendingItems }}</strong>
            <i class="metric-bar metric-bar-warn"></i>
          </div>
        </div>

        <p class="role-description">{{ agent.roleDescription }}</p>
      </el-tab-pane>

      <el-tab-pane name="data">
        <template #label>
          <span class="tab-label"><i>02</i>数据</span>
        </template>
        <section class="io-section">
          <div>
            <header><span class="kicker">INPUTS</span><h3>输入数据</h3></header>
            <ul><li v-for="item in agent.inputData" :key="item">{{ item }}</li></ul>
          </div>
          <div>
            <header><span class="kicker">OUTPUTS</span><h3>输出结果</h3></header>
            <ul><li v-for="item in agent.outputResults" :key="item">{{ item }}</li></ul>
          </div>
        </section>
      </el-tab-pane>

      <el-tab-pane name="logs">
        <template #label>
          <span class="tab-label"><i>03</i>日志</span>
        </template>
        <section class="recent-logs">
          <span class="kicker">RECENT ACTIVITY</span>
          <div v-for="log in agent.logs.slice(0, 5)" :key="log.id" class="log-line" :class="`log-${log.type}`">
            <time>{{ log.time }}</time>
            <p>{{ log.content }}</p>
          </div>
          <el-empty v-if="agent.logs.length === 0" description="暂无运行日志" :image-size="42" />
          <el-button v-else text type="primary" class="logs-cta" @click="$emit('view-logs')">
            查看全部日志 →
          </el-button>
        </section>
      </el-tab-pane>
    </el-tabs>

    <footer class="detail-actions">
      <el-button type="primary" @click="$emit('append-command')" class="action-primary">
        追加指令
      </el-button>
      <el-button :type="agent.status === 'paused' ? 'success' : 'warning'" @click="$emit('toggle-pause')">
        {{ agent.status === 'paused' ? '继续' : '暂停' }}
      </el-button>
      <el-button plain @click="$emit('rerun')">重跑</el-button>
      <el-button text @click="$emit('view-logs')">日志</el-button>
    </footer>
  </aside>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import AgentAvatar from './AgentAvatar.vue'
import type { OfficeAgent, OfficeAgentStatus } from '@/stores/agentOffice'

const props = defineProps<{ agent: OfficeAgent | undefined }>()
const activeTab = ref('overview')

defineEmits<{
  'view-logs': []
  'append-command': []
  'toggle-pause': []
  rerun: []
}>()

watch(() => props.agent?.id, () => { activeTab.value = 'overview' })

function statusLabel(status: OfficeAgentStatus) {
  return { running: '运行中', waiting: '待确认', error: '异常', idle: '空闲', paused: '已暂停', completed: '已完成' }[status]
}

function statusMeta(status: OfficeAgentStatus) {
  return ({
    running: '正在处理任务 · 上次心跳刚刚',
    waiting: '等待人工确认 · 已停留 02:14',
    error: '异常中断 · 需要立即介入',
    idle: '空闲待命 · 随时接受任务',
    paused: '已被人工暂停',
    completed: '今日工作已收尾',
  } as const)[status]
}

function statusTagType(status: OfficeAgentStatus) {
  return ({ running: 'primary', waiting: 'warning', error: 'danger', idle: 'success', paused: 'info', completed: 'success' } as const)[status]
}

function progressColor(status: OfficeAgentStatus) {
  return { running: '#4B8FCB', waiting: '#D9A441', error: '#D66B52', idle: '#4F8F68', paused: '#89918C', completed: '#26372F' }[status]
}

function avatarStatus(status: OfficeAgentStatus) {
  return ({ running: 'working', waiting: 'waiting', error: 'error', idle: 'idle', paused: 'offline', completed: 'idle' } as const)[status]
}

function etaFromProgress(progress: number) {
  if (progress >= 100) return '即将完成'
  if (progress <= 5) return '刚刚开始'
  const remain = Math.max(1, Math.round((100 - progress) / 8))
  return `约 ${remain} 分钟`
}
</script>

<style lang="scss" scoped>
.agent-detail {
  --accent: #4b8fcb;
  display: flex;
  flex-direction: column;
  min-width: 300px;
  height: 100%;
  max-height: 620px;
  padding: 16px 16px 14px;
  color: #1a221d;
  border: 2px solid #1f2a24;
  background: #faf3e2;
  box-shadow:
    inset 0 1px 0 #b7996e,
    6px 8px 0 -1px rgba(31, 42, 36, 0.16),
    12px 22px 40px -16px rgba(31, 42, 36, 0.32);
  position: relative;
  overflow: hidden;
}

.kicker {
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #8d704a;
}

/* === HEADER === */
.detail-header {
  display: grid;
  grid-template-columns: 76px 1fr;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(31, 42, 36, 0.18);
}

.detail-avatar {
  position: relative;
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  border: 2px solid #1f2a24;
  background: color-mix(in srgb, var(--accent) 16%, #faf3e2);
  overflow: hidden;
}

.avatar-tag {
  position: absolute;
  top: 4px;
  left: 4px;
  z-index: 2;
  padding: 1px 5px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #1f2a24;
  background: #faf3e2;
  border: 1px solid #1f2a24;
}

.avatar-pulse {
  position: absolute;
  inset: 0;
  border: 2px solid var(--accent);
  animation: avatar-pulse 2.4s ease-in-out infinite;
  pointer-events: none;
}

@keyframes avatar-pulse {
  0%, 100% { opacity: 0; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.05); }
}

.detail-identity { min-width: 0; }

.dept-line {
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #8d704a;
}

.detail-header h2 {
  display: block;
  margin: 2px 0 4px;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 22px;
  font-weight: 500;
  font-style: italic;
  font-variation-settings: 'opsz' 96, 'SOFT' 30;
  line-height: 1.05;
  letter-spacing: -0.01em;
  color: #1f2a24;
}

.role-line {
  display: block;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 11px;
  font-style: italic;
  font-weight: 300;
  line-height: 1.35;
  color: rgba(31, 42, 36, 0.6);
}

/* === STATUS STRIP === */
.status-strip {
  display: grid;
  grid-template-columns: auto auto 1fr;
  align-items: center;
  gap: 8px;
  margin: 12px 0 10px;
  padding: 7px 10px 7px 9px;
  border: 1.5px solid currentColor;
  background: color-mix(in srgb, currentColor 8%, #faf3e2);
}

.status-strip .strip-dot {
  display: grid;
  place-items: center;
  width: 14px;
  height: 14px;
  border: 1.5px solid currentColor;
  background: currentColor;
}

.status-strip .strip-dot i {
  width: 6px;
  height: 6px;
  background: #faf3e2;
  border-radius: 50%;
}

.status-strip .strip-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.status-strip .strip-meta {
  text-align: right;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 10px;
  font-style: italic;
  color: rgba(31, 42, 36, 0.6);
  letter-spacing: 0.01em;
}

.status-running { color: #4b8fcb; }
.status-waiting { color: #c98a2c; }
.status-error { color: #b94c34; }
.status-idle { color: #4f8f68; }
.status-paused { color: #6f7a72; }
.status-completed { color: #1f2a24; }

.status-running .strip-dot i,
.status-error .strip-dot i { animation: strip-blink 1s steps(2, jump-none) infinite; }

@keyframes strip-blink { 50% { opacity: 0.35; } }

/* === TABS === */
.detail-tabs { flex: 1; min-height: 0; margin-top: 2px; }
.detail-tabs :deep(.el-tabs__header) { margin-bottom: 10px; border-bottom: 1px solid rgba(31, 42, 36, 0.18); }
.detail-tabs :deep(.el-tabs__item) {
  height: 36px;
  padding: 0 4px !important;
  font-size: 12px;
  font-weight: 500;
  color: rgba(31, 42, 36, 0.5) !important;
}
.detail-tabs :deep(.el-tabs__item.is-active) { color: #1f2a24 !important; }
.detail-tabs :deep(.el-tabs__active-bar) { background-color: var(--accent); height: 2px; }
.detail-tabs :deep(.el-tabs__content) { overflow: auto; padding-right: 2px; }

.tab-label {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}
.tab-label i {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 500;
  font-style: normal;
  color: #8d704a;
  letter-spacing: 0.1em;
}

/* === CURRENT TASK === */
.current-task {
  display: grid;
  gap: 12px;
  padding: 12px 13px;
  border: 1.5px solid rgba(31, 42, 36, 0.18);
  background: #f5ebd3;
}

.task-card-top {
  display: grid;
  gap: 5px;
}
.task-name {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 14px;
  font-style: italic;
  font-weight: 500;
  line-height: 1.35;
  color: #1f2a24;
}

.task-card-bottom {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 12px;
}
.task-percent {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 22px;
  font-style: italic;
  font-weight: 500;
  font-variation-settings: 'opsz' 96;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.progress-track { display: grid; gap: 4px; min-width: 0; }
.progress-track :deep(.el-progress) { margin: 0; }
.progress-track small {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: rgba(31, 42, 36, 0.55);
}

/* === METRICS === */
.detail-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
.metric {
  position: relative;
  display: grid;
  gap: 4px;
  padding: 10px 12px 12px;
  border: 1.5px solid rgba(31, 42, 36, 0.18);
  background: #faf3e2;
  overflow: hidden;
}
.metric-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #8d704a;
}
.metric-value {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 26px;
  font-style: italic;
  font-weight: 500;
  font-variation-settings: 'opsz' 96;
  line-height: 1;
  color: #1f2a24;
  font-variant-numeric: tabular-nums;
}
.metric-bar {
  display: block;
  height: 3px;
  margin-top: 4px;
  background: var(--accent);
  transform-origin: left;
  transform: scaleX(0.5);
  transition: transform 320ms cubic-bezier(0.2, 0.7, 0.2, 1);
}
.metric:hover .metric-bar { transform: scaleX(1); }
.metric-bar-success { background: #4f8f68; transform: scaleX(0.7); }
.metric-bar-warn { background: #d9a441; transform: scaleX(0.4); }

.role-description {
  margin: 10px 0 0;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 12px;
  font-style: italic;
  font-weight: 300;
  line-height: 1.55;
  color: rgba(31, 42, 36, 0.62);
  padding-top: 10px;
  border-top: 1px solid rgba(31, 42, 36, 0.12);
}

/* === IO SECTION === */
.io-section { display: grid; gap: 10px; }
.io-section > div {
  padding: 11px 13px;
  border: 1.5px solid rgba(31, 42, 36, 0.18);
  background: #faf3e2;
}
.io-section header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
  padding-bottom: 7px;
  border-bottom: 1px dashed rgba(31, 42, 36, 0.18);
}
.io-section h3 {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 14px;
  font-style: italic;
  font-weight: 500;
  color: #1f2a24;
  margin: 0;
}
.io-section ul { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
.io-section li {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  line-height: 1.45;
  color: rgba(31, 42, 36, 0.7);
  padding-left: 14px;
  position: relative;
  letter-spacing: 0.01em;
}
.io-section li::before {
  position: absolute;
  left: 0;
  top: 6px;
  width: 6px;
  height: 2px;
  background: var(--accent);
  content: '';
}

/* === RECENT LOGS === */
.recent-logs { min-height: 0; display: grid; gap: 8px; }
.recent-logs > .kicker { display: block; }
.log-line {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 8px;
  padding: 7px 0;
  border-bottom: 1px solid rgba(31, 42, 36, 0.1);
}
.log-line time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: #8d704a;
  letter-spacing: 0.04em;
}
.log-line p {
  margin: 0;
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 11px;
  line-height: 1.45;
  color: #445049;
}
.log-error p { color: #b74f3a; }
.log-command p { color: #356f9b; }

.logs-cta {
  margin-top: 4px;
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 10px !important;
  font-weight: 500;
  letter-spacing: 0.1em;
  justify-self: start;
}

/* === ACTIONS === */
.detail-actions {
  display: grid;
  grid-template-columns: 1.4fr 1fr 0.9fr 0.7fr;
  gap: 6px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(31, 42, 36, 0.18);
}
.detail-actions :deep(.el-button) {
  min-height: 34px;
  margin: 0;
  padding-inline: 8px;
  border-radius: 0;
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.detail-actions :deep(.action-primary) {
  background: var(--accent);
  border-color: var(--accent);
  color: #faf3e2;
}
.detail-actions :deep(.action-primary:hover) {
  background: color-mix(in srgb, var(--accent) 85%, #1f2a24);
  border-color: color-mix(in srgb, var(--accent) 85%, #1f2a24);
}
</style>
