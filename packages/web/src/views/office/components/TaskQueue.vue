<template>
  <section class="task-queue">
    <header>
      <div>
        <span>TASK QUEUE</span><h2>任务队列</h2>
      </div>
      <strong>{{ tasks.length }} 个任务</strong>
    </header>

    <div v-if="tasks.length" class="queue-scroll">
      <button
        v-for="task in tasks"
        :key="task.id"
        type="button"
        class="task-card"
        :class="[{ selected: selectedAgentId === task.agentId }, `task-${task.status}`]"
        @click="$emit('select', task.agentId)"
      >
        <div class="task-topline"><span>{{ agentName(task.agentId) }}</span><time>{{ task.updatedAt }}</time></div>
        <h3>{{ task.name }}</h3>
        <div class="task-status">
          <span><el-tag :type="priorityType(task.priority)" size="small" effect="plain">{{ priorityLabel(task.priority) }}</el-tag>{{ statusLabel(task.status) }}</span>
          <strong>{{ task.progress }}%</strong>
        </div>
        <el-progress :percentage="task.progress" :show-text="false" :stroke-width="7" :color="progressColor(task.status)" />
      </button>
    </div>

    <el-empty v-else description="任务队列为空" :image-size="56" />
  </section>
</template>

<script setup lang="ts">
import type { OfficeAgent, OfficeAgentStatus, OfficeTask, TaskPriority } from '@/stores/agentOffice'

const props = defineProps<{
  tasks: OfficeTask[]
  agents: OfficeAgent[]
  selectedAgentId: string
}>()

defineEmits<{ select: [agentId: string] }>()

function agentName(agentId: string) {
  return props.agents.find((agent) => agent.id === agentId)?.name || '未知 Agent'
}

function priorityLabel(priority: TaskPriority) {
  return { high: '高优先级', medium: '中优先级', low: '低优先级' }[priority]
}

function priorityType(priority: TaskPriority) {
  return ({ high: 'danger', medium: 'warning', low: 'info' } as const)[priority]
}

function statusLabel(status: OfficeAgentStatus) {
  return { running: '运行中', waiting: '等待确认', error: '异常', idle: '空闲', paused: '已暂停', completed: '已完成' }[status]
}

function progressColor(status: OfficeAgentStatus) {
  return { running: '#4B8FCB', waiting: '#D9A441', error: '#D66B52', idle: '#4F8F68', paused: '#89918C', completed: '#26372F' }[status]
}
</script>

<style lang="scss" scoped>
.task-queue {
  padding: 11px 12px;
  color: #1f2a24;
  border: 3px solid #26372f;
  background: #fff9f0;
  box-shadow: 7px 9px 0 rgba(38, 55, 47, 0.13);
}

.task-queue header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 8px; }
.task-queue header > div { display: flex; align-items: baseline; gap: 7px; }
.task-queue header span { color: #b7996e; font-size: 9px; font-weight: 900; letter-spacing: 0.14em; }
.task-queue h2 { font-size: 15px; }
.task-queue header > strong { color: #6e766f; font-size: 12px; }

.queue-scroll { display: flex; gap: 9px; padding: 2px 2px 7px; overflow-x: auto; scroll-snap-type: x proximity; }
.queue-scroll::-webkit-scrollbar { height: 8px; }
.queue-scroll::-webkit-scrollbar-thumb { background: #b7996e; border: 2px solid #fff9f0; }

.task-card {
  flex: 0 0 228px;
  min-width: 0;
  padding: 9px 10px;
  color: #1f2a24;
  text-align: left;
  border: 2px solid rgba(38, 55, 47, 0.22);
  border-radius: 2px;
  background: #f5efe6;
  box-shadow: 4px 4px 0 rgba(38, 55, 47, 0.1);
  cursor: pointer;
  scroll-snap-align: start;
  transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
}

.task-card:hover { transform: translateY(-2px); border-color: #b7996e; box-shadow: 5px 6px 0 rgba(38, 55, 47, 0.13); }
.task-card:active { transform: translateY(1px); box-shadow: 2px 2px 0 rgba(38, 55, 47, 0.12); }
.task-card.selected { border-color: #26372f; box-shadow: 0 0 0 2px #b7996e, 5px 6px 0 rgba(38, 55, 47, 0.13); }
.task-error { background: #fff0eb; }
.task-waiting { background: #fff6de; }
.task-completed { background: #edf5ef; }

.task-topline,
.task-status { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.task-topline > span,
.task-topline time { max-width: 150px; overflow: hidden; color: #6e766f; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.task-card h3 { margin: 7px 0; overflow: hidden; font-size: 12px; line-height: 1.4; text-overflow: ellipsis; white-space: nowrap; }
.task-status { margin: 6px 0 4px; }
.task-status span { display: flex; align-items: center; gap: 5px; color: #6e766f; font-size: 10px; }
.task-status strong { font-size: 13px; }
</style>
