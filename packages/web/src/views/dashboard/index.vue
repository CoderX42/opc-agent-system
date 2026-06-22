<template>
  <div class="page-container dashboard-page">
    <section class="command-hero">
      <div class="hero-copy">
        <div class="hero-eyebrow"><span></span> OPC DIGITAL WORKFORCE</div>
        <h1>{{ greeting }}，今天先处理<br><em>最重要的事。</em></h1>
        <p>四位数字员工正在协同工作。当前有 {{ totalPending }} 项待处理，其中 {{ totalUrgent }} 项需要你的确认。</p>
        <div class="hero-actions">
          <el-button type="primary" size="large" icon="Plus" @click="$router.push('/admin/task')">创建新任务</el-button>
          <el-button size="large" plain icon="OfficeBuilding" @click="$router.push('/office')">进入办公区</el-button>
          <button class="text-action" type="button" @click="goTo('/admin/meeting')">查看今日简报 <span>↗</span></button>
        </div>
      </div>

      <div class="hero-radar" aria-label="Agent 运行概览">
        <div class="radar-orbit orbit-outer"></div>
        <div class="radar-orbit orbit-inner"></div>
        <div class="radar-core">
          <strong>{{ activeAgentCount }}</strong>
          <span>AGENTS ONLINE</span>
        </div>
        <div class="radar-node node-finance"><el-icon><Money /></el-icon></div>
        <div class="radar-node node-service"><el-icon><Service /></el-icon></div>
        <div class="radar-node node-legal"><el-icon><DocumentChecked /></el-icon></div>
        <div class="radar-node node-admin"><el-icon><OfficeBuilding /></el-icon></div>
        <div class="radar-caption">
          <span class="live-dot"></span>
          <span>运行稳定</span>
          <strong>99.8%</strong>
        </div>
      </div>
    </section>

    <section class="section-block agent-section">
      <div class="section-heading">
        <div>
          <span class="section-index">01</span>
          <h2>数字员工</h2>
        </div>
        <p>跨部门协同状态</p>
      </div>

      <div class="agent-grid">
        <article
          v-for="(agent, index) in agentList"
          :key="agent.name"
          class="agent-card"
          :style="{ '--agent-color': agent.color, '--delay': `${index * 60}ms` }"
          @click="goTo(agent.path)"
        >
          <div class="agent-card-top">
            <div class="agent-icon"><el-icon :size="22"><component :is="agent.icon" /></el-icon></div>
            <span class="agent-number">0{{ index + 1 }}</span>
          </div>
          <h3>{{ agent.name }}</h3>
          <p>{{ agent.description }}</p>
          <div class="agent-card-bottom">
            <span class="agent-live"><i></i>运行中</span>
            <strong>{{ agent.taskCount }} <small>待处理</small></strong>
            <el-icon><ArrowRight /></el-icon>
          </div>
        </article>
      </div>
    </section>

    <section class="stats-grid">
      <StatsCard
        v-for="stat in statsData"
        :key="stat.label"
        :label="stat.label"
        :value="stat.value"
        :icon="stat.icon"
        :color="stat.color"
      />
    </section>

    <section class="workspace-grid">
      <div class="workspace-panel todo-panel">
        <div class="panel-header">
          <div>
            <span class="panel-kicker">PRIORITY QUEUE</span>
            <h2>今日待办</h2>
          </div>
          <button type="button" class="panel-link" @click="goTo('/admin/task')">全部事项 <span>→</span></button>
        </div>

        <div v-loading="todoLoading" class="todo-list">
          <div v-for="(todo, index) in todoList" :key="todo.key" class="todo-item">
            <span class="todo-index">{{ String(index + 1).padStart(2, '0') }}</span>
            <div class="todo-main">
              <strong>{{ todo.title }}</strong>
              <span>{{ todo.source }} · {{ todo.dueDate }}</span>
            </div>
            <el-tag :type="getPriorityType(todo.priority)" effect="light" round>{{ todo.priorityText }}</el-tag>
            <button type="button" class="todo-open" aria-label="打开事项" @click="goTo(todo.path)">↗</button>
          </div>
          <el-empty v-if="!todoLoading && todoList.length === 0" description="今日无待办" :image-size="60" />
        </div>
      </div>

      <div class="side-stack">
        <div class="workspace-panel quick-panel">
          <div class="panel-header compact">
            <div>
              <span class="panel-kicker">SHORTCUTS</span>
              <h2>快速开始</h2>
            </div>
          </div>
          <div class="quick-actions">
            <button
              v-for="action in quickActions"
              :key="action.label"
              type="button"
              class="quick-action"
              @click="goTo(action.path)"
            >
              <span class="quick-icon"><el-icon><component :is="action.icon" /></el-icon></span>
              <span>{{ action.label }}</span>
              <i>↗</i>
            </button>
          </div>
        </div>

        <div class="workspace-panel activity-panel">
          <div class="panel-header compact">
            <div>
              <span class="panel-kicker">LIVE FEED</span>
              <h2>系统概览</h2>
            </div>
            <span class="live-badge"><i></i> LIVE</span>
          </div>
          <div class="activity-list">
            <div class="activity-item">
              <span class="activity-marker is-success"></span>
              <div><p>财务：{{ financeSummary.incomeThisMonth ? '¥' + formatNumber(financeSummary.incomeThisMonth) + ' 本月收入' : '暂无本月收入数据' }}</p><span>财务 Agent</span></div>
            </div>
            <div class="activity-item">
              <span class="activity-marker" :class="serviceStats.pendingTickets > 0 ? 'is-warning' : 'is-success'"></span>
              <div><p>客服：{{ serviceStats.pendingTickets || 0 }} 项待处理工单，{{ serviceStats.activeConversations || 0 }} 个进行中对话</p><span>客服 Agent</span></div>
            </div>
            <div class="activity-item">
              <span class="activity-marker is-primary"></span>
              <div><p>法务：{{ legalStats.activeContracts || 0 }} 份活跃合同，合规率 {{ legalStats.complianceRate || 0 }}%</p><span>法务 Agent</span></div>
            </div>
            <div class="activity-item">
              <span class="activity-marker" :class="adminStats.overdueTasks > 0 ? 'is-warning' : 'is-primary'"></span>
              <div><p>行政：{{ adminStats.overdueTasks || 0 }} 项逾期任务，{{ adminStats.todaySchedules || 0 }} 项今日日程</p><span>行政 Agent</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import StatsCard from '@/components/StatsCard.vue'
import { getFinanceOverview } from '@/api/finance'
import { getCustomerServiceOverview, getTicketList } from '@/api/customer-service'
import { getLegalOverview } from '@/api/legal'
import { getAdminOverview, getTaskList } from '@/api/admin'

const router = useRouter()

const todoLoading = ref(false)
const todoList = ref<any[]>([])

const serviceStats = reactive<Record<string, any>>({})
const legalStats = reactive<Record<string, any>>({})
const adminStats = reactive<Record<string, any>>({})
const financeSummary = reactive<Record<string, any>>({})

const agentList = computed(() => [
  { name: '财务 Agent', icon: 'Money', description: '发票管理、记账与经营数据洞察', path: '/finance', taskCount: financeSummary.pendingInvoices || 0, color: '#397bff' },
  { name: '客服 Agent', icon: 'Service', description: '客户对话、工单与满意度跟进', path: '/customer-service', taskCount: serviceStats.pendingTickets || 0, color: '#2f9e72' },
  { name: '法务 Agent', icon: 'DocumentChecked', description: '合同审查、风险识别与合规检查', path: '/legal', taskCount: legalStats.expiringContracts || 0, color: '#e68a3f' },
  { name: '行政 Agent', icon: 'OfficeBuilding', description: '日程、任务与会议行动项管理', path: '/admin', taskCount: adminStats.pendingTasks || 0, color: '#d95951' },
])

const activeAgentCount = computed(() => 4)

const totalPending = computed(() =>
  (serviceStats.pendingTickets || 0) + (legalStats.pendingReviews || 0) +
  (adminStats.pendingTasks || 0) + (financeSummary.pendingInvoices || 0)
)

const totalUrgent = computed(() => {
  let n = 0
  if (serviceStats.pendingTickets > 5) n++
  if (legalStats.expiringContracts > 0) n++
  if (adminStats.overdueTasks > 0) n++
  return n
})

const statsData = computed(() => [
  { label: '本月收入', value: '¥' + formatNumber(financeSummary.incomeThisMonth || 0), icon: 'TrendCharts', color: '#2f8f67' },
  { label: '待处理工单', value: serviceStats.pendingTickets ?? 0, icon: 'Ticket', color: '#397bff' },
  { label: '活跃合同', value: legalStats.activeContracts ?? 0, icon: 'Document', color: '#d9823d' },
  { label: '本月完成任务', value: adminStats.doneTasks ?? 0, icon: 'List', color: '#d95951' },
])

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '凌晨好'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const quickActions = [
  { label: '创建发票', icon: 'Plus', path: '/finance/invoice' },
  { label: '新建工单', icon: 'Tickets', path: '/customer-service/ticket' },
  { label: '新建合同', icon: 'DocumentAdd', path: '/legal/contract' },
  { label: '添加日程', icon: 'Calendar', path: '/admin/schedule' },
  { label: '财务报表', icon: 'DataAnalysis', path: '/finance/report' },
  { label: '合规检查', icon: 'CircleCheck', path: '/legal/compliance' },
]

function goTo(path: string) { router.push(path) }

function formatNumber(n: number) {
  return Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getPriorityType(priority: string) {
  const map: Record<string, 'danger' | 'warning' | 'primary' | 'info'> = {
    紧急: 'danger', 高: 'warning', 中: 'primary', 低: 'info',
    URGENT: 'danger', HIGH: 'warning', MEDIUM: 'primary', LOW: 'info',
  }
  return map[priority] || 'info'
}

async function fetchFinance() {
  try {
    const res = await getFinanceOverview()
    const data = (res.data as any) || {}
    const summary = data.summary || data
    Object.assign(financeSummary, summary)
    financeSummary.pendingInvoices = data.pendingInvoices
  } catch { /* ignore */ }
}

async function fetchService() {
  try {
    const res = await getCustomerServiceOverview()
    Object.assign(serviceStats, (res.data as any) || {})
  } catch { /* ignore */ }
}

async function fetchLegal() {
  try {
    const res = await getLegalOverview()
    Object.assign(legalStats, (res.data as any) || {})
  } catch { /* ignore */ }
}

async function fetchAdmin() {
  try {
    const res = await getAdminOverview()
    Object.assign(adminStats, (res.data as any) || {})
  } catch { /* ignore */ }
}

async function fetchTodos() {
  todoLoading.value = true
  try {
    const [tasks, tickets] = await Promise.all([
      getTaskList({ page: 1, pageSize: 5, status: 'TODO' } as any).catch(() => ({ data: { items: [] } })),
      getTicketList({ page: 1, pageSize: 3, status: 'OPEN' } as any).catch(() => ({ data: { items: [] } })),
    ])
    const taskItems = (tasks.data.items || []).map((t: any) => ({
      key: `task-${t.id}`,
      title: t.title,
      source: '行政',
      dueDate: t.dueDate ? t.dueDate.slice(0, 10) : '未设截止',
      priority: t.priority,
      priorityText: ({ HIGH: '高', MEDIUM: '中', LOW: '低' } as any)[t.priority] || t.priority,
      path: '/admin/task',
    }))
    const ticketItems = (tickets.data.items || []).map((t: any) => ({
      key: `ticket-${t.id}`,
      title: t.title,
      source: '客服',
      dueDate: t.createdAt ? t.createdAt.slice(0, 10) : '今日',
      priority: t.priority,
      priorityText: ({ URGENT: '紧急', HIGH: '高', MEDIUM: '中', LOW: '低' } as any)[t.priority] || t.priority,
      path: '/customer-service/ticket',
    }))
    todoList.value = [...ticketItems, ...taskItems].slice(0, 6)
  } finally {
    todoLoading.value = false
  }
}

onMounted(() => {
  fetchFinance()
  fetchService()
  fetchLegal()
  fetchAdmin()
  fetchTodos()
})
</script>

<style lang="scss" scoped>
.dashboard-page { padding-top: 22px; }

.command-hero {
  min-height: 300px;
  display: grid;
  grid-template-columns: 1.3fr 0.7fr;
  align-items: center;
  gap: 40px;
  padding: 36px 44px;
  overflow: hidden;
  color: #faf3e2;
  border: 2px solid $forest;
  background:
    repeating-linear-gradient(90deg, rgba(250, 243, 226, 0.04) 0 1px, transparent 1px 28px),
    $forest;
  box-shadow:
    0 1px 0 $brass inset,
    8px 10px 0 -1px rgba(31, 42, 36, 0.16),
    16px 24px 48px -16px rgba(31, 42, 36, 0.4);
}

.hero-eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(250, 243, 226, 0.52);
  span { width: 24px; height: 2px; background: $brass; }
}

.hero-copy h1 {
  max-width: 700px;
  font-family: var(--font-display);
  font-size: clamp(32px, 4vw, 52px);
  font-weight: 500;
  font-style: italic;
  font-variation-settings: 'opsz' 96, 'SOFT' 30;
  line-height: 1.08;
  letter-spacing: -0.02em;
  em { color: $brass; font-style: italic; }
}

.hero-copy > p {
  max-width: 540px;
  margin-top: 16px;
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 300;
  font-style: italic;
  line-height: 1.6;
  color: rgba(250, 243, 226, 0.6);
}

.hero-actions { display: flex; align-items: center; gap: 20px; margin-top: 22px; }
.hero-actions :deep(.el-button--primary) {
  color: $forest;
  background: $brass;
  border-color: $brass;
  border-radius: 0;
  box-shadow: 4px 4px 0 rgba(31, 42, 36, 0.2);
  font-family: var(--font-body);
  font-weight: 600;
  &:hover { 
    background: #d4b896; 
    border-color: #d4b896;
    transform: translateY(-2px);
    box-shadow: 6px 6px 0 rgba(31, 42, 36, 0.2);
  }
}
.hero-actions :deep(.el-button--large) {
  font-family: var(--font-body);
  font-weight: 600;
}

.text-action {
  color: rgba(250, 243, 226, 0.8);
  background: transparent;
  border: 0;
  cursor: pointer;
  font-family: var(--font-display);
  font-size: 12px;
  font-style: italic;
  font-weight: 500;
  transition: color 160ms ease;
  span { margin-left: 6px; color: $brass; }
  &:hover { color: #faf3e2; }
}

.hero-radar {
  position: relative;
  width: 240px;
  height: 240px;
  justify-self: center;
}

.radar-orbit { 
  position: absolute; 
  inset: 0; 
  border: 1px solid rgba(183, 153, 110, 0.22); 
}
.orbit-outer::before, .orbit-inner::before { position: absolute; inset: 50% 0 auto; height: 1px; content: ''; background: rgba(183, 153, 110, 0.16); }
.orbit-outer::after, .orbit-inner::after { position: absolute; inset: 0 50% 0 auto; width: 1px; content: ''; background: rgba(183, 153, 110, 0.16); }
.orbit-inner { inset: 40px; }

.radar-core {
  position: absolute;
  inset: 68px;
  display: grid;
  place-content: center;
  text-align: center;
  background: rgba(183, 153, 110, 0.1);
  border: 2px solid rgba(183, 153, 110, 0.32);
  box-shadow: 0 0 32px rgba(183, 153, 110, 0.12);
  animation: radar-breathe 3.6s ease-in-out infinite;
  strong { 
    font-family: var(--font-display);
    font-size: 40px; 
    font-weight: 500;
    font-style: italic;
    line-height: 1; 
    color: $brass;
  }
  span { 
    margin-top: 4px; 
    font-family: var(--font-mono);
    font-size: 8px; 
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(250, 243, 226, 0.48); 
  }
}

@keyframes radar-breathe {
  0%, 100% { box-shadow: 0 0 32px rgba(183, 153, 110, 0.12); }
  50% { box-shadow: 0 0 48px rgba(183, 153, 110, 0.2); }
}

.radar-node {
  position: absolute;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  color: #faf3e2;
  background: color-mix(in srgb, var(--agent-color, $brass) 20%, $forest);
  border: 2px solid $forest;
  box-shadow: 3px 3px 0 rgba(31, 42, 36, 0.2);
}
.node-finance { top: 0; left: 102px; --agent-color: #397bff; }
.node-service { top: 100px; right: 0; --agent-color: #2f9e72; }
.node-legal { bottom: 0; left: 102px; --agent-color: #e68a3f; }
.node-admin { top: 100px; left: 0; --agent-color: #d95951; }

.radar-caption {
  position: absolute;
  right: -6px;
  bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.1em;
  color: rgba(250, 243, 226, 0.6);
  background: rgba(31, 42, 36, 0.6);
  border: 1px solid rgba(183, 153, 110, 0.2);
  backdrop-filter: blur(8px);
  strong { color: #faf3e2; }
}
.live-dot { 
  width: 5px; 
  height: 5px; 
  background: #8dd8a3; 
  animation: status-blink 1.2s steps(2, jump-none) infinite;
}

@keyframes status-blink { 50% { opacity: 0.35; } }

.section-block { margin-top: 28px; }
.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 14px;
  > div { display: flex; align-items: baseline; gap: 10px; }
  h2 { 
    font-family: var(--font-display);
    font-size: 20px; 
    font-weight: 500;
    font-style: italic;
    font-variation-settings: 'opsz' 96;
    letter-spacing: -0.01em;
    color: $forest;
  }
  p { color: $text-secondary; font-size: 12px; }
}
.section-index { 
  font-family: var(--font-mono);
  font-size: 9px; 
  font-weight: 500; 
  letter-spacing: 0.14em;
  padding: 2px 6px;
  border: 1px solid $brass;
  background: $cream-warm;
  color: $brass-deep;
}

.agent-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.agent-card {
  min-height: 180px;
  padding: 16px;
  cursor: pointer;
  background: $cream;
  border: 2px solid $forest;
  box-shadow: 4px 4px 0 rgba(31, 42, 36, 0.12);
  animation: card-in 0.5s $transition-timing both;
  animation-delay: var(--delay);
  transition: transform 160ms $transition-timing, box-shadow 160ms ease;
  &:hover { 
    transform: translateY(-3px); 
    box-shadow: 6px 8px 0 rgba(31, 42, 36, 0.16);
  }
  h3 { 
    margin-top: 14px; 
    font-family: var(--font-display);
    font-size: 15px; 
    font-weight: 500;
    font-style: italic;
    letter-spacing: -0.01em;
    color: $forest;
  }
  > p { 
    min-height: 36px; 
    margin-top: 4px; 
    color: $text-secondary; 
    font-size: 11px; 
    line-height: 1.6; 
  }
}
@keyframes card-in { from { opacity: 0; transform: translateY(10px); } }

.agent-card-top, .agent-card-bottom { display: flex; align-items: center; justify-content: space-between; }
.agent-icon { 
  width: 38px; 
  height: 38px; 
  display: grid; 
  place-items: center; 
  color: $forest;
  background: color-mix(in srgb, var(--agent-color) 12%, $cream-warm); 
  border: 1.5px solid $forest;
}
.agent-number { 
  font-family: var(--font-mono);
  font-size: 9px; 
  font-weight: 500; 
  letter-spacing: 0.12em;
  color: $brass-deep;
}
.agent-card-bottom { margin-top: 12px; padding-top: 10px; border-top: 1px solid $rule; }
.agent-live { 
  display: flex; 
  align-items: center; 
  gap: 5px; 
  font-family: var(--font-mono);
  font-size: 9px; 
  font-weight: 500;
  letter-spacing: 0.08em;
  color: $text-secondary; 
  i { width: 5px; height: 5px; background: $success-color; } 
}
.agent-card-bottom strong { 
  margin-left: auto; 
  margin-right: 10px; 
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 500;
  font-style: italic;
  font-variant-numeric: tabular-nums;
  color: $forest;
  small { 
    font-family: var(--font-mono);
    font-size: 9px; 
    font-weight: 500;
    letter-spacing: 0.12em;
    color: $text-secondary; 
  } 
}
.agent-card-bottom > .el-icon { color: $text-secondary; }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 18px; }

.workspace-grid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(330px, 0.8fr); gap: 16px; margin-top: 16px; }
.workspace-panel { 
  background: $cream; 
  border: 2px solid $forest; 
  box-shadow: 4px 4px 0 rgba(31, 42, 36, 0.12);
}
.panel-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 12px; }
.panel-header.compact { padding-bottom: 10px; }
.panel-kicker { 
  font-family: var(--font-mono);
  font-size: 8px; 
  font-weight: 500; 
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: $brass-deep;
}
.panel-header h2 { 
  margin-top: 2px; 
  font-family: var(--font-display);
  font-size: 16px; 
  font-weight: 500;
  font-style: italic;
  letter-spacing: -0.01em;
  color: $forest;
}
.panel-link { 
  color: $text-secondary; 
  background: transparent; 
  border: 0; 
  cursor: pointer; 
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.1em;
  transition: color 160ms ease;
  span { margin-left: 4px; color: $forest; }
  &:hover { color: $forest; }
}

.todo-list { padding: 0 12px 12px; min-height: 100px; }
.todo-item { 
  display: grid; 
  grid-template-columns: 30px 1fr auto 30px; 
  align-items: center; 
  gap: 10px; 
  min-height: 60px; 
  padding: 8px 10px; 
  border-top: 1px solid $rule; 
  transition: background 160ms ease; 
  &:hover { background: $cream-warm; } 
}
.todo-index { 
  font-family: var(--font-mono);
  font-size: 9px; 
  font-weight: 500; 
  letter-spacing: 0.08em;
  color: $brass-deep;
}
.todo-main { 
  display: flex; 
  flex-direction: column; 
  gap: 3px; 
  min-width: 0; 
  strong { 
    overflow: hidden; 
    font-family: var(--font-display);
    font-size: 12px; 
    font-weight: 500;
    font-style: italic;
    text-overflow: ellipsis; 
    white-space: nowrap; 
    color: $forest;
  } 
  span { 
    font-family: var(--font-mono);
    font-size: 9px; 
    color: $text-secondary; 
    letter-spacing: 0.04em;
  } 
}
.todo-open { 
  width: 26px; 
  height: 26px; 
  display: grid;
  place-items: center;
  color: $text-secondary; 
  background: $cream-warm; 
  border: 1.5px solid $forest;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 10px;
  transition: all 160ms ease;
  &:hover {
    color: $forest;
    transform: translateY(-2px);
    box-shadow: 2px 2px 0 rgba(31, 42, 36, 0.12);
  }
}

.side-stack { display: grid; gap: 16px; }
.quick-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 0 14px 16px; }
.quick-action { 
  position: relative; 
  min-height: 78px; 
  display: flex; 
  flex-direction: column; 
  align-items: flex-start; 
  justify-content: center; 
  gap: 6px; 
  padding: 10px; 
  color: $text-regular; 
  background: $cream-warm; 
  border: 1.5px solid $forest;
  cursor: pointer; 
  transition: all 160ms ease; 
  &:hover { 
    color: $forest; 
    transform: translateY(-2px); 
    box-shadow: 3px 3px 0 rgba(31, 42, 36, 0.14);
  } 
  > span:nth-child(2) { 
    font-family: var(--font-display);
    font-size: 10px; 
    font-weight: 500;
    font-style: italic;
  } 
  > i { 
    position: absolute; 
    top: 6px; 
    right: 6px; 
    color: $text-secondary; 
    font-size: 9px; 
    font-style: normal;
    font-family: var(--font-mono);
  } 
}
.quick-icon { color: $forest; font-size: 16px; }

.live-badge { 
  display: flex; 
  align-items: center; 
  gap: 5px; 
  font-family: var(--font-mono);
  font-size: 8px; 
  font-weight: 700; 
  letter-spacing: 0.14em;
  color: $success-color;
  padding: 2px 6px;
  border: 1px solid $success-color;
  background: color-mix(in srgb, $success-color 8%, $cream);
  i { 
    width: 5px; 
    height: 5px; 
    background: $success-color;
    animation: status-blink 1.2s steps(2, jump-none) infinite;
  } 
}
.activity-list { padding: 0 18px 16px; }
.activity-item { 
  display: grid; 
  grid-template-columns: 8px 1fr; 
  gap: 10px; 
  padding: 10px 0; 
  border-top: 1px solid $rule; 
  p { 
    font-size: 11px; 
    line-height: 1.45; 
    color: $text-regular;
  } 
  div span { 
    font-family: var(--font-mono);
    font-size: 8px; 
    color: $text-secondary;
    letter-spacing: 0.06em;
  } 
}
.activity-marker { 
  width: 6px; 
  height: 6px; 
  margin-top: 4px; 
  background: #4b8fcb; 
  border: 1px solid $forest;
  &.is-success { background: $success-color; } 
  &.is-warning { background: $warning-color; } 
}

@media (max-width: 1200px) {
  .command-hero { grid-template-columns: 1fr 260px; padding: 32px; }
  .agent-grid, .stats-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 900px) {
  .command-hero { grid-template-columns: 1fr; }
  .hero-radar { display: none; }
  .workspace-grid { grid-template-columns: 1fr; }
}

@media (max-width: 620px) {
  .command-hero { min-height: 0; padding: 26px 20px; }
  .hero-copy h1 { font-size: 30px; }
  .agent-grid, .stats-grid { grid-template-columns: 1fr; }
  .quick-actions { grid-template-columns: repeat(2, 1fr); }
  .todo-item { grid-template-columns: 24px 1fr auto; }
  .todo-open { display: none; }
}
</style>
