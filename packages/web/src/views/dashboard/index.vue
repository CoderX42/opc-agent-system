<template>
  <div class="page-container dashboard-page">
    <section class="command-hero">
      <div class="hero-copy">
        <div class="hero-eyebrow"><span></span> OPC DIGITAL WORKFORCE</div>
        <h1>{{ greeting }}，今天先处理<br><em>最重要的事。</em></h1>
        <p>四位数字员工正在协同工作。当前有 {{ totalPending }} 项待处理，其中 {{ totalUrgent }} 项需要你的确认。</p>
        <div class="hero-actions">
          <el-button type="primary" size="large" icon="Plus" @click="$router.push('/admin/task')">创建新任务</el-button>
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
.dashboard-page { padding-top: 26px; }

.command-hero {
  min-height: 330px;
  display: grid;
  grid-template-columns: 1.3fr 0.7fr;
  align-items: center;
  gap: 48px;
  padding: 44px 52px;
  overflow: hidden;
  color: #f5f8f2;
  background:
    linear-gradient(110deg, rgba(13, 33, 28, 0.98), rgba(20, 69, 59, 0.95)),
    $bg-sidebar;
  border-radius: 28px;
  box-shadow: 0 24px 60px rgba(13, 33, 28, 0.18);
}

.hero-eyebrow {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 20px;
  color: rgba(239, 246, 239, 0.5);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.16em;
  span { width: 22px; height: 2px; background: $accent-color; }
}

.hero-copy h1 {
  max-width: 700px;
  font-size: clamp(36px, 4vw, 58px);
  font-weight: 680;
  line-height: 1.08;
  letter-spacing: -0.055em;
  em { color: $accent-color; font-style: normal; }
}

.hero-copy > p {
  max-width: 540px;
  margin-top: 18px;
  color: rgba(237, 244, 238, 0.62);
  font-size: 14px;
  line-height: 1.75;
}

.hero-actions { display: flex; align-items: center; gap: 22px; margin-top: 26px; }
.hero-actions :deep(.el-button--primary) {
  color: #10251f;
  background: $accent-color;
  border-color: $accent-color;
  box-shadow: 0 12px 30px rgba(201, 242, 123, 0.16);
  &:hover { background: #d6f79a; border-color: #d6f79a; }
}

.text-action {
  color: rgba(244, 248, 242, 0.8);
  background: transparent;
  border: 0;
  cursor: pointer;
  font-weight: 650;
  span { margin-left: 6px; color: $accent-color; }
}

.hero-radar {
  position: relative;
  width: 250px;
  height: 250px;
  justify-self: center;
}

.radar-orbit { position: absolute; inset: 0; border: 1px solid rgba(201, 242, 123, 0.16); border-radius: 50%; }
.orbit-outer::before, .orbit-inner::before { position: absolute; inset: 50% 0 auto; height: 1px; content: ''; background: rgba(201, 242, 123, 0.12); }
.orbit-outer::after, .orbit-inner::after { position: absolute; inset: 0 50% 0 auto; width: 1px; content: ''; background: rgba(201, 242, 123, 0.12); }
.orbit-inner { inset: 42px; }

.radar-core {
  position: absolute;
  inset: 72px;
  display: grid;
  place-content: center;
  text-align: center;
  background: rgba(201, 242, 123, 0.09);
  border: 1px solid rgba(201, 242, 123, 0.26);
  border-radius: 50%;
  box-shadow: 0 0 44px rgba(201, 242, 123, 0.08);
  strong { color: $accent-color; font-size: 42px; line-height: 1; }
  span { margin-top: 5px; color: rgba(245, 249, 244, 0.44); font-size: 7px; letter-spacing: 0.12em; }
}

.radar-node {
  position: absolute;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  color: $accent-color;
  background: #18382f;
  border: 1px solid rgba(201, 242, 123, 0.28);
  border-radius: 12px;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.18);
}
.node-finance { top: 1px; left: 106px; }
.node-service { top: 104px; right: 0; }
.node-legal { bottom: 3px; left: 106px; }
.node-admin { top: 104px; left: 0; }

.radar-caption {
  position: absolute;
  right: -8px;
  bottom: 14px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 11px;
  color: rgba(242, 248, 242, 0.56);
  background: rgba(6, 24, 19, 0.84);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  font-size: 9px;
  backdrop-filter: blur(10px);
  strong { color: #fff; }
}
.live-dot { width: 6px; height: 6px; background: $accent-color; border-radius: 50%; }

.section-block { margin-top: 34px; }
.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 16px;
  > div { display: flex; align-items: baseline; gap: 10px; }
  h2 { font-size: 22px; font-weight: 720; letter-spacing: -0.04em; }
  p { color: $text-secondary; font-size: 12px; }
}
.section-index { color: $primary-color; font-size: 10px; font-weight: 800; letter-spacing: 0.1em; }

.agent-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
.agent-card {
  min-height: 194px;
  padding: 19px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid $border-light;
  border-radius: 19px;
  box-shadow: $shadow-sm;
  animation: card-in 0.5s $transition-timing both;
  animation-delay: var(--delay);
  transition: transform $transition-duration $transition-timing, box-shadow $transition-duration $transition-timing;
  &:hover { transform: translateY(-4px); box-shadow: $shadow-md; }
  h3 { margin-top: 18px; font-size: 16px; font-weight: 720; letter-spacing: -0.025em; }
  > p { min-height: 38px; margin-top: 6px; color: $text-secondary; font-size: 11px; line-height: 1.7; }
}
@keyframes card-in { from { opacity: 0; transform: translateY(10px); } }

.agent-card-top, .agent-card-bottom { display: flex; align-items: center; justify-content: space-between; }
.agent-icon { width: 40px; height: 40px; display: grid; place-items: center; color: var(--agent-color); background: color-mix(in srgb, var(--agent-color) 10%, white); border-radius: 12px; }
.agent-number { color: #c3cac6; font-size: 10px; font-weight: 800; letter-spacing: 0.1em; }
.agent-card-bottom { margin-top: 14px; padding-top: 13px; border-top: 1px solid $border-lighter; }
.agent-live { display: flex; align-items: center; gap: 5px; color: $text-secondary; font-size: 9px; i { width: 6px; height: 6px; background: #41a979; border-radius: 50%; } }
.agent-card-bottom strong { margin-left: auto; margin-right: 10px; font-size: 13px; small { color: $text-placeholder; font-size: 8px; font-weight: 500; } }
.agent-card-bottom > .el-icon { color: $text-placeholder; }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 18px; }

.workspace-grid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(330px, 0.8fr); gap: 18px; margin-top: 18px; }
.workspace-panel { background: rgba(255, 255, 255, 0.9); border: 1px solid $border-light; border-radius: 21px; box-shadow: $shadow-sm; }
.panel-header { display: flex; align-items: center; justify-content: space-between; padding: 22px 24px 16px; }
.panel-header.compact { padding-bottom: 12px; }
.panel-kicker { color: $text-placeholder; font-size: 8px; font-weight: 800; letter-spacing: 0.13em; }
.panel-header h2 { margin-top: 2px; font-size: 18px; font-weight: 720; letter-spacing: -0.035em; }
.panel-link { color: $text-secondary; background: transparent; border: 0; cursor: pointer; font-size: 11px; span { margin-left: 5px; color: $primary-color; } }

.todo-list { padding: 0 14px 14px; min-height: 100px; }
.todo-item { display: grid; grid-template-columns: 32px 1fr auto 30px; align-items: center; gap: 10px; min-height: 64px; padding: 8px 10px; border-top: 1px solid $border-lighter; transition: background $transition-duration; &:hover { background: #f7f8f4; border-radius: 11px; } }
.todo-index { color: #b1bab5; font-size: 9px; font-weight: 750; }
.todo-main { display: flex; flex-direction: column; gap: 3px; min-width: 0; strong { overflow: hidden; font-size: 12px; font-weight: 670; text-overflow: ellipsis; white-space: nowrap; } span { color: $text-placeholder; font-size: 9px; } }
.todo-open { width: 28px; height: 28px; color: $text-secondary; background: #f1f3ee; border: 0; border-radius: 8px; cursor: pointer; }

.side-stack { display: grid; gap: 18px; }
.quick-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 0 16px 18px; }
.quick-action { position: relative; min-height: 82px; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 6px; padding: 10px; color: $text-regular; background: #f7f8f4; border: 1px solid transparent; border-radius: 13px; cursor: pointer; transition: all $transition-duration; &:hover { color: $primary-color; background: #fff; border-color: $border-color; transform: translateY(-2px); } > span:nth-child(2) { font-size: 9px; font-weight: 650; } > i { position: absolute; top: 8px; right: 8px; color: #bac2be; font-size: 9px; font-style: normal; } }
.quick-icon { color: $primary-color; font-size: 17px; }

.live-badge { display: flex; align-items: center; gap: 5px; color: #508e6d; font-size: 8px; font-weight: 800; letter-spacing: 0.08em; i { width: 6px; height: 6px; background: #50a878; border-radius: 50%; } }
.activity-list { padding: 0 20px 18px; }
.activity-item { display: grid; grid-template-columns: 10px 1fr; gap: 10px; padding: 10px 0; border-top: 1px solid $border-lighter; p { color: $text-regular; font-size: 10px; line-height: 1.45; } div span { color: $text-placeholder; font-size: 8px; } }
.activity-marker { width: 7px; height: 7px; margin-top: 4px; background: #397bff; border-radius: 50%; &.is-success { background: #2f9e72; } &.is-warning { background: #e68a3f; } }

@media (max-width: 1200px) {
  .command-hero { grid-template-columns: 1fr 280px; padding: 38px; }
  .agent-grid, .stats-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 900px) {
  .command-hero { grid-template-columns: 1fr; }
  .hero-radar { display: none; }
  .workspace-grid { grid-template-columns: 1fr; }
}

@media (max-width: 620px) {
  .command-hero { min-height: 0; padding: 30px 24px; }
  .hero-copy h1 { font-size: 35px; }
  .agent-grid, .stats-grid { grid-template-columns: 1fr; }
  .quick-actions { grid-template-columns: repeat(2, 1fr); }
  .todo-item { grid-template-columns: 25px 1fr auto; }
  .todo-open { display: none; }
}
</style>
