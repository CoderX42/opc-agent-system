<template>
  <div class="agent-list-view">
    <div
      v-for="agent in agents"
      :key="agent.id"
      class="list-agent-card"
      :class="{ selected: selectedAgentId === agent.id }"
      @click="$emit('select', agent.id)"
    >
      <AgentAvatar :type="agent.type" :status="mapStatus(agent.status)" :size="64" />
      <div class="list-info">
        <strong>{{ agent.shortName }}</strong>
        <span class="list-task">{{ agent.currentTask }}</span>
        <span class="list-status">{{ statusLabel(agent.status) }} · {{ agent.progress }}%</span>
      </div>
      <div class="list-actions">
        <button @click.stop="$emit('toggle-pause', agent.id)">
          {{ agent.status === 'paused' ? '继续' : '暂停' }}
        </button>
        <button @click.stop="$emit('append-command', agent.id)">指令</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AgentAvatar from './AgentAvatar.vue'
import type { OfficeAgent, OfficeAgentStatus } from '@/types/office'

defineProps<{
  agents: OfficeAgent[]
  selectedAgentId: string
}>()

defineEmits<{
  select: [agentId: string]
  'toggle-pause': [agentId: string]
  'append-command': [agentId: string]
}>()

const statusLabel = (status: OfficeAgentStatus) => ({
  running: '运行中',
  waiting: '待确认',
  error: '异常',
  idle: '空闲',
  paused: '已暂停',
  completed: '已完成',
}[status] || status)

function mapStatus(status: OfficeAgentStatus) {
  if (status === 'running') return 'working'
  if (status === 'paused' || status === 'completed') return 'idle'
  return status as any
}
</script>