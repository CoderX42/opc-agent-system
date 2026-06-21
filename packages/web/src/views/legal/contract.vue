<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">合同管理</h2>
      <div class="page-actions">
        <el-button type="primary" icon="Plus" @click="handleCreate">新建合同</el-button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="filter-items">
        <el-select v-model="filters.status" placeholder="状态" clearable style="width: 130px;">
          <el-option label="草稿" value="DRAFT" />
          <el-option label="审核中" value="REVIEWING" />
          <el-option label="已通过" value="APPROVED" />
          <el-option label="已驳回" value="REJECTED" />
          <el-option label="已签署" value="SIGNED" />
          <el-option label="已过期" value="EXPIRED" />
        </el-select>
        <el-select v-model="filters.type" placeholder="类型" clearable style="width: 130px;">
          <el-option label="销售" value="SALES" />
          <el-option label="采购" value="PURCHASE" />
          <el-option label="服务" value="SERVICE" />
          <el-option label="保密" value="NDA" />
          <el-option label="劳务" value="EMPLOYMENT" />
          <el-option label="其他" value="OTHER" />
        </el-select>
        <el-input v-model="filters.keyword" placeholder="搜索合同..." prefix-icon="Search" clearable style="width: 200px;" @keyup.enter="handleSearch" />
      </div>
      <el-button icon="Search" @click="handleSearch">搜索</el-button>
    </div>

    <div class="table-wrapper">
      <el-table :data="contractList" v-loading="loading" stripe>
        <el-table-column type="selection" width="50" />
        <el-table-column prop="title" label="合同名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ getTypeText(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="partyA" label="甲方" width="120" show-overflow-tooltip />
        <el-table-column prop="partyB" label="乙方" width="120" show-overflow-tooltip />
        <el-table-column prop="amount" label="金额" width="130" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.amount) }}</template>
        </el-table-column>
        <el-table-column label="开始日期" width="120">
          <template #default="{ row }">{{ formatDate(row.signDate || row.startDate) }}</template>
        </el-table-column>
        <el-table-column label="结束日期" width="120">
          <template #default="{ row }">{{ formatDate(row.expiryDate || row.endDate) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleView(row)">查看</el-button>
            <el-button link type="primary" size="small" @click="handleEdit(row)" :disabled="!['DRAFT', 'REJECTED'].includes(row.status)">编辑</el-button>
            <el-button link type="warning" size="small" @click="handleSubmitReview(row)" :disabled="row.status !== 'DRAFT'">提交审核</el-button>
            <el-button link type="success" size="small" @click="handleAiReview(row)" :disabled="row.status === 'EXPIRED'">AI审查</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && contractList.length === 0" description="暂无合同" />

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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="650px" destroy-on-close>
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

    <el-dialog v-model="reviewVisible" title="AI 审查结果" width="600px" destroy-on-close>
      <div v-loading="reviewLoading" class="review-content">
        <div v-if="reviewResult" class="result-block">
          <p><b>风险等级：</b>
            <el-tag :type="reviewResult.riskLevel === 'HIGH' ? 'danger' : reviewResult.riskLevel === 'MEDIUM' ? 'warning' : 'success'">
              {{ reviewResult.riskLevel }}
            </el-tag>
          </p>
          <p><b>摘要：</b>{{ reviewResult.summary }}</p>
          <div v-if="reviewResult.issues?.length">
            <b>问题：</b>
            <ul><li v-for="(it, i) in reviewResult.issues" :key="i">{{ it }}</li></ul>
          </div>
          <div v-if="reviewResult.suggestions?.length">
            <b>建议：</b>
            <ul><li v-for="(s, i) in reviewResult.suggestions" :key="i">{{ s }}</li></ul>
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
import { ref, reactive, onMounted, watch } from 'vue'
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

watch([() => filters.status, () => filters.type], () => { pagination.page = 1; fetchList() })
onMounted(fetchList)
</script>

<style lang="scss" scoped>
.filter-items { display: flex; gap: 12px; flex-wrap: wrap; }
.review-content { line-height: 1.7; }
.review-content ul { margin: 4px 0 8px 16px; padding: 0; }
</style>
