<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">合规检查</h2>
      <div class="page-actions">
        <el-button type="primary" icon="Refresh" @click="handleRunCheck" :loading="checking">执行检查</el-button>
      </div>
    </div>

    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6">
        <StatsCard label="通过项" :value="stats.pass" icon="CircleCheck" color="#67c23a" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="未通过" :value="stats.fail" icon="CircleClose" color="#f56c6c" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="待检查" :value="stats.pending" icon="Clock" color="#e6a23c" />
      </el-col>
      <el-col :xs="12" :sm="6">
        <StatsCard label="合规率" :value="complianceRate" icon="DataLine" color="#409eff" />
      </el-col>
    </el-row>

    <el-card shadow="never" style="margin-bottom: 16px;">
      <template #header>
        <span class="card-title">合规进度</span>
      </template>
      <el-progress :percentage="complianceProgress" :stroke-width="20" :text-inside="true" :status="complianceProgress >= 80 ? 'success' : 'warning'" />
    </el-card>

    <div class="filter-bar">
      <el-select v-model="filters.status" placeholder="状态" clearable style="width: 130px;">
        <el-option label="通过" value="PASS" />
        <el-option label="未通过" value="FAIL" />
        <el-option label="待检查" value="PENDING" />
      </el-select>
      <el-input v-model="filters.category" placeholder="分类关键词" clearable style="width: 200px;" />
      <el-button icon="Search" @click="handleSearch">搜索</el-button>
    </div>

    <div class="table-wrapper">
      <el-table :data="complianceList" v-loading="loading" stripe>
        <el-table-column prop="title" label="检查项" min-width="200" show-overflow-tooltip />
        <el-table-column prop="category" label="分类" width="120">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.category }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="250" show-overflow-tooltip />
        <el-table-column label="截止日期" width="120">
          <template #default="{ row }">{{ formatDate(row.dueDate) }}</template>
        </el-table-column>
        <el-table-column label="负责人" width="120">
          <template #default="{ row }">{{ row.responsiblePerson || '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && complianceList.length === 0" description="暂无检查项" />
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          layout="total, prev, pager, next"
          @current-change="fetchList"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import StatsCard from '@/components/StatsCard.vue'
import { getComplianceList, runComplianceCheck, updateComplianceStatus, getLegalOverview } from '@/api/legal'

const loading = ref(false)
const checking = ref(false)

const filters = reactive({ status: '', category: '' })
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

const complianceList = ref<any[]>([])
const stats = reactive({ pass: 0, fail: 0, pending: 0 })

const complianceProgress = computed(() => {
  const total = stats.pass + stats.fail + stats.pending
  return total ? Math.round((stats.pass / total) * 100) : 0
})

const complianceRate = computed(() => complianceProgress.value + '%')

async function fetchList() {
  loading.value = true
  try {
    const res = await getComplianceList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      status: filters.status || undefined,
      category: filters.category || undefined,
    } as any)
    complianceList.value = res.data.items || []
    pagination.total = res.data.total || 0
    computeStats()
  } catch {
    complianceList.value = []
  } finally {
    loading.value = false
  }
}

function computeStats() {
  stats.pass = complianceList.value.filter(c => c.status === 'PASS').length
  stats.fail = complianceList.value.filter(c => c.status === 'FAIL').length
  stats.pending = complianceList.value.filter(c => c.status === 'PENDING').length
}

function handleSearch() {
  pagination.page = 1
  fetchList()
}

async function handleRunCheck() {
  checking.value = true
  try {
    await runComplianceCheck()
    ElMessage.success('合规检查已完成')
    fetchList()
  } catch { /* ignore */ }
  finally { checking.value = false }
}

function handleDetail(row: any) {
  const result = row.result
  const content = `<b>${row.title}</b><br/>
    分类：${row.category}<br/>
    状态：${getStatusText(row.status)}<br/>
    截止日期：${formatDate(row.dueDate)}<br/>
    负责人：${row.responsiblePerson || '-'}<br/><br/>
    <b>描述：</b>${row.description || '-'}<br/><br/>
    <b>最近结果：</b>${result ? JSON.stringify(result) : '尚未检查'}`
  ElMessageBox.alert(content, '检查项详情', { dangerouslyUseHTMLString: true, customStyle: { maxWidth: '560px' } })
    .catch(() => {})
}

function formatDate(value: string | Date | undefined | null) {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toISOString().slice(0, 10)
}

function getStatusType(s: string) {
  const m = { PASS: 'success', FAIL: 'danger', PENDING: 'info' } as const
  return m[s as keyof typeof m] || 'info'
}
function getStatusText(s: string) {
  const m: Record<string, string> = { PASS: '通过', FAIL: '未通过', PENDING: '待检查' }
  return m[s] || s
}

watch([() => filters.status, () => filters.category], () => { pagination.page = 1; fetchList() })
onMounted(fetchList)
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
.filter-bar { 
  display: flex; 
  gap: 12px; 
  margin-bottom: 16px; 
  align-items: center;
  padding: 14px 16px;
  background: $cream;
  border: 2px solid $forest;
  box-shadow: 4px 4px 0 rgba(31, 42, 36, 0.12);
}
</style>