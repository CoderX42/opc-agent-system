<template>
  <section class="floor-map" :data-has-selection="Boolean(selectedAgentId)">
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

function handleSelect(agentId: string) {
  emit('focus', agentId)
}
</script>
