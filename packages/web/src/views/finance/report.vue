<template>
  <div class="page-container">
    <div class="page-header report-page-header">
      <div>
        <span class="kicker">FINANCIAL REPORT</span>
        <h2 class="page-title">财务报表</h2>
        <p class="page-subtitle">面向月结复盘的收入、支出、利润与费用结构分析。</p>
      </div>
      <div class="page-actions">
        <el-button type="primary" icon="Download" @click="handleExport">导出报表</el-button>
      </div>
    </div>

    <section class="report-hero">
      <div class="report-hero-main">
        <span class="hero-stamp">MONTH CLOSE</span>
        <h3>{{ reportSignal }}</h3>
        <p>当前报表基于最近月度趋势生成，适合快速复核经营结果、费用结构和利润波动。</p>
      </div>
      <div class="report-ledger">
        <div>
          <span>利润率</span>
          <strong :class="{ 'is-negative': monthSummary.profit < 0 }">{{ profitRate }}</strong>
        </div>
        <div>
          <span>收入覆盖</span>
          <strong>{{ incomeCoverage }}</strong>
        </div>
        <div>
          <span>结构项</span>
          <strong>{{ categoryCount }}</strong>
        </div>
      </div>
    </section>

    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6">
        <StatsCard label="本月收入" :value="formatMoney(monthSummary.income)" icon="TrendCharts" color="#4f8f68" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="本月支出" :value="formatMoney(monthSummary.expense)" icon="Minus" color="#b94c34" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="利润率" :value="profitRate" icon="DataLine" color="#2f6f7e" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="净利润" :value="formatMoney(monthSummary.profit)" icon="Coin" color="#d9a441" />
      </el-col>
    </el-row>

    <el-card shadow="never" class="report-card report-trend-card">
      <template #header>
        <div class="chart-card-header">
          <div>
            <span class="kicker">MONTHLY FLOW</span>
            <span class="card-title">月度收支趋势</span>
          </div>
          <span class="chart-note">收入 / 支出 / 净利润</span>
        </div>
      </template>
      <div ref="trendChartRef" class="chart-container"></div>
    </el-card>

    <el-row :gutter="16" class="report-grid">
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="report-card">
          <template #header>
            <div class="chart-card-header">
              <div>
                <span class="kicker">REVENUE MIX</span>
                <span class="card-title">收入结构</span>
              </div>
              <span class="chart-note">分类占比</span>
            </div>
          </template>
          <div ref="incomeChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="report-card">
          <template #header>
            <div class="chart-card-header">
              <div>
                <span class="kicker">EXPENSE MIX</span>
                <span class="card-title">支出结构</span>
              </div>
              <span class="chart-note">费用占比</span>
            </div>
          </template>
          <div ref="expenseChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="report-card report-profit-card">
      <template #header>
        <div class="chart-card-header">
          <div>
            <span class="kicker">PROFIT LINE</span>
            <span class="card-title">利润趋势</span>
          </div>
          <span class="chart-note">净利润</span>
        </div>
      </template>
      <div ref="profitChartRef" class="chart-container"></div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import StatsCard from '@/components/StatsCard.vue'
import { ElMessage } from 'element-plus'
import { getFinanceOverview, exportFinanceReport } from '@/api/finance'

const trendChartRef = ref<HTMLElement>()
const incomeChartRef = ref<HTMLElement>()
const expenseChartRef = ref<HTMLElement>()
const profitChartRef = ref<HTMLElement>()

let charts: echarts.ECharts[] = []

const overview = reactive<Record<string, any>>({})
const monthSummary = reactive({ income: 0, expense: 0, profit: 0 })

const profitRate = computed(() => {
  if (!monthSummary.income) return '0%'
  return ((monthSummary.profit / monthSummary.income) * 100).toFixed(1) + '%'
})

const incomeCoverage = computed(() => {
  if (!monthSummary.expense) return monthSummary.income ? '100%+' : '0%'
  return `${((monthSummary.income / monthSummary.expense) * 100).toFixed(0)}%`
})

const categoryCount = computed(() => `${((overview.categoryDistribution || []) as unknown[]).length}项`)

const reportSignal = computed(() => {
  if (monthSummary.profit > 0) return '本月利润表现为正'
  if (monthSummary.profit < 0) return '本月利润承压'
  return '等待月度数据沉淀'
})

const FINANCE_COLORS = {
  income: '#4f8f68',
  expense: '#b94c34',
  profit: '#2f6f7e',
  brass: '#b7996e',
  forest: '#1f2a24',
  muted: '#6e7a72',
  paper: '#faf3e2',
  rule: 'rgba(31, 42, 36, 0.14)',
}

async function fetchOverview() {
  try {
    const res = await getFinanceOverview()
    Object.assign(overview, res.data || {})
    const trend = (overview.monthlyTrend || []) as Array<{ month: string; income: number; expense: number }>
    if (trend.length > 0) {
      const last = trend[trend.length - 1]
      monthSummary.income = Number(last.income || 0)
      monthSummary.expense = Number(last.expense || 0)
      monthSummary.profit = monthSummary.income - monthSummary.expense
    }
    renderCharts()
  } catch { /* ignore */ }
}

function renderCharts() {
  const trend = (overview.monthlyTrend || []) as Array<{ month: string; income: number; expense: number }>
  const categories = (overview.categoryDistribution || []) as Array<{ category: string; amount: number }>
  const months = trend.map(m => m.month)
  const incomes = trend.map(m => Number(m.income || 0))
  const expenses = trend.map(m => Number(m.expense || 0))
  const profits = incomes.map((v, i) => v - expenses[i])

  if (trendChartRef.value) {
    const chart = echarts.init(trendChartRef.value)
    chart.setOption({
      color: [FINANCE_COLORS.income, FINANCE_COLORS.expense, FINANCE_COLORS.profit],
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(250, 243, 226, 0.96)',
        borderColor: FINANCE_COLORS.forest,
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
        data: ['收入', '支出', '净利润'],
      },
      grid: { left: 8, right: 18, top: 44, bottom: 8, containLabel: true },
      xAxis: {
        type: 'category',
        data: months.length ? months : ['本月'],
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
        { name: '收入', type: 'bar', data: incomes, barMaxWidth: 24, itemStyle: { borderRadius: [5, 5, 0, 0] } },
        { name: '支出', type: 'bar', data: expenses, barMaxWidth: 24, itemStyle: { borderRadius: [5, 5, 0, 0] } },
        { name: '净利润', type: 'line', smooth: true, symbolSize: 7, lineStyle: { width: 3 }, data: profits },
      ],
    })
    charts.push(chart)
  }

  if (incomeChartRef.value) {
    const chart = echarts.init(incomeChartRef.value)
    chart.setOption({
      color: ['#4f8f68', '#2f6f7e', '#b7996e', '#8d704a', '#6e7a72'],
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(250, 243, 226, 0.96)',
        borderColor: FINANCE_COLORS.forest,
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
      series: [{
        type: 'pie',
        radius: ['46%', '70%'],
        center: ['50%', '45%'],
        itemStyle: { borderRadius: 6, borderColor: FINANCE_COLORS.paper, borderWidth: 3 },
        label: { show: false },
        emphasis: { scaleSize: 6, label: { show: true, fontSize: 13, fontWeight: 'bold', color: FINANCE_COLORS.forest } },
        data: categories.length ? categories.map(c => ({ value: c.amount, name: c.category })) : [{ value: 1, name: '暂无数据' }],
      }],
    })
    charts.push(chart)
  }

  if (expenseChartRef.value) {
    const chart = echarts.init(expenseChartRef.value)
    chart.setOption({
      color: ['#b94c34', '#d98f45', '#b7996e', '#8d704a', '#6e7a72'],
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(250, 243, 226, 0.96)',
        borderColor: FINANCE_COLORS.forest,
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
      series: [{
        type: 'pie',
        radius: ['46%', '70%'],
        center: ['50%', '45%'],
        itemStyle: { borderRadius: 6, borderColor: FINANCE_COLORS.paper, borderWidth: 3 },
        label: { show: false },
        emphasis: { scaleSize: 6, label: { show: true, fontSize: 13, fontWeight: 'bold', color: FINANCE_COLORS.forest } },
        data: categories.length ? categories.map(c => ({ value: c.amount, name: c.category })) : [{ value: 1, name: '暂无数据' }],
      }],
    })
    charts.push(chart)
  }

  if (profitChartRef.value) {
    const chart = echarts.init(profitChartRef.value)
    chart.setOption({
      color: [FINANCE_COLORS.profit],
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(250, 243, 226, 0.96)',
        borderColor: FINANCE_COLORS.forest,
        borderWidth: 1,
        textStyle: { color: FINANCE_COLORS.forest },
        valueFormatter: (value: number | string) => formatMoney(value),
      },
      grid: { left: 8, right: 18, top: 28, bottom: 8, containLabel: true },
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
      series: [{
        type: 'line',
        smooth: true,
        symbolSize: 7,
        lineStyle: { width: 3 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(47, 111, 126, 0.24)' },
            { offset: 1, color: 'rgba(47, 111, 126, 0.02)' },
          ]),
        },
        data: profits,
      }],
    })
    charts.push(chart)
  }
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

function handleResize() { charts.forEach(c => c.resize()) }

onMounted(() => {
  fetchOverview()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  charts.forEach(c => c.dispose())
  charts = []
  window.removeEventListener('resize', handleResize)
})
</script>

<style lang="scss" scoped>
.report-page-header {
  align-items: flex-end;
}

.page-subtitle {
  margin-top: 6px;
  color: $text-secondary;
  line-height: 1.7;
}

.report-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.54fr);
  gap: 20px;
  margin-bottom: 16px;
  padding: 18px 20px;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(31, 42, 36, 0.96), rgba(44, 58, 50, 0.92)),
    radial-gradient(circle at 90% 0%, rgba(217, 164, 65, 0.36), transparent 38%);
  border: 2px solid $forest;
  box-shadow: $shadow-md;
  color: $cream;

  &::before {
    position: absolute;
    inset: 8px;
    pointer-events: none;
    content: '';
    border: 1px solid rgba(250, 243, 226, 0.18);
  }
}

.report-hero-main,
.report-ledger {
  position: relative;
  z-index: 1;
}

.hero-stamp {
  display: inline-flex;
  padding: 3px 8px;
  margin-bottom: 10px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: $forest;
  background: $brass;
}

.report-hero h3 {
  margin-bottom: 8px;
  font-family: var(--font-display);
  font-size: clamp(24px, 3vw, 34px);
  font-style: italic;
  font-weight: 500;
  line-height: 1;
}

.report-hero p {
  max-width: 640px;
  color: rgba(250, 243, 226, 0.74);
  line-height: 1.7;
}

.report-ledger {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 1px solid rgba(250, 243, 226, 0.16);
}

.report-ledger div {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  min-height: 96px;
  padding: 14px;
  border-right: 1px solid rgba(250, 243, 226, 0.16);

  &:last-child {
    border-right: 0;
  }
}

.report-ledger span {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  color: rgba(250, 243, 226, 0.62);
}

.report-ledger strong {
  font-family: var(--font-display);
  font-size: 24px;
  font-style: italic;
  font-weight: 500;
  color: $cream;
  font-variant-numeric: tabular-nums;

  &.is-negative {
    color: #ffb199;
  }
}

.stats-row { margin-bottom: 20px; }

.report-card {
  height: 100%;
}

.report-trend-card {
  margin-bottom: 16px;
}

.report-grid {
  row-gap: 16px;
}

.report-profit-card {
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
  white-space: nowrap;
  border: 1px solid $rule;
  background: $cream-warm;
}

.chart-container { height: 320px; width: 100%; }

@media (max-width: 960px) {
  .report-hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .report-page-header {
    align-items: flex-start;
  }

  .report-ledger {
    grid-template-columns: 1fr;
  }

  .report-ledger div {
    border-right: 0;
    border-bottom: 1px solid rgba(250, 243, 226, 0.16);

    &:last-child {
      border-bottom: 0;
    }
  }
}
</style>
