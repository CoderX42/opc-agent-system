<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">行政概览</h2>
      <div class="page-actions">
        <el-button icon="MagicStick" @click="$router.push({ path: '/agents/copilot', query: { agent: 'ADMIN' } })">问 Agent</el-button>
        <el-button type="primary" icon="Plus" @click="$router.push('/admin/task')">新建任务</el-button>
      </div>
    </div>

    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6">
        <StatsCard label="待处理任务" :value="overview.pendingTasks" icon="List" color="#409eff" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="今日日程" :value="overview.todaySchedules" icon="Calendar" color="#67c23a" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="即将会议" :value="overview.upcomingMeetings" icon="VideoCamera" color="#e6a23c" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="逾期任务" :value="overview.overdueTasks" icon="WarningFilled" color="#f56c6c" />
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
                <strong>{{ schedule.title }}</strong>
                <span v-if="schedule.location" class="schedule-location">
                  <el-icon><Location /></el-icon>{{ schedule.location }}
                </span>
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
      <el-table :data="pendingTasks" v-loading="taskLoading" size="default">
        <el-table-column prop="title" label="任务" min-width="200" show-overflow-tooltip />
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
import { ref, reactive, onMounted, onUnmounted } from 'vue'
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
    todaySchedules.value = (res.data as any) || []
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
    series: [{
      type: 'pie',
      radius: ['50%', '75%'],
      label: { show: true, formatter: '{b}: {c}' },
      data: [
        { value: overview.todoTasks || 0, name: '待办', itemStyle: { color: '#909399' } },
        { value: overview.inProgressTasks || 0, name: '进行中', itemStyle: { color: '#e6a23c' } },
        { value: overview.doneTasks || 0, name: '已完成', itemStyle: { color: '#67c23a' } },
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
.stats-row { margin-bottom: 20px; }
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
.schedule-item { display: flex; align-items: center; gap: 8px; }
.schedule-location { display: flex; align-items: center; gap: 4px; font-size: 12px; color: $text-secondary; }
</style>
