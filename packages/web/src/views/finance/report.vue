<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">财务报表</h2>
      <div class="page-actions">
        <el-button type="primary" icon="Download" @click="handleExport">导出报表</el-button>
      </div>
    </div>

    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6">
        <StatsCard label="本月收入" :value="formatMoney(monthSummary.income)" icon="TrendCharts" color="#67c23a" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="本月支出" :value="formatMoney(monthSummary.expense)" icon="Minus" color="#f56c6c" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="利润率" :value="profitRate" icon="DataLine" color="#409eff" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="净利润" :value="formatMoney(monthSummary.profit)" icon="Coin" color="#e6a23c" />
      </el-col>
    </el-row>

    <el-card shadow="never" style="margin-bottom: 16px;">
      <template #header>
        <span class="card-title">月度收支趋势</span>
      </template>
      <div ref="trendChartRef" class="chart-container"></div>
    </el-card>

    <el-row :gutter="16">
      <el-col :xs="24" :lg="12">
        <el-card shadow="never">
          <template #header>
            <span class="card-title">收入结构</span>
          </template>
          <div ref="incomeChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card shadow="never">
          <template #header>
            <span class="card-title">支出结构</span>
          </template>
          <div ref="expenseChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" style="margin-top: 16px;">
      <template #header>
        <span class="card-title">利润趋势</span>
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
      tooltip: { trigger: 'axis' },
      legend: { data: ['收入', '支出', '净利润'] },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: months.length ? months : ['本月'] },
      yAxis: { type: 'value', axisLabel: { formatter: '¥{value}' } },
      series: [
        { name: '收入', type: 'bar', data: incomes, itemStyle: { color: '#67c23a' } },
        { name: '支出', type: 'bar', data: expenses, itemStyle: { color: '#f56c6c' } },
        { name: '净利润', type: 'line', smooth: true, data: profits, itemStyle: { color: '#409eff' } },
      ],
    })
    charts.push(chart)
  }

  if (incomeChartRef.value) {
    const chart = echarts.init(incomeChartRef.value)
    chart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
      series: [{
        type: 'pie', radius: ['35%', '65%'],
        data: categories.length ? categories.map(c => ({ value: c.amount, name: c.category })) : [{ value: 1, name: '暂无数据' }],
      }],
    })
    charts.push(chart)
  }

  if (expenseChartRef.value) {
    const chart = echarts.init(expenseChartRef.value)
    chart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
      series: [{
        type: 'pie', radius: ['35%', '65%'],
        data: categories.length ? categories.map(c => ({ value: c.amount, name: c.category })) : [{ value: 1, name: '暂无数据' }],
      }],
    })
    charts.push(chart)
  }

  if (profitChartRef.value) {
    const chart = echarts.init(profitChartRef.value)
    chart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: months.length ? months : ['本月'] },
      yAxis: { type: 'value', axisLabel: { formatter: '¥{value}' } },
      series: [{
        type: 'line', smooth: true, areaStyle: { opacity: 0.3 },
        data: profits, itemStyle: { color: '#409eff' },
      }],
    })
    charts.push(chart)
  }
}

function formatMoney(value: number | string | undefined) {
  if (value === undefined || value === null) return '¥0.00'
  return '¥' + Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
.stats-row { margin-bottom: 20px; }
.card-title { font-weight: 600; font-size: 15px; }
.chart-container { height: 320px; width: 100%; }
</style>