<template>
  <Teleport to="body">
    <Transition name="cabin-fade">
      <div v-if="agent" class="cabin-overlay" role="dialog" aria-modal="true" :aria-label="`${agent.name} 办公舱`">
        <button type="button" class="cabin-backdrop" aria-label="关闭" @click="$emit('close')" />

        <section class="cabin-panel agent-focus-cabin" :style="{ '--accent': agent.accent }">
          <header class="cabin-header">
            <div>
              <span class="brief-kicker">{{ agent.roomName }}</span>
              <h2>{{ agent.shortName }} · {{ statusLabel(agent.status) }}</h2>
            </div>
            <button type="button" class="cabin-close" aria-label="关闭" @click="$emit('close')">×</button>
          </header>

          <main class="cabin-body">
            <div class="cabin-portrait">
              <div class="portrait-room" :class="`status-${agent.status}`">
                <AgentAvatar :type="agent.type" :status="avatarStatus(agent.status)" :size="120" />
              </div>
            </div>

            <div class="cabin-brief">
              <p class="cabin-task">{{ agent.currentTask }}</p>
              <div class="big-progress cabin-progress">
                <strong>{{ agent.progress }}<i>%</i></strong>
                <div class="progress-rail"><span :style="{ width: `${agent.progress}%` }" /></div>
              </div>

              <div class="brief-metrics cabin-metrics">
                <article>
                  <span>今日完成</span>
                  <strong>{{ agent.completedToday }}</strong>
                </article>
                <article>
                  <span>待处理</span>
                  <strong>{{ agent.pendingItems }}</strong>
                </article>
                <article>
                  <span>部门</span>
                  <strong class="metric-sm">{{ agent.department }}</strong>
                </article>
              </div>

              <ol class="cabin-timeline">
                <li v-for="log in timeline" :key="log.id" :class="`log-${log.type}`">
                  <time>{{ log.time }}</time>
                  <p>{{ log.content }}</p>
                </li>
              </ol>

              <footer class="cabin-actions">
                <el-button
                  :type="agent.status === 'paused' ? 'success' : 'warning'"
                  size="small"
                  @click="$emit('toggle-pause')"
                >
                  {{ agent.status === 'paused' ? '继续' : '暂停' }}
                </el-button>
                <el-button plain size="small" @click="$emit('rerun')">重跑</el-button>
                <el-button type="primary" size="small" @click="$emit('append-command')">+ 指令</el-button>
                <el-button plain size="small" @click="$emit('view-logs')">日志</el-button>
                <button type="button" class="cabin-copilot-fab" @click="$emit('open-copilot')">
                  Copilot ↗
                </button>
              </footer>
            </div>
          </main>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import AgentAvatar from './AgentAvatar.vue'
import { OFFICE_AVATAR_STATUS, OFFICE_STATUS_SHORT_LABEL } from '../constants/statusMeta'
import type { OfficeAgent, OfficeAgentStatus } from '@/types/office'

const props = defineProps<{ agent: OfficeAgent | null }>()

defineEmits<{
  close: []
  'toggle-pause': []
  rerun: []
  'append-command': []
  'view-logs': []
  'open-copilot': []
}>()

const timeline = computed(() => props.agent?.logs.filter((log) => log.type !== 'command').slice(0, 3) ?? [])

function statusLabel(status: OfficeAgentStatus) {
  return OFFICE_STATUS_SHORT_LABEL[status]
}

function avatarStatus(status: OfficeAgentStatus) {
  if (status === 'idle' || status === 'completed') return 'idle'
  return OFFICE_AVATAR_STATUS[status]
}

watch(
  () => props.agent,
  (agent) => {
    document.body.style.overflow = agent ? 'hidden' : ''
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<style lang="scss" scoped>
.cabin-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 20px;
}

.cabin-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(31, 42, 36, 0.55);
  backdrop-filter: blur(2px);
  cursor: pointer;
}

.cabin-panel {
  position: relative;
  z-index: 1;
  width: min(720px, 96vw);
  max-height: min(86vh, 720px);
  overflow: auto;
  padding: 16px 18px 18px;
  animation: overlay-rise 280ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.cabin-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.cabin-header h2 {
  margin: 4px 0 0;
  font-family: var(--font-display, 'Fraunces', serif);
  font-size: 22px;
  font-style: italic;
  color: var(--cream, #f4ebda);
}

.cabin-close {
  width: 34px;
  height: 34px;
  border: 2px solid rgba(244, 235, 218, 0.35);
  background: rgba(0, 0, 0, 0.15);
  color: #f4ebda;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.cabin-body {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 16px;
}

.cabin-portrait .portrait-room {
  display: grid;
  place-items: center;
  min-height: 160px;
  border: 1px solid rgb(var(--line) / 0.5);
  background: rgba(255, 244, 220, 0.08);
}

.cabin-task {
  margin: 0 0 12px;
  font-family: var(--font-display, 'Fraunces', serif);
  font-size: 20px;
  font-style: italic;
  line-height: 1.2;
  color: var(--cream, #f4ebda);
}

.cabin-progress {
  margin-bottom: 12px;
}

.cabin-progress strong {
  font-size: 42px;
}

.cabin-metrics {
  margin-bottom: 12px;
}

.cabin-metrics .metric-sm {
  font-size: 18px !important;
}

.cabin-timeline {
  display: grid;
  gap: 6px;
  margin: 0 0 14px;
  padding: 0;
  list-style: none;
}

.cabin-timeline li {
  display: grid;
  grid-template-columns: 52px 1fr;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255, 244, 220, 0.12);
}

.cabin-timeline time {
  font-family: var(--font-mono, monospace);
  font-size: 9px;
  color: var(--brass, #b7996e);
}

.cabin-timeline p {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: rgba(255, 244, 220, 0.78);
}

.cabin-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.cabin-copilot-fab {
  margin-left: auto;
  min-height: 32px;
  padding: 0 12px;
  border: 2px solid color-mix(in srgb, var(--accent) 70%, #f4ebda);
  background: color-mix(in srgb, var(--accent) 22%, transparent);
  color: #f4ebda;
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  cursor: pointer;
}

.cabin-fade-enter-active,
.cabin-fade-leave-active {
  transition: opacity 220ms ease;
}

.cabin-fade-enter-from,
.cabin-fade-leave-to {
  opacity: 0;
}

@keyframes overlay-rise {
  from { opacity: 0; transform: translateY(18px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (max-width: 640px) {
  .cabin-body {
    grid-template-columns: 1fr;
  }

  .cabin-copilot-fab {
    margin-left: 0;
    width: 100%;
  }
}
</style>