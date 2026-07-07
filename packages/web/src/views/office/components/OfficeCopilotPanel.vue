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
          @click="setActiveType(opt.type)"
        >
          {{ opt.code }}
        </button>
      </div>
    </div>

    <div class="model-strip" :class="{ 'needs-key': currentModelInfo.needsApiKey }">
      <div>
        <span class="model-label">模型接入</span>
        <select
          class="model-select provider-select"
          :value="currentConfiguredAgent?.config?.provider || ''"
          :disabled="modelSaving || !currentConfiguredAgent"
          @change="handleProviderSelect"
        >
          <option v-for="preset in providerPresets" :key="preset.value" :value="preset.value">
            {{ preset.label }}
          </option>
        </select>
        <select
          class="model-select"
          :value="currentModelInfo.model"
          :disabled="modelSaving || !currentConfiguredAgent"
          @change="handleModelSelect"
        >
          <option v-for="model in currentModelOptions" :key="model.value" :value="model.value">
            {{ model.label }}
          </option>
          <option v-if="currentModelInfo.model && !currentModelInPreset" :value="currentModelInfo.model">
            {{ currentModelInfo.model }}
          </option>
        </select>
      </div>
      <span class="key-pill">{{ modelSaving ? '保存中…' : currentModelInfo.keyStatus }}</span>
    </div>

    <div class="chat-wrap">
      <AgentAssistantPanel
        :key="activeType"
        :agent-id="currentConfiguredAgent?.id"
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
import { computed, onMounted, ref, watch } from 'vue'
import AgentAssistantPanel from '@/components/AgentAssistantPanel.vue'
import { getAgentModelPresets, getConfigurableAgents, updateAgentModelConfig } from '@/api/agent'
import type { AgentChatType } from '@/api/agent'
import type { Agent, AgentProviderPreset, AgentType } from '@/types'
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
const configuredAgents = ref<Agent[]>([])
const providerPresets = ref<AgentProviderPreset[]>([])
const modelSaving = ref(false)

// Sync initial active from selected agent when provided
watch(() => props.selectedAgentId, (id) => {
  if (!id) return
  const found = props.agents.find(a => a.id === id)
  if (found) activeType.value = found.type
}, { immediate: true })

const currentOpt = computed(() => agentOptions.find(o => o.type === activeType.value)! )
const currentChatType = computed(() => mapToChatType(activeType.value))
const currentConfiguredAgent = computed(() => configuredAgents.value.find((agent) => agent.type === currentChatType.value))
const currentProviderPreset = computed(() => {
  const provider = currentConfiguredAgent.value?.config?.provider
  return providerPresets.value.find((preset) => preset.value === provider)
})
const currentModelOptions = computed(() => currentProviderPreset.value?.models || [])
const currentModelInPreset = computed(() => {
  const model = currentConfiguredAgent.value?.config?.model
  return Boolean(model && currentModelOptions.value.some((item) => item.value === model))
})
const currentModelInfo = computed(() => {
  const config = currentConfiguredAgent.value?.config
  const preset = currentProviderPreset.value
  const needsApiKey = Boolean(config?.apiKeyRequired && !config.apiKey)
  return {
    providerLabel: preset?.label || config?.provider || '默认模型',
    model: config?.model || preset?.defaultModel || '',
    needsApiKey,
    keyStatus: needsApiKey ? '等待 API Key' : config?.apiKey ? 'KEY 已配置' : '免密/本地',
  }
})

onMounted(() => {
  void loadModelSettings()
})

async function loadModelSettings() {
  try {
    const [agentsRes, presetsRes] = await Promise.all([
      getConfigurableAgents(),
      getAgentModelPresets(),
    ])
    configuredAgents.value = agentsRes.data
    providerPresets.value = presetsRes.data
  } catch {
    configuredAgents.value = []
    providerPresets.value = []
  }
}

async function handleProviderSelect(event: Event) {
  const provider = (event.target as HTMLSelectElement).value
  const preset = providerPresets.value.find((item) => item.value === provider)
  if (!preset) return
  await saveCurrentModelConfig({
    provider: preset.value,
    model: preset.defaultModel || currentConfiguredAgent.value?.config?.model || '',
    baseUrl: preset.defaultBaseUrl,
    apiKeyRequired: preset.apiKeyRequired,
  })
}

async function handleModelSelect(event: Event) {
  const model = (event.target as HTMLSelectElement).value
  if (!model) return
  await saveCurrentModelConfig({ model })
}

async function saveCurrentModelConfig(
  patch: Partial<Agent['config']>,
) {
  const agent = currentConfiguredAgent.value
  if (!agent || modelSaving.value) return
  const nextConfig = {
    ...agent.config,
    ...patch,
    apiKey: agent.config.apiKey || '',
    baseUrl: patch.baseUrl ?? agent.config.baseUrl ?? '',
    systemPrompt: agent.config.systemPrompt || '',
  }
  modelSaving.value = true
  try {
    const res = await updateAgentModelConfig(agent.id, nextConfig)
    const index = configuredAgents.value.findIndex((item) => item.id === agent.id)
    if (index >= 0) configuredAgents.value[index] = res.data
  } finally {
    modelSaving.value = false
  }
}

function setActiveType(type: AgentOpt['type']) {
  activeType.value = type
  const activeAgent = props.agents.find((agent) => agent.type === type)
  if (activeAgent) emit('select-agent', activeAgent.id)
}

function mapToChatType(t: string): AgentChatType {
  const m: Record<string, AgentChatType> = {
    finance: 'FINANCE',
    service: 'CUSTOMER_SERVICE',
    legal: 'LEGAL',
    admin: 'ADMIN',
  }
  return m[t] || 'FINANCE'
}

function mapBackendToOfficeType(type: AgentType): AgentOpt['type'] {
  const m: Record<AgentType, AgentOpt['type']> = {
    FINANCE: 'finance',
    CUSTOMER_SERVICE: 'service',
    LEGAL: 'legal',
    ADMIN: 'admin',
  }
  return m[type]
}

const recentLogs = computed(() => {
  // prefer logs of the active mapped agent if possible
  const activeAgent = props.agents.find(a => a.type === activeType.value)
  const src = (activeAgent?.logs || props.logs || []).slice(0, 6)
  return src
})

watch(configuredAgents, (agents) => {
  const matched = agents.some((agent) => agent.type === currentChatType.value)
  if (!matched && agents[0]) activeType.value = mapBackendToOfficeType(agents[0].type)
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

.model-strip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: #f7f3e8;
  border-bottom: 1px solid rgb(var(--line) / 0.35);
  font-size: 11px;

  div {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  strong,
  small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: #082558;
  }

  small {
    color: #6e6b61;
    font-family: var(--font-mono);
  }
}

.model-label {
  flex-shrink: 0;
  color: #8d704a;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.model-select {
  min-width: 0;
  max-width: 180px;
  height: 22px;
  padding: 0 22px 0 6px;
  border: 1px solid rgba(141, 112, 74, 0.22);
  border-radius: 6px;
  color: #3a3630;
  background: rgba(255, 255, 255, 0.74);
  font-size: 11px;
  outline: none;
}

.provider-select {
  max-width: 132px;
  font-weight: 700;
}

.key-pill {
  flex-shrink: 0;
  padding: 2px 6px;
  border: 1px solid rgba(47, 143, 103, 0.28);
  border-radius: 999px;
  color: #2f8f67;
  background: rgba(47, 143, 103, 0.08);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
}

.model-strip.needs-key .key-pill {
  color: #c8772e;
  border-color: rgba(200, 119, 46, 0.32);
  background: rgba(200, 119, 46, 0.1);
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
