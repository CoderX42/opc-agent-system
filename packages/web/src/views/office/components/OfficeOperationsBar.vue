<template>
  <section class="ops-bar" aria-label="办公区运营指挥条">
    <div class="ops-primary" :style="{ '--accent': selectedAgent?.accent || '#4b8fcb' }">
      <span class="ops-eyebrow">FOCUS AGENT</span>
      <div class="ops-agent-line">
        <strong>{{ selectedAgent?.shortName || '未选择' }}</strong>
        <span v-if="selectedAgent">{{ selectedAgent.department }} · {{ statusLabel(selectedAgent.status) }}</span>
      </div>
      <p>{{ selectedAgent?.currentTask || '选择一个办公室查看运行细节' }}</p>
    </div>

    <div class="ops-metrics" role="list" aria-label="关键运营指标">
      <article role="listitem" class="ops-metric danger" :class="{ active: errorCount > 0 }">
        <span>异常</span>
        <strong>{{ errorCount }}</strong>
      </article>
      <article role="listitem" class="ops-metric warn" :class="{ active: waitingCount > 0 }">
        <span>待确认</span>
        <strong>{{ waitingCount }}</strong>
      </article>
      <article role="listitem" class="ops-metric">
        <span>高优先级</span>
        <strong>{{ highPriorityCount }}</strong>
      </article>
      <article role="listitem" class="ops-metric">
        <span>运行负载</span>
        <strong>{{ runningCount }}/{{ agentCount }}</strong>
      </article>
    </div>

    <div class="ops-actions" aria-label="快捷操作">
      <el-button size="small" type="primary" @click="$emit('append-command')">追加指令</el-button>
      <el-button size="small" :disabled="!hasIssue" @click="$emit('focus-issue')">定位异常</el-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { OFFICE_STATUS_SHORT_LABEL } from '../constants/statusMeta'
import type { OfficeAgent, OfficeAgentStatus } from '@/types/office'

defineProps<{
  selectedAgent: OfficeAgent | undefined
  agentCount: number
  runningCount: number
  waitingCount: number
  errorCount: number
  highPriorityCount: number
  hasIssue: boolean
}>()

defineEmits<{
  'append-command': []
  'focus-issue': []
}>()

function statusLabel(status: OfficeAgentStatus) {
  return OFFICE_STATUS_SHORT_LABEL[status]
}
</script>
