<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">行政概览</h2>
      <div class="page-actions">
        <el-button icon="MagicStick" @click="$router.push({ path: '/agents/copilot', query: { agent: 'ADMIN' } })">问 Agent</el-button>
        <el-button type="primary" icon="Plus" @click="$router.push('/admin/task')">新建任务</el-button>
      </div>
    </div>

    <section class="admin-hero">
      <div class="hero-copy">
        <span class="kicker">ADMIN AGENT · DAILY BRIEF</span>
        <h3>小行正在整理今天的行政队列</h3>
        <p>把日程、会议和待办放在同一张桌面上，先处理逾期与高优，再安排今日协作节奏。</p>
        <div class="hero-actions">
          <button type="button" class="hero-link" @click="$router.push('/admin/schedule')">
            查看今日排程 <span>{{ overview.todaySchedules }}</span>
          </button>
          <button type="button" class="hero-link is-warning" @click="$router.push('/admin/task')">
            逾期提醒 <span>{{ overview.overdueTasks }}</span>
          </button>
        </div>
      </div>
      <div class="hero-panel">
        <div class="hero-panel-header">
          <span>任务流转</span>
          <strong>{{ completionRate }}%</strong>
        </div>
        <div class="progress-track">
          <span :style="{ width: completionRate + '%' }"></span>
        </div>
        <div class="hero-breakdown">
          <span>待办 {{ overview.todoTasks }}</span>
          <span>进行中 {{ overview.inProgressTasks }}</span>
          <span>完成 {{ overview.doneTasks }}</span>
        </div>
      </div>
    </section>

    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6">
        <StatsCard label="待处理任务" :value="overview.pendingTasks" icon="List" color="#b7996e" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="今日日程" :value="overview.todaySchedules" icon="Calendar" color="#4f8f68" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="即将会议" :value="overview.upcomingMeetings" icon="VideoCamera" color="#d9a441" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="逾期任务" :value="overview.overdueTasks" icon="WarningFilled" color="#b94c34" />
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :xs="24" :lg="12">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span class="card-title">今日日程</span>
              <el-button link type="primary" @click="$router.push('/admin/schedule')">查看全部</el-button>
            </div>
          </template>
          <el-timeline v-loading="scheduleLoading">
            <el-timeline-item
              v-for="schedule in todaySchedules"
              :key="schedule.id"
              :timestamp="`${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}`"
              :type="getScheduleType(schedule.type)"
              placement="top"
            >
              <div class="schedule-item">
                <div class="schedule-copy">
                  <strong>{{ schedule.title }}</strong>
                  <span v-if="schedule.location" class="schedule-location">
                    <el-icon><Location /></el-icon>{{ schedule.location }}
                  </span>
                </div>
                <el-tag size="small" :type="getScheduleType(schedule.type)">{{ getScheduleText(schedule.type) }}</el-tag>
              </div>
            </el-timeline-item>
            <el-empty v-if="!scheduleLoading && todaySchedules.length === 0" description="今日暂无日程" :image-size="60" />
          </el-timeline>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <el-card shadow="never">
          <template #header>
            <span class="card-title">任务进度</span>
          </template>
          <div ref="taskChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" style="margin-top: 16px;">
      <template #header>
        <div class="card-header">
          <span class="card-title">待办任务</span>
          <el-button link type="primary" @click="$router.push('/admin/task')">查看全部</el-button>
        </div>
      </template>
      <el-table :data="pendingTasks" v-loading="taskLoading" size="default" row-class-name="admin-table-row">
        <el-table-column prop="title" label="任务" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="task-title-cell">
              <span class="task-dot" :class="`is-${(row.priority || 'LOW').toLowerCase()}`"></span>
              <span>{{ row.title }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="80">
          <template #default="{ row }">
            <el-tag :type="getPriorityType(row.priority)" size="small">{{ getPriorityText(row.priority) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="截止日期" width="120">
          <template #default="{ row }">{{ formatDate(row.dueDate) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!taskLoading && pendingTasks.length === 0" description="暂无待办任务" :image-size="60" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import StatsCard from '@/components/StatsCard.vue'
import { getAdminOverview, getScheduleList, getTaskList } from '@/api/admin'

const taskChartRef = ref<HTMLElement>()
let taskChart: echarts.ECharts | null = null

const overview = reactive({
  pendingTasks: 0,
  todaySchedules: 0,
  upcomingMeetings: 0,
  overdueTasks: 0,
  todoTasks: 0,
  inProgressTasks: 0,
  doneTasks: 0,
})
const todaySchedules = ref<any[]>([])
const pendingTasks = ref<any[]>([])
const scheduleLoading = ref(false)
const taskLoading = ref(false)

const completionRate = computed(() => {
  const total = overview.todoTasks + overview.inProgressTasks + overview.doneTasks
  if (!total) return 0
  return Math.round((overview.doneTasks / total) * 100)
})

async function fetchOverview() {
  try {
    const res = await getAdminOverview()
    Object.assign(overview, (res.data as any) || {})
    renderChart()
  } catch { /* ignore */ }
}

async function fetchSchedules() {
  scheduleLoading.value = true
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
    const res = await getScheduleList({ startDate: today.toISOString(), endDate: tomorrow.toISOString() } as any)
    const data = res.data as any
    todaySchedules.value = Array.isArray(data) ? data : (data?.items || [])
  } catch {
    todaySchedules.value = []
  } finally {
    scheduleLoading.value = false
  }
}

async function fetchPendingTasks() {
  taskLoading.value = true
  try {
    const res = await getTaskList({ page: 1, pageSize: 5, status: 'TODO' } as any)
    pendingTasks.value = (res.data.items || []).slice(0, 5)
  } catch {
    pendingTasks.value = []
  } finally {
    taskLoading.value = false
  }
}

function renderChart() {
  if (!taskChartRef.value) return
  if (!taskChart) taskChart = echarts.init(taskChartRef.value)
  taskChart.setOption({
    tooltip: { trigger: 'item' },
    legend: {
      bottom: 0,
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: '#445049', fontSize: 11 },
    },
    series: [{
      type: 'pie',
      radius: ['52%', '76%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: '#faf3e2', borderWidth: 3 },
      label: { show: true, formatter: '{b}\n{c}', color: '#1f2a24', fontWeight: 600 },
      data: [
        { value: overview.todoTasks || 0, name: '待办', itemStyle: { color: '#6e7a72' } },
        { value: overview.inProgressTasks || 0, name: '进行中', itemStyle: { color: '#d9a441' } },
        { value: overview.doneTasks || 0, name: '已完成', itemStyle: { color: '#4f8f68' } },
      ],
    }],
  })
}

function formatTime(value: string | Date | undefined | null) {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toTimeString().slice(0, 5)
}

function formatDate(value: string | Date | undefined | null) {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toISOString().slice(0, 10)
}

function getScheduleType(type?: string) {
  const m: Record<string, any> = { MEETING: 'primary', DEADLINE: 'danger', WORK: 'warning', PERSONAL: 'success' }
  return m[type || ''] || 'info'
}
function getScheduleText(type?: string) {
  const m: Record<string, string> = { MEETING: '会议', DEADLINE: '截止', WORK: '工作', PERSONAL: '个人' }
  return m[type || ''] || '日程'
}

function getPriorityType(p: string) { const m = { LOW: 'info', MEDIUM: 'primary', HIGH: 'warning' } as const; return m[p as keyof typeof m] || 'info' }
function getPriorityText(p: string) { const m: Record<string, string> = { LOW: '低', MEDIUM: '中', HIGH: '高' }; return m[p] || p }
function getStatusType(s: string) { const m = { TODO: 'info', IN_PROGRESS: 'warning', DONE: 'success' } as const; return m[s as keyof typeof m] || 'info' }
function getStatusText(s: string) { const m: Record<string, string> = { TODO: '待办', IN_PROGRESS: '进行中', DONE: '已完成' }; return m[s] || s }

function handleResize() { taskChart?.resize() }

onMounted(() => {
  fetchOverview()
  fetchSchedules()
  fetchPendingTasks()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  taskChart?.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>

<style lang="scss" scoped>
.admin-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  align-items: stretch;
  margin-bottom: 18px;
  padding: 18px;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(31, 42, 36, 0.96), rgba(44, 58, 50, 0.92)),
    radial-gradient(circle at 80% 10%, rgba(183, 153, 110, 0.34), transparent 34%);
  border: 2px solid $forest;
  box-shadow: $shadow-sm;
  color: $cream;
}

.hero-copy {
  min-width: 0;

  .kicker {
    color: color-mix(in srgb, $brass 82%, $cream);
  }

  h3 {
    margin: 10px 0 8px;
    font-family: var(--font-display);
    font-size: clamp(20px, 2vw, 28px);
    font-style: italic;
    font-weight: 500;
    line-height: 1.15;
  }

  p {
    max-width: 620px;
    color: color-mix(in srgb, $cream 80%, $forest);
    line-height: 1.7;
  }
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.hero-link {
  display: inline-flex;
  gap: 10px;
  align-items: center;
  padding: 9px 12px;
  color: $cream;
  cursor: pointer;
  background: rgba(250, 243, 226, 0.08);
  border: 1.5px solid rgba(250, 243, 226, 0.28);
  transition: all 160ms $transition-timing;

  span {
    min-width: 24px;
    padding: 2px 6px;
    font-family: var(--font-mono);
    font-size: 11px;
    text-align: center;
    color: $forest;
    background: $cream;
  }

  &:hover {
    transform: translateY(-2px);
    border-color: $brass;
    box-shadow: 3px 3px 0 rgba(250, 243, 226, 0.16);
  }

  &.is-warning span {
    color: $cream;
    background: $danger-color;
  }
}

.hero-panel {
  align-self: center;
  padding: 16px;
  background: rgba(250, 243, 226, 0.1);
  border: 1.5px solid rgba(250, 243, 226, 0.26);
}

.hero-panel-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;

  span {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.12em;
    color: color-mix(in srgb, $cream 72%, $brass);
  }

  strong {
    font-family: var(--font-display);
    font-size: 36px;
    font-style: italic;
    font-weight: 500;
    line-height: 1;
  }
}

.progress-track {
  height: 9px;
  padding: 2px;
  background: rgba(250, 243, 226, 0.16);
  border: 1px solid rgba(250, 243, 226, 0.25);

  span {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, $brass, $cream);
    transition: width 260ms $transition-timing;
  }
}

.hero-breakdown {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 14px;

  span {
    padding: 8px;
    font-family: var(--font-mono);
    font-size: 10px;
    text-align: center;
    color: color-mix(in srgb, $cream 82%, $forest);
    background: rgba(250, 243, 226, 0.08);
    border: 1px solid rgba(250, 243, 226, 0.18);
  }
}

.stats-row { margin-bottom: 20px; row-gap: 16px; }
.card-title { 
  font-family: var(--font-display);
  font-weight: 500;
  font-style: italic;
  font-size: 15px;
  font-variation-settings: 'opsz' 96;
  color: $forest;
}
.card-header { display: flex; justify-content: space-between; align-items: center; }
.chart-container { height: 300px; width: 100%; }
.schedule-item { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.schedule-copy {
  display: grid;
  gap: 4px;
  min-width: 0;

  strong {
    color: $forest;
    line-height: 1.4;
  }
}
.schedule-location { display: flex; align-items: center; gap: 4px; font-size: 12px; color: $text-secondary; }
.task-title-cell { display: flex; align-items: center; gap: 8px; min-width: 0; color: $forest; font-weight: 600; }
.task-dot { width: 8px; height: 8px; flex: 0 0 auto; background: $info-color; border: 1px solid $forest; }
.task-dot.is-medium { background: $warning-color; }
.task-dot.is-high { background: $danger-color; }

@media (max-width: 960px) {
  .admin-hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .admin-hero {
    padding: 14px;
  }

  .hero-breakdown {
    grid-template-columns: 1fr;
  }
}
</style>
