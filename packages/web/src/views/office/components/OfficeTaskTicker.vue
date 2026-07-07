<template>
  <section class="task-ticker" aria-label="任务滚动带">
    <button type="button" class="ticker-nav" aria-label="向左滚动" @click="scrollBy(-1)">◀</button>

    <div
      ref="trackRef"
      class="ticker-track"
      :class="{ 'is-paused': paused }"
      @mouseenter="paused = true"
      @mouseleave="paused = false"
      @focusin="paused = true"
      @focusout="paused = false"
    >
      <div class="ticker-inner" :class="{ 'auto-scroll': autoScroll && tasks.length > 2 }">
        <button
          v-for="(task, index) in tickerTasks"
          :key="`${task.id}-${index}`"
          type="button"
          class="ticker-card"
          :class="[{ selected: selectedAgentId === task.agentId }, `task-${task.status}`]"
          :aria-pressed="selectedAgentId === task.agentId"
          @click="$emit('select', task.agentId)"
        >
          <span class="ticker-dot" :style="{ background: agentColor(task.agentId) }" />
          <span class="ticker-agent">{{ agentShortName(task.agentId) }}</span>
          <span class="ticker-name">{{ task.name }}</span>
          <span class="ticker-bar"><i :style="{ width: `${task.progress}%` }" /></span>
          <strong class="ticker-pct">{{ task.progress }}%</strong>
          <span class="ticker-priority" :data-priority="task.priority">{{ priorityLabel(task.priority) }}</span>
        </button>
      </div>
    </div>

    <button type="button" class="ticker-nav" aria-label="向右滚动" @click="scrollBy(1)">▶</button>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { TASK_PRIORITY_LABEL } from '../constants/statusMeta'
import type { OfficeAgent, OfficeAgentStatus, OfficeTask, TaskPriority } from '@/types/office'

const props = withDefaults(
  defineProps<{
    tasks: OfficeTask[]
    agents: OfficeAgent[]
    selectedAgentId: string
    autoScroll?: boolean
  }>(),
  { autoScroll: true },
)

defineEmits<{ select: [agentId: string] }>()

const trackRef = ref<HTMLElement | null>(null)
const paused = ref(false)

const agentMap = computed(() => new Map(props.agents.map((agent) => [agent.id, agent])))

const tickerTasks = computed(() => {
  if (!props.autoScroll || props.tasks.length <= 2) return props.tasks
  return [...props.tasks, ...props.tasks]
})

function agentColor(agentId: string) {
  return agentMap.value.get(agentId)?.accent || '#8d704a'
}

function agentShortName(agentId: string) {
  return agentMap.value.get(agentId)?.shortName || 'Agent'
}

function priorityLabel(priority: TaskPriority) {
  return TASK_PRIORITY_LABEL[priority]
}

function scrollBy(direction: -1 | 1) {
  const track = trackRef.value
  if (!track) return
  track.scrollBy({ left: direction * 260, behavior: 'smooth' })
}
</script>

<style lang="scss" scoped>
.task-ticker {
  display: grid;
  grid-template-columns: 36px 1fr 36px;
  align-items: stretch;
  height: 72px;
  border-top: 1px solid rgb(var(--line) / 0.5);
  background: rgb(var(--elev) / 0.4);
  flex-shrink: 0;
}

.ticker-nav {
  border: 0;
  background: rgb(var(--elev) / 0.5);
  color: rgb(var(--muted));
  font-size: 12px;
  cursor: pointer;
  transition: background 140ms ease;
}

.ticker-nav:hover {
  background: rgba(31, 42, 36, 0.16);
}

.ticker-track {
  min-width: 0;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
}

.ticker-track::-webkit-scrollbar {
  height: 6px;
}

.ticker-inner {
  display: flex;
  gap: 8px;
  padding: 10px 8px;
  width: max-content;
}

.ticker-inner.auto-scroll {
  animation: ticker-marquee 36s linear infinite;
}

.ticker-track.is-paused .ticker-inner.auto-scroll {
  animation-play-state: paused;
}

.ticker-card {
  display: grid;
  grid-template-columns: auto auto 1fr auto auto;
  align-items: center;
  gap: 8px;
  min-width: 280px;
  padding: 8px 10px;
  border: 1px solid rgb(var(--line) / 0.5);
  background: rgb(var(--surface));
  box-shadow: $shadow-sm;
  cursor: pointer;
  scroll-snap-align: start;
  text-align: left;
  transition: transform 140ms ease, border-color 140ms ease;
}

.ticker-card:hover,
.ticker-card.selected {
  transform: translateY(-2px);
  border-color: #082558;
}

.ticker-dot {
  width: 8px;
  height: 8px;
  border: 1px solid #082558;
}

.ticker-agent {
  font-family: var(--font-mono, monospace);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #5b3f1f;
  white-space: nowrap;
}

.ticker-name {
  font-family: var(--font-display, 'Fraunces', serif);
  font-size: 12px;
  font-style: italic;
  color: #082558;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ticker-bar {
  width: 56px;
  height: 5px;
  padding: 1px;
  border: 1px solid rgba(91, 63, 31, 0.35);
  background: rgba(244, 235, 218, 0.7);
}

.ticker-bar i {
  display: block;
  height: 100%;
  background: #4b8fcb;
}

.task-error .ticker-bar i { background: #d66b52; }
.task-waiting .ticker-bar i { background: #d9a441; }
.task-running .ticker-bar i { background: #4b8fcb; }

.ticker-pct {
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  font-weight: 800;
  color: #082558;
}

.ticker-priority {
  font-family: var(--font-mono, monospace);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8b5a2b;
}

.ticker-priority[data-priority='high'] { color: #c85a4a; }

@keyframes ticker-marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
</style>