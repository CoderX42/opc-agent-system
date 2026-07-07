<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">会议纪要</h2>
      <div class="page-actions">
        <el-button type="primary" icon="Plus" @click="handleCreate">新建纪要</el-button>
      </div>
    </div>

    <div class="meeting-brief">
      <div>
        <span class="kicker">MEETING NOTES</span>
        <strong>{{ meetingList.length }} 份纪要正在归档</strong>
        <p>快速追踪会议结论、行动项和参会人，减少散落在聊天里的待办。</p>
      </div>
      <div class="meeting-metrics">
        <span><b>{{ completedCount }}</b> 已完成</span>
        <span><b>{{ activeCount }}</b> 进行中</span>
      </div>
    </div>

    <div class="filter-bar meeting-filter">
      <el-input v-model="filters.keyword" placeholder="搜索会议纪要..." clearable class="meeting-search" @keyup.enter="handleSearch" />
      <el-button icon="Search" @click="handleSearch">搜索</el-button>
    </div>

    <div class="table-wrapper">
      <el-table :data="filteredMeetingList" v-loading="loading" stripe>
        <el-table-column prop="title" label="会议主题" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="meeting-title-cell">
              <span class="meeting-icon"><el-icon><Memo /></el-icon></span>
              <span>{{ row.title }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="日期" width="170">
          <template #default="{ row }">{{ formatTime(row.startTime) }}</template>
        </el-table-column>
        <el-table-column prop="location" label="地点" width="150" show-overflow-tooltip />
        <el-table-column label="参会人" width="240">
          <template #default="{ row }">
            <template v-if="row.participants?.length">
              <el-tag v-for="p in row.participants.slice(0, 3)" :key="p" size="small" class="participant-tag">{{ p }}</el-tag>
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
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <div class="row-actions">
              <el-button link type="primary" size="small" @click="handleView(row)">查看</el-button>
              <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </div>
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
            <el-tag v-for="p in currentMeeting.participants || []" :key="p" size="small" class="participant-tag">{{ p }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">会议议程</el-divider>
        <div class="meeting-content agenda-content">{{ currentMeeting.agenda || '—' }}</div>

        <el-divider content-position="left">会议纪要</el-divider>
        <div class="meeting-content minutes-content">{{ currentMeeting.minutes || '—' }}</div>
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
import { computed, ref, reactive, onMounted } from 'vue'
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

const filteredMeetingList = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()
  if (!keyword) return meetingList.value
  return meetingList.value.filter((meeting) => {
    return [
      meeting.title,
      meeting.location,
      meeting.agenda,
      meeting.minutes,
      ...(meeting.participants || []),
    ].some(value => (value || '').toLowerCase().includes(keyword))
  })
})

const completedCount = computed(() => meetingList.value.filter(item => item.status === 'COMPLETED').length)
const activeCount = computed(() => meetingList.value.filter(item => item.status === 'IN_PROGRESS' || item.status === 'SCHEDULED').length)

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
  form.startTime = formatDateTimeValue(row.startTime)
  form.endTime = formatDateTimeValue(row.endTime || '')
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
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
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
.meeting-brief {
  display: flex;
  gap: 18px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 20px 24px;
  @include glass-hero;

  .kicker {
    color: rgb(var(--accent-strong));
  }

  strong {
    display: block;
    margin: 8px 0;
    font-family: var(--font-body);
    font-size: 22px;
    font-weight: 700;
    color: rgb(var(--text));
  }

  p {
    color: rgb(var(--muted));
    line-height: 1.7;
  }
}

.meeting-metrics {
  display: flex;
  gap: 12px;
  flex: 0 0 auto;

  span {
    min-width: 110px;
    padding: 12px 14px;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    text-align: center;
    color: rgb(var(--muted));
    background: rgb(var(--surface) / 0.78);
    border: 1px solid rgb(var(--line) / 0.6);
    border-radius: 1rem;
    box-shadow: $shadow-sm;
    backdrop-filter: blur(8px);
  }

  b {
    display: block;
    margin-bottom: 4px;
    font-family: var(--font-body);
    font-size: 24px;
    font-weight: 700;
    color: rgb(var(--accent-strong));
    font-variant-numeric: tabular-nums;
  }
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
  padding: 14px 18px;
  @include glass-card;
}
.meeting-filter {
  justify-content: flex-start;
}
.meeting-search {
  width: 260px;
}
.meeting-title-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  font-weight: 600;
  color: rgb(var(--text));
}
.meeting-icon {
  display: inline-flex;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  color: rgb(var(--accent-strong));
  background:
    linear-gradient(135deg, rgb(var(--accent-2) / 0.18), rgb(var(--accent-3) / 0.12));
  border: 1px solid rgb(var(--accent-2) / 0.32);
  border-radius: 0.625rem;
}
.participant-tag {
  margin-right: 4px;
  margin-bottom: 3px;
}
.row-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 4px;
}
.row-actions :deep(.el-button) {
  padding: 4px 6px;
  min-height: 28px;
  font-size: 12px;
}
.meeting-content {
  line-height: 1.8;
  white-space: pre-wrap;
  color: rgb(var(--text));
  min-height: 72px;
  padding: 16px 18px;
  background: rgb(var(--surface) / 0.85);
  border: 1px solid rgb(var(--line) / 0.6);
  border-radius: 1rem;
  box-shadow: $shadow-sm;
}
.agenda-content {
  border-left: 4px solid rgb(var(--warn));
}
.minutes-content {
  border-left: 4px solid rgb(var(--success));
}

@media (max-width: 760px) {
  .meeting-brief {
    align-items: stretch;
    flex-direction: column;
  }

  .meeting-metrics {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }

  .meeting-search {
    width: 100%;
  }
}
</style>
