<template>
  <div class="office-toolbar workbench-toolbar" role="toolbar" aria-label="效率工作台工具栏">
    <div class="toolbar-left">
      <input
        :value="searchTerm"
        type="search"
        class="search-input"
        placeholder="搜索 Agent 或任务..."
        @input="$emit('update:searchTerm', ($event.target as HTMLInputElement).value)"
      />
      <div class="filter-pills">
        <button
          v-for="s in statusLegend"
          :key="s.status"
          type="button"
          class="filter-pill"
          :class="{ active: activeFilters.includes(s.status) }"
          @click="toggleFilter(s.status)"
        >
          {{ s.label }}
        </button>
      </div>
    </div>

    <div class="toolbar-center">
      <span class="view-label">视图</span>
      <div class="view-tabs">
        <button
          class="view-tab"
          :class="{ active: viewMode === 'list' }"
          @click="$emit('update:viewMode', 'list')"
        >列表</button>
        <button
          class="view-tab"
          :class="{ active: viewMode === 'kanban' }"
          @click="$emit('update:viewMode', 'kanban')"
        >看板</button>
        <button
          class="view-tab"
          :class="{ active: viewMode === 'map' }"
          @click="$emit('update:viewMode', 'map')"
        >地图</button>
      </div>
    </div>

    <div class="toolbar-right">
      <button class="action-btn" @click="$emit('focus-issue')">定位异常</button>
      <button class="action-btn" @click="$emit('refresh')">刷新</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { OfficeAgentStatus } from '@/types/office'

const props = defineProps<{
  searchTerm: string
  activeFilters: OfficeAgentStatus[]
  viewMode: 'list' | 'kanban' | 'map'
  statusLegend: Array<{ status: OfficeAgentStatus; label: string }>
}>()

const emit = defineEmits<{
  'update:searchTerm': [value: string]
  'update:viewMode': [mode: 'list' | 'kanban' | 'map']
  'update:activeFilters': [filters: OfficeAgentStatus[]]
  'focus-issue': []
  refresh: []
}>()

function toggleFilter(status: OfficeAgentStatus) {
  let next = [...props.activeFilters]
  if (next.includes(status)) {
    next = next.filter(s => s !== status)
  } else {
    next.push(status)
  }
  emit('update:activeFilters', next)
}
</script>

<style lang="scss" scoped>
/* Additional styles if needed; main layout in office.scss */
.toolbar-summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 11px;
}
.summary-text {
  color: var(--forest);
  font-family: var(--font-display);
  font-weight: 600;
}
.summary-detail {
  color: rgba(62, 95, 62, 0.6);
  font-family: var(--font-mono);
  font-size: 10px;
}
.map-legend-inline {
  display: flex;
  gap: 4px;
}
.legend-pill.small {
  padding: 2px 6px;
  font-size: 10px;
  min-height: 22px;
}
</style>