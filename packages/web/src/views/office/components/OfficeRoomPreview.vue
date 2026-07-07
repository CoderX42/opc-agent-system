<template>
  <div
    v-if="agent"
    class="room-preview"
    :style="{ left: `${x}px`, top: `${y}px`, '--accent': agent.accent }"
    role="tooltip"
  >
    <header>
      <strong>{{ agent.shortName }}</strong>
      <span :data-status="agent.status">{{ statusLabel(agent.status) }}</span>
    </header>
    <p>{{ agent.currentTask }}</p>
    <div class="preview-progress">
      <span :style="{ width: `${agent.progress}%` }" />
    </div>
    <footer>{{ agent.progress }}% · {{ agent.department }}</footer>
  </div>
</template>

<script setup lang="ts">
import { OFFICE_STATUS_SHORT_LABEL } from '../constants/statusMeta'
import type { OfficeAgent, OfficeAgentStatus } from '@/types/office'

defineProps<{
  agent: OfficeAgent | null
  x: number
  y: number
}>()

function statusLabel(status: OfficeAgentStatus) {
  return OFFICE_STATUS_SHORT_LABEL[status]
}
</script>

<style lang="scss" scoped>
.room-preview {
  position: fixed;
  z-index: 50;
  width: 220px;
  padding: 10px 12px;
  border: 2px solid #5b3f1f;
  background: rgba(250, 243, 226, 0.96);
  box-shadow: 4px 5px 0 rgba(31, 42, 36, 0.28);
  pointer-events: none;
  transform: translate(-50%, calc(-100% - 14px));
  animation: preview-rise 180ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.room-preview header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.room-preview header strong {
  font-family: var(--font-display, 'Fraunces', serif);
  font-size: 14px;
  font-style: italic;
  color: #1f2a24;
}

.room-preview header span {
  padding: 2px 5px;
  border: 1px solid #5b3f1f;
  font-family: var(--font-mono, monospace);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #2a422a;
}

.room-preview header span[data-status='error'] {
  background: rgba(200, 90, 74, 0.15);
  color: #c85a4a;
}

.room-preview p {
  margin: 0 0 8px;
  font-size: 11px;
  line-height: 1.4;
  color: rgba(31, 42, 36, 0.78);
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.preview-progress {
  height: 6px;
  padding: 1px;
  border: 1px solid rgba(91, 63, 31, 0.35);
  background: rgba(244, 235, 218, 0.6);
}

.preview-progress span {
  display: block;
  height: 100%;
  background: var(--accent, #4b8fcb);
}

.room-preview footer {
  margin-top: 6px;
  font-family: var(--font-mono, monospace);
  font-size: 9px;
  letter-spacing: 0.06em;
  color: #8b5a2b;
}

@keyframes preview-rise {
  from { opacity: 0; transform: translate(-50%, calc(-100% - 6px)); }
  to { opacity: 1; transform: translate(-50%, calc(-100% - 14px)); }
}
</style>