<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">日程管理</h2>
      <div class="page-actions">
        <el-button type="primary" icon="Plus" @click="handleCreate">新建日程</el-button>
      </div>
    </div>

    <section class="schedule-strip">
      <div class="selected-date-card">
        <span class="kicker">SELECTED DAY</span>
        <strong>{{ selectedDateLabel }}</strong>
        <p>{{ selectedDateEvents.length }} 项安排需要跟进</p>
      </div>
      <div class="schedule-legend">
        <span v-for="item in scheduleTypes" :key="item.value" :class="item.value">
          <i></i>{{ item.label }}
        </span>
      </div>
    </section>

    <el-card shadow="never" class="calendar-card">
      <el-calendar v-model="selectedDate">
        <template #date-cell="{ data }">
          <div class="calendar-cell" :class="{ 'is-selected': data.isSelected, 'is-today': isToday(data.day) }" @click="handleDateClick(data.day)">
            <div class="day-row">
              <span class="day-number">{{ data.day.split('-')[2] }}</span>
              <small v-if="getDateEvents(data.day).length">{{ getDateEvents(data.day).length }}</small>
            </div>
            <div v-for="event in getVisibleDateEvents(data.day)" :key="event.id" class="calendar-event" :class="event.type">
              {{ event.title }}
            </div>
            <span v-if="getDateEvents(data.day).length > 3" class="event-more">
              +{{ getDateEvents(data.day).length - 3 }} more
            </span>
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
          <template #default="{ row }">{{ formatTimeLabel(row.startTime) }}</template>
        </el-table-column>
        <el-table-column label="结束" width="160">
          <template #default="{ row }">{{ formatTimeLabel(row.endTime) }}</template>
        </el-table-column>
        <el-table-column prop="title" label="日程" min-width="200" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="getTypeTag(row.type)">{{ getTypeText(row.type) }}</el-tag>
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

const selectedDateLabel = computed(() => {
  return selectedDate.value.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
})

const selectedDateEvents = computed(() => {
  return allEvents.value.filter(e => formatDay(e.startTime) === selectedDateKey.value)
})

const scheduleTypes = [
  { value: 'PERSONAL', label: '个人' },
  { value: 'MEETING', label: '会议' },
  { value: 'WORK', label: '工作' },
  { value: 'DEADLINE', label: '截止' },
]

function formatDay(value: string | Date | undefined | null) {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateTimeValue(value: string | Date | undefined | null) {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`
}

function formatTimeLabel(value: string | Date | undefined | null) {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

async function fetchList() {
  loading.value = true
  try {
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

function getVisibleDateEvents(day: string) {
  return getDateEvents(day).slice(0, 3)
}

function isToday(day: string) {
  return formatDay(new Date()) === day
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
  form.startTime = formatDateTimeValue(row.startTime)
  form.endTime = formatDateTimeValue(row.endTime || '')
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

function getTypeText(type?: string) {
  const m: Record<string, string> = { PERSONAL: '个人', MEETING: '会议', WORK: '工作', DEADLINE: '截止' }
  return m[type || ''] || '日程'
}

function getTypeTag(type?: string) {
  const m = { PERSONAL: 'success', MEETING: 'primary', WORK: 'warning', DEADLINE: 'danger' } as const
  return m[type as keyof typeof m] || 'info'
}

onMounted(fetchList)
</script>

<style lang="scss" scoped>
.schedule-strip {
  display: grid;
  grid-template-columns: minmax(220px, 320px) 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.selected-date-card,
.schedule-legend {
  background: $cream;
  border: 1px solid rgb(var(--line) / 0.7);
  box-shadow: $shadow-sm;
}

.selected-date-card {
  padding: 14px 16px;

  strong {
    display: block;
    margin: 6px 0 4px;
    font-family: var(--font-display);
    font-size: 22px;
    font-style: italic;
    font-weight: 500;
    color: $forest;
  }

  p {
    color: $text-secondary;
  }
}

.schedule-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
  padding: 14px 16px;

  span {
    display: inline-flex;
    gap: 7px;
    align-items: center;
    font-family: var(--font-mono);
    font-size: 10px;
    color: $text-secondary;
    letter-spacing: 0.08em;
  }

  i {
    width: 10px;
    height: 10px;
    background: $info-color;
    border: 1px solid $forest;
  }

  .MEETING i { background: $primary-color; }
  .DEADLINE i { background: $danger-color; }
  .WORK i { background: $warning-color; }
  .PERSONAL i { background: $success-color; }
}

.card-title { 
  font-family: var(--font-display);
  font-weight: 500;
  font-style: italic;
  font-size: 15px;
  font-variation-settings: 'opsz' 96;
  color: $forest;
}
.card-header { display: flex; justify-content: space-between; align-items: center; }

.calendar-card {
  overflow: hidden;

  :deep(.el-calendar__header) {
    padding: 16px 18px;
    background: $cream-warm;
    border-bottom: 1.5px solid $rule;
  }

  :deep(.el-calendar__title) {
    font-family: var(--font-display);
    font-size: 20px;
    font-style: italic;
    color: $forest;
  }

  :deep(.el-calendar-table td) {
    border-color: $rule;
  }

  :deep(.el-calendar-day) {
    min-height: 108px;
    padding: 0;
  }
}

.calendar-cell {
  height: 100%;
  min-height: 108px;
  padding: 7px;
  cursor: pointer;
  transition: background 160ms $transition-timing, box-shadow 160ms $transition-timing;

  &:hover {
    background: color-mix(in srgb, $brass 8%, $cream);
    box-shadow: inset 0 0 0 1.5px $forest;
  }

  &.is-selected {
    background: color-mix(in srgb, $brass 12%, $cream);
    box-shadow: inset 0 0 0 2px $forest;
  }

  &.is-today .day-number {
    color: $cream;
    background: $forest;
  }
}

.day-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 5px;

  small {
    min-width: 18px;
    padding: 1px 5px;
    font-family: var(--font-mono);
    font-size: 10px;
    text-align: center;
    color: $forest;
    background: $cream-warm;
    border: 1px solid $rule;
  }
}

.day-number {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  color: $forest;
}

.calendar-event {
  font-size: 11px;
  padding: 2px 5px;
  margin-top: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background-color: color-mix(in srgb, $info-color 10%, $cream);
  color: $info-color;
  border: 1px solid currentColor;

  &.MEETING { background-color: color-mix(in srgb, $primary-color 8%, $cream); color: $primary-color; }
  &.DEADLINE { background-color: color-mix(in srgb, $danger-color 10%, $cream); color: $danger-color; }
  &.WORK { background-color: color-mix(in srgb, $warning-color 10%, $cream); color: $warning-color; }
  &.PERSONAL { background-color: color-mix(in srgb, $success-color 10%, $cream); color: $success-color; }
}

.event-more {
  display: inline-block;
  margin-top: 4px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: $text-placeholder;
}

@media (max-width: 840px) {
  .schedule-strip {
    grid-template-columns: 1fr;
  }

  .schedule-legend {
    justify-content: flex-start;
  }
}
</style>
