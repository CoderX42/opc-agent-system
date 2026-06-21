<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">日程管理</h2>
      <div class="page-actions">
        <el-button type="primary" icon="Plus" @click="handleCreate">新建日程</el-button>
      </div>
    </div>

    <el-card shadow="never">
      <el-calendar v-model="selectedDate">
        <template #date-cell="{ data }">
          <div class="calendar-cell" @click="handleDateClick(data.day)">
            <span>{{ data.day.split('-')[2] }}</span>
            <div v-for="event in getDateEvents(data.day)" :key="event.id" class="calendar-event" :class="event.type">
              {{ event.title }}
            </div>
          </div>
        </template>
      </el-calendar>
    </el-card>

    <el-card shadow="never" style="margin-top: 16px;">
      <template #header>
        <div class="card-header">
          <span class="card-title">{{ selectedDateKey }} 日程</span>
          <el-button type="primary" size="small" icon="Plus" @click="handleCreate">添加</el-button>
        </div>
      </template>
      <el-table :data="selectedDateEvents" v-loading="loading" size="default">
        <el-table-column label="开始" width="160">
          <template #default="{ row }">{{ formatTime(row.startTime) }}</template>
        </el-table-column>
        <el-table-column label="结束" width="160">
          <template #default="{ row }">{{ formatTime(row.endTime) }}</template>
        </el-table-column>
        <el-table-column prop="title" label="日程" min-width="200" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ row.type || 'PERSONAL' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="location" label="地点" width="150" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && selectedDateEvents.length === 0" description="暂无日程" />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="550px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入日程标题" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.type" style="width: 100%;">
            <el-option label="个人" value="PERSONAL" />
            <el-option label="会议" value="MEETING" />
            <el-option label="工作" value="WORK" />
            <el-option label="截止日期" value="DEADLINE" />
          </el-select>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="开始时间" prop="startTime">
              <el-date-picker v-model="form.startTime" type="datetime" placeholder="选择时间" style="width: 100%;" value-format="YYYY-MM-DDTHH:mm:ss" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束时间">
              <el-date-picker v-model="form.endTime" type="datetime" placeholder="选择时间" style="width: 100%;" value-format="YYYY-MM-DDTHH:mm:ss" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="地点">
          <el-input v-model="form.location" placeholder="请输入地点" />
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
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { getScheduleList, createSchedule, updateSchedule, deleteSchedule } from '@/api/admin'
import type { Schedule } from '@/types'

const selectedDate = ref(new Date())
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('新建日程')
const formRef = ref<FormInstance>()

const allEvents = ref<Schedule[]>([])

const form = reactive({
  id: '', title: '', type: 'PERSONAL', startTime: '', endTime: '', location: '', description: '',
})

const formRules: FormRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
}

const selectedDateKey = computed(() => {
  const d = selectedDate.value
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

const selectedDateEvents = computed(() => {
  return allEvents.value.filter(e => formatDay(e.startTime) === selectedDateKey.value)
})

function formatDay(value: string | Date | undefined | null) {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatTime(value: string | Date | undefined | null) {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toISOString().slice(0, 16).replace('T', ' ')
}

async function fetchList() {
  loading.value = true
  try {
    const today = new Date()
    const monthAgo = new Date(today)
    monthAgo.setMonth(today.getMonth() - 1)
    const monthLater = new Date(today)
    monthLater.setMonth(today.getMonth() + 1)
    const res = await getScheduleList({ page: 1, pageSize: 100 })
    allEvents.value = res.data.items || []
  } catch {
    allEvents.value = []
  } finally {
    loading.value = false
  }
}

function getDateEvents(day: string) {
  return allEvents.value.filter(e => formatDay(e.startTime) === day)
}

function handleDateClick(day: string) {
  selectedDate.value = new Date(`${day}T00:00:00`)
}

function resetForm() {
  form.id = ''
  form.title = ''
  form.type = 'PERSONAL'
  form.startTime = ''
  form.endTime = ''
  form.location = ''
  form.description = ''
}

function handleCreate() { resetForm(); dialogTitle.value = '新建日程'; dialogVisible.value = true }

function handleEdit(row: any) {
  form.id = row.id
  form.title = row.title
  form.type = (row as any).type || 'PERSONAL'
  form.startTime = formatTime(row.startTime)
  form.endTime = formatTime(row.endTime || '')
  form.location = row.location || ''
  form.description = row.description || ''
  dialogTitle.value = '编辑日程'
  dialogVisible.value = true
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除日程 "${row.title}" 吗？`, '提示', { type: 'warning' })
    await deleteSchedule(row.id)
    ElMessage.success('删除成功')
    fetchList()
  } catch { /* cancel */ }
}

async function handleSubmit() {
  if (!formRef.value) return
  try { await formRef.value.validate() } catch { return }
  submitting.value = true
  try {
    const { id, ...payload } = form
    if (form.id) {
      await updateSchedule(id, payload)
      ElMessage.success('更新成功')
    } else {
      await createSchedule(payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchList()
  } finally {
    submitting.value = false
  }
}

onMounted(fetchList)
</script>

<style lang="scss" scoped>
.card-title { font-weight: 600; font-size: 15px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }

.calendar-cell { height: 100%; padding: 4px; }

.calendar-event {
  font-size: 11px;
  padding: 1px 4px;
  border-radius: 2px;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background-color: #ecf5ff;
  color: #409eff;

  &.MEETING { background-color: #ecf5ff; color: #409eff; }
  &.DEADLINE { background-color: #fef0f0; color: #f56c6c; }
  &.WORK { background-color: #fdf6ec; color: #e6a23c; }
  &.PERSONAL { background-color: #f0f9eb; color: #67c23a; }
}
</style>
