<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">法务概览</h2>
      <div class="page-actions">
        <el-button icon="MagicStick" @click="$router.push({ path: '/agents/copilot', query: { agent: 'LEGAL' } })">问 Agent</el-button>
        <el-button type="primary" icon="Plus" @click="$router.push('/legal/contract')">新建合同</el-button>
      </div>
    </div>

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

    <el-row :gutter="16">
      <el-col :xs="24" :lg="12">
        <el-card shadow="never">
          <template #header>
            <span class="card-title">合同状态分布</span>
          </template>
          <div ref="statusChartRef" class="chart-container"></div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <el-card shadow="never">
          <template #header>
            <span class="card-title">月度合同统计</span>
          </template>
          <div ref="monthlyChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" style="margin-top: 16px;">
      <template #header>
        <div class="card-header">
          <span class="card-title">即将到期合同</span>
          <el-button link type="primary" @click="$router.push('/legal/contract')">查看全部</el-button>
        </div>
      </template>
      <el-table :data="expiringList" v-loading="loading" size="default">
        <el-table-column prop="title" label="合同名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="partyB" label="对方" width="150" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ getTypeText(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="到期日期" width="120">
          <template #default="{ row }">{{ formatDate(row.expiryDate) }}</template>
        </el-table-column>
        <el-table-column label="金额" width="140" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.amount) }}</template>
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

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#909399', REVIEWING: '#e6a23c', APPROVED: '#67c23a', REJECTED: '#f56c6c', SIGNED: '#409eff', EXPIRED: '#909399',
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
  } catch { /* ignore */ }
}

async function fetchExpiring() {
  loading.value = true
  try {
    const res = await getContractList({ page: 1, pageSize: 10 } as any)
    expiringList.value = (res.data.items || []).slice(0, 5)
  } catch {
    expiringList.value = []
  } finally {
    loading.value = false
  }
}

function renderStatusChart() {
  if (!statusChartRef.value) return
  const data = Object.entries(STATUS_COLORS).map(([key, color]) => ({ name: getStatusText(key), value: 0, itemStyle: { color } }))
  if (expiringList.value.length === 0) {
    data.push({ name: '暂无数据', value: 1, itemStyle: { color: '#dcdfe6' } })
  } else {
    data[0].value = Math.floor(Math.random() * 5) + 3
  }
  const chart = echarts.init(statusChartRef.value)
  chart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{ type: 'pie', radius: ['40%', '70%'], data }],
  })
  charts.push(chart)
}

function renderMonthlyChart() {
  if (!monthlyChartRef.value) return
  const months = ['10月', '11月', '12月', '1月', '2月', '3月']
  const chart = echarts.init(monthlyChartRef.value)
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['新建', '到期'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value' },
    series: [
      { name: '新建', type: 'bar', data: [5, 8, 6, 10, 7, 9], itemStyle: { color: '#409eff' } },
      { name: '到期', type: 'bar', data: [2, 3, 4, 2, 5, 3], itemStyle: { color: '#f56c6c' } },
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
