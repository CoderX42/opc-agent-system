<template>
  <section class="agent-focus-cabin" :style="{ '--accent': agent.accent }" aria-label="Agent 聚焦办公舱">
    <header class="focus-nav">
      <button type="button" class="back-office" @click="$emit('back')">← 返回办公区</button>
      <span class="focus-breadcrumb">办公区 / {{ agent.name }}</span>
    </header>

    <main class="focus-canvas">
      <section class="portrait-stage" aria-label="Agent 全身状态">
        <div class="portrait-room" :class="`status-${agent.status}`">
          <span class="portrait-grid" aria-hidden="true"></span>
          <span class="portrait-halo" aria-hidden="true"></span>
          <AgentAvatar :type="agent.type" :status="avatarStatus(agent.status)" :size="176" />
          <span v-if="agent.status === 'running'" class="portrait-fx work"><i></i><i></i><i></i></span>
          <span v-else-if="agent.status === 'error'" class="portrait-fx alert">!</span>
          <span v-else-if="agent.status === 'waiting'" class="portrait-fx wait">WAIT</span>
          <span v-else class="portrait-fx rest"><i>Z</i><i>Z</i></span>
        </div>
      </section>

      <section class="focus-brief">
        <span class="brief-kicker">CURRENT TASK</span>
        <h2>{{ agent.currentTask }}</h2>
        <div class="big-progress">
          <strong>{{ agent.progress }}<i>%</i></strong>
          <div class="progress-rail"><span :style="{ width: `${agent.progress}%` }"></span></div>
        </div>
        <div class="brief-metrics">
          <article>
            <span>耗时</span>
            <strong>{{ elapsedTime }}</strong>
          </article>
          <article>
            <span>今日完成</span>
            <strong>{{ agent.completedToday }}</strong>
          </article>
          <article>
            <span>待处理</span>
            <strong>{{ agent.pendingItems }}</strong>
          </article>
        </div>
        <footer class="focus-actions-row">
          <el-button :type="agent.status === 'paused' ? 'success' : 'warning'" @click="$emit('toggle-pause')">
            {{ agent.status === 'paused' ? '继续' : '暂停' }}
          </el-button>
          <el-button plain @click="$emit('rerun')">重跑</el-button>
          <el-button type="primary" @click="$emit('append-command')">+ 指令</el-button>
        </footer>
      </section>
    </main>

    <section class="focus-lower">
      <div class="timeline-card">
        <header>
          <span>任务时间线</span>
          <button type="button" @click="$emit('view-logs')">查看完整日志</button>
        </header>
        <ol>
          <li v-for="log in timeline" :key="log.id" :class="`log-${log.type}`">
            <time>{{ log.time }}</time>
            <p>{{ log.content }}</p>
          </li>
        </ol>
      </div>

      <div class="completion-card">
        <span>今日完成</span>
        <strong>{{ agent.completedToday }} 项</strong>
        <i><b :style="{ width: `${completionPercent}%` }"></b></i>
        <small>基于今日任务吞吐估算</small>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AgentAvatar from './AgentAvatar.vue'
import { OFFICE_AVATAR_STATUS } from '../constants/statusMeta'
import type { OfficeAgent, OfficeAgentStatus } from '@/types/office'

const props = defineProps<{ agent: OfficeAgent }>()

defineEmits<{
  back: []
  'toggle-pause': []
  rerun: []
  'append-command': []
  'view-logs': []
}>()

const timeline = computed(() => props.agent.logs.filter((log) => log.type !== 'command').slice(0, 6))
const completionPercent = computed(() => Math.min(100, Math.max(12, props.agent.completedToday * 10)))
const elapsedTime = computed(() => {
  const minutes = Math.max(8, Math.round((props.agent.progress / 100) * 124))
  return `01:${String(minutes % 60).padStart(2, '0')}:${String((props.agent.pendingItems * 7) % 60).padStart(2, '0')}`
})

function avatarStatus(status: OfficeAgentStatus) {
  if (status === 'idle' || status === 'completed') return 'idle'
  return OFFICE_AVATAR_STATUS[status]
}
</script>
