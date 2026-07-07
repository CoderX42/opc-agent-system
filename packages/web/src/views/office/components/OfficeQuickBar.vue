<template>
  <nav class="office-quickbar" aria-label="快捷指令">
    <div class="quickbar-group">
      <button type="button" class="quick-btn quick-btn--accent" @click="$emit('focus-issue')">
        <span>⚡</span> 定位异常
      </button>
      <button type="button" class="quick-btn" @click="$emit('pause-all')">
        <span>⏸</span> 全部暂停
      </button>
      <button type="button" class="quick-btn" @click="$emit('resume-all')">
        <span>▶</span> 全部继续
      </button>
    </div>

    <span class="quickbar-divider" aria-hidden="true" />

    <div class="quickbar-group quickbar-rooms">
      <button
        v-for="room in rooms"
        :key="room.type"
        type="button"
        class="quick-btn quick-btn--room"
        :style="{ '--room-accent': room.accent }"
        @click="$emit('goto-room', room.id)"
      >
        {{ room.code }}
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import type { OfficeAgent } from '@/types/office'

defineProps<{
  rooms: Array<Pick<OfficeAgent, 'id' | 'type' | 'accent'> & { code: string }>
}>()

defineEmits<{
  'focus-issue': []
  'pause-all': []
  'resume-all': []
  'goto-room': [agentId: string]
}>()
</script>

<style lang="scss" scoped>
.office-quickbar {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 12px;
  border-top: 2px solid rgba(91, 63, 31, 0.28);
  border-bottom: 2px solid rgba(91, 63, 31, 0.28);
  background: rgba(31, 42, 36, 0.88);
  flex-shrink: 0;
  overflow-x: auto;
}

.quickbar-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.quickbar-rooms {
  margin-left: auto;
}

.quickbar-divider {
  width: 1px;
  height: 24px;
  background: rgba(244, 235, 218, 0.22);
  flex-shrink: 0;
}

.quick-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 30px;
  padding: 0 10px;
  border: 2px solid rgba(244, 235, 218, 0.28);
  background: rgba(244, 235, 218, 0.06);
  color: #f4ebda;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  white-space: nowrap;
  cursor: pointer;
  transition: transform 140ms ease, background 140ms ease, border-color 140ms ease;
}

.quick-btn span {
  font-size: 11px;
}

.quick-btn:hover {
  transform: translateY(-1px);
  background: rgba(244, 235, 218, 0.14);
  border-color: #b7996e;
}

.quick-btn--accent {
  border-color: rgba(217, 164, 65, 0.65);
  background: rgba(217, 164, 65, 0.14);
}

.quick-btn--room {
  min-width: 44px;
  justify-content: center;
  border-color: color-mix(in srgb, var(--room-accent) 55%, transparent);
  color: color-mix(in srgb, var(--room-accent) 80%, #f4ebda);
}
</style>