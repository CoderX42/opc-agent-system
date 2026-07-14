<template>
  <button type="button" class="model-health" :class="{ 'needs-attention': modelInfo.needsApiKey }" @click="drawerOpen = true">
    <span class="health-dot" aria-hidden="true"></span>
    <span>{{ modelInfo.label }}</span>
  </button>

  <el-drawer v-model="drawerOpen" title="模型设置" direction="rtl" size="min(460px, 100vw)" :teleported="true" :modal="true" :z-index="2050" class="agent-model-drawer">
    <div class="model-settings">
      <header>
        <p>当前 Agent</p>
        <h2>{{ presentation.name }}</h2>
        <span>{{ presentation.code }} · {{ presentation.description }}</span>
      </header>

      <p v-if="loadError" class="model-error" role="alert">{{ loadError }}</p>
      <div class="form-grid">
        <label>
          <span>服务商</span>
          <select v-model="draft.provider" :disabled="!currentAgent || saving" @change="syncProviderDefaults">
            <option v-for="preset in providerPresets" :key="preset.value" :value="preset.value">{{ preset.label }}</option>
          </select>
        </label>
        <label>
          <span>模型</span>
          <select v-model="draft.model" :disabled="!currentAgent || saving">
            <option v-for="model in currentModels" :key="model.value" :value="model.value">{{ model.label }}</option>
          </select>
        </label>
        <label>
          <span>Base URL</span>
          <input v-model.trim="draft.baseUrl" :disabled="!currentAgent || saving" placeholder="https://…" />
        </label>
        <label>
          <span>API Key</span>
          <input v-model.trim="draft.apiKey" :disabled="!currentAgent || saving" type="password" placeholder="留空则保留当前配置" autocomplete="off" />
        </label>
      </div>

      <p v-if="testResult" class="test-result" :class="testResult.ok ? 'is-ok' : 'is-failed'">
        {{ testResult.ok ? `连接正常 · ${testResult.latencyMs}ms` : testResult.error || '连接失败' }}
      </p>
      <div class="model-actions">
        <button class="secondary-action" type="button" :disabled="testing || !currentAgent" @click="testConnection">
          {{ testing ? '测试中…' : '测试连接' }}
        </button>
        <button class="primary-action" type="button" :disabled="saving || !currentAgent" @click="save">
          {{ saving ? '保存中…' : '保存设置' }}
        </button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { getAgentModelPresets, getConfigurableAgents, testAgentConnection, updateAgentModelConfig, type AgentChatType } from '@/api/agent'
import type { Agent, AgentModelConfig, AgentProviderPreset } from '@/types'
import { getAgentPresentation } from '../domain/agentCatalog'

const props = defineProps<{ agentType: AgentChatType }>()

const drawerOpen = ref(false)
const configuredAgents = ref<Agent[]>([])
const providerPresets = ref<AgentProviderPreset[]>([])
const saving = ref(false)
const testing = ref(false)
const loadError = ref('')
const testResult = ref<{ ok: boolean; latencyMs: number; error?: string } | null>(null)
const draft = reactive<Partial<AgentModelConfig>>({})

const presentation = computed(() => getAgentPresentation(props.agentType))
const currentAgent = computed(() => configuredAgents.value.find((agent) => agent.type === props.agentType))
const currentPreset = computed(() => providerPresets.value.find((preset) => preset.value === draft.provider))
const currentModels = computed(() => currentPreset.value?.models || [])
const modelInfo = computed(() => {
  const config = currentAgent.value?.config
  const needsApiKey = Boolean(config?.apiKeyRequired && !config.apiKey)
  if (!currentAgent.value) return { label: '模型加载中', needsApiKey: false }
  if (needsApiKey) return { label: '模型待配置', needsApiKey: true }
  return { label: config?.model || '模型已就绪', needsApiKey: false }
})

function setDraft(agent = currentAgent.value) {
  const config = agent?.config
  draft.provider = config?.provider || providerPresets.value[0]?.value
  draft.model = config?.model || providerPresets.value[0]?.defaultModel || ''
  draft.baseUrl = config?.baseUrl || providerPresets.value.find((preset) => preset.value === draft.provider)?.defaultBaseUrl || ''
  draft.apiKey = ''
  testResult.value = null
}

async function load() {
  loadError.value = ''
  try {
    const [agents, presets] = await Promise.all([getConfigurableAgents(), getAgentModelPresets()])
    configuredAgents.value = agents.data || []
    providerPresets.value = presets.data || []
    setDraft()
  } catch {
    loadError.value = '无法加载模型配置，请稍后重试。'
  }
}

function syncProviderDefaults() {
  const preset = currentPreset.value
  if (!preset) return
  draft.model = preset.defaultModel || draft.model
  draft.baseUrl = preset.defaultBaseUrl || draft.baseUrl
  testResult.value = null
}

async function save() {
  const agent = currentAgent.value
  if (!agent || saving.value) return
  saving.value = true
  try {
    const config: AgentModelConfig = {
      ...agent.config,
      provider: draft.provider || agent.config.provider,
      model: draft.model || agent.config.model,
      baseUrl: draft.baseUrl || '',
      apiKey: draft.apiKey || agent.config.apiKey || '',
      systemPrompt: agent.config.systemPrompt || '',
    }
    const result = await updateAgentModelConfig(agent.id, config)
    const index = configuredAgents.value.findIndex((item) => item.id === agent.id)
    if (index >= 0) configuredAgents.value[index] = result.data
    setDraft(result.data)
  } catch {
    loadError.value = '保存失败，请检查配置后重试。'
  } finally {
    saving.value = false
  }
}

async function testConnection() {
  if (!currentAgent.value || testing.value) return
  testing.value = true
  testResult.value = null
  try {
    const result = await testAgentConnection({
      provider: draft.provider || currentAgent.value.config.provider,
      model: draft.model || currentAgent.value.config.model,
      baseUrl: draft.baseUrl || undefined,
      apiKey: draft.apiKey || currentAgent.value.config.apiKey || undefined,
      maxTokens: 1,
      temperature: 0,
    })
    testResult.value = { ok: result.data.ok, latencyMs: result.data.latencyMs, error: result.data.error }
  } catch (error: any) {
    testResult.value = { ok: false, latencyMs: 0, error: error?.message || '连接失败' }
  } finally {
    testing.value = false
  }
}

watch(() => props.agentType, () => setDraft())
onMounted(() => { void load() })
</script>

<style scoped lang="scss">
.model-health { display: inline-flex; align-items: center; gap: 7px; min-height: 36px; max-width: 180px; padding: 0 10px; overflow: hidden; color: #34413a; border: 1px solid #d8ded9; border-radius: 999px; background: #fff; cursor: pointer; font: 600 12px/1 'IBM Plex Sans', 'Noto Sans SC', sans-serif; text-overflow: ellipsis; white-space: nowrap; }
.model-health:hover { border-color: #17201c; }
.model-health.needs-attention { color: #8a5814; border-color: #e6c78d; background: #fff8e8; }
.health-dot { width: 7px; height: 7px; flex: 0 0 7px; border-radius: 50%; background: #287a58; }
.needs-attention .health-dot { background: #bd7b19; }
.model-settings { display: grid; width: 100%; min-height: 100%; gap: 24px; padding: 4px 6px; color: #17201c; font-family: 'IBM Plex Sans', 'Noto Sans SC', sans-serif; }
.model-settings header { padding-bottom: 20px; border-bottom: 1px solid #d8ded9; }
.model-settings header p { margin: 0 0 6px; color: #68736d; font: 700 10px/1 'IBM Plex Mono', monospace; letter-spacing: .12em; text-transform: uppercase; }
.model-settings header h2 { margin: 0; font-size: 22px; letter-spacing: -.025em; }
.model-settings header span { display: block; margin-top: 7px; color: #68736d; font-size: 13px; }
.form-grid { display: grid; gap: 16px; }
.form-grid label { display: grid; gap: 7px; }
.form-grid label > span { color: #68736d; font: 700 11px/1 'IBM Plex Mono', monospace; letter-spacing: .08em; text-transform: uppercase; }
.form-grid input, .form-grid select { width: 100%; min-height: 42px; padding: 0 11px; color: #17201c; border: 1px solid #d8ded9; border-radius: 7px; background: #fbfcfa; font: 14px/1 'IBM Plex Sans', 'Noto Sans SC', sans-serif; outline: none; }
.form-grid input:focus, .form-grid select:focus { border-color: #1f775a; box-shadow: 0 0 0 3px rgb(31 119 90 / .13); }
.model-actions { position: sticky; bottom: -20px; display: flex; justify-content: flex-end; gap: 8px; margin: 0 -6px -4px; padding: 14px 6px 4px; border-top: 1px solid #d8ded9; background: #f9fcfa; }
.model-actions button { min-height: 40px; padding: 0 13px; border-radius: 6px; cursor: pointer; font: 650 13px/1 'IBM Plex Sans', 'Noto Sans SC', sans-serif; }
.secondary-action { color: #17201c; border: 1px solid #d8ded9; background: #fff; }
.primary-action { color: #fff; border: 1px solid #c7462b; background: #c7462b; }
.model-actions button:disabled { opacity: .5; cursor: not-allowed; }
.test-result, .model-error { margin: 0; padding: 10px 12px; border-radius: 7px; font-size: 13px; line-height: 1.5; }
.test-result.is-ok { color: #1f775a; background: #eaf5ef; }
.test-result.is-failed, .model-error { color: #96392e; background: #fff1ef; }
</style>

<style lang="scss">
/* 非 scoped：作用域 teleport 到 body 的 drawer 根节点 */
.agent-model-drawer { height: 100dvh !important; max-height: 100dvh !important; border-radius: 18px 0 0 18px; }
.agent-model-drawer .el-drawer__header { margin-bottom: 0; }
.agent-model-drawer .el-drawer__body { display: flex; min-height: 0; padding: 20px 22px; overflow-y: auto; overscroll-behavior: contain; }
</style>
