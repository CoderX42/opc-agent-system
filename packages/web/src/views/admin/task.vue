<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">任务管理</h2>
      <div class="page-actions">
        <el-button type="primary" icon="Plus" @click="handleCreate">新建任务</el-button>
      </div>
    </div>

    <div class="task-command">
      <div class="task-command-copy">
        <span class="kicker">ADMIN QUEUE</span>
        <strong>{{ taskSummary }}</strong>
      </div>
      <div class="task-command-controls">
        <el-select v-model="filters.priority" placeholder="优先级" clearable class="priority-select">
          <el-option label="低优先级" value="LOW" />
          <el-option label="中优先级" value="MEDIUM" />
          <el-option label="高优先级" value="HIGH" />
        </el-select>
        <el-input v-model="filters.keyword" placeholder="搜索任务..." clearable class="task-search" @keyup.enter="handleSearch" />
        <el-button icon="Search" @click="handleSearch">搜索</el-button>
      </div>
    </div>

    <div class="view-switch">
      <el-radio-group v-model="viewMode" size="small">
        <el-radio-button value="board">看板</el-radio-button>
        <el-radio-button value="list">列表</el-radio-button>
      </el-radio-group>
    </div>

    <div v-if="viewMode === 'board'" class="kanban-board">
      <div v-for="column in kanbanColumns" :key="column.key" class="kanban-column">
        <div class="kanban-column-header" :style="{ borderTopColor: column.color }">
          <div>
            <span class="column-title">{{ column.title }}</span>
            <small>{{ column.hint }}</small>
          </div>
          <span class="column-count">{{ column.tasks.length }}</span>
        </div>
        <div class="kanban-column-body">
          <el-skeleton v-if="loading" :rows="5" animated />
          <div v-for="task in column.tasks" :key="task.id" class="kanban-card" @click="handleEdit(task)">
            <div class="card-top">
              <el-tag :type="getPriorityType(task.priority)" size="small">{{ getPriorityText(task.priority) }}</el-tag>
              <span class="card-date" :class="{ 'is-overdue': isOverdue(task.dueDate) && task.status !== 'DONE' }">
                {{ formatDueText(task.dueDate) }}
              </span>
            </div>
            <h4 class="card-title">{{ task.title }}</h4>
            <p class="card-desc">{{ task.description || '暂无描述，点击补充执行细节。' }}</p>
            <div class="card-meta">
              <span>{{ getStatusText(task.status) }}</span>
              <span v-if="task.assignee">{{ task.assignee }}</span>
            </div>
          </div>
          <el-empty v-if="!loading && column.tasks.length === 0" :image-size="54" description="无任务" />
        </div>
      </div>
    </div>

    <div v-else class="table-wrapper">
      <el-table :data="filteredTasks" v-loading="loading" stripe>
        <el-table-column prop="title" label="任务" min-width="200" show-overflow-tooltip />
        <el-table-column label="优先级" width="80">
          <template #default="{ row }">
            <el-tag :type="getPriorityType(row.priority)" size="small">{{ getPriorityText(row.priority) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="截止日期" width="120">
          <template #default="{ row }">{{ formatDate(row.dueDate) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-dropdown @command="(c) => handleStatusChange(row, c)">
              <el-button link type="primary" size="small">状态 <el-icon><ArrowDown /></el-icon></el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="TODO">待办</el-dropdown-item>
                  <el-dropdown-item command="IN_PROGRESS">进行中</el-dropdown-item>
                  <el-dropdown-item command="DONE">已完成</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && filteredTasks.length === 0" description="暂无任务" />
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="550px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入任务标题" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-select v-model="form.priority" style="width: 100%;">
            <el-option label="低" value="LOW" />
            <el-option label="中" value="MEDIUM" />
            <el-option label="高" value="HIGH" />
          </el-select>
        </el-form-item>
        <el-form-item label="截止日期">
          <el-date-picker v-model="form.dueDate" type="date" placeholder="选择日期" style="width: 100%;" value-format="YYYY-MM-DD" />
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
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { getTaskList, createTask, updateTask, deleteTask, updateTaskStatus } from '@/api/admin'
import type { Task } from '@/types'

const loading = ref(false)
const submitting = ref(false)
const viewMode = ref<'board' | 'list'>('board')
const dialogVisible = ref(false)
const dialogTitle = ref('新建任务')
const formRef = ref<FormInstance>()

const filters = reactive({ priority: '', keyword: '' })
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

const form = reactive({ id: '', title: '', description: '', priority: 'MEDIUM' as Task['priority'], dueDate: '' })

const formRules: FormRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
}

const taskList = ref<Task[]>([])

const kanbanColumns = computed(() => [
  { key: 'TODO', title: '待办', hint: '等待派发与拆解', color: '#6e7a72', tasks: filteredTasks.value.filter(t => t.status === 'TODO') },
  { key: 'IN_PROGRESS', title: '进行中', hint: '正在协调处理', color: '#d9a441', tasks: filteredTasks.value.filter(t => t.status === 'IN_PROGRESS') },
  { key: 'DONE', title: '已完成', hint: '已归档待复盘', color: '#4f8f68', tasks: filteredTasks.value.filter(t => t.status === 'DONE') },
])

const filteredTasks = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()
  if (!keyword) return taskList.value
  return taskList.value.filter((task) => {
    return [task.title, task.description, task.assignee].some(value => (value || '').toLowerCase().includes(keyword))
  })
})

const taskSummary = computed(() => {
  const todo = taskList.value.filter(t => t.status === 'TODO').length
  const doing = taskList.value.filter(t => t.status === 'IN_PROGRESS').length
  const overdue = taskList.value.filter(t => t.status !== 'DONE' && isOverdue(t.dueDate)).length
  return `${todo} 个待办 · ${doing} 个进行中 · ${overdue} 个已过期`
})

async function fetchList() {
  loading.value = true
  try {
    const res = await getTaskList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      priority: filters.priority || undefined,
    } as any)
    taskList.value = res.data.items || []
    pagination.total = res.data.total || 0
  } catch {
    taskList.value = []
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
  form.dueDate = ''
}

function handleCreate() { resetForm(); dialogTitle.value = '新建任务'; dialogVisible.value = true }

function handleEdit(row: any) {
  form.id = row.id
  form.title = row.title
  form.description = row.description || ''
  form.priority = row.priority
  form.dueDate = formatDate(row.dueDate) || ''
  dialogTitle.value = '编辑任务'
  dialogVisible.value = true
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除任务 "${row.title}" 吗？`, '提示', { type: 'warning' })
    await deleteTask(row.id)
    ElMessage.success('删除成功')
    fetchList()
  } catch { /* cancel */ }
}

async function handleStatusChange(row: any, status: string) {
  try {
    await updateTaskStatus(row.id, status as any)
    ElMessage.success('状态已更新')
    fetchList()
  } catch { /* ignore */ }
}

async function handleSubmit() {
  if (!formRef.value) return
  try { await formRef.value.validate() } catch { return }
  submitting.value = true
  try {
    const { id, ...payload } = form
    if (form.id) {
      await updateTask(id, payload)
      ElMessage.success('更新成功')
    } else {
      await createTask(payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchList()
  } finally {
    submitting.value = false
  }
}

function formatDate(value: string | Date | undefined | null) {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toISOString().slice(0, 10)
}

function formatDueText(value: string | Date | undefined | null) {
  if (!value) return '无截止'
  const d = typeof value === 'string' ? new Date(value) : value
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(d)
  due.setHours(0, 0, 0, 0)
  const days = Math.round((due.getTime() - today.getTime()) / 86400000)
  if (days < 0) return `逾期 ${Math.abs(days)} 天`
  if (days === 0) return '今天截止'
  if (days === 1) return '明天截止'
  return formatDate(d)
}

function isOverdue(value: string | Date | undefined | null) {
  if (!value) return false
  const d = typeof value === 'string' ? new Date(value) : value
  const due = new Date(d)
  due.setHours(23, 59, 59, 999)
  return due.getTime() < Date.now()
}

function getPriorityType(p: string) { const m = { LOW: 'info', MEDIUM: 'primary', HIGH: 'warning' } as const; return m[p as keyof typeof m] || 'info' }
function getPriorityText(p: string) { const m: Record<string, string> = { LOW: '低', MEDIUM: '中', HIGH: '高' }; return m[p] || p }
function getStatusType(s: string) { const m = { TODO: 'info', IN_PROGRESS: 'warning', DONE: 'success' } as const; return m[s as keyof typeof m] || 'info' }
function getStatusText(s: string) { const m: Record<string, string> = { TODO: '待办', IN_PROGRESS: '进行中', DONE: '已完成' }; return m[s] || s }

onMounted(fetchList)
</script>

<style lang="scss" scoped>
.task-command {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  padding: 14px 16px;
  background:
    linear-gradient(90deg, rgba(250, 243, 226, 0.96), rgba(245, 235, 211, 0.96)),
    repeating-linear-gradient(135deg, transparent 0 10px, rgba(31, 42, 36, 0.03) 10px 11px);
  border: 2px solid $forest;
  box-shadow: 4px 4px 0 rgba(31, 42, 36, 0.12);
}

.task-command-copy {
  display: grid;
  gap: 4px;
  min-width: 220px;

  strong {
    font-family: var(--font-display);
    font-size: 18px;
    font-style: italic;
    font-weight: 500;
    color: $forest;
  }
}

.task-command-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.priority-select { width: 150px; }
.task-search { width: 220px; }

.view-switch {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.kanban-board {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 16px;
}

.kanban-column {
  flex: 1;
  min-width: 280px;
  background: $cream;
  border: 2px solid $forest;
  display: flex;
  flex-direction: column;
  box-shadow: 4px 4px 0 rgba(31, 42, 36, 0.12);
}

.kanban-column-header {
  padding: 12px 14px 13px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  border-top: 4px solid $rule;
  border-bottom: 1.5px solid $rule;
  background: $cream-warm;

  small {
    display: block;
    margin-top: 4px;
    font-size: 11px;
    color: $text-secondary;
  }
}

.column-title { 
  font-family: var(--font-display);
  font-weight: 500;
  font-style: italic;
  font-size: 14px;
  font-variation-settings: 'opsz' 96;
  color: $forest;
}

.column-count {
  display: inline-flex;
  min-width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 18px;
  font-style: italic;
  color: $forest;
  background: $cream;
  border: 1.5px solid $forest;
}

.kanban-column-body {
  padding: 12px;
  flex: 1;
  min-height: 360px;
  max-height: calc(100vh - 320px);
  overflow-y: auto;
  @include custom-scrollbar;
}

.kanban-card {
  position: relative;
  overflow: hidden;
  background: $bg-page;
  border: 1.5px solid $forest;
  padding: 12px 12px 10px;
  margin-bottom: 12px;
  cursor: pointer;
  box-shadow: 2px 2px 0 rgba(31, 42, 36, 0.08);
  transition: all $transition-duration;

  &::before {
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    content: '';
    background: $brass;
  }
  
  &:hover { 
    transform: translateY(-2px);
    box-shadow: 4px 4px 0 rgba(31, 42, 36, 0.16);
  }
}

.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.card-date {
  font-size: 11px;
  color: $text-placeholder;
  font-family: var(--font-mono);

  &.is-overdue {
    color: $danger-color;
    font-weight: 700;
  }
}
.card-title { 
  font-family: var(--font-display);
  font-size: 14px; 
  font-weight: 500; 
  font-style: italic;
  margin-bottom: 4px; 
  color: $forest; 
}
.card-desc { font-size: 12px; line-height: 1.55; color: $text-secondary; margin-bottom: 10px; @include text-ellipsis(2); }
.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  span {
    padding: 3px 6px;
    font-family: var(--font-mono);
    font-size: 9px;
    color: $brass-deep;
    background: $cream-warm;
    border: 1px solid $rule;
  }
}

@media (max-width: 920px) {
  .task-command {
    align-items: stretch;
    flex-direction: column;
  }

  .task-command-controls {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .task-command-controls,
  .priority-select,
  .task-search {
    width: 100%;
  }

  .view-switch {
    justify-content: flex-start;
  }

  .kanban-column {
    min-width: 82vw;
  }
}
</style>
