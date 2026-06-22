<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">工单管理</h2>
      <div class="page-actions">
        <el-button type="primary" icon="Plus" @click="handleCreate">创建工单</el-button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="filter-items">
        <el-select v-model="filters.status" placeholder="状态" clearable style="width: 120px;">
          <el-option label="待处理" value="OPEN" />
          <el-option label="进行中" value="IN_PROGRESS" />
          <el-option label="已解决" value="RESOLVED" />
          <el-option label="已关闭" value="CLOSED" />
        </el-select>
        <el-select v-model="filters.priority" placeholder="优先级" clearable style="width: 120px;">
          <el-option label="低" value="LOW" />
          <el-option label="中" value="MEDIUM" />
          <el-option label="高" value="HIGH" />
          <el-option label="紧急" value="URGENT" />
        </el-select>
        <el-input v-model="filters.keyword" placeholder="搜索工单..." prefix-icon="Search" clearable style="width: 200px;" @keyup.enter="handleSearch" />
      </div>
      <el-button icon="Search" @click="handleSearch">搜索</el-button>
    </div>

    <div class="table-wrapper">
      <el-table :data="ticketList" v-loading="loading" stripe>
        <el-table-column type="selection" width="50" />
        <el-table-column prop="id" label="工单号" width="220" show-overflow-tooltip />
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="priority" label="优先级" width="80">
          <template #default="{ row }">
            <el-tag :type="getPriorityType(row.priority)" size="small">{{ getPriorityText(row.priority) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="负责人" width="120">
          <template #default="{ row }">{{ row.assignee || row.assignedTo || '—' }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleView(row)">查看</el-button>
            <el-button link type="primary" size="small" @click="handleEdit(row)" :disabled="row.status === 'CLOSED'">编辑</el-button>
            <el-button link type="warning" size="small" @click="handleAssign(row)" :disabled="row.status === 'CLOSED'">分配</el-button>
            <el-button link type="success" size="small" @click="handleResolve(row)" :disabled="row.status === 'RESOLVED' || row.status === 'CLOSED'">解决</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && ticketList.length === 0" description="暂无工单" />

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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入工单标题" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="4" placeholder="请描述问题" />
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-select v-model="form.priority" style="width: 100%;">
            <el-option label="低" value="LOW" />
            <el-option label="中" value="MEDIUM" />
            <el-option label="高" value="HIGH" />
            <el-option label="紧急" value="URGENT" />
          </el-select>
        </el-form-item>
        <el-form-item label="负责人">
          <el-input v-model="form.assignee" placeholder="负责人姓名" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="resolveVisible" title="解决工单" width="480px" destroy-on-close>
      <el-form label-width="80px">
        <el-form-item label="解决方案">
          <el-input v-model="resolution" type="textarea" :rows="4" placeholder="请描述解决方案" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resolveVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="confirmResolve">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  getTicketList,
  createTicket,
  updateTicket,
  deleteTicket,
  resolveTicket,
  assignTicket,
} from '@/api/customer-service'
import type { Ticket } from '@/types'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const resolveVisible = ref(false)
const dialogTitle = ref('创建工单')
const formRef = ref<FormInstance>()
const resolution = ref('')
const resolvingTicket = ref<Ticket | null>(null)

const filters = reactive({ status: '', priority: '', keyword: '' })
const pagination = reactive({ page: 1, pageSize: 10, total: 0 })

const form = reactive<{
  id: string
  title: string
  description: string
  priority: string
  assignee: string
}>({
  id: '',
  title: '',
  description: '',
  priority: 'MEDIUM',
  assignee: '',
})

const formRules: FormRules = {
  title: [{ required: true, message: '请输入工单标题', trigger: 'blur' }],
  description: [{ required: true, message: '请描述问题', trigger: 'blur' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
}

const ticketList = ref<Ticket[]>([])

async function fetchList() {
  loading.value = true
  try {
    const res = await getTicketList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      status: filters.status || undefined,
      priority: filters.priority || undefined,
    } as any)
    ticketList.value = res.data.items || []
    pagination.total = res.data.total || 0
  } catch {
    ticketList.value = []
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
  form.description = ''
  form.priority = 'MEDIUM'
  form.assignee = ''
}

function handleCreate() {
  resetForm()
  dialogTitle.value = '创建工单'
  dialogVisible.value = true
}

function handleView(row: any) {
  ElMessageBox.alert(
    `<b>${row.title}</b><br/>${row.description || row.content || ''}`,
    `工单详情 ${row.id.slice(0, 8)}`,
    { dangerouslyUseHTMLString: true },
  ).catch(() => {})
}

function handleEdit(row: any) {
  form.id = row.id
  form.title = row.title
  form.description = row.description || (row as any).content || ''
  form.priority = row.priority
  form.assignee = row.assignee || (row as any).assignedTo || ''
  dialogTitle.value = '编辑工单'
  dialogVisible.value = true
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除工单 "${row.title}" 吗？`, '提示', { type: 'warning' })
    submitting.value = true
    await deleteTicket(row.id)
    ElMessage.success('已删除')
    pagination.page = ticketList.value.length === 1 && pagination.page > 1 ? pagination.page - 1 : pagination.page
    fetchList()
  } catch { /* cancel */ }
  finally { submitting.value = false }
}

function handleResolve(row: any) {
  resolvingTicket.value = row
  resolution.value = ''
  resolveVisible.value = true
}

async function confirmResolve() {
  if (!resolvingTicket.value || !resolution.value.trim()) {
    ElMessage.warning('请填写解决方案')
    return
  }
  submitting.value = true
  try {
    await resolveTicket(resolvingTicket.value.id, resolution.value)
    ElMessage.success('已标记解决')
    resolveVisible.value = false
    fetchList()
  } finally {
    submitting.value = false
  }
}

async function handleAssign(row: any) {
  try {
    const { value } = await ElMessageBox.prompt('请输入负责人姓名', '分配工单', { inputPlaceholder: '负责人' })
    if (!value) return
    await assignTicket(row.id, value)
    ElMessage.success('分配成功')
    fetchList()
  } catch { /* cancel */ }
}

async function handleSubmit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch { return }
  submitting.value = true
  try {
    if (form.id) {
      await updateTicket(form.id, {
        title: form.title,
        description: form.description,
        priority: form.priority as Ticket['priority'],
        assignee: form.assignee,
      } as any)
      ElMessage.success('更新成功')
    } else {
      await createTicket({
        title: form.title,
        description: form.description,
        priority: form.priority as Ticket['priority'],
        assignee: form.assignee,
      } as any)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchList()
  } finally {
    submitting.value = false
  }
}

function formatDateTime(value: string | Date | undefined) {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toLocaleString('zh-CN', { hour12: false })
}

function getPriorityType(p: string) { const m = { LOW: 'info', MEDIUM: 'primary', HIGH: 'warning', URGENT: 'danger' } as const; return m[p as keyof typeof m] || 'info' }
function getPriorityText(p: string) { const m: Record<string, string> = { LOW: '低', MEDIUM: '中', HIGH: '高', URGENT: '紧急' }; return m[p] || p }
function getStatusType(s: string) { const m = { OPEN: 'primary', IN_PROGRESS: 'warning', RESOLVED: 'success', CLOSED: 'info' } as const; return m[s as keyof typeof m] || 'info' }
function getStatusText(s: string) { const m: Record<string, string> = { OPEN: '待处理', IN_PROGRESS: '进行中', RESOLVED: '已解决', CLOSED: '已关闭' }; return m[s] || s }

watch([() => filters.status, () => filters.priority], () => {
  pagination.page = 1
  fetchList()
})

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
</style>
