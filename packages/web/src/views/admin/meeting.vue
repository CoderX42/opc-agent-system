<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">会议纪要</h2>
      <div class="page-actions">
        <el-button type="primary" icon="Plus" @click="handleCreate">新建纪要</el-button>
      </div>
    </div>

    <div class="filter-bar">
      <el-input v-model="filters.keyword" placeholder="搜索会议纪要..." clearable style="width: 240px;" @keyup.enter="handleSearch" />
      <el-button icon="Search" @click="handleSearch">搜索</el-button>
    </div>

    <div class="table-wrapper">
      <el-table :data="meetingList" v-loading="loading" stripe>
        <el-table-column prop="title" label="会议主题" min-width="200" show-overflow-tooltip />
        <el-table-column label="日期" width="170">
          <template #default="{ row }">{{ formatTime(row.startTime) }}</template>
        </el-table-column>
        <el-table-column prop="location" label="地点" width="150" show-overflow-tooltip />
        <el-table-column label="参会人" width="240">
          <template #default="{ row }">
            <template v-if="row.participants?.length">
              <el-tag v-for="p in row.participants.slice(0, 3)" :key="p" size="small" style="margin-right: 4px;">{{ p }}</el-tag>
              <el-tag v-if="row.participants.length > 3" size="small" type="info">+{{ row.participants.length - 3 }}</el-tag>
            </template>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleView(row)">查看</el-button>
            <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && meetingList.length === 0" description="暂无会议纪要" />

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

    <el-dialog v-model="detailVisible" :title="currentMeeting?.title" width="700px" destroy-on-close>
      <template v-if="currentMeeting">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="开始时间">{{ formatTime(currentMeeting.startTime) }}</el-descriptions-item>
          <el-descriptions-item label="结束时间">{{ formatTime(currentMeeting.endTime) }}</el-descriptions-item>
          <el-descriptions-item label="地点">{{ currentMeeting.location || '—' }}</el-descriptions-item>
          <el-descriptions-item label="会议链接">{{ currentMeeting.meetingLink || '—' }}</el-descriptions-item>
          <el-descriptions-item label="参会人" :span="2">
            <el-tag v-for="p in currentMeeting.participants || []" :key="p" size="small" style="margin-right: 4px;">{{ p }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">会议议程</el-divider>
        <div class="meeting-content">{{ currentMeeting.agenda || '—' }}</div>

        <el-divider content-position="left">会议纪要</el-divider>
        <div class="meeting-content">{{ currentMeeting.minutes || '—' }}</div>
      </template>
    </el-dialog>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="650px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="80px">
        <el-form-item label="主题" prop="title">
          <el-input v-model="form.title" placeholder="请输入会议主题" />
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
        <el-form-item label="会议链接">
          <el-input v-model="form.meetingLink" placeholder="如：Zoom / 腾讯会议链接" />
        </el-form-item>
        <el-form-item label="参会人">
          <el-select v-model="form.participants" multiple filterable allow-create placeholder="请输入参会人" style="width: 100%;">
          </el-select>
        </el-form-item>
        <el-form-item label="会议议程">
          <el-input v-model="form.agenda" type="textarea" :rows="4" placeholder="请输入议程" />
        </el-form-item>
        <el-form-item label="会议纪要">
          <el-input v-model="form.minutes" type="textarea" :rows="6" placeholder="请输入会议纪要" />
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { getMeetingMinutesList, createMeetingMinutes, updateMeetingMinutes, deleteMeetingMinutes } from '@/api/admin'

interface Meeting {
  id: string
  title: string
  startTime: string
  endTime?: string
  location?: string
  meetingLink?: string
  participants?: string[]
  agenda?: string
  minutes?: string
  status?: string
}

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const detailVisible = ref(false)
const dialogTitle = ref('新建会议纪要')
const formRef = ref<FormInstance>()
const currentMeeting = ref<Meeting | null>(null)

const filters = reactive({ keyword: '' })
const pagination = reactive({ page: 1, pageSize: 10, total: 0 })

const form = reactive({
  id: '', title: '', startTime: '', endTime: '', location: '', meetingLink: '',
  participants: [] as string[], agenda: '', minutes: '',
})

const formRules: FormRules = {
  title: [{ required: true, message: '请输入主题', trigger: 'blur' }],
  startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
}

const meetingList = ref<Meeting[]>([])

async function fetchList() {
  loading.value = true
  try {
    const res = await getMeetingMinutesList({
      page: pagination.page,
      pageSize: pagination.pageSize,
    } as any)
    meetingList.value = (res.data.items || []) as Meeting[]
    pagination.total = res.data.total || 0
  } catch {
    meetingList.value = []
  } finally {
    loading.value = false
  }
}

function handleSearch() { pagination.page = 1; fetchList() }

function resetForm() {
  form.id = ''
  form.title = ''
  form.startTime = ''
  form.endTime = ''
  form.location = ''
  form.meetingLink = ''
  form.participants = []
  form.agenda = ''
  form.minutes = ''
}

function handleCreate() { resetForm(); dialogTitle.value = '新建会议纪要'; dialogVisible.value = true }

function handleView(row: any) { currentMeeting.value = row; detailVisible.value = true }

function handleEdit(row: any) {
  form.id = row.id
  form.title = row.title
  form.startTime = formatTime(row.startTime)
  form.endTime = formatTime(row.endTime || '')
  form.location = row.location || ''
  form.meetingLink = row.meetingLink || ''
  form.participants = [...(row.participants || [])]
  form.agenda = row.agenda || ''
  form.minutes = row.minutes || ''
  dialogTitle.value = '编辑会议纪要'
  dialogVisible.value = true
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除会议纪要 "${row.title}" 吗？`, '提示', { type: 'warning' })
    await deleteMeetingMinutes(row.id)
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
      await updateMeetingMinutes(id, payload)
      ElMessage.success('更新成功')
    } else {
      await createMeetingMinutes(payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchList()
  } finally {
    submitting.value = false
  }
}

function formatTime(value: string | Date | undefined | null) {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toISOString().slice(0, 16).replace('T', ' ')
}

function getStatusType(s?: string) {
  const m: Record<string, any> = { SCHEDULED: 'info', IN_PROGRESS: 'warning', COMPLETED: 'success', CANCELLED: 'danger' }
  return m[s || ''] || 'info'
}
function getStatusText(s?: string) {
  const m: Record<string, string> = { SCHEDULED: '已安排', IN_PROGRESS: '进行中', COMPLETED: '已完成', CANCELLED: '已取消' }
  return m[s || ''] || (s || '—')
}

onMounted(fetchList)
</script>

<style lang="scss" scoped>
.filter-bar { display: flex; gap: 12px; margin-bottom: 12px; align-items: center; }
.meeting-content { line-height: 1.8; white-space: pre-wrap; color: $text-regular; padding: 12px; background: $bg-color; border-radius: $border-radius-sm; }
</style>
