<template>
  <section class="floor-map" :data-has-selection="Boolean(selectedAgentId)">
    <header class="map-toolbar" aria-label="办公室地图概览">
      <div class="map-toolbar__summary">
        <span class="summary-eyebrow">OFFICE FLOOR</span>
        <strong>{{ agents.length }} 间 Agent 办公舱</strong>
        <em>{{ activeCount }} 个运行中 · {{ issueCount }} 个待处理</em>
      </div>

      <div class="map-toolbar__legend" aria-label="状态图例">
        <span
          v-for="item in statusLegend"
          :key="item.status"
          class="legend-pill"
          :data-status="item.status"
          :aria-label="`${item.label} ${countByStatus(item.status)} 个`"
        >
          <i></i>
          <span>{{ item.label }}</span>
          <b>{{ countByStatus(item.status) }}</b>
        </span>
      </div>
    </header>

    <div class="floor-map__stage">
      <div v-if="loading" class="map-skeleton" aria-busy="true" aria-live="polite">
        <div class="skeleton-grid">
          <div v-for="i in 4" :key="i" class="skeleton-room"></div>
        </div>
        <p>数字员工正在整理桌面……</p>
      </div>

      <OfficeScene
        v-else
        :agents="agents"
        :selected-agent-id="selectedAgentId"
        @select="handleSelect"
      />
    </div>

    <footer class="map-helpbar" aria-label="地图操作提示">
      <span><kbd>点击</kbd> 查看 Agent 工作舱</span>
      <span><kbd>Esc</kbd> 返回办公区</span>
      <span>房间颜色跟随业务身份，状态点用于快速扫视</span>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import OfficeScene from './OfficeScene.vue'
import type { OfficeAgent, OfficeAgentStatus } from '@/types/office'

const props = defineProps<{
  agents: OfficeAgent[]
  selectedAgentId: string
  loading?: boolean
  statusLegend: Array<{ status: OfficeAgentStatus; label: string }>
}>()

const emit = defineEmits<{
  focus: [agentId: string]
}>()

const activeCount = computed(() => props.agents.filter((agent) => agent.status === 'running').length)
const issueCount = computed(() => props.agents.filter((agent) => agent.status === 'waiting' || agent.status === 'error').length)

function countByStatus(status: OfficeAgentStatus) {
  return props.agents.filter((agent) => agent.status === status).length
}

function handleSelect(agentId: string) {
  emit('focus', agentId)
}
</script>
