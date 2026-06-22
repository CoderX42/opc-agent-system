<template>
  <div class="page-container">
    <div class="page-header ledger-page-header">
      <div>
        <span class="kicker">LEDGER ENTRIES</span>
        <h2 class="page-title">记账管理</h2>
        <p class="page-subtitle">记录收入、支出、账户和往来方，让财务 Agent 有清晰可靠的流水底账。</p>
      </div>
      <div class="page-actions">
        <el-button type="primary" icon="Plus" @click="handleCreate">新增记录</el-button>
        <el-button icon="Download" @click="handleExport">导出</el-button>
      </div>
    </div>

    <section class="ledger-summary">
      <div class="summary-item">
        <span>当前页收入</span>
        <strong class="is-income">¥{{ formatMoney(pageIncome) }}</strong>
      </div>
      <div class="summary-item">
        <span>当前页支出</span>
        <strong class="is-expense">¥{{ formatMoney(pageExpense) }}</strong>
      </div>
      <div class="summary-item">
        <span>当前页结余</span>
        <strong :class="pageBalance >= 0 ? 'is-income' : 'is-expense'">¥{{ formatMoney(pageBalance) }}</strong>
      </div>
      <div class="summary-item">
        <span>匹配记录</span>
        <strong>{{ pagination.total }}</strong>
      </div>
    </section>

    <div class="filter-bar ledger-filter-bar">
      <div class="filter-copy">
        <span class="kicker">FILTERS</span>
        <strong>筛选流水</strong>
      </div>
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

    <div class="table-wrapper ledger-table-wrapper">
      <el-table
        :data="transactionList"
        v-loading="loading"
        stripe
        class="ledger-table"
        :row-class-name="getTransactionRowClass"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column label="日期" width="120">
          <template #default="{ row }">
            <span class="ledger-date">{{ formatDate(row.transactionDate || row.date) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="getTypeTag(row.type)" size="small" effect="plain">{{ getTypeText(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="130">
          <template #default="{ row }">
            <span class="category-pill">{{ row.category || '未分类' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="counterparty" label="交易方" min-width="170" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="party-cell">
              <strong>{{ row.counterparty || '未填写交易方' }}</strong>
              <span>{{ row.description || '暂无说明' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="account" label="账户" width="130">
          <template #default="{ row }">
            <span class="account-chip">{{ row.account || '默认账户' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="140" align="right">
          <template #default="{ row }">
            <span class="money-value" :class="row.type === 'INCOME' ? 'is-income' : 'is-expense'">
              {{ row.type === 'INCOME' ? '+' : '-' }}¥{{ formatMoney(row.amount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="备注" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="muted-text">{{ row.description || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </div>
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px" destroy-on-close class="finance-dialog">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px" class="finance-form">
        <div class="form-section-title">流水信息</div>
        <el-form-item label="交易类型" prop="type">
          <el-radio-group v-model="form.type" class="type-switch">
            <el-radio-button value="INCOME">收入</el-radio-button>
            <el-radio-button value="EXPENSE">支出</el-radio-button>
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
import { ref, reactive, computed, onMounted, watch } from 'vue'
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

const pageIncome = computed(() => transactionList.value.reduce((sum, item) => {
  return item.type === 'INCOME' ? sum + Number(item.amount || 0) : sum
}, 0))

const pageExpense = computed(() => transactionList.value.reduce((sum, item) => {
  return item.type === 'EXPENSE' ? sum + Number(item.amount || 0) : sum
}, 0))

const pageBalance = computed(() => pageIncome.value - pageExpense.value)

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

function getTransactionRowClass({ row }: { row: Transaction }) {
  return row.type === 'INCOME' ? 'is-income-row' : 'is-expense-row'
}

watch([() => filters.type, () => filters.category], () => { pagination.page = 1; fetchList() })
onMounted(fetchList)
</script>

<style lang="scss" scoped>
.ledger-page-header {
  align-items: flex-end;
}

.page-subtitle {
  margin-top: 6px;
  color: $text-secondary;
  line-height: 1.7;
}

.ledger-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-bottom: 16px;
  background: $cream;
  border: 2px solid $forest;
  box-shadow: $shadow-sm;
}

.summary-item {
  padding: 14px 16px;
  border-right: 1px solid $rule;

  &:last-child {
    border-right: 0;
  }

  span {
    display: block;
    margin-bottom: 8px;
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: $brass-deep;
  }

  strong {
    font-family: var(--font-display);
    font-size: 24px;
    font-style: italic;
    font-weight: 500;
    color: $forest;
    font-variant-numeric: tabular-nums;

    &.is-income {
      color: $success-color;
    }

    &.is-expense {
      color: $danger-color;
    }
  }
}

.ledger-filter-bar { 
  display: flex; 
  gap: 12px; 
  margin-bottom: 16px; 
  align-items: center;
  padding: 14px 16px;
  background: $cream;
  border: 2px solid $forest;
  box-shadow: 4px 4px 0 rgba(31, 42, 36, 0.12);
}

.filter-copy {
  min-width: 112px;

  strong {
    display: block;
    margin-top: 3px;
    color: $forest;
  }
}

.filter-items {
  display: flex;
  flex: 1;
  gap: 12px;
  flex-wrap: wrap;
}

.ledger-table-wrapper {
  position: relative;
}

.ledger-date {
  font-family: var(--font-mono);
  font-size: 11px;
  color: $text-secondary;
}

.category-pill,
.account-chip {
  display: inline-flex;
  max-width: 100%;
  padding: 3px 8px;
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-pill {
  color: $brass-deep;
  background: color-mix(in srgb, $brass 10%, $cream);
  border: 1px solid rgba(183, 153, 110, 0.38);
}

.account-chip {
  color: $forest;
  background: color-mix(in srgb, $forest 7%, $cream);
  border: 1px solid rgba(31, 42, 36, 0.22);
}

.party-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;

  strong {
    color: $forest;
    font-size: 13px;
    font-weight: 700;
  }

  span {
    color: $text-secondary;
    font-size: 11px;
  }
}

.money-value {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;

  &.is-income {
    color: $success-color;
  }

  &.is-expense {
    color: $danger-color;
  }
}

.muted-text {
  color: $text-secondary;
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.form-section-title {
  margin: 0 0 14px 100px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
  color: $brass-deep;
}

.type-switch {
  width: 100%;
}

:deep(.type-switch .el-radio-button) {
  width: 50%;
}

:deep(.type-switch .el-radio-button__inner) {
  width: 100%;
}

:deep(.ledger-table .is-income-row td:first-child) {
  box-shadow: inset 3px 0 0 $success-color;
}

:deep(.ledger-table .is-expense-row td:first-child) {
  box-shadow: inset 3px 0 0 $danger-color;
}

:deep(.finance-dialog .el-dialog__body) {
  padding-top: 20px;
}

@media (max-width: 760px) {
  .ledger-page-header {
    align-items: flex-start;
  }

  .ledger-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .summary-item:nth-child(2n) {
    border-right: 0;
  }

  .summary-item:nth-child(-n + 2) {
    border-bottom: 1px solid $rule;
  }

  .ledger-filter-bar {
    align-items: flex-start;
  }
}

@media (max-width: 520px) {
  .ledger-summary {
    grid-template-columns: 1fr;
  }

  .summary-item {
    border-right: 0;
    border-bottom: 1px solid $rule;

    &:last-child {
      border-bottom: 0;
    }
  }

  .form-section-title {
    margin-left: 0;
  }
}
</style>
