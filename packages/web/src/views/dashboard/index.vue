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
  min-height: 280px;
  display: grid;
  grid-template-columns: 1.3fr 0.7fr;
  align-items: center;
  gap: 40px;
  padding: 32px 40px;
  overflow: hidden;
  color: #fff;
  border-radius: 24px;
  background: linear-gradient(135deg, #0d47a1 0%, #1677ff 55%, #00b8ff 100%);
  box-shadow:
    0 24px 56px -28px rgb(13 71 161 / 0.45),
    inset 0 1px 0 rgb(255 255 255 / 0.18);
  position: relative;
}

.hero-eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.7);
  span {
    width: 24px;
    height: 2px;
    background: rgb(255 255 255 / 0.45);
    border-radius: 999px;
  }
}

.hero-copy h1 {
  max-width: 700px;
  font-family: var(--font-body);
  font-size: clamp(28px, 3.6vw, 44px);
  font-weight: 700;
  line-height: 1.08;
  letter-spacing: -0.02em;
  em { color: #b9f4ff; font-style: normal; }
}

.hero-copy > p {
  max-width: 540px;
  margin-top: 14px;
  font-size: 14px;
  line-height: 1.6;
  color: rgb(255 255 255 / 0.82);
}

.hero-actions { display: flex; align-items: center; gap: 12px; margin-top: 18px; }
.hero-actions :deep(.el-button--primary) {
  color: #fff;
  background: rgb(255 255 255 / 0.18);
  border: 1px solid rgb(255 255 255 / 0.32);
  border-radius: 14px;
  backdrop-filter: blur(8px);
  font-family: var(--font-body);
  font-weight: 600;
  box-shadow: none;
  &:hover {
    background: rgb(255 255 255 / 0.28);
    border-color: rgb(255 255 255 / 0.5);
    transform: translateY(-2px);
  }
}
.hero-actions :deep(.el-button--large) {
  font-family: var(--font-body);
  font-weight: 600;
  min-height: 44px;
  padding: 10px 20px;
}

.text-action {
  color: rgb(255 255 255 / 0.85);
  background: transparent;
  border: 0;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: color 160ms ease;
  span { margin-left: 6px; color: #b9f4ff; }
  &:hover { color: #fff; }
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
  border: 1px solid rgb(255 255 255 / 0.22);
  border-radius: 50%;
}
.orbit-outer::before, .orbit-inner::before { position: absolute; inset: 50% 0 auto; height: 1px; content: ''; background: rgb(255 255 255 / 0.18); }
.orbit-outer::after, .orbit-inner::after { position: absolute; inset: 0 50% 0 auto; width: 1px; content: ''; background: rgb(255 255 255 / 0.18); }
.orbit-inner { inset: 40px; }

.radar-core {
  position: absolute;
  inset: 68px;
  display: grid;
  place-content: center;
  text-align: center;
  background: rgb(255 255 255 / 0.14);
  border: 1px solid rgb(255 255 255 / 0.32);
  border-radius: 50%;
  box-shadow: 0 0 32px rgb(255 255 255 / 0.18);
  animation: radar-breathe 3.6s ease-in-out infinite;
  strong {
    font-family: var(--font-body);
    font-size: 38px;
    font-weight: 700;
    line-height: 1;
    color: #fff;
  }
  span {
    margin-top: 2px;
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgb(255 255 255 / 0.65);
  }
}

@keyframes radar-breathe {
  0%, 100% { box-shadow: 0 0 32px rgb(255 255 255 / 0.18); }
  50% { box-shadow: 0 0 56px rgb(255 255 255 / 0.3); }
}

.radar-node {
  position: absolute;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  color: #fff;
  background: var(--agent-color, #00b8ff);
  border-radius: 50%;
  border: 1px solid rgb(255 255 255 / 0.32);
  box-shadow: 0 6px 18px -6px var(--agent-color, #00b8ff);
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
  color: rgb(255 255 255 / 0.7);
  background: rgb(13 71 161 / 0.45);
  border: 1px solid rgb(255 255 255 / 0.18);
  border-radius: 999px;
  backdrop-filter: blur(8px);
  strong { color: #b9f4ff; }
}
.live-dot {
  width: 5px;
  height: 5px;
  background: #b9f4ff;
  border-radius: 50%;
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
    font-family: var(--font-body);
    font-size: 19px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: rgb(var(--text));
  }
  p { color: rgb(var(--muted)); font-size: 12px; }
}
.section-index {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.14em;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgb(var(--accent-2) / 0.12);
  color: rgb(var(--accent-strong));
}

.agent-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.agent-card {
  min-height: 180px;
  padding: 18px 16px;
  cursor: pointer;
  background:
    linear-gradient(145deg, rgb(var(--surface) / 0.98), rgb(var(--surface) / 0.92)),
    radial-gradient(circle at 18% 0%, rgb(var(--accent-2) / 0.08), transparent 18rem);
  border: 1px solid rgb(var(--line) / 0.6);
  border-radius: 1.25rem;
  box-shadow: $shadow-soft;
  animation: card-in 0.5s $transition-timing both;
  animation-delay: var(--delay);
  transition: transform 160ms $transition-timing, box-shadow 160ms ease, border-color 160ms ease;
  &:hover {
    transform: translateY(-3px);
    box-shadow: $shadow-glow;
    border-color: rgb(var(--accent) / 0.5);
  }
  h3 {
    margin-top: 14px;
    font-family: var(--font-body);
    font-size: 15px;
    font-weight: 600;
    color: rgb(var(--text));
  }
  > p {
    min-height: 36px;
    margin-top: 4px;
    color: rgb(var(--muted));
    font-size: 11px;
    line-height: 1.6;
  }
}
@keyframes card-in { from { opacity: 0; transform: translateY(10px); } }

.agent-card-top, .agent-card-bottom { display: flex; align-items: center; justify-content: space-between; }
.agent-icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  color: #fff;
  background: var(--agent-color, rgb(var(--accent)));
  border-radius: 12px;
  box-shadow: 0 6px 18px -8px var(--agent-color, rgb(var(--accent)));
}
.agent-number {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: rgb(var(--faint));
}
.agent-card-bottom { margin-top: 14px; gap: 10px; }
.agent-live {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: rgb(var(--muted));
  i {
    width: 6px;
    height: 6px;
    background: rgb(var(--success));
    border-radius: 50%;
    box-shadow: 0 0 0 3px rgb(var(--success) / 0.2);
  }
}
.agent-card-bottom strong {
  margin-left: auto;
  margin-right: 10px;
  font-family: var(--font-body);
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--text));
  small {
    margin-left: 4px;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.1em;
    color: rgb(var(--faint));
  }
}
.agent-card-bottom > .el-icon { color: rgb(var(--faint)); }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 18px; }

.workspace-grid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(330px, 0.8fr); gap: 16px; margin-top: 16px; }
.workspace-panel {
  background:
    linear-gradient(145deg, rgb(var(--surface) / 0.97), rgb(var(--surface) / 0.92));
  border: 1px solid rgb(var(--line) / 0.6);
  box-shadow: $shadow-soft;
  border-radius: 1.25rem;
  backdrop-filter: blur(12px);
}
.panel-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 12px; }
.panel-header.compact { padding-bottom: 10px; }
.panel-kicker {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgb(var(--accent-strong));
}
.panel-header h2 {
  margin-top: 4px;
  font-family: var(--font-body);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: rgb(var(--text));
}
.panel-link {
  color: rgb(var(--muted));
  background: transparent;
  border: 0;
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: color 160ms ease;
  span { color: rgb(var(--accent)); }
  &:hover { color: rgb(var(--accent-strong)); }
}

.todo-list { padding: 4px 12px 14px; min-height: 100px; }
.todo-item {
  display: grid;
  grid-template-columns: 30px 1fr auto 32px;
  align-items: center;
  gap: 10px;
  min-height: 64px;
  padding: 10px 12px;
  margin-bottom: 6px;
  border-radius: 0.875rem;
  background: rgb(var(--surface) / 0.6);
  border: 1px solid rgb(var(--line) / 0.5);
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
  &:hover {
    background: rgb(var(--surface) / 0.9);
    border-color: rgb(var(--accent) / 0.35);
    transform: translateY(-1px);
    box-shadow: $shadow-sm;
  }
}
.todo-index {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: rgb(var(--faint));
}
.todo-main {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  strong {
    overflow: hidden;
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: rgb(var(--text));
  }
  span {
    font-family: var(--font-mono);
    font-size: 10px;
    color: rgb(var(--muted));
    letter-spacing: 0.04em;
  }
}
.todo-open {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  color: rgb(var(--muted));
  background: rgb(var(--elev) / 0.7);
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 11px;
  transition: all 160ms ease;
  &:hover {
    color: #fff;
    background: rgb(var(--accent));
    transform: translateY(-1px);
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
  padding: 12px;
  color: rgb(var(--muted));
  background: rgb(var(--surface) / 0.7);
  border: 1px solid rgb(var(--line) / 0.6);
  border-radius: 0.875rem;
  cursor: pointer;
  transition: transform 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease;
  &:hover {
    color: rgb(var(--accent-strong));
    border-color: rgb(var(--accent) / 0.4);
    transform: translateY(-2px);
    box-shadow: $shadow-soft;
  }
  > span:nth-child(2) {
    font-family: var(--font-body);
    font-size: 12px;
    font-weight: 500;
  }
  > i {
    position: absolute;
    top: 8px;
    right: 8px;
    color: rgb(var(--faint));
    font-size: 11px;
    font-style: normal;
    font-family: var(--font-mono);
  }
}
.quick-icon { color: rgb(var(--accent)); font-size: 18px; }

.live-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: rgb(var(--success));
  padding: 4px 8px;
  border-radius: 999px;
  background: rgb(var(--success) / 0.1);
  i {
    width: 6px;
    height: 6px;
    background: rgb(var(--success));
    border-radius: 50%;
    animation: status-blink 1.2s steps(2, jump-none) infinite;
  }
}
.activity-list { padding: 4px 18px 16px; display: grid; gap: 8px; }
.activity-item {
  display: grid;
  grid-template-columns: 10px 1fr;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 0.875rem;
  background: rgb(var(--surface) / 0.6);
  border: 1px solid rgb(var(--line) / 0.5);
  p {
    font-size: 12px;
    line-height: 1.5;
    color: rgb(var(--text));
    font-weight: 500;
  }
  div span {
    font-family: var(--font-mono);
    font-size: 9px;
    color: rgb(var(--faint));
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
}
.activity-marker {
  width: 8px;
  height: 8px;
  margin-top: 6px;
  background: rgb(var(--accent));
  border-radius: 50%;
  &.is-success { background: rgb(var(--success)); }
  &.is-warning { background: rgb(var(--warn)); }
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
