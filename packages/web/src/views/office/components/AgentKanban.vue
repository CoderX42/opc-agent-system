<template>
  <div class="agent-kanban">
    <div
      v-for="col in columns"
      :key="col.key"
      class="kanban-col"
      :class="`kanban-${col.key}`"
    >
      <div class="col-head">
        <span class="col-label">{{ col.label }}</span>
        <span class="col-count">{{ colAgents(col).length }}</span>
      </div>

      <div class="col-body" @dragover.prevent @drop="onDrop($event, col)">
        <div
          v-for="agent in colAgents(col)"
          :key="agent.id"
          class="kanban-card"
          :class="{ 'is-selected': selectedAgentId === agent.id, [`status-${agent.status}`]: true }"
          draggable="true"
          @dragstart="onDragStart($event, agent.id)"
          @click="$emit('select', agent.id)"
        >
          <div class="card-head">
            <AgentAvatar :type="agent.type" :status="mapAvatarStatus(agent.status)" :size="44" />
            <div class="card-meta">
              <div class="card-name">{{ agent.shortName }}</div>
              <div class="card-role">{{ agent.department }}</div>
            </div>
            <el-tag size="small" :type="statusTagType(agent.status)" effect="plain">
              {{ statusShort(agent.status) }}
            </el-tag>
          </div>

          <div class="card-task">
            {{ agent.currentTask }}
          </div>

          <div class="card-progress">
            <el-progress :percentage="agent.progress" :stroke-width="4" :show-text="false" />
            <span class="pct">{{ agent.progress }}%</span>
          </div>

          <div class="card-actions">
            <el-button size="small" @click.stop="emitAction('toggle-pause', agent.id)">
              {{ agent.status === 'paused' ? '继续' : '暂停' }}
            </el-button>
            <el-button size="small" @click.stop="emitAction('append-command', agent.id)">指令</el-button>
            <el-button size="small" @click.stop="emitAction('view-logs', agent.id)">日志</el-button>
            <el-button size="small" type="primary" @click.stop="emitAction('open-copilot', agent.id)">Copilot</el-button>
          </div>
        </div>

        <div v-if="!colAgents(col).length" class="col-empty">暂无</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AgentAvatar from './AgentAvatar.vue'
import type { OfficeAgent, OfficeAgentStatus } from '@/types/office'
import {
  OFFICE_STATUS_SHORT_LABEL,
  OFFICE_STATUS_TAG_TYPE,
} from '../constants/statusMeta'

const props = defineProps<{
  agents: OfficeAgent[]
  selectedAgentId: string
}>()

const emit = defineEmits<{
  select: [agentId: string]
  'toggle-pause': [agentId: string]
  'append-command': [agentId: string]
  'view-logs': [agentId: string]
  'open-copilot': [agentId: string]
  'move-agent': [agentId: string, targetStatus: OfficeAgentStatus]
}>()

const columns = [
  { key: 'todo', label: 'TODO', statuses: ['waiting', 'idle', 'paused'] as const },
  { key: 'running', label: 'RUNNING', statuses: ['running'] as const },
  { key: 'blocked', label: 'BLOCKED', statuses: ['error'] as const },
] as const

function colAgents(col: typeof columns[number]) {
  return props.agents.filter(a => (col.statuses as readonly string[]).includes(a.status))
}

function mapAvatarStatus(s: OfficeAgentStatus): any {
  if (s === 'running') return 'working'
  if (s === 'paused' || s === 'completed' || s === 'idle') return 'idle'
  return s as any
}

function statusShort(s: OfficeAgentStatus) {
  return OFFICE_STATUS_SHORT_LABEL[s] || s
}

function statusTagType(s: OfficeAgentStatus) {
  return OFFICE_STATUS_TAG_TYPE[s] || 'info'
}

function emitAction(name: 'toggle-pause' | 'append-command' | 'view-logs' | 'open-copilot', id: string) {
  emit(name as any, id)
}

// Minimal drag to move between columns (maps back to a representative status)
function onDragStart(ev: DragEvent, agentId: string) {
  ev.dataTransfer?.setData('text/plain', agentId)
}

function onDrop(ev: DragEvent, col: typeof columns[number]) {
  const id = ev.dataTransfer?.getData('text/plain')
  if (!id) return
  // pick first representative status for the column
  const target = col.statuses[0]
  emit('move-agent', id, target as OfficeAgentStatus)
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.agent-kanban {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  height: 100%;
  min-height: 420px;
  padding: 8px;
  background: rgb(var(--elev) / 0.4);
  border: 1px solid rgb(var(--line) / 0.5);
}

.kanban-col {
  display: flex;
  flex-direction: column;
  background: rgb(var(--surface));
  border: 1px solid rgb(var(--line) / 0.6);
  border-radius: 12px;
  overflow: hidden;
}

.col-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: rgb(var(--elev) / 0.6);
  border-bottom: 1px solid rgb(var(--line) / 0.5);
  color: rgb(var(--muted));
}

.col-count {
  font-size: 10px;
  background: rgb(var(--elev));
  padding: 1px 6px;
  border-radius: 999px;
  color: rgb(var(--muted));
}

.col-body {
  flex: 1;
  padding: 8px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kanban-card {
  background: rgb(var(--surface));
  border: 1px solid rgb(var(--line) / 0.6);
  padding: 10px;
  cursor: pointer;
  transition: all .15s ease;
  border-radius: 10px;
  box-shadow: $shadow-sm;
}

.kanban-card:hover {
  border-color: rgb(var(--accent));
  box-shadow: $shadow-md;
}

.kanban-card.is-selected {
  border-color: rgb(var(--accent));
  background: rgb(var(--elev));
}

.card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.card-meta {
  flex: 1;
  min-width: 0;
}

.card-name {
  font-weight: 600;
  font-size: 13px;
  color: #1f2a24;
}

.card-role {
  font-size: 10px;
  color: #6e6b61;
  font-family: var(--font-mono);
}

.card-task {
  font-size: 12px;
  line-height: 1.3;
  color: #3a3630;
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-progress {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.pct {
  font-family: var(--font-mono);
  font-size: 10px;
  color: #6e6b61;
  min-width: 32px;
  text-align: right;
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.card-actions .el-button {
  font-size: 11px;
  padding: 2px 6px;
}

.col-empty {
  font-size: 11px;
  color: #a39b8a;
  padding: 12px 4px;
  font-family: var(--font-mono);
}

.status-running { border-left: 3px solid #4b8fcb; }
.status-waiting { border-left: 3px solid #d9a441; }
.status-error { border-left: 3px solid #d66b52; }
.status-paused { border-left: 3px solid #89918c; }
.status-idle { border-left: 3px solid #4f8f68; }
.status-completed { border-left: 3px solid #26372f; }
</style>
