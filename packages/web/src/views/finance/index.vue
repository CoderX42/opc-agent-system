<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">财务概览</h2>
      <div class="page-actions">
        <el-button icon="MagicStick" @click="$router.push({ path: '/agents/copilot', query: { agent: 'FINANCE' } })">问 Agent</el-button>
        <el-button type="primary" icon="Download" @click="handleExport">导出报表</el-button>
      </div>
    </div>

    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6">
        <StatsCard label="总收入" :value="formatMoney(overview.totalIncome)" icon="TrendCharts" color="#67c23a" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="总支出" :value="formatMoney(overview.totalExpense)" icon="Minus" color="#f56c6c" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="净利润" :value="formatMoney(overview.netProfit)" icon="Coin" color="#409eff" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="待审发票" :value="overview.pendingInvoices ?? 0" icon="Document" color="#e6a23c" />
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :xs="24" :lg="16">
        <el-card shadow="never">
          <template #header>
            <span class="card-title">月度收支趋势</span>
          </template>
          <div ref="trendChartRef" class="chart-container"></div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="8">
        <el-card shadow="never">
          <template #header>
            <span class="card-title">支出分类</span>
          </template>
          <div ref="pieChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" style="margin-top: 16px;">
      <template #header>
        <div class="card-header">
          <span class="card-title">最近交易</span>
          <el-button link type="primary" @click="$router.push('/finance/transaction')">查看全部</el-button>
        </div>
      </template>
      <el-table :data="recentTransactions" v-loading="recentLoading" size="default">
        <el-table-column label="日期" width="120">
          <template #default="{ row }">{{ formatDate(row.transactionDate || row.date) }}</template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="category" label="分类" width="120" />
        <el-table-column prop="type" label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="row.type === 'INCOME' ? 'success' : 'danger'" size="small">
              {{ row.type === 'INCOME' ? '收入' : '支出' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="140" align="right">
          <template #default="{ row }">
            <span :style="{ color: row.type === 'INCOME' ? '#67c23a' : '#f56c6c' }">
              {{ row.type === 'INCOME' ? '+' : '-' }}¥{{ formatMoney(row.amount) }}
            </span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
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

function formatDate(value: string | Date | undefined) {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toISOString().slice(0, 10)
}

function renderTrendChart(monthlyTrend: Array<{ month: string; income: number; expense: number }>) {
  if (!trendChartRef.value) return
  if (!trendChart) trendChart = echarts.init(trendChartRef.value)
  const months = monthlyTrend.map(m => m.month)
  const incomes = monthlyTrend.map(m => Number(m.income || 0))
  const expenses = monthlyTrend.map(m => Number(m.expense || 0))
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['收入', '支出'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: months.length ? months : ['本月'] },
    yAxis: { type: 'value' },
    series: [
      { name: '收入', type: 'line', smooth: true, data: incomes, itemStyle: { color: '#67c23a' } },
      { name: '支出', type: 'line', smooth: true, data: expenses, itemStyle: { color: '#f56c6c' } },
    ],
  })
}

function renderPieChart(categories: Array<{ category: string; amount: number }>) {
  if (!pieChartRef.value) return
  if (!pieChart) pieChart = echarts.init(pieChartRef.value)
  pieChart.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: '0', left: 'center' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
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
.stats-row { margin-bottom: 16px; }
.card-title { 
  font-family: var(--font-display);
  font-weight: 500;
  font-style: italic;
  font-size: 15px;
  font-variation-settings: 'opsz' 96;
  color: $forest;
}
.card-header { display: flex; justify-content: space-between; align-items: center; }
.chart-container { height: 320px; width: 100%; }
</style>
