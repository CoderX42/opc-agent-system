<template>
  <Teleport to="body">
    <Transition name="drawer-fade">
      <div v-if="desk" class="drawer-mask" @click="$emit('close')" />
    </Transition>
    <Transition name="drawer-slide">
      <aside v-if="desk" class="agent-drawer" :style="{ '--desk-color': desk.accent }">
        <!-- 抽屉顶部装饰条 + drag handle -->
        <header class="drawer-header">
          <div class="drawer-handle" />
          <div class="drawer-meta">
            <span class="drawer-eyebrow">DIGITAL EMPLOYEE</span>
            <span class="drawer-subtitle">在对话中...</span>
          </div>
          <button class="drawer-close" type="button" @click="$emit('close')" aria-label="关闭抽屉">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
          </button>
        </header>

        <div class="drawer-body">
          <AgentAssistantPanel
            :type="agentType"
            :title="`${desk.name} Copilot`"
            :icon="iconFor(desk.type)"
            :color="desk.accent"
          />
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, watch } from 'vue'
import AgentAssistantPanel from '@/components/AgentAssistantPanel.vue'
import type { AgentChatType } from '@/api/agent'
import type { OfficeAgent } from '@/stores/agentOffice'

const props = defineProps<{ desk: OfficeAgent | null }>()
const emit = defineEmits<{ close: [] }>()

const agentType = computed<AgentChatType>(() => {
  if (!props.desk) return 'CUSTOMER_SERVICE'
  return ({ finance: 'FINANCE', service: 'CUSTOMER_SERVICE', legal: 'LEGAL', admin: 'ADMIN' } as const)[props.desk.type]
})

function iconFor(type: OfficeAgent['type']): string {
  return { finance: 'Money', service: 'Service', legal: 'DocumentChecked', admin: 'OfficeBuilding' }[type]
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

watch(() => props.desk, (d) => {
  document.body.style.overflow = d ? 'hidden' : ''
})
</script>

<style lang="scss" scoped>
.drawer-mask {
  position: fixed;
  inset: 0;
  background: radial-gradient(ellipse at 30% 20%, rgba(58, 38, 22, 0.32), rgba(20, 12, 8, 0.5));
  z-index: 90;
  backdrop-filter: blur(3px);
}
.agent-drawer {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: min(540px, 94vw);
  z-index: 100;
  background:
    linear-gradient(180deg, #fafaf6 0%, #f3eee3 100%);
  box-shadow:
    -24px 0 50px rgba(20, 12, 8, 0.28),
    -2px 0 0 rgba(58, 38, 22, 0.06);
  display: flex;
  flex-direction: column;
  border-top-left-radius: 18px;
  border-bottom-left-radius: 18px;
  overflow: hidden;
}
.drawer-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px 12px;
  border-bottom: 1px solid rgba(58, 38, 22, 0.06);
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(8px);
}
.drawer-handle {
  width: 36px;
  height: 4px;
  background: rgba(58, 38, 22, 0.18);
  border-radius: 2px;
}
.drawer-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.drawer-eyebrow {
  color: var(--desk-color, #155e52);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.14em;
}
.drawer-subtitle {
  color: $text-secondary;
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.drawer-subtitle::before {
  content: '';
  width: 6px;
  height: 6px;
  background: #2f9e72;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgba(47, 159, 114, 0.18);
  animation: dot-pulse 1.8s ease-out infinite;
}
@keyframes dot-pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(47, 159, 114, 0.18); }
  50%      { box-shadow: 0 0 0 6px rgba(47, 159, 114, 0); }
}

.drawer-close {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  background: rgba(58, 38, 22, 0.06);
  border: 0;
  border-radius: 9px;
  cursor: pointer;
  color: $text-regular;
  transition: background 0.2s, color 0.2s, transform 0.2s;
}
.drawer-close:hover {
  background: rgba(58, 38, 22, 0.12);
  color: $text-primary;
  transform: rotate(90deg);
}

.drawer-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.drawer-body :deep(.agent-assistant) {
  height: 100%;
  border-radius: 0;
  border: 0;
  background: transparent;
}

.drawer-slide-enter-from,
.drawer-slide-leave-to { transform: translateX(100%); }
.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.drawer-fade-enter-from,
.drawer-fade-leave-to { opacity: 0; }
.drawer-fade-enter-active,
.drawer-fade-leave-active { transition: opacity 0.3s ease; }
</style>
