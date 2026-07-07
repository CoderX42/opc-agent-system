<template>
  <div class="office-copilot-panel">
    <div class="panel-head">
      <span class="head-title">Agent Copilot</span>
      <div class="agent-switch">
        <button
          v-for="opt in agentOptions"
          :key="opt.type"
          class="switch-btn"
          :class="{ active: activeType === opt.type }"
          :style="{ '--accent': opt.color }"
          @click="activeType = opt.type"
        >
          {{ opt.code }}
        </button>
      </div>
    </div>

    <div class="chat-wrap">
      <AgentAssistantPanel
        :key="activeType"
        :type="mapToChatType(activeType)"
        :title="currentOpt.name + ' Copilot'"
        :icon="currentOpt.icon"
        :color="currentOpt.color"
        :placeholder="currentOpt.placeholder"
        :suggestions="currentOpt.suggestions"
      />
    </div>

    <div class="log-stream">
      <div class="log-head">
        <span>最近日志流</span>
        <button class="mini-btn" @click="emit('view-full-logs')">展开全部</button>
      </div>
      <div class="log-list">
        <div v-for="log in recentLogs" :key="log.id" class="log-item" :class="`log-${log.type}`">
          <time>{{ log.time }}</time>
          <span class="log-content">{{ log.content }}</span>
        </div>
        <div v-if="!recentLogs.length" class="log-empty">暂无日志</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AgentAssistantPanel from '@/components/AgentAssistantPanel.vue'
import type { AgentChatType } from '@/api/agent'
import type { OfficeAgent, OfficeAgentLog } from '@/types/office'

interface AgentOpt {
  type: 'finance' | 'service' | 'legal' | 'admin'
  code: string
  name: string
  icon: string
  color: string
  placeholder: string
  suggestions: string[]
}

const props = defineProps<{
  agents: OfficeAgent[]
  selectedAgentId?: string
  logs?: OfficeAgentLog[] // pass logs for current or global recent
}>()

const emit = defineEmits<{
  'select-agent': [id: string]
  'view-full-logs': []
}>()

const agentOptions: AgentOpt[] = [
  { type: 'finance', code: 'FIN', name: '财务 Agent', icon: 'Money', color: '#2f8f67', placeholder: '向财务 Copilot 提问…', suggestions: ['总结本月现金流', '检查异常发票'] },
  { type: 'service', code: 'CUS', name: '客服 Agent', icon: 'Service', color: '#3b5bdb', placeholder: '向客服 Copilot 提问…', suggestions: ['优先处理哪些工单？'] },
  { type: 'legal', code: 'LAW', name: '法务 Agent', icon: 'DocumentChecked', color: '#c8772e', placeholder: '向法务 Copilot 提问…', suggestions: ['列出合同高风险点'] },
  { type: 'admin', code: 'ADM', name: '行政 Agent', icon: 'OfficeBuilding', color: '#c44a3f', placeholder: '向行政 Copilot 提问…', suggestions: ['拆解今日待办'] },
]

const activeType = ref<'finance' | 'service' | 'legal' | 'admin'>('finance')

// Sync initial active from selected agent when provided
watch(() => props.selectedAgentId, (id) => {
  if (!id) return
  const found = props.agents.find(a => a.id === id)
  if (found) activeType.value = found.type
}, { immediate: true })

const currentOpt = computed(() => agentOptions.find(o => o.type === activeType.value)! )

function mapToChatType(t: string): AgentChatType {
  const m: Record<string, AgentChatType> = {
    finance: 'FINANCE',
    service: 'CUSTOMER_SERVICE',
    legal: 'LEGAL',
    admin: 'ADMIN',
  }
  return m[t] || 'FINANCE'
}

const recentLogs = computed(() => {
  // prefer logs of the active mapped agent if possible
  const activeAgent = props.agents.find(a => a.type === activeType.value)
  const src = (activeAgent?.logs || props.logs || []).slice(0, 6)
  return src
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.office-copilot-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 520px;
  background: rgb(var(--surface));
  border: 1px solid rgb(var(--line) / 0.6);
  border-radius: 12px;
  overflow: hidden;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: rgb(var(--elev) / 0.5);
  border-bottom: 1px solid rgb(var(--line) / 0.4);
  font-size: 12px;
}

.head-title {
  font-weight: 600;
  color: #082558;
}

.agent-switch {
  display: flex;
  gap: 2px;
}

.switch-btn {
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 2px 6px;
  border: 1px solid rgb(var(--line) / 0.5);
  background: rgb(var(--surface));
  cursor: pointer;
  color: #3a3630;
  transition: all 0.1s;
}

.switch-btn.active {
  background: var(--accent, #2f8f67);
  color: #fff;
  border-color: var(--accent, #2f8f67);
}

.chat-wrap {
  flex: 1;
  min-height: 280px;
  overflow: hidden;
}

.log-stream {
  border-top: 1px solid #e6e0d2;
  background: #faf8f1;
  padding: 6px 10px;
  font-size: 11px;
}

.log-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
  color: #6e6b61;
}

.mini-btn {
  font-size: 9px;
  padding: 0 4px;
  background: none;
  border: none;
  color: #8d704a;
  cursor: pointer;
}

.log-list {
  max-height: 92px;
  overflow: auto;
  font-family: var(--font-mono);
  font-size: 10px;
  line-height: 1.35;
}

.log-item {
  display: flex;
  gap: 6px;
  padding: 1px 0;
  color: #3a3630;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.log-item time {
  color: #8d704a;
  flex-shrink: 0;
}

.log-empty {
  color: #a39b8a;
  font-size: 10px;
}
</style>
