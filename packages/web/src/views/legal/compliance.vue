<template>
  <div class="page-container legal-page compliance-page">
    <section class="compliance-hero">
      <div class="compliance-copy">
        <span class="kicker">COMPLIANCE RADAR</span>
        <h2 class="page-title">合规检查</h2>
        <p>把制度要求、截止日期和检查结果放在同一张表里，便于快速识别未通过和待整改项。</p>
      </div>
      <div class="compliance-score-card">
        <span>当前合规率</span>
        <strong>{{ complianceRate }}</strong>
        <small>{{ stats.pass }} 通过 / {{ stats.fail }} 未通过 / {{ stats.pending }} 待检查</small>
      </div>
      <div class="page-actions">
        <el-button type="primary" icon="Refresh" @click="handleRunCheck" :loading="checking">执行检查</el-button>
      </div>
    </section>

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

    <el-card shadow="never" class="progress-card">
      <template #header>
        <div class="card-header">
          <div>
            <span class="card-title">合规进度</span>
            <p class="card-subtitle">通过项占全部检查项的比例</p>
          </div>
          <span class="progress-label">{{ complianceProgress }}%</span>
        </div>
      </template>
      <el-progress :percentage="complianceProgress" :stroke-width="18" :text-inside="true" :status="complianceProgress >= 80 ? 'success' : 'warning'" />
      <div class="progress-legend">
        <span><i class="is-pass"></i>通过 {{ stats.pass }}</span>
        <span><i class="is-fail"></i>未通过 {{ stats.fail }}</span>
        <span><i class="is-pending"></i>待检查 {{ stats.pending }}</span>
      </div>
    </el-card>

    <div class="filter-bar compliance-filter-bar">
      <div class="filter-copy">
        <span>检查项筛选</span>
        <small>聚焦未通过、待检查或指定分类</small>
      </div>
      <div class="filter-controls">
        <el-select v-model="filters.status" placeholder="状态" clearable class="filter-field">
          <el-option label="通过" value="PASS" />
          <el-option label="未通过" value="FAIL" />
          <el-option label="待检查" value="PENDING" />
        </el-select>
        <el-input v-model="filters.category" placeholder="分类关键词" clearable class="keyword-field" />
        <el-button icon="Search" @click="handleSearch">搜索</el-button>
      </div>
    </div>

    <div class="table-wrapper compliance-table-wrapper">
      <div class="table-toolbar">
        <div>
          <span class="table-title">检查清单</span>
          <small>共 {{ pagination.total }} 项，当前页 {{ complianceList.length }} 项</small>
        </div>
        <div class="table-chips">
          <span v-if="filters.status">{{ getStatusText(filters.status) }}</span>
          <span v-if="filters.category">“{{ filters.category }}”</span>
          <span v-if="!filters.status && !filters.category">全部检查项</span>
        </div>
      </div>

      <el-table :data="complianceList" v-loading="loading" stripe class="compliance-table">
        <el-table-column prop="title" label="检查项" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="check-title-cell">
              <span>{{ row.title }}</span>
              <small>{{ row.description || '暂无描述' }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="120">
          <template #default="{ row }">
            <el-tag size="small" effect="plain" class="category-tag">{{ row.category }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small" class="status-pill">{{ getStatusText(row.status) }}</el-tag>
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
.compliance-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 240px auto;
  gap: 18px;
  align-items: stretch;
  margin-bottom: 20px;
  padding: 20px 22px;
  background:
    linear-gradient(135deg, rgba(250, 243, 226, 0.95), rgba(245, 235, 211, 0.9)),
    repeating-linear-gradient(90deg, rgba(31, 42, 36, 0.045) 0 1px, transparent 1px 18px);
  border: 1px solid rgb(var(--line) / 0.6);
  border-radius: 1.5rem;
  box-shadow: $shadow-soft;
  backdrop-filter: blur(8px);
}

.compliance-copy p {
  max-width: 620px;
  margin-top: 8px;
  line-height: 1.75;
  color: $text-regular;
}

.compliance-copy .page-title {
  margin-top: 8px;
  font-family: var(--font-display);
  font-size: clamp(26px, 2.6vw, 38px);
  font-style: italic;
  font-weight: 500;
  line-height: 1.08;
  color: $forest;
}

.compliance-score-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 16px;
  color: $cream;
  background: $forest;
  border: 1px solid rgba(250, 243, 226, 0.2);

  span {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: $brass;
  }

  strong {
    margin-top: 8px;
    font-family: var(--font-display);
    font-size: 42px;
    font-style: italic;
    font-weight: 500;
    line-height: 1;
  }

  small {
    margin-top: 8px;
    color: rgba(250, 243, 226, 0.72);
  }
}

.compliance-hero .page-actions {
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
}

.stats-row {
  margin-bottom: 20px;
}

.progress-card {
  margin-bottom: 16px;

  :deep(.el-card__body) {
    padding: 18px;
    background:
      linear-gradient(180deg, rgba(250, 243, 226, 0.76), rgba(245, 235, 211, 0.56)),
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
  gap: 12px;
  align-items: center;
}

.card-subtitle {
  margin-top: 5px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: $text-secondary;
}

.progress-label {
  font-family: var(--font-display);
  font-size: 24px;
  font-style: italic;
  color: $forest;
}

.progress-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;

  span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: $text-secondary;
  }

  i {
    width: 8px;
    height: 8px;
    display: inline-block;
    transform: rotate(45deg);
  }

  .is-pass { background: $success-color; }
  .is-fail { background: $danger-color; }
  .is-pending { background: $warning-color; }
}

.compliance-filter-bar {
  align-items: stretch;
  padding: 0;
  overflow: hidden;
}

.filter-copy {
  min-width: 210px;
  padding: 14px 16px;
  color: $cream;
  background: $forest;

  span,
  small {
    display: block;
  }

  span {
    font-family: var(--font-display);
    font-size: 17px;
    font-style: italic;
  }

  small {
    margin-top: 6px;
    line-height: 1.5;
    color: rgba(250, 243, 226, 0.72);
  }
}

.filter-controls {
  display: flex;
  flex: 1;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
}

.filter-field {
  width: 132px;
}

.keyword-field {
  width: 240px;
}

.compliance-table-wrapper {
  background:
    linear-gradient(180deg, rgba(250, 243, 226, 0.96), rgba(245, 235, 211, 0.92));
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid $rule;
  background: rgba(250, 243, 226, 0.72);
}

.table-title {
  display: block;
  font-family: var(--font-display);
  font-size: 17px;
  font-style: italic;
  font-weight: 500;
  color: $forest;
}

.table-toolbar small {
  display: block;
  margin-top: 4px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: $text-secondary;
}

.table-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;

  span {
    padding: 4px 8px;
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: $brass-deep;
    background: rgba(183, 153, 110, 0.12);
    border: 1px solid rgba(141, 112, 74, 0.32);
  }
}

.check-title-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;

  span {
    font-weight: 700;
    color: $forest;
  }

  small {
    max-width: 360px;
    overflow: hidden;
    color: $text-secondary;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.category-tag {
  background: color-mix(in srgb, $brass 10%, $cream) !important;
  border-color: rgba(141, 112, 74, 0.38) !important;
  color: $brass-deep !important;
}

.status-pill {
  min-width: 58px;
  justify-content: center;
}

@media (max-width: 1080px) {
  .compliance-hero {
    grid-template-columns: 1fr;
  }

  .compliance-hero .page-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 760px) {
  .compliance-filter-bar,
  .filter-controls,
  .table-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-copy,
  .filter-field,
  .keyword-field,
  .filter-controls > .el-button {
    width: 100%;
  }
}
</style>
