<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">记账管理</h2>
      <div class="page-actions">
        <el-button type="primary" icon="Plus" @click="handleCreate">新增记录</el-button>
        <el-button icon="Download" @click="handleExport">导出</el-button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="filter-items">
        <el-select v-model="filters.type" placeholder="交易类型" clearable style="width: 120px;">
          <el-option label="收入" value="INCOME" />
          <el-option label="支出" value="EXPENSE" />
        </el-select>
        <el-input v-model="filters.category" placeholder="分类关键词" clearable style="width: 160px;" />
        <el-date-picker v-model="filters.dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" />
      </div>
      <el-button icon="Search" @click="handleSearch">搜索</el-button>
    </div>

    <div class="table-wrapper">
      <el-table :data="transactionList" v-loading="loading" stripe>
        <el-table-column type="selection" width="50" />
        <el-table-column label="日期" width="120">
          <template #default="{ row }">{{ formatDate(row.transactionDate || row.date) }}</template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="getTypeTag(row.type)" size="small">{{ getTypeText(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="120" />
        <el-table-column prop="counterparty" label="交易方" min-width="150" show-overflow-tooltip />
        <el-table-column prop="account" label="账户" width="120" />
        <el-table-column prop="amount" label="金额" width="140" align="right">
          <template #default="{ row }">
            <span :style="{ color: row.type === 'INCOME' ? '#67c23a' : '#f56c6c', fontWeight: 600 }">
              {{ row.type === 'INCOME' ? '+' : '-' }}¥{{ formatMoney(row.amount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && transactionList.length === 0" description="暂无记录" />

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="fetchList"
          @size-change="fetchList"
        />
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="550px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="交易类型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio value="INCOME">收入</el-radio>
            <el-radio value="EXPENSE">支出</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-input v-model="form.category" placeholder="如 服务收入 / 办公用品" />
        </el-form-item>
        <el-form-item label="金额" prop="amount">
          <el-input-number v-model="form.amount" :min="0" :precision="2" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="交易方" prop="counterparty">
          <el-input v-model="form.counterparty" placeholder="请输入交易方" />
        </el-form-item>
        <el-form-item label="账户" prop="account">
          <el-input v-model="form.account" placeholder="请输入账户" />
        </el-form-item>
        <el-form-item label="交易日期" prop="date">
          <el-date-picker v-model="form.date" type="date" placeholder="选择日期" style="width: 100%;" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { getTransactionList, createTransaction, updateTransaction, deleteTransaction, exportFinanceReport } from '@/api/finance'
import type { Transaction } from '@/types'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('新增记录')
const formRef = ref<FormInstance>()

const filters = reactive({ type: '', category: '', dateRange: null as [string, string] | null })
const pagination = reactive({ page: 1, pageSize: 10, total: 0 })

const form = reactive({
  id: '',
  type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
  category: '',
  amount: 0,
  counterparty: '',
  account: '',
  date: '',
  description: '',
})

const formRules: FormRules = {
  type: [{ required: true, message: '请选择交易类型', trigger: 'change' }],
  category: [{ required: true, message: '请输入分类', trigger: 'blur' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
  counterparty: [{ required: true, message: '请输入交易方', trigger: 'blur' }],
  date: [{ required: true, message: '请选择日期', trigger: 'change' }],
}

const transactionList = ref<Transaction[]>([])

async function fetchList() {
  loading.value = true
  try {
    const res = await getTransactionList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      type: filters.type || undefined,
      category: filters.category || undefined,
    } as any)
    transactionList.value = res.data.items || []
    pagination.total = res.data.total || 0
  } catch {
    transactionList.value = []
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
  form.type = 'EXPENSE'
  form.category = ''
  form.amount = 0
  form.counterparty = ''
  form.account = ''
  form.date = ''
  form.description = ''
}

function handleCreate() {
  resetForm()
  dialogTitle.value = '新增记录'
  dialogVisible.value = true
}

function handleEdit(row: any) {
  form.id = row.id
  form.type = (row.type as 'INCOME' | 'EXPENSE') || 'EXPENSE'
  form.category = row.category || ''
  form.amount = Number(row.amount) || 0
  form.counterparty = row.counterparty || ''
  form.account = row.account || ''
  form.date = row.transactionDate || (row as any).date || ''
  form.description = row.description || ''
  dialogTitle.value = '编辑记录'
  dialogVisible.value = true
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定删除该记录吗？', '提示', { type: 'warning' })
    submitting.value = true
    await deleteTransaction(row.id)
    ElMessage.success('删除成功')
    fetchList()
  } catch { /* cancel */ }
  finally { submitting.value = false }
}

async function handleExport() {
  if (!filters.dateRange || filters.dateRange.length !== 2) {
    ElMessage.warning('请先选择导出的日期范围')
    return
  }
  try {
    const res = await exportFinanceReport({
      startDate: filters.dateRange[0],
      endDate: filters.dateRange[1],
    })
    if (res.data?.downloadUrl) {
      window.open(res.data.downloadUrl, '_blank')
      ElMessage.success(`已导出 ${res.data.count || 0} 条记录`)
    }
  } catch { /* ignore */ }
}

async function handleSubmit() {
  if (!formRef.value) return
  try { await formRef.value.validate() } catch { return }
  submitting.value = true
  try {
    if (form.id) {
      await updateTransaction(form.id, {
        type: form.type, category: form.category, amount: form.amount,
        counterparty: form.counterparty, account: form.account, date: form.date,
        description: form.description,
      } as any)
      ElMessage.success('更新成功')
    } else {
      await createTransaction({
        type: form.type, category: form.category, amount: form.amount,
        counterparty: form.counterparty, account: form.account, date: form.date,
        description: form.description,
      } as any)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchList()
  } finally {
    submitting.value = false
  }
}

function formatMoney(value: number | string | undefined) {
  if (value === undefined || value === null) return '0.00'
  return Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(value: string | Date | undefined) {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toISOString().slice(0, 10)
}

function getTypeTag(type: string) {
  const map = { INCOME: 'success', EXPENSE: 'danger' } as const
  return map[type as keyof typeof map] || 'info'
}
function getTypeText(type: string) {
  const map: Record<string, string> = { INCOME: '收入', EXPENSE: '支出' }
  return map[type] || type
}

watch([() => filters.type, () => filters.category], () => { pagination.page = 1; fetchList() })
onMounted(fetchList)
</script>

<style lang="scss" scoped>
.filter-items { display: flex; gap: 12px; flex-wrap: wrap; }
</style>
