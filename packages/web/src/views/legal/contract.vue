<template>
  <div class="page-container legal-page contract-page">
    <section class="contract-hero">
      <div>
        <span class="kicker">CONTRACT CONTROL</span>
        <h2 class="page-title">合同管理</h2>
        <p class="contract-hero-desc">用一个清晰的台账追踪合同状态、责任双方、金额与审查动作。</p>
      </div>
      <div class="page-actions">
        <el-button type="primary" icon="Plus" @click="handleCreate">新建合同</el-button>
      </div>
    </section>

    <div class="filter-bar contract-filter-bar">
      <div class="filter-copy">
        <span>筛选检索</span>
        <small>按状态、类型或合同名称快速定位</small>
      </div>
      <div class="filter-controls">
        <div class="filter-items">
          <el-select v-model="filters.status" placeholder="状态" clearable class="filter-field">
            <el-option label="草稿" value="DRAFT" />
            <el-option label="审核中" value="REVIEWING" />
            <el-option label="已通过" value="APPROVED" />
            <el-option label="已驳回" value="REJECTED" />
            <el-option label="已签署" value="SIGNED" />
            <el-option label="已过期" value="EXPIRED" />
          </el-select>
          <el-select v-model="filters.type" placeholder="类型" clearable class="filter-field">
            <el-option label="销售" value="SALES" />
            <el-option label="采购" value="PURCHASE" />
            <el-option label="服务" value="SERVICE" />
            <el-option label="保密" value="NDA" />
            <el-option label="劳务" value="EMPLOYMENT" />
            <el-option label="其他" value="OTHER" />
          </el-select>
          <el-input v-model="filters.keyword" placeholder="搜索合同..." prefix-icon="Search" clearable class="keyword-field" @keyup.enter="handleSearch" />
        </div>
        <el-button icon="Search" @click="handleSearch">搜索</el-button>
      </div>
    </div>

    <div class="table-wrapper contract-table-wrapper">
      <div class="table-toolbar">
        <div>
          <span class="table-title">合同台账</span>
          <small>共 {{ pagination.total }} 份合同，当前显示 {{ displayedContractList.length }} 份</small>
        </div>
        <div class="table-chips">
          <span v-if="filters.status">{{ getStatusText(filters.status) }}</span>
          <span v-if="filters.type">{{ getTypeText(filters.type) }}</span>
          <span v-if="filters.keyword">“{{ filters.keyword }}”</span>
          <span v-if="!filters.status && !filters.type && !filters.keyword">全部合同</span>
        </div>
      </div>

      <el-table :data="displayedContractList" v-loading="loading" stripe class="contract-table">
        <el-table-column type="selection" width="50" />
        <el-table-column prop="title" label="合同名称" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="contract-title-cell">
              <span>{{ row.title }}</span>
              <small>{{ row.id?.slice(0, 8) }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" class="legal-type-tag">{{ getTypeText(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="partyA" label="甲方" width="120" show-overflow-tooltip />
        <el-table-column prop="partyB" label="乙方" width="120" show-overflow-tooltip />
        <el-table-column prop="amount" label="金额" width="130" align="right">
          <template #default="{ row }">
            <span class="money-text">¥{{ formatMoney(row.amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="开始日期" width="120">
          <template #default="{ row }">{{ formatDate(row.signDate || row.startDate) }}</template>
        </el-table-column>
        <el-table-column label="结束日期" width="120">
          <template #default="{ row }">{{ formatDate(row.expiryDate || row.endDate) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small" class="status-pill">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <div class="row-actions">
              <el-button link type="primary" size="small" @click="handleView(row)">查看</el-button>
              <el-button link type="primary" size="small" @click="handleEdit(row)" :disabled="!['DRAFT', 'REJECTED'].includes(row.status)">编辑</el-button>
              <el-dropdown trigger="click" @command="(command) => handleRowCommand(command, row)">
                <el-button link type="primary" size="small">
                  更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="submit" :disabled="row.status !== 'DRAFT'">提交审核</el-dropdown-item>
                    <el-dropdown-item command="aiReview" :disabled="row.status === 'EXPIRED'">AI 审查</el-dropdown-item>
                    <el-dropdown-item command="delete" divided>删除合同</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && displayedContractList.length === 0" description="暂无合同" />

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="fetchList"
          @size-change="fetchList"
        />
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="650px" destroy-on-close class="legal-dialog">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="合同名称" prop="title">
          <el-input v-model="form.title" placeholder="请输入合同名称" />
        </el-form-item>
        <el-form-item label="合同类型" prop="type">
          <el-select v-model="form.type" style="width: 100%;">
            <el-option label="销售" value="SALES" />
            <el-option label="采购" value="PURCHASE" />
            <el-option label="服务" value="SERVICE" />
            <el-option label="保密" value="NDA" />
            <el-option label="劳务" value="EMPLOYMENT" />
            <el-option label="其他" value="OTHER" />
          </el-select>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="甲方" prop="partyA">
              <el-input v-model="form.partyA" placeholder="甲方" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="乙方" prop="partyB">
              <el-input v-model="form.partyB" placeholder="乙方" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="合同内容" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="6" placeholder="请输入合同内容" />
        </el-form-item>
        <el-form-item label="合同金额">
          <el-input-number v-model="form.amount" :min="0" :precision="2" style="width: 100%;" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="签订日期">
              <el-date-picker v-model="form.signDate" type="date" placeholder="选择日期" style="width: 100%;" value-format="YYYY-MM-DD" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="到期日期">
              <el-date-picker v-model="form.expiryDate" type="date" placeholder="选择日期" style="width: 100%;" value-format="YYYY-MM-DD" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="reviewVisible" width="680px" destroy-on-close class="review-dialog">
      <template #header>
        <div class="review-dialog-header">
          <span class="kicker">AI REVIEW REPORT</span>
          <strong>AI 审查结果</strong>
        </div>
      </template>
      <div v-loading="reviewLoading" class="review-content">
        <div v-if="reviewResult" class="result-block">
          <div class="risk-banner" :class="getRiskClass(reviewResult.riskLevel)">
            <span>风险等级</span>
            <strong>{{ getRiskText(reviewResult.riskLevel) }}</strong>
          </div>
          <div class="summary-box">
            <span>审查摘要</span>
            <p>{{ reviewResult.summary || '暂无摘要' }}</p>
          </div>
          <div class="review-grid">
            <div class="review-section">
              <b>风险问题</b>
              <ul v-if="reviewResult.issues?.length">
                <li v-for="(it, i) in reviewResult.issues" :key="i">{{ it }}</li>
              </ul>
              <p v-else>暂未发现明显风险。</p>
            </div>
            <div class="review-section">
              <b>修改建议</b>
              <ul v-if="reviewResult.suggestions?.length">
                <li v-for="(s, i) in reviewResult.suggestions" :key="i">{{ s }}</li>
              </ul>
              <p v-else>暂无补充建议。</p>
            </div>
          </div>
        </div>
        <el-empty v-else description="等待结果" />
      </div>
      <template #footer>
        <el-button v-if="reviewResult?.decisionComment" type="primary" @click="reviewVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  getContractList, createContract, updateContract, deleteContract,
  submitContractForReview, aiReviewContract,
} from '@/api/legal'
import type { Contract } from '@/types'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('新建合同')
const formRef = ref<FormInstance>()
const reviewVisible = ref(false)
const reviewLoading = ref(false)
const reviewResult = ref<any>(null)

const filters = reactive({ status: '', type: '', keyword: '' })
const pagination = reactive({ page: 1, pageSize: 10, total: 0 })

const form = reactive({
  id: '',
  title: '',
  type: 'SERVICE' as Contract['type'],
  content: '',
  amount: 0,
  partyA: '',
  partyB: '',
  signDate: '',
  expiryDate: '',
})

const formRules: FormRules = {
  title: [{ required: true, message: '请输入合同名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择合同类型', trigger: 'change' }],
  partyA: [{ required: true, message: '请输入甲方', trigger: 'blur' }],
  partyB: [{ required: true, message: '请输入乙方', trigger: 'blur' }],
  content: [{ required: true, message: '请输入合同内容', trigger: 'blur' }],
}

const contractList = ref<Contract[]>([])

const displayedContractList = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()
  if (!keyword) return contractList.value
  return contractList.value.filter((item) => {
    return [item.title, item.partyA, item.partyB, item.content]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword))
  })
})

async function fetchList() {
  loading.value = true
  try {
    const res = await getContractList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      status: filters.status || undefined,
      type: filters.type || undefined,
    } as any)
    contractList.value = res.data.items || []
    pagination.total = res.data.total || 0
  } catch {
    contractList.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchList()
}

function resetForm() {
  form.id = ''
  form.title = ''
  form.type = 'SERVICE'
  form.content = ''
  form.amount = 0
  form.partyA = ''
  form.partyB = ''
  form.signDate = ''
  form.expiryDate = ''
}

function handleCreate() {
  resetForm()
  dialogTitle.value = '新建合同'
  dialogVisible.value = true
}

function handleView(row: any) {
  ElMessageBox.alert(
    `<b>${row.title}</b><br/>甲方：${row.partyA || '-'}<br/>乙方：${row.partyB || '-'}<br/>
     类型：${getTypeText(row.type)}<br/>金额：¥${formatMoney(row.amount)}<br/>
     状态：${getStatusText(row.status)}<br/>签订：${formatDate(row.signDate) || '-'}<br/>
     到期：${formatDate(row.expiryDate) || '-'}<br/><br/>
     <b>合同内容：</b><br/>${(row as any).content || ''}`,
    '合同详情',
    { dangerouslyUseHTMLString: true, customStyle: { maxWidth: '600px' } },
  ).catch(() => {})
}

function handleEdit(row: any) {
  form.id = row.id
  form.title = row.title
  form.type = row.type
  form.content = (row as any).content || ''
  form.amount = Number(row.amount) || 0
  form.partyA = row.partyA || ''
  form.partyB = row.partyB || ''
  form.signDate = formatDate(row.signDate) || ''
  form.expiryDate = formatDate(row.expiryDate) || ''
  dialogTitle.value = '编辑合同'
  dialogVisible.value = true
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除合同 "${row.title}" 吗？`, '提示', { type: 'warning' })
    submitting.value = true
    await deleteContract(row.id)
    ElMessage.success('删除成功')
    fetchList()
  } catch { /* cancel */ }
  finally { submitting.value = false }
}

async function handleSubmitReview(row: any) {
  try {
    await ElMessageBox.confirm(`确定将合同 "${row.title}" 提交审核吗？`, '提示', { type: 'info' })
    submitting.value = true
    await submitContractForReview(row.id)
    ElMessage.success('已提交审核')
    fetchList()
  } catch { /* cancel */ }
  finally { submitting.value = false }
}

async function handleAiReview(row: any) {
  reviewVisible.value = true
  reviewLoading.value = true
  reviewResult.value = null
  try {
    const res = await aiReviewContract(row.id)
    reviewResult.value = (res.data as any)?.reviewResult || res.data
    ElMessage.success('审查完成')
  } catch {
    reviewResult.value = null
  } finally {
    reviewLoading.value = false
  }
}

function handleRowCommand(command: string | number | object, row: any) {
  switch (command) {
    case 'submit':
      handleSubmitReview(row)
      break
    case 'aiReview':
      handleAiReview(row)
      break
    case 'delete':
      handleDelete(row)
      break
  }
}

async function handleSubmit() {
  if (!formRef.value) return
  try { await formRef.value.validate() } catch { return }
  submitting.value = true
  try {
    const { id, ...payload } = form
    if (form.id) {
      await updateContract(id, payload)
      ElMessage.success('更新成功')
    } else {
      await createContract(payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchList()
  } finally {
    submitting.value = false
  }
}

function formatMoney(value: number | string | undefined | null) {
  if (value === undefined || value === null) return '0.00'
  return Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(value: string | Date | undefined | null) {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toISOString().slice(0, 10)
}

function getTypeText(type: string) {
  const map: Record<string, string> = { SALES: '销售', PURCHASE: '采购', SERVICE: '服务', NDA: '保密', EMPLOYMENT: '劳务', OTHER: '其他' }
  return map[type] || type
}
function getStatusType(status: string) {
  const map = { DRAFT: 'info', REVIEWING: 'warning', APPROVED: 'success', REJECTED: 'danger', SIGNED: 'success', EXPIRED: 'info' } as const
  return map[status as keyof typeof map] || 'info'
}
function getStatusText(status: string) {
  const map: Record<string, string> = { DRAFT: '草稿', REVIEWING: '审核中', APPROVED: '已通过', REJECTED: '已驳回', SIGNED: '已签署', EXPIRED: '已过期' }
  return map[status] || status
}

function getRiskText(level: string | undefined) {
  const map: Record<string, string> = { HIGH: '高风险', MEDIUM: '中风险', LOW: '低风险' }
  return map[level || ''] || level || '未分级'
}

function getRiskClass(level: string | undefined) {
  const map: Record<string, string> = { HIGH: 'is-high', MEDIUM: 'is-medium', LOW: 'is-low' }
  return map[level || ''] || 'is-unknown'
}

watch([() => filters.status, () => filters.type], () => { pagination.page = 1; fetchList() })
onMounted(fetchList)
</script>

<style lang="scss" scoped>
.contract-hero {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
  margin-bottom: 18px;
  padding: 20px 22px;
  background:
    linear-gradient(135deg, rgba(250, 243, 226, 0.95), rgba(245, 235, 211, 0.9)),
    repeating-linear-gradient(90deg, rgba(31, 42, 36, 0.045) 0 1px, transparent 1px 18px);
  border: 2px solid $forest;
  box-shadow: 6px 8px 0 rgba(31, 42, 36, 0.14);
}

.contract-hero-desc {
  max-width: 560px;
  margin-top: 8px;
  line-height: 1.7;
  color: $text-regular;
}

.contract-hero .page-title {
  margin-top: 8px;
  font-family: var(--font-display);
  font-size: clamp(26px, 2.6vw, 38px);
  font-style: italic;
  font-weight: 500;
  line-height: 1.08;
  color: $forest;
}

.contract-filter-bar {
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
    color: $cream;
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
  justify-content: space-between;
  padding: 14px 16px;
}

.filter-items {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-field {
  width: 132px;
}

.keyword-field {
  width: 240px;
}

.contract-table-wrapper {
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

.contract-title-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;

  span {
    font-weight: 700;
    color: $forest;
  }

  small {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.08em;
    color: $text-secondary;
  }
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

.status-pill {
  min-width: 54px;
  justify-content: center;
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.review-dialog-header {
  display: flex;
  flex-direction: column;
  gap: 6px;

  strong {
    font-family: var(--font-display);
    font-size: 22px;
    font-style: italic;
    font-weight: 500;
    color: $forest;
  }
}

.review-content {
  min-height: 180px;
  line-height: 1.7;
  background:
    linear-gradient(180deg, $cream-warm, $cream),
    repeating-linear-gradient(0deg, transparent 0 27px, rgba(31, 42, 36, 0.04) 27px 28px);
  padding: 14px;
  border: 1.5px solid $rule;
}

.result-block {
  display: grid;
  gap: 12px;
}

.risk-banner {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  color: $cream;
  background: $forest;
  border: 2px solid $forest;

  span {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(250, 243, 226, 0.72);
  }

  strong {
    font-family: var(--font-display);
    font-size: 30px;
    font-style: italic;
    font-weight: 500;
    line-height: 1;
  }

  &.is-high {
    background: $danger-color;
    border-color: color-mix(in srgb, $danger-color 80%, $forest);
  }

  &.is-medium {
    color: $forest;
    background: $warning-color;
    border-color: color-mix(in srgb, $warning-color 70%, $forest);

    span {
      color: rgba(31, 42, 36, 0.66);
    }
  }

  &.is-low {
    background: $success-color;
    border-color: color-mix(in srgb, $success-color 72%, $forest);
  }
}

.summary-box,
.review-section {
  padding: 14px;
  background: rgba(250, 243, 226, 0.72);
  border: 1px solid $rule;
}

.summary-box span,
.review-section b {
  display: block;
  margin-bottom: 8px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: $brass-deep;
}

.summary-box p,
.review-section p {
  color: $text-regular;
}

.review-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.review-section ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    position: relative;
    padding-left: 16px;
    color: $text-regular;

    &::before {
      position: absolute;
      top: 0.72em;
      left: 0;
      width: 6px;
      height: 6px;
      content: '';
      background: $brass;
      transform: rotate(45deg);
    }
  }
}

@media (max-width: 900px) {
  .contract-hero,
  .filter-controls,
  .table-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-copy {
    width: 100%;
  }

  .filter-field,
  .keyword-field {
    width: 100%;
  }

  .filter-items {
    width: 100%;
  }

  .review-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .contract-hero .page-actions,
  .filter-controls > .el-button {
    width: 100%;
  }
}
</style>
