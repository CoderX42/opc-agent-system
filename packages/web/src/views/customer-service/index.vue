<template>
  <div class="page-container service-overview-page">
    <section class="service-hero">
      <div class="hero-copy">
        <span class="kicker">Customer Service Agent</span>
        <h2 class="page-title">客服概览</h2>
        <p class="hero-subtitle">
          统一观察客户对话、待处理工单与服务质量，把最需要 Agent 介入的事项放到前面。
        </p>
        <div class="hero-metrics">
          <span>平均响应 {{ formatMinutes(overview.avgResponseTime) }}</span>
          <span>满意度 {{ formatPercent(overview.satisfactionRate) }}</span>
          <span>解决率 {{ resolutionRate }}%</span>
        </div>
      </div>

      <div class="hero-side">
        <div class="signal-card">
          <span class="signal-label">SERVICE LOAD</span>
          <strong>{{ serviceLoadLabel }}</strong>
          <small>{{ pendingTicketCount }} 个工单等待处理，{{ overview.activeConversations ?? 0 }} 个对话进行中</small>
        </div>
        <div class="page-actions">
          <el-button icon="MagicStick" @click="$router.push({ path: '/agents/copilot', query: { agent: 'CUSTOMER_SERVICE' } })">问 Agent</el-button>
          <el-button type="primary" icon="Plus" @click="$router.push('/customer-service/conversation')">进入对话</el-button>
        </div>
      </div>
    </section>

    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6">
        <StatsCard label="活跃对话" :value="overview.activeConversations ?? 0" icon="ChatDotRound" color="#2f8f67" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="待处理工单" :value="pendingTicketCount" icon="Ticket" color="#d9a441" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="今日消息数" :value="overview.todayMessages ?? 0" icon="ChatLineSquare" color="#4f8f68" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="今日已解决" :value="overview.resolvedToday ?? 0" icon="CircleCheck" color="#b94c34" />
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :xs="24" :lg="14">
        <el-card shadow="never" class="service-card chart-card">
          <template #header>
            <div class="card-header">
              <div>
                <span class="card-title">对话 / 工单统计</span>
                <small>最近一周服务工作量</small>
              </div>
              <div class="chart-legend">
                <span><i class="is-conversation"></i>对话</span>
                <span><i class="is-ticket"></i>解决</span>
              </div>
            </div>
          </template>
          <div ref="trendChartRef" class="chart-container"></div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="10">
        <el-card shadow="never" class="service-card chart-card">
          <template #header>
            <div class="card-header">
              <div>
                <span class="card-title">渠道分布</span>
                <small>客户来源占比</small>
              </div>
            </div>
          </template>
          <div ref="channelChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="service-card recent-card">
      <template #header>
        <div class="card-header">
          <div>
            <span class="card-title">最近对话</span>
            <small>按最后更新时间排序</small>
          </div>
          <el-button link type="primary" @click="$router.push('/customer-service/conversation')">查看全部</el-button>
        </div>
      </template>
      <el-table :data="recentConversations" v-loading="recentLoading" size="default">
        <el-table-column label="客户" min-width="160">
          <template #default="{ row }">
            <div class="customer-cell">
              <span class="customer-mark">{{ getInitial(row.customerName) }}</span>
              <div>
                <strong>{{ row.customerName || '匿名客户' }}</strong>
                <small>#{{ shortId(row.id) }}</small>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="channel" label="渠道" width="80">
          <template #default="{ row }">
            <span class="channel-pill" :class="getChannelClass(row.channel)">{{ getChannelText(row.channel) }}</span>
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
        <template #empty>
          <div class="table-empty">
            <strong>还没有最近对话</strong>
            <span>新的客户消息会在这里形成服务流。</span>
          </div>
        </template>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted, onUnmounted } from 'vue'
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

const pendingTicketCount = computed(() => overview.pendingTickets ?? overview.openTickets ?? 0)
const resolutionRate = computed(() => {
  const resolved = overview.resolvedToday ?? 0
  const total = resolved + pendingTicketCount.value
  if (!total) return 0
  return Math.round((resolved / total) * 100)
})
const serviceLoadLabel = computed(() => {
  if (pendingTicketCount.value >= 10) return '高负载'
  if (pendingTicketCount.value >= 4) return '需要关注'
  return '运行平稳'
})

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

function getChannelClass(channel: string) {
  const map: Record<string, string> = { WEB: 'is-web', PHONE: 'is-phone', EMAIL: 'is-email', WECHAT: 'is-wechat' }
  return map[channel] || 'is-web'
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
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('zh-CN', { hour12: false })
}

function formatMinutes(value: number | undefined) {
  if (value === undefined || value === null) return '—'
  if (value < 60) return `${value} 分钟`
  return `${Math.round(value / 60)} 小时`
}

function formatPercent(value: number | undefined) {
  if (value === undefined || value === null) return '—'
  return `${value}%`
}

function getInitial(name?: string) {
  return (name || '客').slice(0, 1).toUpperCase()
}

function shortId(id?: string) {
  return id ? id.slice(0, 8) : '--------'
}

function initCharts() {
  if (trendChartRef.value) {
    const chart = echarts.init(trendChartRef.value)
    chart.setOption({
      color: ['#2f8f67', '#d9a441'],
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1f2a24',
        borderWidth: 0,
        textStyle: { color: '#faf3e2', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 },
        axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(31, 42, 36, 0.06)' } },
      },
      grid: { left: 8, right: 10, top: 26, bottom: 4, containLabel: true },
      xAxis: {
        type: 'category',
        data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
        axisTick: { show: false },
        axisLine: { lineStyle: { color: 'rgba(31, 42, 36, 0.26)' } },
        axisLabel: { color: '#6e7a72', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(31, 42, 36, 0.1)', type: 'dashed' } },
        axisLabel: { color: '#6e7a72', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 },
      },
      series: [
        {
          name: '活跃对话',
          type: 'bar',
          barWidth: 18,
          data: [12, 15, 10, 18, 22, 16, 8],
          itemStyle: { color: '#2f8f67', borderRadius: [3, 3, 0, 0] },
        },
        {
          name: '已解决工单',
          type: 'line',
          smooth: true,
          symbolSize: 7,
          data: [8, 12, 7, 14, 18, 12, 6],
          lineStyle: { width: 3, color: '#d9a441' },
          itemStyle: { color: '#d9a441', borderColor: '#1f2a24', borderWidth: 1 },
          areaStyle: { color: 'rgba(217, 164, 65, 0.12)' },
        },
      ],
    })
    charts.push(chart)
  }

  if (channelChartRef.value) {
    const chart = echarts.init(channelChartRef.value)
    chart.setOption({
      color: ['#2f8f67', '#d9a441', '#4f8f68', '#b94c34'],
      tooltip: {
        trigger: 'item',
        backgroundColor: '#1f2a24',
        borderWidth: 0,
        textStyle: { color: '#faf3e2', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 },
      },
      legend: {
        bottom: 0,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: '#6e7a72', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 },
      },
      series: [{
        type: 'pie', radius: ['40%', '70%'],
        center: ['50%', '45%'],
        padAngle: 3,
        itemStyle: { borderColor: '#faf3e2', borderWidth: 3 },
        label: { color: '#1f2a24', fontFamily: 'Bricolage Grotesque, sans-serif' },
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
.service-overview-page {
  --service-green: #2f8f67;
  --service-gold: #d9a441;
}

.service-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
  gap: 18px;
  align-items: stretch;
  margin-bottom: 18px;
  padding: 20px;
  background:
    linear-gradient(135deg, rgba(47, 143, 103, 0.12), transparent 42%),
    linear-gradient(180deg, $cream, $cream-warm);
  border: 2px solid $forest;
  box-shadow: 6px 8px 0 rgba(31, 42, 36, 0.12);
}

.hero-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.page-title {
  margin-top: 6px;
  font-family: var(--font-display);
  font-size: clamp(25px, 2.4vw, 34px);
  font-weight: 500;
  font-style: italic;
  font-variation-settings: 'opsz' 96, 'SOFT' 30;
  color: $forest;
}

.hero-subtitle {
  max-width: 720px;
  margin-top: 8px;
  line-height: 1.7;
  color: $text-secondary;
}

.hero-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;

  span {
    padding: 5px 9px;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: $forest;
    background: rgba(255, 255, 255, 0.42);
    border: 1px solid rgba(31, 42, 36, 0.16);
  }
}

.hero-side {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
}

.signal-card {
  padding: 14px;
  color: $cream;
  background:
    linear-gradient(135deg, rgba(217, 164, 65, 0.18), transparent 45%),
    $forest;
  border: 1px solid rgba(250, 243, 226, 0.22);
  box-shadow: inset 0 0 0 1px rgba(250, 243, 226, 0.08);

  strong {
    display: block;
    margin-top: 8px;
    font-family: var(--font-display);
    font-size: 26px;
    font-style: italic;
    font-weight: 500;
  }

  small {
    display: block;
    margin-top: 8px;
    line-height: 1.5;
    color: rgba(250, 243, 226, 0.72);
  }
}

.signal-label {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.18em;
  color: $brass;
}

.page-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.stats-row {
  margin-bottom: 18px;
}

.service-card {
  :deep(.el-card__header) {
    padding: 14px 16px;
  }

  :deep(.el-card__body) {
    padding: 16px;
  }
}

.chart-card {
  margin-bottom: 16px;
}

.recent-card {
  margin-top: 0;
}

.card-title { 
  font-family: var(--font-display);
  font-weight: 500;
  font-style: italic;
  font-size: 15px;
  font-variation-settings: 'opsz' 96;
  color: $forest;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;

  small {
    display: block;
    margin-top: 3px;
    font-family: var(--font-mono);
    font-size: 9px;
    font-style: normal;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: $text-placeholder;
  }
}

.chart-legend {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: $text-secondary;

  span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  i {
    width: 8px;
    height: 8px;
    display: inline-block;
    background: var(--service-green);
  }

  .is-ticket {
    background: var(--service-gold);
  }
}

.chart-container {
  height: 300px;
  width: 100%;
}

.customer-cell {
  display: flex;
  align-items: center;
  gap: 10px;

  strong {
    display: block;
    color: $forest;
    font-weight: 700;
  }

  small {
    display: block;
    margin-top: 2px;
    font-family: var(--font-mono);
    font-size: 10px;
    color: $text-placeholder;
  }
}

.customer-mark {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  font-family: var(--font-display);
  font-size: 16px;
  font-style: italic;
  color: $cream;
  background: $forest;
  border: 1.5px solid $forest;
  box-shadow: 2px 2px 0 rgba(31, 42, 36, 0.12);
}

.channel-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  padding: 4px 7px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: $forest;
  border: 1px solid currentColor;
  background: color-mix(in srgb, $brass 12%, $cream);

  &.is-web { color: #2f8f67; }
  &.is-phone { color: #b94c34; }
  &.is-email { color: #8d704a; }
  &.is-wechat { color: #4f8f68; }
}

.table-empty {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 28px 0;
  color: $text-secondary;

  strong {
    color: $forest;
    font-family: var(--font-display);
    font-size: 16px;
    font-style: italic;
    font-weight: 500;
  }

  span {
    font-size: 12px;
  }
}

@media (max-width: 960px) {
  .service-hero {
    grid-template-columns: 1fr;
  }

  .page-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .service-hero {
    padding: 16px;
  }

  .hero-metrics {
    flex-direction: column;
  }

  .card-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .chart-container {
    height: 260px;
  }
}
</style>
