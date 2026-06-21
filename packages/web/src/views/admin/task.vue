<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">任务管理</h2>
      <div class="page-actions">
        <el-button type="primary" icon="Plus" @click="handleCreate">新建任务</el-button>
      </div>
    </div>

    <div class="filter-bar">
      <el-select v-model="filters.priority" placeholder="优先级" clearable style="width: 130px;">
        <el-option label="低" value="LOW" />
        <el-option label="中" value="MEDIUM" />
        <el-option label="高" value="HIGH" />
      </el-select>
      <el-input v-model="filters.keyword" placeholder="搜索任务..." clearable style="width: 200px;" @keyup.enter="handleSearch" />
      <el-button icon="Search" @click="handleSearch">搜索</el-button>
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
          <span class="column-title">{{ column.title }}</span>
          <el-badge :value="column.tasks.length" type="info" />
        </div>
        <div class="kanban-column-body">
          <div v-for="task in column.tasks" :key="task.id" class="kanban-card" @click="handleEdit(task)">
            <div class="card-top">
              <el-tag :type="getPriorityType(task.priority)" size="small">{{ getPriorityText(task.priority) }}</el-tag>
              <span class="card-date">{{ formatDate(task.dueDate) }}</span>
            </div>
            <h4 class="card-title">{{ task.title }}</h4>
            <p class="card-desc">{{ task.description }}</p>
          </div>
          <el-empty v-if="column.tasks.length === 0" :image-size="60" description="无任务" />
        </div>
      </div>
    </div>

    <div v-else class="table-wrapper">
      <el-table :data="taskList" v-loading="loading" stripe>
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
      <el-empty v-if="!loading && taskList.length === 0" description="暂无任务" />
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
  { key: 'TODO', title: '待办', color: '#909399', tasks: taskList.value.filter(t => t.status === 'TODO') },
  { key: 'IN_PROGRESS', title: '进行中', color: '#e6a23c', tasks: taskList.value.filter(t => t.status === 'IN_PROGRESS') },
  { key: 'DONE', title: '已完成', color: '#67c23a', tasks: taskList.value.filter(t => t.status === 'DONE') },
])

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

function getPriorityType(p: string) { const m = { LOW: 'info', MEDIUM: 'primary', HIGH: 'warning' } as const; return m[p as keyof typeof m] || 'info' }
function getPriorityText(p: string) { const m: Record<string, string> = { LOW: '低', MEDIUM: '中', HIGH: '高' }; return m[p] || p }
function getStatusType(s: string) { const m = { TODO: 'info', IN_PROGRESS: 'warning', DONE: 'success' } as const; return m[s as keyof typeof m] || 'info' }
function getStatusText(s: string) { const m: Record<string, string> = { TODO: '待办', IN_PROGRESS: '进行中', DONE: '已完成' }; return m[s] || s }

onMounted(fetchList)
</script>

<style lang="scss" scoped>
.filter-bar { display: flex; gap: 12px; margin-bottom: 12px; align-items: center; }
.view-switch { margin-bottom: 16px; }

.kanban-board {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 16px;
}

.kanban-column {
  flex: 1;
  min-width: 280px;
  background: $bg-color;
  border-radius: $border-radius-md;
  display: flex;
  flex-direction: column;
}

.kanban-column-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 3px solid;
}

.column-title { font-weight: 600; font-size: 15px; }

.kanban-column-body {
  padding: 0 12px 12px;
  flex: 1;
  min-height: 200px;
  overflow-y: auto;
  @include custom-scrollbar;
}

.kanban-card {
  background: $bg-white;
  border-radius: $border-radius-sm;
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  box-shadow: $shadow-sm;
  transition: box-shadow $transition-duration;
  &:hover { box-shadow: $shadow-md; }
}

.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.card-date { font-size: 11px; color: $text-placeholder; }
.card-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; color: $text-primary; }
.card-desc { font-size: 12px; color: $text-secondary; margin-bottom: 0; @include text-ellipsis(2); }
</style>
