<template>
  <div class="page-container ticket-page">
    <div class="page-header ticket-page-header">
      <div>
        <span class="kicker">Support Ticket Queue</span>
        <h2 class="page-title">工单管理</h2>
        <p class="page-subtitle">按优先级、状态与负责人快速整理问题，保持客户请求流转清楚。</p>
      </div>
      <div class="page-actions">
        <el-button icon="MagicStick" @click="$router.push({ path: '/agents/copilot', query: { agent: 'CUSTOMER_SERVICE' } })">问 Agent</el-button>
        <el-button type="primary" icon="Plus" @click="handleCreate">创建工单</el-button>
      </div>
    </div>

    <div class="ticket-summary">
      <div class="summary-item is-open">
        <span>待处理</span>
        <strong>{{ queueStats.open }}</strong>
      </div>
      <div class="summary-item is-progress">
        <span>进行中</span>
        <strong>{{ queueStats.inProgress }}</strong>
      </div>
      <div class="summary-item is-urgent">
        <span>紧急</span>
        <strong>{{ queueStats.urgent }}</strong>
      </div>
      <div class="summary-item is-resolved">
        <span>已解决</span>
        <strong>{{ queueStats.resolved }}</strong>
      </div>
    </div>

    <div class="filter-bar">
      <div class="filter-items">
        <el-select v-model="filters.status" placeholder="状态" clearable class="filter-control">
          <el-option label="待处理" value="OPEN" />
          <el-option label="进行中" value="IN_PROGRESS" />
          <el-option label="已解决" value="RESOLVED" />
          <el-option label="已关闭" value="CLOSED" />
        </el-select>
        <el-select v-model="filters.priority" placeholder="优先级" clearable class="filter-control">
          <el-option label="低" value="LOW" />
          <el-option label="中" value="MEDIUM" />
          <el-option label="高" value="HIGH" />
          <el-option label="紧急" value="URGENT" />
        </el-select>
        <el-input v-model="filters.keyword" placeholder="搜索标题、描述或负责人..." prefix-icon="Search" clearable class="keyword-input" @keyup.enter="handleSearch" />
      </div>
      <div class="filter-actions">
        <span class="filter-hint">当前显示 {{ visibleTickets.length }} / {{ ticketList.length }} 条</span>
        <el-button @click="handleReset">清空</el-button>
        <el-button icon="Search" @click="handleSearch">搜索</el-button>
      </div>
    </div>

    <div class="table-wrapper">
      <el-table :data="visibleTickets" v-loading="loading" stripe class="ticket-table">
        <el-table-column type="selection" width="50" />
        <el-table-column label="工单" min-width="280">
          <template #default="{ row }">
            <div class="ticket-title-cell">
              <span class="ticket-no">#{{ shortId(row.id) }}</span>
              <strong>{{ row.title }}</strong>
              <small>{{ row.description || row.content || '暂无问题描述' }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="96">
          <template #default="{ row }">
            <span class="priority-pill" :class="`is-${row.priority.toLowerCase()}`">{{ getPriorityText(row.priority) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="112">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="负责人" width="150">
          <template #default="{ row }">
            <div class="assignee-cell" :class="{ empty: !getAssignee(row) }">
              <span>{{ getAssignee(row) ? getInitial(getAssignee(row)) : '?' }}</span>
              <strong>{{ getAssignee(row) || '未分配' }}</strong>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleView(row)">查看</el-button>
            <el-button link type="primary" size="small" @click="handleEdit(row)" :disabled="row.status === 'CLOSED'">编辑</el-button>
            <el-button link type="warning" size="small" @click="handleAssign(row)" :disabled="row.status === 'CLOSED'">分配</el-button>
            <el-button link type="success" size="small" @click="handleResolve(row)" :disabled="row.status === 'RESOLVED' || row.status === 'CLOSED'">解决</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="table-empty">
            <strong>没有匹配的工单</strong>
            <span>调整筛选条件，或创建一个新的客户问题。</span>
          </div>
        </template>
      </el-table>

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
import { computed, ref, reactive, onMounted, watch } from 'vue'
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

const visibleTickets = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()
  return ticketList.value.filter((ticket) => {
    const priorityMatched = !filters.priority || ticket.priority === filters.priority
    const content = [
      ticket.id,
      ticket.title,
      ticket.description,
      ticket.content,
      ticket.assignee,
      ticket.assignedTo,
    ].filter(Boolean).join(' ').toLowerCase()
    const keywordMatched = !keyword || content.includes(keyword)
    return priorityMatched && keywordMatched
  })
})

const queueStats = computed(() => ({
  open: ticketList.value.filter((item) => item.status === 'OPEN').length,
  inProgress: ticketList.value.filter((item) => item.status === 'IN_PROGRESS').length,
  urgent: ticketList.value.filter((item) => item.priority === 'URGENT').length,
  resolved: ticketList.value.filter((item) => item.status === 'RESOLVED').length,
}))

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

function handleReset() {
  filters.status = ''
  filters.priority = ''
  filters.keyword = ''
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
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('zh-CN', { hour12: false })
}

function shortId(id?: string) { return id ? id.slice(0, 8) : '--------' }
function getAssignee(row: Partial<Ticket>) { return row.assignee || row.assignedTo || '' }
function getInitial(value?: string) { return (value || '').slice(0, 1).toUpperCase() }
function getPriorityType(p: string) { const m = { LOW: 'info', MEDIUM: 'primary', HIGH: 'warning', URGENT: 'danger' } as const; return m[p as keyof typeof m] || 'info' }
function getPriorityText(p: string) { const m: Record<string, string> = { LOW: '低', MEDIUM: '中', HIGH: '高', URGENT: '紧急' }; return m[p] || p }
function getStatusType(s: string) { const m = { OPEN: 'primary', IN_PROGRESS: 'warning', RESOLVED: 'success', CLOSED: 'info' } as const; return m[s as keyof typeof m] || 'info' }
function getStatusText(s: string) { const m: Record<string, string> = { OPEN: '待处理', IN_PROGRESS: '进行中', RESOLVED: '已解决', CLOSED: '已关闭' }; return m[s] || s }

watch(() => filters.status, () => {
  pagination.page = 1
  fetchList()
})

onMounted(fetchList)
</script>

<style lang="scss" scoped>
.ticket-page-header {
  align-items: flex-end;
}

.page-subtitle {
  max-width: 620px;
  margin-top: 6px;
  color: $text-secondary;
  line-height: 1.6;
}

.ticket-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-item {
  position: relative;
  overflow: hidden;
  min-height: 92px;
  padding: 14px 16px;
  background: $cream;
  border: 2px solid $forest;
  box-shadow: 4px 4px 0 rgba(31, 42, 36, 0.12);

  &::after {
    position: absolute;
    right: -18px;
    bottom: -28px;
    width: 82px;
    height: 82px;
    content: '';
    border: 1px solid currentColor;
    opacity: 0.18;
    transform: rotate(12deg);
  }

  span {
    color: $brass-deep;
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.16em;
  }

  strong {
    display: block;
    margin-top: 12px;
    color: $forest;
    font-family: var(--font-display);
    font-size: 30px;
    font-style: italic;
    font-weight: 500;
    line-height: 1;
  }

  &.is-open { color: #2f8f67; }
  &.is-progress { color: #d9a441; }
  &.is-urgent { color: #b94c34; }
  &.is-resolved { color: #4f8f68; }
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

.filter-items {
  display: flex;
  gap: 12px;
  flex: 1;
  flex-wrap: wrap;
}

.filter-control {
  width: 128px;
}

.keyword-input {
  width: min(340px, 100%);
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-hint {
  color: $text-placeholder;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.06em;
}

.ticket-table {
  :deep(.el-table__row) {
    transition: background 160ms $transition-timing;
  }
}

.ticket-title-cell {
  display: grid;
  gap: 4px;
  min-width: 0;

  strong {
    color: $forest;
    font-size: 13px;
    font-weight: 700;
    @include text-ellipsis(1);
  }

  small {
    color: $text-secondary;
    font-size: 12px;
    line-height: 1.45;
    @include text-ellipsis(1);
  }
}

.ticket-no {
  width: fit-content;
  padding: 2px 6px;
  color: $brass-deep;
  background: color-mix(in srgb, $brass 10%, $cream);
  border: 1px solid rgba(31, 42, 36, 0.16);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.priority-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  padding: 4px 8px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: $info-color;
  background: color-mix(in srgb, $info-color 8%, $cream);
  border: 1px solid currentColor;

  &.is-medium {
    color: $forest;
    background: color-mix(in srgb, $brass 10%, $cream);
  }

  &.is-high {
    color: $warning-color;
    background: color-mix(in srgb, $warning-color 10%, $cream);
  }

  &.is-urgent {
    color: $danger-color;
    background: color-mix(in srgb, $danger-color 10%, $cream);
  }
}

.assignee-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;

  span {
    width: 25px;
    height: 25px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    color: $cream;
    background: $forest;
    border: 1px solid $forest;
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 800;
  }

  strong {
    color: $text-regular;
    font-size: 12px;
    font-weight: 700;
    @include text-ellipsis(1);
  }

  &.empty {
    span {
      color: $text-placeholder;
      background: transparent;
      border-style: dashed;
    }

    strong {
      color: $text-placeholder;
      font-weight: 500;
    }
  }
}

.table-empty {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 28px 0;
  color: $text-secondary;

  strong {
    color: $forest;
    font-family: var(--font-display);
    font-size: 16px;
    font-style: italic;
    font-weight: 500;
  }
}

@media (max-width: 960px) {
  .ticket-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .ticket-page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .ticket-summary {
    grid-template-columns: 1fr;
  }

  .filter-bar,
  .filter-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .filter-control,
  .keyword-input {
    width: 100%;
  }
}
</style>
