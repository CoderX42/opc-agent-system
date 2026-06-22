<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">发票管理</h2>
      <div class="page-actions">
        <el-button type="primary" icon="Plus" @click="handleCreate">创建发票</el-button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="filter-items">
        <el-select v-model="filters.type" placeholder="发票类型" clearable style="width: 120px;">
          <el-option label="收入发票" value="income" />
          <el-option label="支出发票" value="expense" />
        </el-select>
        <el-select v-model="filters.status" placeholder="状态" clearable style="width: 120px;">
          <el-option label="草稿" value="DRAFT" />
          <el-option label="待审核" value="PENDING" />
          <el-option label="已通过" value="APPROVED" />
          <el-option label="已驳回" value="REJECTED" />
        </el-select>
        <el-date-picker v-model="filters.dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" />
      </div>
      <el-button icon="Search" @click="handleSearch">搜索</el-button>
    </div>

    <div class="table-wrapper">
      <el-table :data="invoiceList" v-loading="loading" stripe>
        <el-table-column type="selection" width="50" />
        <el-table-column prop="invoiceNo" label="发票编号" width="160" />
        <el-table-column prop="customerName" label="客户名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.type === 'income' ? 'success' : 'danger'" size="small">
              {{ row.type === 'income' ? '收入' : '支出' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="140" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.amount) }}</template>
        </el-table-column>
        <el-table-column prop="taxAmount" label="税额" width="120" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.taxAmount) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="开票日期" width="120">
          <template #default="{ row }">{{ formatDate(row.invoiceDate || row.date) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleView(row)">查看</el-button>
            <el-button link type="primary" size="small" @click="handleEdit(row)" :disabled="row.status === 'APPROVED'">编辑</el-button>
            <el-button link type="success" size="small" @click="handleApprove(row)" :disabled="row.status !== 'PENDING'">审核</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && invoiceList.length === 0" description="暂无发票" />

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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="发票类型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio value="income">收入发票</el-radio>
            <el-radio value="expense">支出发票</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="发票图片">
          <div class="invoice-upload">
            <FileUpload
              accept="image/jpeg,image/png"
              :limit="1"
              :max-size="8"
              tip="支持 JPG、PNG 发票图片，上传后可进行 OCR 识别"
              @success="handleImageUploadSuccess"
              @remove="handleImageRemove"
            />
            <div v-if="form.imageUrl" class="invoice-upload-actions">
              <el-button
                type="primary"
                plain
                icon="View"
                :loading="recognizing"
                @click="handleRecognize"
              >
                识别并填入
              </el-button>
              <a :href="form.imageUrl" target="_blank" rel="noreferrer">查看原图</a>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="发票编号">
          <el-input v-model="form.invoiceNo" placeholder="上传识别或手动输入" />
        </el-form-item>
        <el-form-item label="客户名称" prop="customerName">
          <el-input v-model="form.customerName" placeholder="请输入客户名称" />
        </el-form-item>
        <el-form-item label="金额" prop="amount">
          <el-input-number v-model="form.amount" :min="0" :precision="2" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="税率(%)">
          <el-input-number v-model="form.taxRate" :min="0" :max="100" :precision="1" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="开票日期" prop="invoiceDate">
          <el-date-picker v-model="form.invoiceDate" type="date" placeholder="选择日期" style="width: 100%;" value-format="YYYY-MM-DD" />
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
import { ElMessage, ElMessageBox, type FormInstance, type FormRules, type UploadFile } from 'element-plus'
import { getInvoiceList, createInvoice, updateInvoice, deleteInvoice, approveInvoice, recognizeInvoiceImage } from '@/api/finance'
import type { Invoice } from '@/types'

const loading = ref(false)
const submitting = ref(false)
const recognizing = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('创建发票')
const formRef = ref<FormInstance>()

const filters = reactive({ type: '', status: '', dateRange: null as [string, string] | null })
const pagination = reactive({ page: 1, pageSize: 10, total: 0 })

const form = reactive({
  id: '',
  type: 'income' as 'income' | 'expense',
  invoiceNo: '',
  customerName: '',
  amount: 0,
  taxRate: 13,
  invoiceDate: '',
  description: '',
  imageUrl: '',
  attachments: [] as string[],
})

const formRules: FormRules = {
  type: [{ required: true, message: '请选择发票类型', trigger: 'change' }],
  customerName: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
  invoiceDate: [{ required: true, message: '请选择开票日期', trigger: 'change' }],
}

const invoiceList = ref<Invoice[]>([])

async function fetchList() {
  loading.value = true
  try {
    const res = await getInvoiceList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      type: filters.type || undefined,
      status: filters.status || undefined,
      startDate: filters.dateRange?.[0],
      endDate: filters.dateRange?.[1],
    } as any)
    invoiceList.value = res.data.items || []
    pagination.total = res.data.total || 0
  } catch {
    invoiceList.value = []
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
  form.type = 'income'
  form.invoiceNo = ''
  form.customerName = ''
  form.amount = 0
  form.taxRate = 13
  form.invoiceDate = ''
  form.description = ''
  form.imageUrl = ''
  form.attachments = []
}

function handleCreate() {
  resetForm()
  dialogTitle.value = '创建发票'
  dialogVisible.value = true
}

function handleView(row: any) {
  ElMessageBox.alert(
    `<b>${row.invoiceNo || row.id.slice(0, 8)}</b><br/>
     类型：${row.type === 'income' ? '收入' : '支出'}<br/>
     客户：${row.customerName || '-'}<br/>
     金额：¥${formatMoney(row.amount)}<br/>
     税额：¥${formatMoney(row.taxAmount)}<br/>
     状态：${getStatusText(row.status)}<br/>
     开票日期：${formatDate(row.invoiceDate || row.date) || '-'}<br/>
     附件：${row.imageUrl ? `<a href="${row.imageUrl}" target="_blank">查看图片</a>` : '-'}<br/>
     描述：${row.description || '-'}`,
    '发票详情',
    { dangerouslyUseHTMLString: true },
  ).catch(() => {})
}

function handleEdit(row: any) {
  form.id = row.id
  form.type = (row.type as 'income' | 'expense') || 'income'
  form.invoiceNo = row.invoiceNo || ''
  form.customerName = row.customerName || ''
  form.amount = Number(row.amount) || 0
  form.taxRate = Number(row.taxRate) || 0
  form.invoiceDate = formatDate(row.invoiceDate || row.date)
  form.description = row.description || ''
  form.imageUrl = row.imageUrl || row.attachments?.[0] || ''
  form.attachments = row.attachments || []
  dialogTitle.value = '编辑发票'
  dialogVisible.value = true
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除发票 "${row.invoiceNo || row.id}" 吗？`, '提示', { type: 'warning' })
    submitting.value = true
    await deleteInvoice(row.id)
    ElMessage.success('删除成功')
    fetchList()
  } catch { /* cancel */ }
  finally { submitting.value = false }
}

async function handleApprove(row: any) {
  try {
    const { value: reason } = await ElMessageBox.prompt('审批备注（可选）', '审核发票', { inputPlaceholder: '审批意见', confirmButtonText: '通过', cancelButtonText: '驳回', distinguishCancelAndClose: true })
    submitting.value = true
    await approveInvoice(row.id, true, reason)
    ElMessage.success('已通过')
    fetchList()
  } catch (action: any) {
    if (action === 'cancel') {
      try {
        const { value: reason } = await ElMessageBox.prompt('驳回原因', '驳回发票', { inputPlaceholder: '请填写驳回原因' })
        submitting.value = true
        await approveInvoice(row.id, false, reason)
        ElMessage.warning('已驳回')
        fetchList()
      } catch { /* cancel */ }
      finally { submitting.value = false }
    }
  } finally {
    submitting.value = false
  }
}

async function handleSubmit() {
  if (!formRef.value) return
  try { await formRef.value.validate() } catch { return }
  submitting.value = true
  try {
    const payload = {
      type: form.type,
      invoiceNo: form.invoiceNo || undefined,
      customerName: form.customerName,
      amount: form.amount,
      taxRate: form.taxRate,
      invoiceDate: form.invoiceDate,
      description: form.description || undefined,
      imageUrl: form.imageUrl || undefined,
      attachments: form.attachments,
    }
    if (form.id) {
      await updateInvoice(form.id, payload as any)
      ElMessage.success('更新成功')
    } else {
      await createInvoice(payload as any)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchList()
  } catch {
    // 请求拦截器会展示后端错误信息，这里只负责收口，避免未处理的 Promise 报错。
  } finally {
    submitting.value = false
  }
}

function unwrapUploadData(response: unknown) {
  const data = response as { data?: { id?: string; url?: string }; id?: string; url?: string }
  return data.data || data
}

function handleImageUploadSuccess(response: unknown, _file: UploadFile) {
  const uploaded = unwrapUploadData(response)
  if (!uploaded?.id || !uploaded?.url) return
  form.imageUrl = uploaded.url
  form.attachments = [uploaded.url]
}

function handleImageRemove() {
  form.imageUrl = ''
  form.attachments = []
}

async function handleRecognize() {
  const filename = form.imageUrl.split('/').pop()
  if (!filename) {
    ElMessage.warning('请先上传发票图片')
    return
  }
  recognizing.value = true
  try {
    const res = await recognizeInvoiceImage(filename)
    const fields = res.data.fields || {}
    if (fields.invoiceNo) form.invoiceNo = fields.invoiceNo
    if (fields.customerName) form.customerName = fields.customerName
    if (fields.amount !== undefined) form.amount = Number(fields.amount) || 0
    if (fields.taxRate !== undefined) form.taxRate = Number(fields.taxRate) || 0
    if (fields.invoiceDate) form.invoiceDate = fields.invoiceDate
    if (fields.description) form.description = fields.description
    ElMessage.success('OCR 识别完成，请核对后保存')
  } catch {
    // 请求拦截器会展示具体错误。
  } finally {
    recognizing.value = false
  }
}

function formatMoney(value: number | string | undefined) {
  if (value === undefined || value === null) return '0.00'
  return Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(value: string | Date | undefined | null) {
  if (!value) return ''
  return typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10)
}

function getStatusType(status: string) {
  const map = { DRAFT: 'info', PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' } as const
  return map[status as keyof typeof map] || 'info'
}
function getStatusText(status: string) {
  const map: Record<string, string> = { DRAFT: '草稿', PENDING: '待审核', APPROVED: '已通过', REJECTED: '已驳回' }
  return map[status] || status
}

watch([() => filters.type, () => filters.status, () => filters.dateRange], () => { pagination.page = 1; fetchList() })
onMounted(fetchList)
</script>

<style lang="scss" scoped>
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
.filter-items { display: flex; gap: 12px; flex-wrap: wrap; }
.invoice-upload {
  width: 100%;
}

.invoice-upload-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;

  a {
    color: $forest;
    font-size: 13px;
    font-weight: 600;
    text-decoration: underline;
  }
}
</style>
