<template>
  <section class="task-queue">
    <header>
      <div>
        <span class="kicker">TASK QUEUE</span>
        <h2>
          任务队列
          <small>FLOW · INCOMING</small>
        </h2>
      </div>
      <strong class="queue-count">
        <i>{{ tasks.length }}</i>
        <span>个任务</span>
      </strong>
    </header>

    <div v-if="tasks.length" class="queue-scroll">
      <button
        v-for="(task, i) in tasks"
        :key="task.id"
        type="button"
        class="task-card"
        :class="[{ selected: selectedAgentId === task.agentId }, `task-${task.status}`]"
        :style="{ '--idx': i }"
        :aria-pressed="selectedAgentId === task.agentId"
        :aria-label="`${task.name}，${agentName(task.agentId)}，${statusLabel(task.status)}，进度 ${task.progress}%`"
        @click="$emit('select', task.agentId)"
      >
        <div class="task-topline">
          <span class="agent-tag">
            <i class="agent-dot" :style="{ background: agentDotColor(task.agentId) }"></i>
            {{ agentName(task.agentId) }}
          </span>
          <time>{{ task.updatedAt }}</time>
        </div>
        <h3>{{ task.name }}</h3>
        <div class="task-status">
          <span class="status-row">
            <el-tag :type="priorityType(task.priority)" size="small" effect="plain">
              {{ priorityLabel(task.priority) }}
            </el-tag>
            <em class="status-name">{{ statusLabel(task.status) }}</em>
          </span>
          <strong class="status-percent">{{ task.progress }}<i>%</i></strong>
        </div>
        <el-progress
          :percentage="task.progress"
          :show-text="false"
          :stroke-width="5"
          :color="progressColor(task.status)"
          role="progressbar"
          :aria-label="`${task.name} 进度`"
          :aria-valuenow="task.progress"
          aria-valuemin="0"
          aria-valuemax="100"
        />
      </button>
    </div>

    <el-empty v-else description="任务队列为空" :image-size="56" />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  OFFICE_STATUS_COLOR,
  OFFICE_STATUS_LABEL,
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_TAG_TYPE,
} from '../constants/statusMeta'
import type { OfficeAgent, OfficeAgentStatus, OfficeTask, TaskPriority } from '@/types/office'

const props = defineProps<{
  tasks: OfficeTask[]
  agents: OfficeAgent[]
  selectedAgentId: string
}>()

defineEmits<{ select: [agentId: string] }>()

const agentMap = computed(() => new Map(props.agents.map((agent) => [agent.id, agent])))

function agentName(agentId: string) {
  return agentMap.value.get(agentId)?.name || '未知 Agent'
}

function agentDotColor(agentId: string) {
  return agentMap.value.get(agentId)?.accent || '#8d704a'
}

function priorityLabel(priority: TaskPriority) {
  return TASK_PRIORITY_LABEL[priority]
}

function priorityType(priority: TaskPriority) {
  return TASK_PRIORITY_TAG_TYPE[priority]
}

function statusLabel(status: OfficeAgentStatus) {
  return OFFICE_STATUS_LABEL[status]
}

function progressColor(status: OfficeAgentStatus) {
  return OFFICE_STATUS_COLOR[status]
}
</script>

<style lang="scss" scoped>
.task-queue {
  padding: 14px 16px 16px;
  color: #1a221d;
  border: 2px solid #1f2a24;
  background: #faf3e2;
  box-shadow:
    inset 0 1px 0 #b7996e,
    6px 8px 0 -1px rgba(31, 42, 36, 0.16),
    12px 22px 40px -16px rgba(31, 42, 36, 0.32);
  position: relative;
  animation: queue-rise 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) 0.3s both;
}

@keyframes queue-rise {
  0% { opacity: 0; transform: translateY(14px); }
  100% { opacity: 1; transform: translateY(0); }
}

.kicker {
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #8d704a;
}

.task-queue header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(31, 42, 36, 0.18);
}

.task-queue header > div { display: flex; flex-direction: column; gap: 4px; }

.task-queue h2 {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 18px;
  font-weight: 500;
  font-style: italic;
  font-variation-settings: 'opsz' 96, 'SOFT' 30;
  letter-spacing: -0.01em;
  color: #1f2a24;
}

.task-queue h2 small {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-style: normal;
  font-weight: 500;
  letter-spacing: 0.16em;
  color: #8d704a;
  text-transform: uppercase;
}

.queue-count {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  font-family: 'Fraunces', Georgia, serif;
  color: #1f2a24;
}
.queue-count i {
  font-size: 22px;
  font-style: italic;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.queue-count span {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.14em;
  color: #6e766f;
  text-transform: uppercase;
}

.queue-scroll {
  display: flex;
  gap: 10px;
  padding: 2px 2px 8px;
  overflow-x: auto;
  scroll-snap-type: x proximity;
}

.queue-scroll::-webkit-scrollbar { height: 8px; }
.queue-scroll::-webkit-scrollbar-track { background: #f5ebd3; }
.queue-scroll::-webkit-scrollbar-thumb {
  background: #b7996e;
  border: 2px solid #f5ebd3;
}

.task-card {
  position: relative;
  flex: 0 0 244px;
  min-width: 0;
  padding: 11px 12px 12px;
  color: #1a221d;
  text-align: left;
  border: 2px solid rgba(31, 42, 36, 0.22);
  border-radius: 0;
  background: #f5ebd3;
  box-shadow: 4px 4px 0 rgba(31, 42, 36, 0.12);
  cursor: pointer;
  scroll-snap-align: start;
  transition: transform 160ms cubic-bezier(0.2, 0.7, 0.2, 1), border-color 160ms ease, box-shadow 160ms ease;
  animation: card-slide-in 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) both;
  animation-delay: calc(var(--idx, 0) * 60ms + 500ms);
  overflow: hidden;
}

@keyframes card-slide-in {
  0% { opacity: 0; transform: translateX(12px); }
  100% { opacity: 1; transform: translateX(0); }
}

.task-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 3px;
  height: 100%;
  background: var(--status-stripe, #8d704a);
  transform: scaleY(0.4);
  transform-origin: top;
  transition: transform 240ms cubic-bezier(0.2, 0.7, 0.2, 1);
}

.task-card::after {
  content: 'OPEN';
  position: absolute;
  right: 10px;
  bottom: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: rgba(31, 42, 36, 0.34);
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 160ms ease, transform 160ms ease;
}

.task-card:hover {
  transform: translateY(-3px);
  border-color: #1f2a24;
  box-shadow: 6px 8px 0 rgba(31, 42, 36, 0.16);
}
.task-card:hover::after,
.task-card:focus-visible::after { opacity: 1; transform: translateY(0); }
.task-card:hover::before { transform: scaleY(1); }

.task-card:focus-visible {
  outline: 3px solid rgba(217, 164, 65, 0.78);
  outline-offset: 3px;
  transform: translateY(-3px);
}

.task-card:active {
  transform: translateY(1px);
  box-shadow: 2px 2px 0 rgba(31, 42, 36, 0.14);
}

.task-card.selected {
  border-color: #1f2a24;
  background: #faf3e2;
  box-shadow: 0 0 0 2px #b7996e, 6px 8px 0 rgba(31, 42, 36, 0.16);
}
.task-card.selected::before { transform: scaleY(1); }

.task-error { --status-stripe: #d66b52; }
.task-waiting { --status-stripe: #d9a441; }
.task-running { --status-stripe: #4b8fcb; }
.task-idle { --status-stripe: #4f8f68; }
.task-paused { --status-stripe: #89918c; }
.task-completed { --status-stripe: #1f2a24; }

.task-topline,
.task-status { display: flex; align-items: center; justify-content: space-between; gap: 8px; }

.task-topline { margin-bottom: 8px; }

.agent-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: #1f2a24;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-dot {
  width: 7px;
  height: 7px;
  border: 1.5px solid #1f2a24;
  flex-shrink: 0;
}

.task-topline time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: #8d704a;
  white-space: nowrap;
}

.task-card h3 {
  margin: 0 0 8px;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 13px;
  font-style: italic;
  font-weight: 500;
  line-height: 1.35;
  color: #1f2a24;
  letter-spacing: -0.005em;
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.task-status { margin: 6px 0 8px; }

.status-row { display: inline-flex; align-items: center; gap: 5px; }

.status-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-style: normal;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: #6e766f;
  text-transform: uppercase;
}

.status-percent {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 16px;
  font-style: italic;
  font-weight: 500;
  font-variation-settings: 'opsz' 96;
  font-variant-numeric: tabular-nums;
  color: #1f2a24;
  line-height: 1;
}
.status-percent i {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-style: normal;
  font-weight: 500;
  color: #6e766f;
  margin-left: 1px;
}

.task-card :deep(.el-progress) { margin: 0; }

.task-card :deep(.el-tag) {
  border-radius: 0 !important;
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 9px !important;
  font-weight: 700 !important;
  letter-spacing: 0.1em;
}
</style>
