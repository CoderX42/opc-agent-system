<template>
  <div class="page-container legal-page legal-overview-page">
    <section class="legal-hero">
      <div class="legal-hero-copy">
        <span class="kicker">LEGAL AGENT / RISK DESK</span>
        <h2 class="legal-hero-title">法务概览</h2>
        <p class="legal-hero-desc">集中查看合同生命周期、临期提醒与合规通过率，让法务风险在进入流程前先被看见。</p>
        <div class="legal-hero-meta">
          <span>审查队列 {{ stats.pendingReviews }} 项</span>
          <span>临期合同 {{ stats.expiringContracts }} 份</span>
          <span>合规率 {{ stats.complianceRate }}%</span>
        </div>
      </div>
      <div class="legal-hero-panel">
        <span class="panel-label">TODAY'S PRIORITY</span>
        <strong>{{ stats.expiringContracts || stats.pendingReviews || 0 }}</strong>
        <small>需要法务关注的风险项</small>
        <div class="panel-ruler">
          <i></i><i></i><i></i><i></i>
        </div>
      </div>
      <div class="page-actions legal-hero-actions">
        <el-button icon="MagicStick" @click="$router.push({ path: '/agents/copilot', query: { agent: 'LEGAL' } })">问 Agent</el-button>
        <el-button type="primary" icon="Plus" @click="$router.push('/legal/contract')">新建合同</el-button>
      </div>
    </section>

    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6">
        <StatsCard label="活跃合同" :value="stats.activeContracts" icon="Document" color="#409eff" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="即将到期" :value="stats.expiringContracts" icon="AlarmClock" color="#f56c6c" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="合规率" :value="stats.complianceRate + '%'" icon="CircleCheck" color="#67c23a" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="待审核" :value="stats.pendingReviews" icon="Edit" color="#e6a23c" />
      </el-col>
    </el-row>

    <el-row :gutter="16" class="legal-chart-row">
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="legal-card chart-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">合同状态分布</span>
              <span class="card-note">Contract stages</span>
            </div>
          </template>
          <div ref="statusChartRef" class="chart-container"></div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="legal-card chart-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">月度合同统计</span>
              <span class="card-note">Monthly rhythm</span>
            </div>
          </template>
          <div ref="monthlyChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="legal-card expiring-card">
      <template #header>
        <div class="card-header">
          <div>
            <span class="card-title">即将到期合同</span>
            <p class="card-subtitle">优先处理续签、终止或补充协议</p>
          </div>
          <el-button link type="primary" @click="$router.push('/legal/contract')">查看全部</el-button>
        </div>
      </template>
      <el-table :data="expiringList" v-loading="loading" size="default">
        <el-table-column prop="title" label="合同名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="partyB" label="对方" width="150" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag class="legal-type-tag" size="small">{{ getTypeText(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="到期日期" width="120">
          <template #default="{ row }">{{ formatDate(row.expiryDate) }}</template>
        </el-table-column>
        <el-table-column label="金额" width="140" align="right">
          <template #default="{ row }">
            <span class="money-text">¥{{ formatMoney(row.amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleRenew(row)">续签</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && expiringList.length === 0" description="暂无即将到期合同" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import StatsCard from '@/components/StatsCard.vue'
import { getLegalOverview, getContractList } from '@/api/legal'
import type { Contract } from '@/types'

const statusChartRef = ref<HTMLElement>()
const monthlyChartRef = ref<HTMLElement>()
let charts: echarts.ECharts[] = []

const loading = ref(false)
const stats = reactive({ activeContracts: 0, expiringContracts: 0, complianceRate: 0, pendingReviews: 0 })
const expiringList = ref<Contract[]>([])
const monthlyStats = ref<Array<{ month: string; created: number; expired: number }>>([])

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6e7a72', REVIEWING: '#d9a441', APPROVED: '#4f8f68', REJECTED: '#b94c34', SIGNED: '#1f2a24', EXPIRED: '#909399',
}

const TYPE_MAP: Record<string, string> = { SALES: '销售', PURCHASE: '采购', SERVICE: '服务', NDA: '保密', EMPLOYMENT: '劳务', OTHER: '其他' }

function getTypeText(type: string) { return TYPE_MAP[type] || type }

function formatMoney(value: number | string | undefined | null) {
  if (value === undefined || value === null) return '0.00'
  return Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(value: string | Date | undefined | null) {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toISOString().slice(0, 10)
}

async function fetchOverview() {
  try {
    const res = await getLegalOverview()
    const data = (res.data as any) || {}
    stats.activeContracts = data.activeContracts ?? 0
    stats.expiringContracts = data.expiringContracts ?? 0
    stats.complianceRate = data.complianceRate ?? 0
    stats.pendingReviews = data.pendingReviews ?? 0
    monthlyStats.value = Array.isArray(data.monthlyStats) ? data.monthlyStats : []
  } catch { /* ignore */ }
}

async function fetchExpiring() {
  loading.value = true
  try {
    const res = await getContractList({ page: 1, pageSize: 10 } as any)
    const items = res.data.items || []
    expiringList.value = items
      .filter(item => item.expiryDate)
      .sort((a, b) => new Date(a.expiryDate || 0).getTime() - new Date(b.expiryDate || 0).getTime())
      .slice(0, 5)
  } catch {
    expiringList.value = []
  } finally {
    loading.value = false
  }
}

function renderStatusChart() {
  if (!statusChartRef.value) return
  const statusCounts = expiringList.value.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1
    return acc
  }, {})
  const data = Object.entries(STATUS_COLORS)
    .map(([key, color]) => ({ name: getStatusText(key), value: statusCounts[key] || 0, itemStyle: { color } }))
    .filter(item => item.value > 0)
  const chartData = data.length ? data : [{ name: '暂无数据', value: 1, itemStyle: { color: '#d7c8a7' } }]
  const chart = echarts.init(statusChartRef.value)
  chart.setOption({
    color: Object.values(STATUS_COLORS),
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, left: 'center', itemWidth: 10, itemHeight: 10 },
    series: [{
      type: 'pie',
      radius: ['46%', '72%'],
      center: ['50%', '44%'],
      label: { color: '#445049' },
      itemStyle: { borderColor: '#faf3e2', borderWidth: 3 },
      data: chartData,
    }],
  })
  charts.push(chart)
}

function renderMonthlyChart() {
  if (!monthlyChartRef.value) return
  const fallback = [
    { month: '10月', created: 5, expired: 2 },
    { month: '11月', created: 8, expired: 3 },
    { month: '12月', created: 6, expired: 4 },
    { month: '1月', created: 10, expired: 2 },
    { month: '2月', created: 7, expired: 5 },
    { month: '3月', created: 9, expired: 3 },
  ]
  const source = monthlyStats.value.length ? monthlyStats.value : fallback
  const chart = echarts.init(monthlyChartRef.value)
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['新建', '到期'] },
    grid: { left: '3%', right: '4%', bottom: '8%', containLabel: true },
    xAxis: { type: 'category', data: source.map(item => item.month), axisTick: { show: false } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(31, 42, 36, 0.1)' } } },
    series: [
      { name: '新建', type: 'bar', data: source.map(item => item.created), barWidth: 18, itemStyle: { color: '#1f2a24' } },
      { name: '到期', type: 'bar', data: source.map(item => item.expired), barWidth: 18, itemStyle: { color: '#b94c34' } },
    ],
  })
  charts.push(chart)
}

function getStatusText(s: string) {
  const m: Record<string, string> = { DRAFT: '草稿', REVIEWING: '审核中', APPROVED: '已通过', REJECTED: '已驳回', SIGNED: '已签署', EXPIRED: '已过期' }
  return m[s] || s
}

function handleRenew(row: any) {
  ElMessage.info(`续签合同: ${row.title}`)
}

function handleResize() { charts.forEach(c => c.resize()) }

onMounted(async () => {
  await Promise.all([fetchOverview(), fetchExpiring()])
  renderStatusChart()
  renderMonthlyChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  charts.forEach(c => c.dispose())
  charts = []
  window.removeEventListener('resize', handleResize)
})
</script>

<style lang="scss" scoped>
.legal-page {
  --legal-accent: #8d704a;
  --legal-danger: #b94c34;
}

.legal-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 210px auto;
  gap: 18px;
  align-items: stretch;
  margin-bottom: 20px;
  padding: 22px;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(250, 243, 226, 0.94), rgba(245, 235, 211, 0.9)),
    repeating-linear-gradient(90deg, rgba(31, 42, 36, 0.05) 0 1px, transparent 1px 18px);
  border: 2px solid $forest;
  box-shadow: 6px 8px 0 rgba(31, 42, 36, 0.14);

  &::after {
    position: absolute;
    top: -80px;
    right: 260px;
    width: 220px;
    height: 220px;
    content: '';
    border: 1px solid rgba(141, 112, 74, 0.26);
    transform: rotate(18deg);
  }
}

.legal-hero-copy,
.legal-hero-panel,
.legal-hero-actions {
  position: relative;
  z-index: 1;
}

.legal-hero-title {
  margin-top: 8px;
  font-family: var(--font-display);
  font-size: clamp(28px, 3vw, 42px);
  font-style: italic;
  font-weight: 500;
  line-height: 1.05;
  color: $forest;
}

.legal-hero-desc {
  max-width: 620px;
  margin-top: 10px;
  line-height: 1.75;
  color: $text-regular;
}

.legal-hero-meta {
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
    background: rgba(183, 153, 110, 0.13);
    border: 1px solid rgba(31, 42, 36, 0.18);
  }
}

.legal-hero-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 142px;
  padding: 16px;
  background: $forest;
  border: 1px solid rgba(250, 243, 226, 0.26);
  box-shadow: inset 0 0 0 1px rgba(250, 243, 226, 0.08);

  .panel-label {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: $brass;
  }

  strong {
    margin-top: 8px;
    font-family: var(--font-display);
    font-size: 44px;
    font-style: italic;
    font-weight: 500;
    line-height: 1;
    color: $cream;
  }

  small {
    margin-top: 8px;
    color: rgba(250, 243, 226, 0.74);
  }
}

.panel-ruler {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 5px;
  margin-top: 18px;

  i {
    height: 3px;
    background: rgba(250, 243, 226, 0.18);

    &:first-child,
    &:nth-child(2) {
      background: $brass;
    }
  }
}

.legal-hero-actions {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 10px;
}

.stats-row {
  margin-bottom: 20px;
}

.legal-chart-row {
  row-gap: 16px;
}

.legal-card {
  :deep(.el-card__body) {
    background:
      linear-gradient(180deg, rgba(250, 243, 226, 0.72), rgba(245, 235, 211, 0.48)),
      repeating-linear-gradient(0deg, transparent 0 27px, rgba(31, 42, 36, 0.035) 27px 28px);
  }
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
  gap: 12px;
}

.card-note,
.card-subtitle {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: $brass-deep;
}

.card-subtitle {
  margin-top: 5px;
  letter-spacing: 0.04em;
  text-transform: none;
  color: $text-secondary;
}

.chart-container {
  height: 300px;
  width: 100%;
}

.expiring-card {
  margin-top: 16px;
}

.legal-type-tag {
  background: color-mix(in srgb, $brass 10%, $cream) !important;
  border-color: rgba(141, 112, 74, 0.38) !important;
  color: $brass-deep !important;
}

.money-text {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  color: $forest;
}

@media (max-width: 1100px) {
  .legal-hero {
    grid-template-columns: 1fr;
  }

  .legal-hero-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .legal-hero {
    padding: 18px;
  }

  .legal-hero-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
