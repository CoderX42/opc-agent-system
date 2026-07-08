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
          {{ opt.tabLabel }}
        </button>
      </div>
    </div>

    <div class="model-strip" :class="{ 'needs-key': currentModelInfo.needsApiKey, 'is-expanded': modelSettingsOpen }">
      <div class="model-strip-main">
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
        <span
          class="key-pill"
          :class="{
            'is-ok': !!testResult && testResult.ok,
            'is-fail': !!testResult && !testResult.ok,
          }"
          :title="testResult && !testResult.ok ? (testResult.error || '连接失败') : ''"
        >
          <template v-if="testing">测试中…</template>
          <template v-else-if="testResult">
            {{ testResult.ok
              ? `✓ ${testResult.latencyMs}ms${testResult.reply ? ` · ${testResult.reply.slice(0, 18)}` : ''}`
              : `✗ ${testResult.error || '连接失败'}` }}
          </template>
          <template v-else>{{ modelSaving ? '保存中…' : currentModelInfo.keyStatus }}</template>
          <i
            v-if="testResult && !testResult.ok && testResult.error"
            class="error-info"
            :title="testResult.error"
            aria-hidden="true"
          >ⓘ</i>
        </span>
        <button
          type="button"
          class="settings-toggle"
          :class="{ 'is-open': modelSettingsOpen }"
          :aria-expanded="modelSettingsOpen"
          :title="modelSettingsOpen ? '收起模型设置' : '展开模型设置'"
          @click="modelSettingsOpen = !modelSettingsOpen"
        >
          <span class="gear" aria-hidden="true">⚙</span>
        </button>
      </div>
      <transition name="model-settings">
        <div v-if="modelSettingsOpen" class="model-settings-panel">
          <select
            class="model-select baseurl-presets"
            :value="''"
            :disabled="!currentProviderPreset"
            title="常用 Base URL"
            @change="handleBaseUrlPresetSelect"
          >
            <option value="">常用 URL…</option>
            <option v-for="url in commonBaseUrls" :key="url" :value="url">{{ url }}</option>
          </select>
          <input
            type="text"
            class="model-input"
            placeholder="Base URL"
            :value="currentBaseUrl"
            :disabled="modelSaving || !currentConfiguredAgent"
            @blur="handleBaseUrlChange"
          />
          <button
            type="button"
            class="test-connection-btn"
            :disabled="testing || !currentConfiguredAgent"
            @click="handleTestConnection"
          >
            {{ testing ? '测试中…' : '测试连接' }}
          </button>
        </div>
      </transition>
    </div>

    <div class="office-supervisor-bar">
      <input
        v-model="supervisorMessage"
        class="supervisor-field"
        placeholder="Supervisor：例如 分析客户合作风险"
        @keyup.enter="runSupervisor"
      />
      <button class="supervisor-btn" :disabled="supervising" @click="runSupervisor">
        {{ supervising ? '运行中' : '协作' }}
      </button>
    </div>

    <div v-if="supervisorResult" class="office-supervisor-result">
      <div class="supervisor-head">
        <span class="intent-tag">意图</span>
        <span class="intent-text">{{ supervisorResult.plan.intent }}</span>
        <button
          type="button"
          class="supervisor-dismiss"
          aria-label="关闭"
          @click="supervisorResult = null"
        >×</button>
      </div>
      <ol class="supervisor-timeline">
        <li
          v-for="(step, idx) in supervisorResult.plan.steps"
          :key="`${step.agentType}-${idx}`"
          class="supervisor-step"
          :class="{ 'is-expanded': expandedStep === idx }"
        >
          <button
            type="button"
            class="step-row"
            :aria-expanded="expandedStep === idx"
            @click="toggleStep(idx)"
          >
            <span class="step-marker" :class="`is-${step.agentType.toLowerCase()}`">
              {{ idx + 1 }}
            </span>
            <span class="step-name">{{ agentTypeLabel(step.agentType) }}</span>
            <span class="step-task">{{ step.taskType }}</span>
            <span class="step-caret" aria-hidden="true">▾</span>
          </button>
          <transition name="step-detail">
            <p v-if="expandedStep === idx" class="step-reason">{{ step.reason }}</p>
          </transition>
        </li>
      </ol>
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
        :session-id="`office-copilot-${activeType}`"
      />
    </div>

    <div class="log-stream" :class="{ 'is-collapsed': logCollapsed }">
      <div class="log-head" @click="logCollapsed = !logCollapsed">
        <span class="log-head-title">
          <span class="caret" aria-hidden="true">▸</span>
          最近日志流
          <em v-if="!logCollapsed">({{ recentLogs.length }})</em>
        </span>
        <button class="mini-btn" @click.stop="emit('view-full-logs')">展开全部</button>
      </div>
      <div v-show="!logCollapsed" class="log-list">
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
import { getAgentModelPresets, getConfigurableAgents, testAgentConnection, updateAgentModelConfig } from '@/api/agent'
import type { AgentChatType } from '@/api/agent'
import { superviseAgentTask, type SupervisorResult } from '@/api/agent-runtime'
import type { Agent, AgentProviderPreset, AgentType } from '@/types'
import type { OfficeAgent, OfficeAgentLog } from '@/types/office'
import { suggestBaseUrls } from '@/constants/llm'

interface AgentOpt {
  type: 'finance' | 'service' | 'legal' | 'admin'
  code: string
  tabLabel: string
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
  { type: 'finance', code: 'FIN', tabLabel: '财务', name: '财务 Agent', icon: 'Money', color: '#2f8f67', placeholder: '向财务 Copilot 提问…', suggestions: ['总结本月现金流', '检查异常发票'] },
  { type: 'service', code: 'CUS', tabLabel: '客服', name: '客服 Agent', icon: 'Service', color: '#3b5bdb', placeholder: '向客服 Copilot 提问…', suggestions: ['优先处理哪些工单？'] },
  { type: 'legal', code: 'LAW', tabLabel: '法务', name: '法务 Agent', icon: 'DocumentChecked', color: '#c8772e', placeholder: '向法务 Copilot 提问…', suggestions: ['列出合同高风险点'] },
  { type: 'admin', code: 'ADM', tabLabel: '行政', name: '行政 Agent', icon: 'OfficeBuilding', color: '#c44a3f', placeholder: '向行政 Copilot 提问…', suggestions: ['拆解今日待办'] },
]

const activeType = ref<'finance' | 'service' | 'legal' | 'admin'>('finance')
const configuredAgents = ref<Agent[]>([])
const providerPresets = ref<AgentProviderPreset[]>([])
const modelSaving = ref(false)
const modelSettingsOpen = ref(false)
const testing = ref(false)
const testResult = ref<{ ok: boolean; latencyMs: number; reply?: string; error?: string } | null>(null)
const supervising = ref(false)
const supervisorMessage = ref('分析客户合作风险')
const supervisorResult = ref<SupervisorResult | null>(null)
const expandedStep = ref<number | null>(null)
const logCollapsed = ref(true)

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
const currentBaseUrl = computed(() => {
  const config = currentConfiguredAgent.value?.config
  return config?.baseUrl || currentProviderPreset.value?.defaultBaseUrl || ''
})
const commonBaseUrls = computed(() =>
  suggestBaseUrls(
    currentConfiguredAgent.value?.config?.provider,
    currentProviderPreset.value?.defaultBaseUrl,
    currentBaseUrl.value,
  ),
)
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
  const previousProvider = currentConfiguredAgent.value?.config?.provider
  const providerChanged = !!previousProvider && previousProvider !== preset.value
  await saveCurrentModelConfig({
    provider: preset.value,
    model: preset.defaultModel || currentConfiguredAgent.value?.config?.model || '',
    baseUrl: preset.defaultBaseUrl,
    apiKeyRequired: preset.apiKeyRequired,
    apiKey: providerChanged ? '' : undefined,
  })
  if (providerChanged) testResult.value = null
}

async function handleModelSelect(event: Event) {
  const model = (event.target as HTMLSelectElement).value
  if (!model) return
  testResult.value = null
  await saveCurrentModelConfig({ model })
}

async function handleBaseUrlChange(event: Event) {
  const input = event.target as HTMLInputElement
  const next = input.value.trim()
  const agent = currentConfiguredAgent.value
  if (!agent) return
  if ((agent.config.baseUrl ?? '') === next) return
  testResult.value = null
  await saveCurrentModelConfig({ baseUrl: next })
}

async function handleBaseUrlPresetSelect(event: Event) {
  const select = event.target as HTMLSelectElement
  const url = select.value
  if (!url) return
  testResult.value = null
  await saveCurrentModelConfig({ baseUrl: url })
  select.value = ''
}

async function handleTestConnection() {
  const agent = currentConfiguredAgent.value
  const config = agent?.config
  if (!agent || !config) return
  testing.value = true
  testResult.value = null
  try {
    const res = await testAgentConnection({
      provider: config.provider,
      model: config.model || currentProviderPreset.value?.defaultModel || '',
      apiKey: config.apiKey || undefined,
      baseUrl: config.baseUrl || currentProviderPreset.value?.defaultBaseUrl || undefined,
      maxTokens: 1,
      temperature: 0,
    })
    testResult.value = {
      ok: res.data.ok,
      latencyMs: res.data.latencyMs,
      reply: res.data.reply,
      error: res.data.error,
    }
  } catch (err) {
    testResult.value = {
      ok: false,
      latencyMs: 0,
      error: err instanceof Error ? err.message : String(err),
    }
  } finally {
    testing.value = false
  }
}

async function saveCurrentModelConfig(
  patch: Partial<Agent['config']>,
) {
  const agent = currentConfiguredAgent.value
  if (!agent || modelSaving.value) return
  const nextConfig = {
    ...agent.config,
    ...patch,
    apiKey: patch.apiKey ?? agent.config.apiKey ?? '',
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

async function runSupervisor() {
  const message = supervisorMessage.value.trim()
  if (!message || supervising.value) return
  supervising.value = true
  try {
    const res = await superviseAgentTask({
      message,
      sessionId: 'office-supervisor',
      metadata: { source: 'office' },
    })
    supervisorResult.value = res.data
  } finally {
    supervising.value = false
  }
}

function toggleStep(idx: number) {
  expandedStep.value = expandedStep.value === idx ? null : idx
}

const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  FINANCE: '财务',
  CUSTOMER_SERVICE: '客服',
  LEGAL: '法务',
  ADMIN: '行政',
}

function agentTypeLabel(type: AgentType): string {
  return AGENT_TYPE_LABELS[type] || type
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
  min-height: 0;
  background: transparent;
  border: 1px solid rgba(13, 71, 161, 0.18);
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 12px 32px -18px rgba(13, 27, 42, 0.2);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: rgb(var(--elev) / 0.5);
  border-bottom: 1px solid rgb(var(--line) / 0.4);
  font-size: 12px;
  flex: 0 0 auto;
}

.head-title {
  font-weight: 600;
  color: #082558;
}

.agent-switch {
  display: flex;
  gap: 6px;
}

.model-strip {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  padding: 6px 10px;
  background: #f7f3e8;
  border-bottom: 1px solid rgb(var(--line) / 0.35);
  font-size: 11px;
  flex: 0 0 auto;
}

.model-strip-main {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1 1 auto;
  flex-wrap: wrap;
  min-width: 0;
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

.model-select,
.model-input {
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

.model-input {
  flex: 1 1 180px;
  max-width: none;
  padding: 0 8px;
  font-family: var(--font-mono);
  font-size: 10px;
}

.provider-select {
  max-width: 132px;
  font-weight: 700;
}

.baseurl-presets {
  max-width: 128px;
  color: #6e6b61;
  font-family: var(--font-mono);
  font-size: 10px;
}

.test-connection-btn {
  height: 22px;
  padding: 0 8px;
  border: 1px solid rgba(47, 143, 103, 0.3);
  border-radius: 7px;
  color: #fff;
  background: linear-gradient(135deg, #2f8f67, #1f6f52);
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
}

.key-pill {
  flex-shrink: 0;
  max-width: 220px;
  padding: 2px 6px;
  border: 1px solid rgba(47, 143, 103, 0.28);
  border-radius: 999px;
  color: #2f8f67;
  background: rgba(47, 143, 103, 0.08);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: default;
}

.key-pill .error-info {
  font-style: normal;
  font-size: 10px;
  cursor: help;
  opacity: 0.85;
}

.key-pill.is-ok {
  color: #2f8f67;
  border-color: rgba(47, 143, 103, 0.48);
  background: rgba(47, 143, 103, 0.12);
}

.key-pill.is-fail {
  color: #c44a3f;
  border-color: rgba(196, 74, 63, 0.42);
  background: rgba(196, 74, 63, 0.1);
}

.model-strip.needs-key .key-pill {
  color: #c8772e;
  border-color: rgba(200, 119, 46, 0.32);
  background: rgba(200, 119, 46, 0.1);
}

.settings-toggle {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(141, 112, 74, 0.22);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.74);
  color: #6e6b61;
  cursor: pointer;
  font-size: 12px;
  transition: transform 0.18s ease, color 0.18s ease;
}

.settings-toggle:hover { color: #2f8f67; }

.settings-toggle.is-open {
  color: #2f8f67;
  background: rgba(47, 143, 103, 0.12);
  border-color: rgba(47, 143, 103, 0.32);
}

.settings-toggle .gear {
  display: inline-block;
  transition: transform 0.4s ease;
}

.settings-toggle.is-open .gear {
  transform: rotate(60deg);
}

.model-settings-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding-top: 6px;
  margin-top: 2px;
  border-top: 1px dashed rgba(141, 112, 74, 0.22);
}

.model-settings-enter-active,
.model-settings-leave-active {
  transition: opacity 0.18s ease, max-height 0.22s ease, transform 0.22s ease;
  overflow: hidden;
}

.model-settings-enter-from,
.model-settings-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-4px);
}

.model-settings-enter-to,
.model-settings-leave-from {
  max-height: 80px;
}

.office-supervisor-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px;
  padding: 6px 10px;
  background: #fbfaf6;
  border-bottom: 1px solid rgb(var(--line) / 0.35);
  flex: 0 0 auto;
}

.supervisor-field {
  min-width: 0;
  height: 24px;
  padding: 0 8px;
  border: 1px solid rgba(141, 112, 74, 0.22);
  border-radius: 8px;
  color: #3a3630;
  background: rgba(255, 255, 255, 0.8);
  font-size: 11px;
  outline: none;
}

.supervisor-btn {
  height: 24px;
  padding: 0 10px;
  border: 1px solid rgba(47, 143, 103, 0.28);
  border-radius: 8px;
  color: #fff;
  background: #2f8f67;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
}

.office-supervisor-result {
  padding: 6px 10px 8px;
  background: #fbfaf6;
  border-bottom: 1px solid rgb(var(--line) / 0.35);
  flex: 0 0 auto;
}

.supervisor-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.intent-tag {
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: 4px;
  color: #fff;
  background: #082558;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.intent-text {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #082558;
  font-size: 11px;
  font-weight: 600;
}

.supervisor-dismiss {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #8d704a;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;

  &:hover { background: rgba(141, 112, 74, 0.12); color: #c44a3f; }
}

.supervisor-timeline {
  list-style: none;
  margin: 0;
  padding: 0 0 0 6px;
  border-left: 1px dashed rgba(47, 143, 103, 0.32);
}

.supervisor-step {
  position: relative;
  margin-left: -1px;
  padding-left: 14px;
}

.supervisor-step::before {
  content: '';
  position: absolute;
  left: 0;
  top: 14px;
  width: 6px;
  height: 1px;
  background: rgba(47, 143, 103, 0.32);
}

.step-row {
  width: 100%;
  display: grid;
  grid-template-columns: 18px auto 1fr auto;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  color: #3a3630;
  font-size: 11px;

  &:hover .step-name { color: #2f8f67; }
}

.step-marker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(47, 143, 103, 0.12);
  border: 1px solid rgba(47, 143, 103, 0.32);
  color: #2f8f67;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 800;
}

.step-marker.is-finance { color: #2f8f67; border-color: rgba(47, 143, 103, 0.32); background: rgba(47, 143, 103, 0.1); }
.step-marker.is-customer_service { color: #3b5bdb; border-color: rgba(59, 91, 219, 0.32); background: rgba(59, 91, 219, 0.1); }
.step-marker.is-legal { color: #c8772e; border-color: rgba(200, 119, 46, 0.32); background: rgba(200, 119, 46, 0.1); }
.step-marker.is-admin { color: #c44a3f; border-color: rgba(196, 74, 63, 0.32); background: rgba(196, 74, 63, 0.1); }

.step-name {
  font-weight: 700;
  color: #082558;
  font-size: 11px;
  white-space: nowrap;
}

.step-task {
  font-family: var(--font-mono);
  font-size: 9px;
  color: #8d704a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-caret {
  font-size: 9px;
  color: #8d704a;
  transition: transform 0.18s ease;
}

.supervisor-step.is-expanded .step-caret {
  transform: rotate(180deg);
  color: #2f8f67;
}

.step-reason {
  margin: 0 0 6px;
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(47, 143, 103, 0.06);
  color: #3a3630;
  font-size: 10.5px;
  line-height: 1.45;
}

.step-detail-enter-active,
.step-detail-leave-active {
  transition: opacity 0.18s ease, transform 0.22s ease, max-height 0.22s ease;
  overflow: hidden;
}

.step-detail-enter-from,
.step-detail-leave-to {
  opacity: 0;
  transform: translateY(-2px);
  max-height: 0;
}

.step-detail-enter-to,
.step-detail-leave-from {
  max-height: 200px;
}

.switch-btn {
  min-width: 46px;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 800;
  padding: 4px 10px;
  border: 1px solid rgb(var(--line) / 0.5);
  border-radius: 999px;
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
  flex: 1 1 auto;
  min-height: 560px;
  overflow: hidden;
  border-top: 1px solid rgba(13, 71, 161, 0.18);
  display: flex;
  flex-direction: column;
}

.log-stream {
  flex: 0 0 auto;
  border-top: 1px solid #e6e0d2;
  background: #faf8f1;
  font-size: 11px;
}

.log-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 10px;
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
  color: #6e6b61;
  cursor: pointer;
  user-select: none;

  &:hover { background: rgb(var(--elev) / 0.4); }
}

.log-head-title {
  display: inline-flex;
  align-items: center;
  gap: 5px;

  .caret {
    display: inline-block;
    transition: transform 0.18s ease;
    color: #8d704a;
  }

  em {
    font-style: normal;
    color: #a39b8a;
    font-weight: 600;
  }
}

.log-stream.is-collapsed .log-head-title .caret {
  transform: rotate(0deg);
}

.log-stream:not(.is-collapsed) .log-head-title .caret {
  transform: rotate(90deg);
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
  max-height: 108px;
  padding: 0 10px 6px;
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

@media (max-width: 768px) {
  .office-copilot-panel {
    border-radius: 0;
  }

  .panel-head {
    position: sticky;
    bottom: 0;
    z-index: 4;
    order: 99;
    padding: 6px 8px calc(env(safe-area-inset-bottom, 0) + 6px);
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-top: 1px solid rgb(var(--line) / 0.5);
    border-bottom: none;
    box-shadow: 0 -8px 18px -12px rgba(8, 37, 88, 0.18);
  }

  .head-title { display: none; }

  .agent-switch {
    width: 100%;
    justify-content: space-between;
    gap: 4px;
  }

  .switch-btn {
    flex: 1 1 auto;
    min-width: 0;
    padding: 6px 4px;
    font-size: 11px;
  }

  .chat-wrap {
    padding-bottom: 4px;
    min-height: 60vh;
  }

  .log-stream {
    max-height: 30vh;
  }
}
</style>
