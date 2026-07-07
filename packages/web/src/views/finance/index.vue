<template>
  <div class="page-container">
    <div class="page-header finance-page-header">
      <div>
        <span class="kicker">FINANCE AGENT</span>
        <h2 class="page-title">财务概览</h2>
        <p class="page-subtitle">实时汇总收入、支出、发票与现金流，帮助 Owner 快速判断经营状态。</p>
      </div>
      <div class="page-actions">
        <el-button icon="MagicStick" @click="$router.push({ path: '/agents/copilot', query: { agent: 'FINANCE' } })">问 Agent</el-button>
        <el-button type="primary" icon="Download" @click="handleExport">导出报表</el-button>
      </div>
    </div>

    <section class="finance-hero">
      <div class="finance-hero-copy">
        <span class="hero-stamp">LEDGER SNAPSHOT</span>
        <h3>{{ cashflowStatus }}</h3>
        <p>财务 Agent 已合并交易流水与已通过发票，正在持续关注净利润、支出结构和待审票据。</p>
      </div>
      <div class="finance-hero-metrics">
        <div class="hero-metric">
          <span>净利润率</span>
          <strong :class="{ 'is-negative': Number(overview.netProfit || 0) < 0 }">{{ netProfitRate }}</strong>
        </div>
        <div class="hero-metric">
          <span>支出占比</span>
          <strong>{{ expenseRatio }}</strong>
        </div>
        <div class="hero-metric">
          <span>趋势样本</span>
          <strong>{{ trendMonths }}</strong>
        </div>
      </div>
    </section>

    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6">
        <StatsCard label="总收入" :value="formatMoney(overview.totalIncome)" icon="TrendCharts" color="#4f8f68" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="总支出" :value="formatMoney(overview.totalExpense)" icon="Minus" color="#b94c34" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="净利润" :value="formatMoney(overview.netProfit)" icon="Coin" color="#2f6f7e" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="待审发票" :value="overview.pendingInvoices ?? 0" icon="Document" color="#d9a441" />
      </el-col>
    </el-row>

    <el-row :gutter="16" class="finance-chart-grid">
      <el-col :xs="24" :lg="16">
        <el-card shadow="never" class="finance-chart-card">
          <template #header>
            <div class="chart-card-header">
              <div>
                <span class="kicker">FLOW TREND</span>
                <span class="card-title">月度收支趋势</span>
              </div>
              <span class="chart-note">收入 / 支出</span>
            </div>
          </template>
          <div ref="trendChartRef" class="chart-container"></div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="8">
        <el-card shadow="never" class="finance-chart-card">
          <template #header>
            <div class="chart-card-header">
              <div>
                <span class="kicker">EXPENSE MIX</span>
                <span class="card-title">支出分类</span>
              </div>
              <span class="chart-note">Top 10</span>
            </div>
          </template>
          <div ref="pieChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="finance-section-card">
      <template #header>
        <div class="card-header">
          <div>
            <span class="kicker">RECENT LEDGER</span>
            <span class="card-title">最近交易</span>
          </div>
          <el-button link type="primary" @click="$router.push('/finance/transaction')">查看全部</el-button>
        </div>
      </template>
      <el-table
        :data="recentTransactions"
        v-loading="recentLoading"
        size="default"
        class="finance-table"
        :row-class-name="getTransactionRowClass"
      >
        <el-table-column label="日期" width="120">
          <template #default="{ row }">
            <span class="ledger-date">{{ formatDate(row.transactionDate || row.date) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="transaction-cell">
              <strong>{{ row.description || '未命名交易' }}</strong>
              <span>{{ row.counterparty || row.account || '系统记录' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="130">
          <template #default="{ row }">
            <span class="category-pill">{{ row.category || '未分类' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="row.type === 'INCOME' ? 'success' : 'danger'" size="small" effect="plain">
              {{ row.type === 'INCOME' ? '收入' : '支出' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="140" align="right">
          <template #default="{ row }">
            <span class="money-value" :class="row.type === 'INCOME' ? 'is-income' : 'is-expense'">
              {{ row.type === 'INCOME' ? '+' : '-' }}{{ formatMoney(row.amount) }}
            </span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import StatsCard from '@/components/StatsCard.vue'
import { ElMessage } from 'element-plus'
import { getFinanceOverview, getTransactionList, exportFinanceReport } from '@/api/finance'

const trendChartRef = ref<HTMLElement>()
const pieChartRef = ref<HTMLElement>()
let trendChart: echarts.ECharts | null = null
let pieChart: echarts.ECharts | null = null

const overview = reactive<Record<string, any>>({})
const recentTransactions = ref<any[]>([])
const recentLoading = ref(false)

const FINANCE_COLORS = {
  income: '#1677ff',
  expense: '#dc2626',
  profit: '#00b8ff',
  brass: '#0099cc',
  forest: '#0d47a1',
  muted: '#3c5578',
  paper: '#ffffff',
  rule: 'rgba(13, 71, 161, 0.12)',
}

const netProfitRate = computed(() => {
  const income = Number(overview.totalIncome || 0)
  if (!income) return '0.0%'
  return `${((Number(overview.netProfit || 0) / income) * 100).toFixed(1)}%`
})

const expenseRatio = computed(() => {
  const income = Number(overview.totalIncome || 0)
  const expense = Number(overview.totalExpense || 0)
  if (!income && !expense) return '0.0%'
  return `${((expense / Math.max(income + expense, 1)) * 100).toFixed(1)}%`
})

const trendMonths = computed(() => `${(overview.monthlyTrend || []).length || 1}个月`)

const cashflowStatus = computed(() => {
  const profit = Number(overview.netProfit || 0)
  if (profit > 0) return '现金流保持正向'
  if (profit < 0) return '现金流需要关注'
  return '现金流等待更多数据'
})

async function fetchOverview() {
  try {
    const res = await getFinanceOverview()
    Object.assign(overview, res.data || {})
    renderTrendChart(overview.monthlyTrend || [])
    renderPieChart(overview.categoryDistribution || [])
  } catch { /* ignore */ }
}

async function fetchRecent() {
  recentLoading.value = true
  try {
    const res = await getTransactionList({ page: 1, pageSize: 5 })
    recentTransactions.value = res.data.items || []
  } catch {
    recentTransactions.value = []
  } finally {
    recentLoading.value = false
  }
}

async function handleExport() {
  const today = new Date()
  const monthAgo = new Date(today)
  monthAgo.setMonth(today.getMonth() - 1)
  try {
    const res = await exportFinanceReport({
      startDate: monthAgo.toISOString().slice(0, 10),
      endDate: today.toISOString().slice(0, 10),
    })
    if (res.data?.downloadUrl) {
      window.open(res.data.downloadUrl, '_blank')
      ElMessage.success('报表已生成')
    }
  } catch { /* ignore */ }
}

function formatMoney(value: number | string | undefined) {
  if (value === undefined || value === null) return '¥0.00'
  return '¥' + Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatCompactMoney(value: number | string | undefined) {
  const amount = Number(value || 0)
  if (Math.abs(amount) >= 10000) return `${(amount / 10000).toFixed(1)}万`
  return amount.toLocaleString('zh-CN')
}

function formatDate(value: string | Date | undefined) {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toISOString().slice(0, 10)
}

function getTransactionRowClass({ row }: { row: any }) {
  return row.type === 'INCOME' ? 'is-income-row' : 'is-expense-row'
}

function renderTrendChart(monthlyTrend: Array<{ month: string; income: number; expense: number }>) {
  if (!trendChartRef.value) return
  if (!trendChart) trendChart = echarts.init(trendChartRef.value)
  const months = monthlyTrend.map(m => m.month)
  const incomes = monthlyTrend.map(m => Number(m.income || 0))
  const expenses = monthlyTrend.map(m => Number(m.expense || 0))
  trendChart.setOption({
    color: [FINANCE_COLORS.income, FINANCE_COLORS.expense],
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.96)',
      borderColor: 'rgba(198, 222, 246, 0.8)',
      borderWidth: 1,
      textStyle: { color: FINANCE_COLORS.forest },
      valueFormatter: (value: number | string) => formatMoney(value),
    },
    legend: {
      top: 0,
      right: 8,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: FINANCE_COLORS.muted, fontSize: 11 },
      data: ['收入', '支出'],
    },
    grid: { left: 8, right: 18, top: 42, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: months.length ? months : ['本月'],
      boundaryGap: false,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: FINANCE_COLORS.rule } },
      axisLabel: { color: FINANCE_COLORS.muted },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: FINANCE_COLORS.muted, formatter: (value: number) => formatCompactMoney(value) },
      splitLine: { lineStyle: { color: FINANCE_COLORS.rule, type: 'dashed' } },
    },
    series: [
      {
        name: '收入',
        type: 'line',
        smooth: true,
        symbolSize: 7,
        lineStyle: { width: 3 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(22, 119, 255, 0.24)' },
            { offset: 1, color: 'rgba(22, 119, 255, 0.02)' },
          ]),
        },
        data: incomes,
      },
      {
        name: '支出',
        type: 'line',
        smooth: true,
        symbolSize: 7,
        lineStyle: { width: 3 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(220, 38, 38, 0.2)' },
            { offset: 1, color: 'rgba(220, 38, 38, 0.02)' },
          ]),
        },
        data: expenses,
      },
    ],
  })
}

function renderPieChart(categories: Array<{ category: string; amount: number }>) {
  if (!pieChartRef.value) return
  if (!pieChart) pieChart = echarts.init(pieChartRef.value)
  pieChart.setOption({
    color: ['#dc2626', '#ea580c', '#1677ff', '#00b8ff', '#00e0c6', '#3c5578', '#0d47a1'],
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.96)',
      borderColor: 'rgba(198, 222, 246, 0.8)',
      borderWidth: 1,
      textStyle: { color: FINANCE_COLORS.forest },
      formatter: '{b}<br/>¥{c} · {d}%',
    },
    legend: {
      bottom: 0,
      left: 'center',
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: FINANCE_COLORS.muted, fontSize: 11 },
    },
    series: [
      {
        type: 'pie',
        radius: ['48%', '72%'],
        center: ['50%', '45%'],
        itemStyle: { borderRadius: 6, borderColor: FINANCE_COLORS.paper, borderWidth: 3 },
        label: { show: false },
        emphasis: { scaleSize: 6, label: { show: true, fontSize: 13, fontWeight: 'bold', color: FINANCE_COLORS.forest } },
        data: categories.length
          ? categories.map(c => ({ value: c.amount, name: c.category }))
          : [{ value: 1, name: '暂无数据' }],
      },
    ],
  })
}

function handleResize() {
  trendChart?.resize()
  pieChart?.resize()
}

onMounted(() => {
  fetchOverview()
  fetchRecent()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  trendChart?.dispose()
  pieChart?.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>

<style lang="scss" scoped>
.finance-page-header {
  align-items: flex-end;
}

.page-subtitle {
  margin-top: 6px;
  color: $text-secondary;
  line-height: 1.7;
}

.finance-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 20px;
  margin-bottom: 16px;
  padding: 20px 24px;
  overflow: hidden;
  background: rgb(var(--surface) / 0.92);
  border: 1px solid rgb(var(--line) / 0.6);
  border-radius: 1.5rem;
  box-shadow: $shadow-soft;
  color: rgb(var(--text));
  backdrop-filter: blur(12px);

}

.finance-hero-copy,
.finance-hero-metrics {
  position: relative;
  z-index: 1;
}

.hero-stamp {
  display: inline-flex;
  padding: 3px 10px;
  margin-bottom: 10px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgb(var(--accent));
  background: rgb(var(--accent) / 0.1);
  border-radius: 999px;
}

.finance-hero h3 {
  margin-bottom: 8px;
  font-family: var(--font-body);
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 700;
  line-height: 1.1;
}

.finance-hero p {
  max-width: 620px;
  color: rgb(var(--muted));
  line-height: 1.6;
}

.finance-hero-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(112px, 1fr));
  min-width: 390px;
  align-self: stretch;
  background: rgb(var(--elev) / 0.5);
  border-radius: 1rem;
  overflow: hidden;
}

.hero-metric {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding: 14px 16px;
  border-right: 1px solid rgb(var(--line) / 0.4);

  &:last-child {
    border-right: 0;
  }

  span {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.08em;
    color: rgb(var(--muted));
  }

  strong {
    font-family: var(--font-body);
    font-size: 24px;
    font-weight: 700;
    color: rgb(var(--text));
    font-variant-numeric: tabular-nums;

    &.is-negative {
      color: rgb(var(--danger));
    }
  }
}

.stats-row { margin-bottom: 16px; }

.finance-chart-grid {
  row-gap: 16px;
}

.finance-chart-card {
  height: 100%;
}

.finance-section-card {
  margin-top: 16px;
}

.card-title { 
  display: block;
  font-family: var(--font-display);
  font-weight: 500;
  font-style: italic;
  font-size: 15px;
  font-variation-settings: 'opsz' 96;
  color: $forest;
}

.card-header,
.chart-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.chart-note {
  padding: 4px 8px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: $brass-deep;
  border: 1px solid $rule;
  background: $cream-warm;
}

.chart-container { height: 320px; width: 100%; }

.ledger-date {
  font-family: var(--font-mono);
  font-size: 11px;
  color: $text-secondary;
}

.transaction-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;

  strong {
    color: $forest;
    font-size: 13px;
    font-weight: 700;
  }

  span {
    color: $text-secondary;
    font-size: 11px;
  }
}

.category-pill {
  display: inline-flex;
  max-width: 100%;
  padding: 3px 8px;
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: $brass-deep;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: color-mix(in srgb, $brass 10%, $cream);
  border: 1px solid rgba(183, 153, 110, 0.38);
}

.money-value {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;

  &.is-income {
    color: $success-color;
  }

  &.is-expense {
    color: $danger-color;
  }
}

:deep(.finance-table .is-income-row td:first-child) {
  box-shadow: inset 3px 0 0 $success-color;
}

:deep(.finance-table .is-expense-row td:first-child) {
  box-shadow: inset 3px 0 0 $danger-color;
}

@media (max-width: 960px) {
  .finance-hero {
    grid-template-columns: 1fr;
  }

  .finance-hero-metrics {
    min-width: 0;
  }
}

@media (max-width: 640px) {
  .finance-page-header {
    align-items: flex-start;
  }

  .finance-hero-metrics {
    grid-template-columns: 1fr;
  }

  .hero-metric {
    border-right: 0;
    border-bottom: 1px solid rgba(250, 243, 226, 0.16);

    &:last-child {
      border-bottom: 0;
    }
  }
}
</style>
