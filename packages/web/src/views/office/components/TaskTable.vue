<template>
  <section class="task-table-panel">
    <header class="table-head">
      <div class="head-left">
        <span class="kicker">TASKS</span>
        <h3>任务表格</h3>
        <span class="count">{{ filteredTasks.length }} / {{ tasks.length }}</span>
      </div>

      <div class="head-actions">
        <el-input
          v-model="internalSearch"
          size="small"
          placeholder="搜索任务或负责人"
          clearable
          style="width: 180px"
          @input="onSearch"
        />
        <el-button-group>
          <el-button size="small" :disabled="!hasSelection" @click="bulk('pause')">暂停</el-button>
          <el-button size="small" :disabled="!hasSelection" @click="bulk('resume')">继续</el-button>
          <el-button size="small" :disabled="!hasSelection" @click="bulk('rerun')">重跑</el-button>
          <el-button size="small" :disabled="!hasSelection" @click="bulk('complete')">完成</el-button>
        </el-button-group>
        <el-button size="small" @click="clearSelection">清空选择</el-button>
      </div>
    </header>

    <el-table
      :data="displayTasks"
      style="width: 100%"
      :default-sort="{ prop: 'updatedAt', order: 'descending' }"
      @sort-change="onSortChange"
      @selection-change="onSelectionChange"
      size="small"
      stripe
      height="240"
    >
      <el-table-column type="selection" width="42" />

      <el-table-column prop="name" label="任务名称" min-width="220" sortable>
        <template #default="{ row }">
          <span class="task-name">{{ (row as OfficeTask).name }}</span>
        </template>
      </el-table-column>

      <el-table-column prop="assignee" label="负责人" width="90" sortable>
        <template #default="{ row }">
          <span class="assignee">{{ (row as OfficeTask).assignee || agentName((row as OfficeTask).agentId) }}</span>
        </template>
      </el-table-column>

      <el-table-column prop="priority" label="优先级" width="90" sortable>
        <template #default="{ row }">
          <el-tag size="small" :type="priorityType((row as OfficeTask).priority)" effect="plain">
            {{ priorityLabel((row as OfficeTask).priority) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="status" label="状态" width="90" sortable>
        <template #default="{ row }">
          <el-tag size="small" :type="statusTag((row as OfficeTask).status)" effect="plain">
            {{ statusLabel((row as OfficeTask).status) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="progress" label="进度" width="110" sortable>
        <template #default="{ row }">
          <div class="prog-cell">
            <el-progress :percentage="(row as OfficeTask).progress" :stroke-width="4" :show-text="false" style="flex:1" />
            <span>{{ (row as OfficeTask).progress }}%</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="duration" label="耗时" width="78" sortable />

      <el-table-column prop="updatedAt" label="更新时间" width="92" sortable />

      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="jumpBusiness(row as OfficeTask)">跳转</el-button>
          <el-button size="small" @click="emitSelect(row as OfficeTask)">定位</el-button>
          <el-button size="small" @click="quickRerun(row as OfficeTask)">重跑</el-button>
        </template>
      </el-table-column>
    </el-table>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  OFFICE_STATUS_LABEL,
  OFFICE_STATUS_TAG_TYPE,
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_TAG_TYPE,
} from '../constants/statusMeta'
import type { OfficeAgent, OfficeTask, TaskPriority, OfficeAgentStatus } from '@/types/office'

const props = defineProps<{
  tasks: OfficeTask[]
  agents: OfficeAgent[]
  selectedAgentId?: string
}>()

const emit = defineEmits<{
  select: [agentId: string]
  'bulk-action': [action: 'pause' | 'resume' | 'rerun' | 'complete', ids: string[]]
  'update-task': [taskId: string, status: OfficeAgentStatus]
}>()

const router = useRouter()

const agentMap = computed(() => new Map(props.agents.map(a => [a.id, a])))

function agentName(id: string) {
  return agentMap.value.get(id)?.shortName || '—'
}

function priorityLabel(p: TaskPriority) { return TASK_PRIORITY_LABEL[p] }
function priorityType(p: TaskPriority) { return TASK_PRIORITY_TAG_TYPE[p] }
function statusLabel(s: OfficeAgentStatus) { return OFFICE_STATUS_LABEL[s] || s }
function statusTag(s: OfficeAgentStatus) { return OFFICE_STATUS_TAG_TYPE[s] || 'info' }

const internalSearch = ref('')
const filteredTasks = computed(() => {
  const q = internalSearch.value.trim().toLowerCase()
  if (!q) return props.tasks
  return props.tasks.filter(t =>
    t.name.toLowerCase().includes(q) ||
    (t.assignee || '').toLowerCase().includes(q) ||
    agentName(t.agentId).toLowerCase().includes(q)
  )
})

const displayTasks = computed(() => filteredTasks.value)

const hasSelection = ref(false)
let currentSelection: OfficeTask[] = []

function onSelectionChange(selection: any[]) {
  currentSelection = selection as OfficeTask[]
  hasSelection.value = selection.length > 0
  // bubble ids up? parent handles via store if wanted, here we emit bulk only on action
}

function onSearch() {
  // no-op, computed
}

function onSortChange({ prop, order }: { prop: string | null; order: 'ascending' | 'descending' | null }) {
  if (prop) {
    // local table handles; store sync optional
  }
}

function onSelectionChangeEmit() {
  // kept for clarity
}

function bulk(action: 'pause' | 'resume' | 'rerun' | 'complete') {
  if (!currentSelection.length) return
  const ids = currentSelection.map(r => (r as OfficeTask).id)
  emit('bulk-action', action, ids)
}

function clearSelection() {
  currentSelection = []
  hasSelection.value = false
  // parent can clear its store selection on next bulk if needed
}

function emitSelect(row: OfficeTask) {
  emit('select', row.agentId)
}

function quickRerun(row: OfficeTask) {
  emit('update-task', row.id, 'running')
}

function jumpBusiness(row: OfficeTask) {
  const path = row.businessPath
  if (path) {
    router.push(path)
  } else {
    // fallback by agent
    const type = agentMap.value.get(row.agentId)?.type
    const map: Record<string, string> = {
      finance: '/finance',
      service: '/customer-service',
      legal: '/legal',
      admin: '/admin',
    }
    if (type) router.push(map[type] || '/')
  }
}

// Expose a way to clear if needed from parent
defineExpose({
  clear: () => {
    currentSelection = []
    hasSelection.value = false
  }
})
</script>

<style lang="scss" scoped>
.task-table-panel {
  border: 1px solid rgb(var(--line) / 0.6);
  background: rgb(var(--surface));
  border-radius: 12px;
  overflow: hidden;
}

.table-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgb(var(--elev) / 0.5);
  border-bottom: 1px solid rgb(var(--line) / 0.4);
}

.head-left {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.kicker {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  color: rgb(var(--muted));
  text-transform: uppercase;
}

.table-head h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #082558;
}

.count {
  font-family: var(--font-mono);
  font-size: 11px;
  color: rgb(var(--muted));
}

.head-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.task-name {
  font-weight: 500;
}

.assignee {
  font-family: var(--font-mono);
  font-size: 12px;
}

.prog-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 11px;
}
</style>
