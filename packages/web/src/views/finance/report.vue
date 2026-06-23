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

    <el-card shadow="never" class="report-card report-trend-card kline-card">
      <template #header>
        <div class="chart-card-header">
          <div class="kline-title">
            <span class="kicker">CASHFLOW KLINE / 收支 K 线</span>
            <span class="card-title">期会 · Ledger Session</span>
          </div>
          <div class="kline-toolbar">
            <span class="dimension-pill">
              <i class="dot"></i>
              {{ dimensionLabel }} · 交易 {{ activePeriodCount }}/{{ klineSeries.length }} 根
            </span>
            <el-segmented
              v-model="klineDimension"
              :options="dimensionOptions"
              size="small"
              class="dimension-switcher"
            />
          </div>
        </div>
      </template>

      <div class="kline-session" :class="{ 'is-bear': latestKline && latestKline.c < latestKline.o }">
        <div class="kline-cell kline-cell--period">
          <span class="cell-label">最新一期</span>
          <strong class="cell-display">{{ latestKline?.x || '—' }}</strong>
          <span class="cell-foot">
            {{ periodRange.from }} → {{ periodRange.to }}
          </span>
        </div>
        <div class="kline-cell">
          <span class="cell-label">开盘</span>
          <strong class="cell-display">{{ latestKline ? formatMoney(latestKline.o) : '—' }}</strong>
          <span class="cell-foot">OPEN</span>
        </div>
        <div class="kline-cell">
          <span class="cell-label">收盘</span>
          <strong class="cell-display" :class="trendClass">
            {{ latestKline ? formatMoney(latestKline.c) : '—' }}
          </strong>
          <span class="cell-foot">{{ latestKline ? trendArrow + ' ' + trendPct : 'CLOSE' }}</span>
        </div>
        <div class="kline-cell">
          <span class="cell-label">最高</span>
          <strong class="cell-display is-up">{{ latestKline ? formatMoney(latestKline.h) : '—' }}</strong>
          <span class="cell-foot">HIGH</span>
        </div>
        <div class="kline-cell">
          <span class="cell-label">最低</span>
          <strong class="cell-display is-down">{{ latestKline ? formatMoney(latestKline.l) : '—' }}</strong>
          <span class="cell-foot">LOW</span>
        </div>
        <div class="kline-cell kline-cell--trend">
          <span class="cell-label">本期振幅</span>
          <strong class="cell-display">{{ latestKline ? formatMoney(latestKline.h - latestKline.l) : '—' }}</strong>
          <span class="cell-foot">{{ latestKline ? amplitudeText : 'RANGE' }}</span>
        </div>
      </div>

      <div class="kline-stage">
        <div v-loading="klineLoading" ref="klineChartRef" class="chart-container chart-container--kline"></div>
        <div v-if="!klineLoading && (!klineSeries.length || totalCount === 0)" class="kline-empty">
          <span class="empty-stamp">NO DATA</span>
          <strong>暂无{{ dimensionLabel }}度数据</strong>
          <small>录入交易或审核发票后,这里会自动长出 K 线。</small>
        </div>
      </div>

      <div class="kline-footer">
        <div class="footer-cell">
          <span class="cell-label">总笔数</span>
          <strong>{{ totalCount }} 笔</strong>
        </div>
        <div class="footer-cell">
          <span class="cell-label">总流水</span>
          <strong>{{ formatMoney(totalTurnover) }}</strong>
        </div>
        <div class="footer-cell">
          <span class="cell-label">累计净额</span>
          <strong :class="netCashflow >= 0 ? 'is-up' : 'is-down'">
            {{ netCashflow >= 0 ? '+' : '-' }}{{ formatMoney(Math.abs(netCashflow)) }}
          </strong>
        </div>
        <div class="footer-cell footer-cell--legend">
          <span class="legend-pill"><i class="swatch swatch--up"></i>上涨</span>
          <span class="legend-pill"><i class="swatch swatch--down"></i>下跌</span>
          <span class="legend-pill"><i class="swatch swatch--empty"></i>无发生额 {{ emptyPeriodCount }}</span>
          <span class="legend-pill"><i class="swatch swatch--ma5"></i>MA5</span>
          <span class="legend-pill"><i class="swatch swatch--ma10"></i>MA10</span>
          <span class="legend-pill"><i class="swatch swatch--ma20"></i>MA20</span>
        </div>
      </div>
    </el-card>

    <el-dialog
      v-model="klineDetailVisible"
      :title="`${klineDetail?.period || ''} K线明细`"
      width="760px"
      class="kline-detail-dialog"
    >
      <div v-loading="klineDetailLoading" class="kline-detail">
        <div v-if="klineDetail" class="kline-detail-summary">
          <div>
            <span>周期</span>
            <strong>{{ klineDetail.range.start }} → {{ klineDetail.range.end }}</strong>
          </div>
          <div>
            <span>开盘</span>
            <strong>{{ formatMoney(klineDetail.o) }}</strong>
          </div>
          <div>
            <span>收盘</span>
            <strong :class="klineDetail.c >= klineDetail.o ? 'is-up' : 'is-down'">{{ formatMoney(klineDetail.c) }}</strong>
          </div>
          <div>
            <span>最高/最低</span>
            <strong>{{ formatMoney(klineDetail.h) }} / {{ formatMoney(klineDetail.l) }}</strong>
          </div>
          <div>
            <span>收入</span>
            <strong class="is-up">{{ formatMoney(klineDetail.income) }}</strong>
          </div>
          <div>
            <span>支出</span>
            <strong class="is-down">{{ formatMoney(klineDetail.expense) }}</strong>
          </div>
        </div>

        <el-empty v-if="klineDetail && !klineDetail.items.length" description="该周期无收入/支出明细" />
        <el-table v-else-if="klineDetail" :data="klineDetail.items" size="small" class="kline-detail-table">
          <el-table-column prop="date" label="日期" width="104" />
          <el-table-column label="来源" width="86">
            <template #default="{ row }">{{ row.source === 'invoice' ? '发票' : '记账' }}</template>
          </el-table-column>
          <el-table-column label="类型" width="76">
            <template #default="{ row }">
              <el-tag :type="isIncomeType(row.type) ? 'danger' : 'success'" size="small" effect="plain">
                {{ isIncomeType(row.type) ? '收入' : '支出' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="category" label="分类" min-width="96" />
          <el-table-column prop="counterparty" label="往来方" min-width="120" show-overflow-tooltip />
          <el-table-column label="金额" width="116" align="right">
            <template #default="{ row }">
              <span :class="isIncomeType(row.type) ? 'is-up' : 'is-down'">
                {{ isIncomeType(row.type) ? '+' : '-' }}{{ formatMoney(row.amount) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="发生后余额" width="128" align="right">
            <template #default="{ row }">{{ formatMoney(row.balanceAfter) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

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
import { ref, computed, reactive, watch, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import StatsCard from '@/components/StatsCard.vue'
import { ElMessage } from 'element-plus'
import {
  getFinanceOverview,
  exportFinanceReport,
  getFinanceKline,
  getFinanceKlineDetail,
  type KlineDetail,
  type KlineSeries,
} from '@/api/finance'

type Dimension = 'daily' | 'monthly' | 'yearly'

const klineChartRef = ref<HTMLElement>()
const incomeChartRef = ref<HTMLElement>()
const expenseChartRef = ref<HTMLElement>()
const profitChartRef = ref<HTMLElement>()

let klineChart: echarts.ECharts | null = null
let charts: echarts.ECharts[] = []

const overview = reactive<Record<string, any>>({})
const monthSummary = reactive({ income: 0, expense: 0, profit: 0 })

const klineDimension = ref<Dimension>('monthly')
const klineLoading = ref(false)
const klineDetailVisible = ref(false)
const klineDetailLoading = ref(false)
const klineDetail = ref<KlineDetail | null>(null)
const klineCache = reactive<Record<Dimension, KlineSeries[] | undefined>>({
  daily: undefined,
  monthly: undefined,
  yearly: undefined,
})

const dimensionOptions: Array<{ label: string; value: Dimension }> = [
  { label: '日', value: 'daily' },
  { label: '月', value: 'monthly' },
  { label: '年', value: 'yearly' },
]

const dimensionRangeDays: Record<Dimension, number> = {
  daily: 365,
  monthly: 365,
  yearly: 365 * 5,
}

const dimensionLabelMap: Record<Dimension, string> = {
  daily: '日',
  monthly: '月',
  yearly: '年',
}

const klineSeries = computed<KlineSeries[]>(() => klineCache[klineDimension.value] ?? [])
const latestKline = computed(() => {
  const arr = klineSeries.value
  return arr.length ? arr[arr.length - 1] : null
})

const dimensionLabel = computed(() => dimensionLabelMap[klineDimension.value])

const trendArrow = computed(() => {
  const k = latestKline.value
  if (!k) return ''
  if (k.empty) return '—'
  return k.c >= k.o ? '▲' : '▼'
})

const trendClass = computed(() => {
  const k = latestKline.value
  if (!k) return ''
  if (k.empty) return 'is-empty'
  return k.c >= k.o ? 'is-up' : 'is-down'
})

const trendPct = computed(() => {
  const k = latestKline.value
  if (!k) return '0.00%'
  if (k.empty) return '无发生额'
  if (!k.o) return '0.00%'
  const pct = ((k.c - k.o) / Math.abs(k.o)) * 100
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
})

const amplitudeText = computed(() => {
  const k = latestKline.value
  if (!k) return 'RANGE'
  if (k.empty) return '无发生额'
  if (!k.o) return 'RANGE'
  const amp = k.o !== 0 ? (Math.abs(k.h - k.l) / Math.abs(k.o)) * 100 : 0
  return `RANGE · ${amp.toFixed(1)}%`
})

const periodRange = computed(() => {
  const arr = klineSeries.value
  if (!arr.length) return { from: '—', to: '—' }
  return { from: arr[0].x, to: arr[arr.length - 1].x }
})

const totalCount = computed(() => klineSeries.value.reduce((acc, s) => acc + s.count, 0))

const activePeriodCount = computed(() => klineSeries.value.filter(s => !s.empty).length)

const emptyPeriodCount = computed(() => klineSeries.value.length - activePeriodCount.value)

const totalTurnover = computed(() =>
  klineSeries.value.reduce((acc, s) => acc + s.income + s.expense, 0),
)

const netCashflow = computed(() =>
  klineSeries.value.reduce((acc, s) => acc + (s.income - s.expense), 0),
)

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
  klineUp: '#d84a3a',
  klineDown: '#2f9b63',
  klineEmpty: '#a8ada7',
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

function isIncomeType(type: string) {
  return type === 'INCOME' || type === 'income'
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

function handleResize() {
  charts.forEach(c => c.resize())
  klineChart?.resize()
}

// =============== K 线图:维度切换 + OHLC + MA5/10/20 ===============

let dimensionSwitchTimer: ReturnType<typeof setTimeout> | null = null
let klineRequestSeq = 0

function computeMA(values: number[], window: number): Array<number | string> {
  return values.map((_, idx) => {
    if (idx < window - 1) return '-'
    let sum = 0
    for (let i = idx - window + 1; i <= idx; i++) sum += values[i]
    return Math.round((sum / window) * 100) / 100
  })
}

function ensureKlineChart(): echarts.ECharts | null {
  if (!klineChartRef.value) return null
  if (!klineChart) klineChart = echarts.init(klineChartRef.value)
  return klineChart
}

function renderKlineChart(series: KlineSeries[]) {
  const chart = ensureKlineChart()
  if (!chart) return
  const xs = series.map(s => s.x)
  const candlestick = series.map((s) => ({
    value: [s.o, s.c, s.l, s.h],
    itemStyle: s.empty
      ? {
          color: 'rgba(168, 173, 167, 0.14)',
          color0: 'rgba(168, 173, 167, 0.14)',
          borderColor: FINANCE_COLORS.klineEmpty,
          borderColor0: FINANCE_COLORS.klineEmpty,
          borderWidth: 1,
        }
      : undefined,
  }))
  const seriesByLabel = new Map(series.map(item => [item.x, item]))
  const closes = series.map(s => s.c)
  const ma5 = computeMA(closes, 5)
  const ma10 = computeMA(closes, 10)
  const ma20 = computeMA(closes, 20)

  const lastIdx = series.length - 1
  const lastPoint = lastIdx >= 0 ? { name: '最新', coord: [xs[lastIdx], closes[lastIdx] ?? 0] } : null

  const MA_COLORS = {
    ma5: '#d9a441', // 暖金
    ma10: '#2f6f7e', // 深蓝绿
    ma20: '#6e7a72', // 烟灰
  }

  chart.setOption(
    {
      animation: false,
      color: [FINANCE_COLORS.klineUp, FINANCE_COLORS.klineDown, MA_COLORS.ma5, MA_COLORS.ma10, MA_COLORS.ma20],
      backgroundColor: 'transparent',
      legend: {
        top: 4,
        right: 8,
        itemWidth: 12,
        itemHeight: 8,
        itemGap: 14,
        textStyle: { color: FINANCE_COLORS.muted, fontSize: 11, padding: [0, 0, 0, 2] },
        icon: 'roundRect',
        data: [
          { name: '净现金流' },
          { name: 'MA5' },
          { name: 'MA10' },
          { name: 'MA20' },
        ],
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(250, 243, 226, 0.98)',
        borderColor: FINANCE_COLORS.forest,
        borderWidth: 1,
        padding: [10, 12],
        extraCssText: 'box-shadow: 0 6px 20px rgba(31, 42, 36, 0.18); border-radius: 4px;',
        textStyle: { color: FINANCE_COLORS.forest, fontSize: 12, fontFamily: 'var(--font-mono)' },
        axisPointer: {
          type: 'cross',
          lineStyle: { color: FINANCE_COLORS.muted, type: 'dashed', opacity: 0.7 },
          crossStyle: { color: FINANCE_COLORS.muted, type: 'dashed', opacity: 0.7 },
          label: {
            backgroundColor: FINANCE_COLORS.forest,
            borderColor: 'transparent',
            color: FINANCE_COLORS.paper,
            padding: [4, 6],
            fontSize: 11,
          },
        },
        formatter: (params: any) => {
          if (!Array.isArray(params) || !params.length) return ''
          const first = params[0]
          const xLabel = first.axisValueLabel ?? first.name
          const candleParam = params.find((p: any) => p.seriesType === 'candlestick')
          const candleData = candleParam?.data
          const candleValue = Array.isArray(candleData) ? candleData : candleData?.value
          const o = Array.isArray(candleValue) ? Number(candleValue[0]) : 0
          const c = Array.isArray(candleValue) ? Number(candleValue[1]) : 0
          const l = Array.isArray(candleValue) ? Number(candleValue[2]) : 0
          const h = Array.isArray(candleValue) ? Number(candleValue[3]) : 0
          const item = seriesByLabel.get(xLabel)
          const isEmpty = Boolean(item?.empty)
          const isUp = c >= o
          const trendColor = isEmpty ? FINANCE_COLORS.klineEmpty : (isUp ? FINANCE_COLORS.klineUp : FINANCE_COLORS.klineDown)
          const change = c - o
          const changePct = o !== 0 ? ((change / Math.abs(o)) * 100).toFixed(2) : '0.00'
          const trendArrow = isEmpty ? '—' : (isUp ? '▲' : '▼')
          const incomeVal = item?.income ?? 0
          const expenseVal = item?.expense ?? 0
          const countVal = item?.count ?? 0
          const turnover = incomeVal + expenseVal
          const row = (label: string, value: string, color = FINANCE_COLORS.forest) => (
            `<div style="display:flex;justify-content:space-between;gap:18px;line-height:1.6;">` +
            `<span style="color:${FINANCE_COLORS.muted};">${label}</span>` +
            `<strong style="color:${color};font-variant-numeric:tabular-nums;">${value}</strong></div>`
          )
          const headerBg = isEmpty
            ? 'rgba(168, 173, 167, 0.16)'
            : (isUp ? 'rgba(216, 74, 58, 0.12)' : 'rgba(47, 155, 99, 0.12)')
          return [
            `<div style="font-weight:700;padding:4px 8px;margin:-10px -12px 8px;background:${headerBg};border-bottom:1px solid ${FINANCE_COLORS.rule};">` +
              `<span style="font-size:12px;">${xLabel}</span>` +
              `<span style="float:right;color:${trendColor};font-size:11px;">${isEmpty ? '无发生额' : `${trendArrow} ${changePct}%`}</span>` +
            `</div>`,
            row('状态', isEmpty ? '无收入/支出' : '有交易发生', trendColor),
            row('开', formatMoney(o)),
            row('收', formatMoney(c), trendColor),
            row('高', formatMoney(h), FINANCE_COLORS.klineUp),
            row('低', formatMoney(l), FINANCE_COLORS.klineDown),
            `<div style="height:1px;background:${FINANCE_COLORS.rule};margin:6px 0;"></div>`,
            row('收入', formatMoney(incomeVal), FINANCE_COLORS.income),
            row('支出', formatMoney(expenseVal), FINANCE_COLORS.expense),
            row('成交笔数', `${countVal} 笔`),
            row('总流水', formatMoney(turnover), trendColor),
          ].join('')
        },
      },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      grid: { left: 56, right: 24, top: 36, bottom: 40, containLabel: false },
      xAxis: {
        type: 'category',
        data: xs,
        boundaryGap: true,
        axisLine: { lineStyle: { color: FINANCE_COLORS.rule } },
        axisLabel: {
          color: FINANCE_COLORS.muted,
          fontSize: 11,
          interval: 'auto',
          hideOverlap: true,
        },
        axisTick: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        scale: true,
        position: 'right',
        axisLabel: {
          color: FINANCE_COLORS.muted,
          fontSize: 11,
          inside: false,
          margin: 8,
          formatter: (v: number) => formatCompactMoney(v),
        },
        splitLine: { lineStyle: { color: FINANCE_COLORS.rule, type: 'dashed', opacity: 0.6 } },
        axisLine: { show: false },
        axisTick: { show: false },
        markLine: {
          silent: true,
          symbol: ['none', 'none'],
          label: { show: false },
          lineStyle: { color: 'rgba(31, 42, 36, 0.45)', type: 'dashed', width: 1 },
          data: [{ yAxis: 0 }],
        },
      },
      dataZoom: [
        { type: 'inside', throttle: 50, zoomOnMouseWheel: true, moveOnMouseMove: true, moveOnMouseWheel: false },
        {
          type: 'slider',
          height: 18,
          bottom: 4,
          borderColor: 'transparent',
          backgroundColor: 'rgba(31, 42, 36, 0.06)',
          fillerColor: 'rgba(47, 111, 126, 0.22)',
          dataBackground: {
            lineStyle: { color: FINANCE_COLORS.muted, opacity: 0.4 },
            areaStyle: { color: FINANCE_COLORS.muted, opacity: 0.1 },
          },
          selectedDataBackground: {
            lineStyle: { color: FINANCE_COLORS.profit, opacity: 0.6 },
            areaStyle: { color: FINANCE_COLORS.profit, opacity: 0.18 },
          },
          handleStyle: { color: FINANCE_COLORS.paper, borderColor: FINANCE_COLORS.forest, borderWidth: 1 },
          moveHandleStyle: { color: FINANCE_COLORS.muted, opacity: 0.3 },
          textStyle: { color: FINANCE_COLORS.muted, fontSize: 10 },
        },
      ],
      series: [
        {
          name: '净现金流',
          type: 'candlestick',
          data: candlestick,
          dimensions: ['open', 'close', 'lowest', 'highest'],
          barWidth: '100%',
          barMinWidth: 2,
          itemStyle: {
            color: FINANCE_COLORS.klineUp,
            color0: FINANCE_COLORS.klineDown,
            borderColor: FINANCE_COLORS.klineUp,
            borderColor0: FINANCE_COLORS.klineDown,
            borderWidth: 1,
          },
          markPoint: lastPoint
            ? {
                symbol: 'pin',
                symbolSize: 36,
                itemStyle: { color: FINANCE_COLORS.profit },
                label: {
                  color: FINANCE_COLORS.paper,
                  fontSize: 10,
                  fontWeight: 700,
                  formatter: () => '最新',
                },
                data: [{ name: '最新', coord: lastPoint.coord, value: formatCompactMoney(Number(lastPoint.coord[1])) }],
              }
            : undefined,
          progressive: 400,
          progressiveThreshold: 3000,
        },
        {
          name: 'MA5',
          type: 'line',
          data: ma5,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1.2, color: MA_COLORS.ma5, type: 'solid' },
          z: 5,
        },
        {
          name: 'MA10',
          type: 'line',
          data: ma10,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1.4, color: MA_COLORS.ma10, type: 'solid' },
          z: 5,
        },
        {
          name: 'MA20',
          type: 'line',
          data: ma20,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1.6, color: MA_COLORS.ma20, type: 'solid' },
          z: 5,
        },
      ],
    },
    { notMerge: false, lazyUpdate: true },
  )
  chart.off('click')
  chart.on('click', (params) => {
    if (params.componentType !== 'series' || params.seriesType !== 'candlestick') return
    const dataIndex = typeof params.dataIndex === 'number' ? params.dataIndex : -1
    const item = dataIndex >= 0 ? series[dataIndex] : undefined
    if (item) openKlineDetail(item.x)
  })
}

async function openKlineDetail(period: string) {
  klineDetailVisible.value = true
  klineDetailLoading.value = true
  klineDetail.value = null
  try {
    const res = await getFinanceKlineDetail({ dimension: klineDimension.value, period })
    klineDetail.value = res.data || null
  } catch (err) {
    ElMessage.warning('K线明细加载失败')
  } finally {
    klineDetailLoading.value = false
  }
}

async function fetchKline(dimension: Dimension) {
  const requestSeq = ++klineRequestSeq
  if (klineCache[dimension]) {
    renderKlineChart(klineCache[dimension]!)
    klineLoading.value = false
    return
  }
  klineLoading.value = true
  try {
    const res = await getFinanceKline({
      dimension,
      rangeDays: dimensionRangeDays[dimension],
    })
    const series = (res.data || []) as KlineSeries[]
    klineCache[dimension] = series
    if (klineDimension.value === dimension) {
      renderKlineChart(series)
    }
  } catch (err) {
    if (requestSeq === klineRequestSeq) ElMessage.warning('K线数据加载失败，已展示本地缓存')
  } finally {
    if (requestSeq === klineRequestSeq) klineLoading.value = false
  }
}

watch(klineDimension, (next, prev) => {
  if (!next || next === prev) return
  if (dimensionSwitchTimer) clearTimeout(dimensionSwitchTimer)
  dimensionSwitchTimer = setTimeout(() => {
    fetchKline(next)
  }, 180)
})

onMounted(() => {
  fetchOverview()
  fetchKline(klineDimension.value)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  charts.forEach(c => c.dispose())
  charts = []
  klineChart?.dispose()
  klineChart = null
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

.chart-container--kline {
  height: 380px;
}

.kline-card {
  position: relative;
  overflow: hidden;

  :deep(.el-card__body) {
    position: relative;
    padding: 0;
    background:
      linear-gradient(180deg, rgba(250, 243, 226, 0.92), rgba(245, 235, 211, 0.88)),
      repeating-linear-gradient(0deg, transparent 0 26px, rgba(31, 42, 36, 0.03) 26px 27px);
  }
}

.kline-card :deep(.el-card__header) {
  padding: 16px 22px 12px;
  border-bottom: 1px solid $rule;
}

.kline-card :deep(.el-card__header)::before {
  content: '';
  position: absolute;
  left: 22px;
  right: 22px;
  top: 0;
  height: 3px;
  background:
    linear-gradient(90deg, $brass 0 8px, transparent 8px 12px, $brass 12px 20px, transparent 20px 24px) repeat-x;
  background-size: 24px 3px;
}

.kline-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.kline-title .kicker {
  letter-spacing: 0.18em;
}

.kline-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dimension-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: $forest;
  background: $cream-warm;
  border: 1px solid $rule;

  .dot {
    width: 7px;
    height: 7px;
    background: $success-color;
    border-radius: 50%;
    box-shadow: 0 0 0 0 rgba(79, 143, 104, 0.6);
    animation: livePulse 2.4s ease-out infinite;
  }
}

@keyframes livePulse {
  0% { box-shadow: 0 0 0 0 rgba(79, 143, 104, 0.55); }
  70% { box-shadow: 0 0 0 6px rgba(79, 143, 104, 0); }
  100% { box-shadow: 0 0 0 0 rgba(79, 143, 104, 0); }
}

.dimension-switcher {
  font-family: var(--font-mono);
}

.dimension-switcher :deep(.el-segmented__item) {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

// ============== K线 期刊式数据条 ==============
.kline-session {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 1fr 1fr 1.1fr;
  gap: 0;
  padding: 18px 22px 16px;
  background:
    linear-gradient(180deg, rgba(31, 42, 36, 0.04), transparent),
    repeating-linear-gradient(90deg, $rule 0 1px, transparent 1px 32px);
  border-bottom: 1px solid $rule;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    left: 22px;
    right: 22px;
    bottom: -1px;
    height: 2px;
    background:
      linear-gradient(90deg, $brass 0, $brass-deep 50%, $brass 100%);
    opacity: 0.65;
  }

  &.is-bear {
    background:
      linear-gradient(180deg, rgba(47, 155, 99, 0.06), transparent),
      repeating-linear-gradient(90deg, $rule 0 1px, transparent 1px 32px);
  }
}

.kline-cell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding: 4px 16px;
  border-right: 1px solid $rule;
  min-height: 76px;

  &:last-child {
    border-right: 0;
  }
}

.kline-cell--period {
  background: rgba(31, 42, 36, 0.04);
  padding-left: 14px;
}

.kline-cell--trend {
  background: rgba(183, 153, 110, 0.06);
}

.cell-label {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: $brass-deep;
}

.cell-display {
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 500;
  font-size: 26px;
  line-height: 1;
  color: $forest;
  font-variant-numeric: tabular-nums;
  font-variation-settings: 'opsz' 144;

  &.is-up { color: #d84a3a; }
  &.is-down { color: #2f9b63; }
  &.is-empty { color: #8f968e; }
}

.kline-cell--period .cell-display {
  font-size: 30px;
  letter-spacing: -0.01em;
}

.cell-foot {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: $text-secondary;
}

// ============== K线 图表舞台 ==============
.kline-stage {
  position: relative;
  padding: 8px 14px 0;
}

.kline-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  pointer-events: none;
  color: $text-secondary;
  text-align: center;
  z-index: 2;

  .empty-stamp {
    display: inline-flex;
    padding: 3px 9px;
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.2em;
    color: $forest;
    background: $brass;
  }

  strong {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 500;
    font-size: 18px;
    color: $forest;
  }

  small {
    font-family: var(--font-mono);
    font-size: 11px;
    color: $text-secondary;
    max-width: 360px;
  }
}

// ============== K线 期刊式底部 ==============
.kline-footer {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1.2fr 2.4fr;
  gap: 0;
  padding: 14px 22px 18px;
  border-top: 1px solid $rule;
  background:
    linear-gradient(180deg, transparent, rgba(31, 42, 36, 0.03));
  position: relative;
}

.kline-footer::before {
  content: '';
  position: absolute;
  left: 22px;
  right: 22px;
  top: -1px;
  height: 2px;
  background:
    repeating-linear-gradient(90deg, $brass-deep 0 12px, transparent 12px 16px);
  opacity: 0.55;
}

.footer-cell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  padding: 0 16px;
  border-right: 1px solid $rule;

  &:last-child {
    border-right: 0;
  }

  strong {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 500;
    font-size: 17px;
    color: $forest;
    font-variant-numeric: tabular-nums;

    &.is-up { color: #d84a3a; }
    &.is-down { color: #2f9b63; }
    &.is-empty { color: #8f968e; }
  }
}

.footer-cell--legend {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding-top: 4px;
}

.legend-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: $text-regular;
  background: rgba(250, 243, 226, 0.6);
  border: 1px solid $rule;
}

.swatch {
  width: 14px;
  height: 6px;
  display: inline-block;
  border-radius: 1px;

  &--up { background: #d84a3a; }
  &--down { background: #2f9b63; }
  &--empty { background: #a8ada7; }
  &--ma5 { background: #d9a441; }
  &--ma10 { background: #2f6f7e; }
  &--ma20 { background: #6e7a72; }
}

.kline-detail {
  min-height: 180px;
}

.kline-detail-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}

.kline-detail-summary div {
  padding: 10px 12px;
  background: rgba(250, 243, 226, 0.72);
  border: 1px solid $rule;
}

.kline-detail-summary span {
  display: block;
  margin-bottom: 4px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: $text-secondary;
  letter-spacing: 0.08em;
}

.kline-detail-summary strong,
.kline-detail-table .is-up,
.kline-detail-table .is-down {
  font-variant-numeric: tabular-nums;
}

.kline-detail-summary .is-up,
.kline-detail-table .is-up {
  color: #d84a3a;
}

.kline-detail-summary .is-down,
.kline-detail-table .is-down {
  color: #2f9b63;
}

.kline-detail-table {
  border: 1px solid $rule;
}

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
