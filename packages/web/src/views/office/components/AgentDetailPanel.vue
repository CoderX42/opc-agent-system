<template>
  <aside v-if="agent" class="agent-detail" :style="{ '--accent': agent.accent }">
    <header class="detail-header">
      <div class="detail-avatar">
        <AgentAvatar :type="agent.type" :status="avatarStatus(agent.status)" :size="54" />
      </div>
      <div class="detail-identity">
        <span>{{ agent.department }}</span>
        <h2>{{ agent.name }}</h2>
      </div>
      <el-tag :type="statusTagType(agent.status)" effect="dark" size="small">
        {{ statusLabel(agent.status) }}
      </el-tag>
    </header>

    <el-tabs v-model="activeTab" class="detail-tabs" stretch>
      <el-tab-pane label="概览" name="overview">
        <section class="current-task">
          <div><span>当前任务</span><strong>{{ agent.currentTask }}</strong></div>
          <b>{{ agent.progress }}%</b>
          <el-progress :percentage="agent.progress" :show-text="false" :stroke-width="8" :color="progressColor(agent.status)" />
        </section>

        <div class="detail-metrics">
          <div><span>今日完成</span><strong>{{ agent.completedToday }}</strong></div>
          <div><span>待处理</span><strong>{{ agent.pendingItems }}</strong></div>
        </div>

        <p class="role-description">{{ agent.roleDescription }}</p>
      </el-tab-pane>

      <el-tab-pane label="数据" name="data">
        <section class="io-section">
          <div>
            <h3>输入数据</h3>
            <ul><li v-for="item in agent.inputData" :key="item">{{ item }}</li></ul>
          </div>
          <div>
            <h3>输出结果</h3>
            <ul><li v-for="item in agent.outputResults" :key="item">{{ item }}</li></ul>
          </div>
        </section>
      </el-tab-pane>

      <el-tab-pane label="日志" name="logs">
        <section class="recent-logs">
          <div v-for="log in agent.logs.slice(0, 5)" :key="log.id" class="log-line" :class="`log-${log.type}`">
            <time>{{ log.time }}</time>
            <p>{{ log.content }}</p>
          </div>
          <el-empty v-if="agent.logs.length === 0" description="暂无运行日志" :image-size="42" />
          <el-button v-else text type="primary" @click="$emit('view-logs')">查看全部日志</el-button>
        </section>
      </el-tab-pane>
    </el-tabs>

    <footer class="detail-actions">
      <el-button type="primary" @click="$emit('append-command')">追加指令</el-button>
      <el-button :type="agent.status === 'paused' ? 'success' : 'warning'" @click="$emit('toggle-pause')">
        {{ agent.status === 'paused' ? '继续' : '暂停' }}
      </el-button>
      <el-button plain @click="$emit('rerun')">重跑</el-button>
      <el-button text @click="$emit('view-logs')">日志</el-button>
    </footer>
  </aside>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import AgentAvatar from './AgentAvatar.vue'
import type { OfficeAgent, OfficeAgentStatus } from '@/stores/agentOffice'

const props = defineProps<{ agent: OfficeAgent | undefined }>()
const activeTab = ref('overview')

defineEmits<{
  'view-logs': []
  'append-command': []
  'toggle-pause': []
  rerun: []
}>()

watch(() => props.agent?.id, () => { activeTab.value = 'overview' })

function statusLabel(status: OfficeAgentStatus) {
  return { running: '运行中', waiting: '待确认', error: '异常', idle: '空闲', paused: '已暂停', completed: '已完成' }[status]
}

function statusTagType(status: OfficeAgentStatus) {
  return ({ running: 'primary', waiting: 'warning', error: 'danger', idle: 'success', paused: 'info', completed: 'success' } as const)[status]
}

function progressColor(status: OfficeAgentStatus) {
  return { running: '#4B8FCB', waiting: '#D9A441', error: '#D66B52', idle: '#4F8F68', paused: '#89918C', completed: '#26372F' }[status]
}

function avatarStatus(status: OfficeAgentStatus) {
  return ({ running: 'working', waiting: 'waiting', error: 'error', idle: 'idle', paused: 'offline', completed: 'idle' } as const)[status]
}
</script>

<style lang="scss" scoped>
.agent-detail {
  --accent: #4b8fcb;
  display: flex;
  flex-direction: column;
  min-width: 300px;
  height: 100%;
  max-height: 590px;
  padding: 14px;
  color: #1f2a24;
  border: 3px solid #26372f;
  background: #fff9f0;
  box-shadow: 5px 7px 0 rgba(38, 55, 47, 0.12);
}

.detail-header { display: grid; grid-template-columns: 62px 1fr auto; align-items: center; gap: 10px; padding-bottom: 10px; border-bottom: 2px solid #26372f; }
.detail-avatar { display: grid; place-items: center; width: 62px; height: 62px; border: 2px solid #26372f; background: color-mix(in srgb, var(--accent) 14%, #fff9f0); overflow: hidden; }
.detail-identity { min-width: 0; }
.detail-identity > span { color: #6e766f; font-size: 9px; font-weight: 900; letter-spacing: 0.08em; }
.detail-header h2 { margin-top: 3px; overflow: hidden; font-size: 17px; font-weight: 900; text-overflow: ellipsis; white-space: nowrap; }

.detail-tabs { flex: 1; min-height: 0; margin-top: 4px; }
.detail-tabs :deep(.el-tabs__header) { margin-bottom: 10px; }
.detail-tabs :deep(.el-tabs__item) { height: 36px; font-size: 12px; font-weight: 700; }
.detail-tabs :deep(.el-tabs__content) { overflow: auto; }

.current-task { display: grid; grid-template-columns: 1fr auto; gap: 8px; padding: 10px; border: 2px solid rgba(38, 55, 47, 0.16); background: #f5efe6; }
.current-task div > span,
.current-task div > strong { display: block; }
.current-task div > span { color: var(--accent); font-size: 9px; font-weight: 900; }
.current-task div > strong { margin-top: 4px; font-size: 13px; line-height: 1.4; }
.current-task > b { color: var(--accent); font-size: 17px; }
.current-task :deep(.el-progress) { grid-column: 1 / -1; }

.detail-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-top: 8px; }
.detail-metrics div { display: flex; align-items: center; justify-content: space-between; padding: 9px; border: 1px solid rgba(38, 55, 47, 0.16); }
.detail-metrics span { color: #6e766f; font-size: 10px; }
.detail-metrics strong { font-size: 19px; }
.role-description { margin-top: 9px; color: #6e766f; font-size: 11px; line-height: 1.55; }

.io-section { display: grid; gap: 8px; }
.io-section > div { padding: 10px; border: 1px solid rgba(38, 55, 47, 0.16); background: #f5efe6; }
.io-section h3 { font-size: 11px; }
.io-section ul { display: grid; gap: 5px; margin-top: 7px; padding: 0; list-style: none; }
.io-section li { color: #6e766f; font-size: 11px; line-height: 1.35; }
.io-section li::before { margin-right: 5px; color: var(--accent); content: '▪'; }

.recent-logs { min-height: 0; }
.log-line { display: grid; grid-template-columns: 40px 1fr; gap: 6px; padding: 7px 0; border-bottom: 1px solid rgba(38, 55, 47, 0.11); }
.log-line time { color: #6e766f; font-size: 9px; }
.log-line p { color: #445049; font-size: 10px; line-height: 1.4; }
.log-error p { color: #b74f3a; }
.log-command p { color: #356f9b; }

.detail-actions { display: grid; grid-template-columns: 1.3fr 1fr 0.8fr 0.7fr; gap: 6px; margin-top: 10px; padding-top: 10px; border-top: 2px solid #26372f; }
.detail-actions :deep(.el-button) { min-height: 34px; margin: 0; padding-inline: 8px; border-radius: 2px; font-size: 11px; }
</style>
