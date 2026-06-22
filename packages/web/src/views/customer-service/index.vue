<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">客服概览</h2>
      <div class="page-actions">
        <el-button icon="MagicStick" @click="$router.push({ path: '/agents/copilot', query: { agent: 'CUSTOMER_SERVICE' } })">问 Agent</el-button>
        <el-button type="primary" icon="Plus" @click="$router.push('/customer-service/conversation')">新建对话</el-button>
      </div>
    </div>

    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6">
        <StatsCard label="活跃对话" :value="overview.activeConversations ?? 0" icon="ChatDotRound" color="#409eff" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="待处理工单" :value="overview.pendingTickets ?? overview.openTickets ?? 0" icon="Ticket" color="#e6a23c" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="今日消息数" :value="overview.todayMessages ?? 0" icon="ChatLineSquare" color="#67c23a" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="今日已解决" :value="overview.resolvedToday ?? 0" icon="CircleCheck" color="#f56c6c" />
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :xs="24" :lg="14">
        <el-card shadow="never">
          <template #header>
            <span class="card-title">对话 / 工单统计</span>
          </template>
          <div ref="trendChartRef" class="chart-container"></div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="10">
        <el-card shadow="never">
          <template #header>
            <span class="card-title">渠道分布</span>
          </template>
          <div ref="channelChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" style="margin-top: 16px;">
      <template #header>
        <div class="card-header">
          <span class="card-title">最近对话</span>
          <el-button link type="primary" @click="$router.push('/customer-service/conversation')">查看全部</el-button>
        </div>
      </template>
      <el-table :data="recentConversations" v-loading="recentLoading" size="default">
        <el-table-column prop="customerName" label="客户" width="120" />
        <el-table-column prop="channel" label="渠道" width="80">
          <template #default="{ row }">
            <el-tag size="small">{{ getChannelText(row.channel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="summary" label="摘要" min-width="250" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最后更新" width="160">
          <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import StatsCard from '@/components/StatsCard.vue'
import { getCustomerServiceOverview, getConversationList } from '@/api/customer-service'
import type { Conversation } from '@/types'

const trendChartRef = ref<HTMLElement>()
const channelChartRef = ref<HTMLElement>()
let charts: echarts.ECharts[] = []

const overview = reactive<Record<string, number>>({})
const recentConversations = ref<Conversation[]>([])
const recentLoading = ref(false)

async function fetchOverview() {
  try {
    const res = await getCustomerServiceOverview()
    Object.assign(overview, res.data || {})
  } catch { /* ignore */ }
}

async function fetchRecent() {
  recentLoading.value = true
  try {
    const res = await getConversationList({ page: 1, pageSize: 5 })
    recentConversations.value = res.data.items || []
  } catch {
    recentConversations.value = []
  } finally {
    recentLoading.value = false
  }
}

function getChannelText(channel: string) {
  const map: Record<string, string> = { WEB: '网页', PHONE: '电话', EMAIL: '邮件', WECHAT: '微信' }
  return map[channel] || channel
}

function getStatusType(status: string) {
  const map = { ACTIVE: 'success', PENDING: 'warning', CLOSED: 'info' } as const
  return map[status as keyof typeof map] || 'info'
}

function getStatusText(status: string) {
  const map: Record<string, string> = { ACTIVE: '进行中', PENDING: '等待中', CLOSED: '已关闭' }
  return map[status] || status
}

function formatDateTime(value: string | Date | undefined) {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toLocaleString('zh-CN', { hour12: false })
}

function initCharts() {
  if (trendChartRef.value) {
    const chart = echarts.init(trendChartRef.value)
    chart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] },
      yAxis: { type: 'value' },
      series: [
        { name: '活跃对话', type: 'bar', data: [12, 15, 10, 18, 22, 16, 8], itemStyle: { color: '#409eff' } },
        { name: '已解决工单', type: 'line', data: [8, 12, 7, 14, 18, 12, 6], itemStyle: { color: '#67c23a' } },
      ],
    })
    charts.push(chart)
  }

  if (channelChartRef.value) {
    const chart = echarts.init(channelChartRef.value)
    chart.setOption({
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie', radius: ['40%', '70%'],
        data: [
          { value: 45, name: '网页' },
          { value: 25, name: '电话' },
          { value: 20, name: '微信' },
          { value: 10, name: '邮件' },
        ],
      }],
    })
    charts.push(chart)
  }
}

function handleResize() { charts.forEach(c => c.resize()) }

onMounted(() => {
  initCharts()
  fetchOverview()
  fetchRecent()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  charts.forEach(c => c.dispose())
  charts = []
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
</style>
