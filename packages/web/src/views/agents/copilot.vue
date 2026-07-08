<template>
  <div class="copilot-page">
    <header class="copilot-topbar">
      <div class="topbar-left">
        <span class="live-pill"><i aria-hidden="true" /> LIVE</span>
        <span class="topbar-title">{{ activeAgent.name }} · COPILOT</span>
      </div>
      <div class="topbar-right">
        <button
          type="button"
          class="topbar-btn"
          :class="{ 'is-active': drawerType === 'model' }"
          @click="openDrawer('model')"
        >
          <span class="topbar-btn-glyph" aria-hidden="true">⚙</span>
          <span>模型</span>
        </button>
        <button
          type="button"
          class="topbar-btn"
          :class="{ 'is-active': drawerType === 'supervisor' }"
          @click="openDrawer('supervisor')"
        >
          <span class="topbar-btn-glyph" aria-hidden="true">◴</span>
          <span>编排</span>
        </button>
      </div>
    </header>
    <div class="copilot-stage">
      <!-- ============ 主体两列：左 rail / 右控制台 ============ -->
      <section class="copilot-grid">
        <!-- 左：Agent 选择 + 命令清单 -->
        <aside class="copilot-rail">
          <div class="rail-block glass-card">
            <div class="agent-rail">
              <button
                v-for="(agent, i) in agents"
                :key="agent.type"
                type="button"
                class="agent-tile"
                :class="{ 'is-active': agent.type === activeAgent.type }"
                :style="{ '--agent-accent': agent.color }"
                @click="activeType = agent.type"
              >
                <span class="tile-rail" aria-hidden="true"></span>
                <span class="tile-watermark" aria-hidden="true">{{ agent.mono }}</span>

                <header class="tile-head">
                  <span class="tile-mono" aria-hidden="true">{{ agent.mono }}</span>
                  <span class="tile-status">
                    <i></i> 在岗
                  </span>
                </header>

                <div class="tile-body">
                  <h3 class="tile-name">{{ agent.name }}</h3>
                  <p class="tile-desc">{{ agent.description }}</p>
                </div>

                <footer class="tile-foot">
                  <span class="tile-code">No.{{ String(i + 1).padStart(2, '0') }} · {{ agent.code }}</span>
                  <span class="tile-meta">
                    <span>{{ agent.suggestions.length }} 命令</span>
                    <span class="tile-dot">·</span>
                    <span>{{ agent.actions.length }} 跳转</span>
                  </span>
                </footer>
              </button>
            </div>
          </div>

          <div class="rail-block glass-card">
            <ol class="cmd-list">
              <li
                v-for="(prompt, i) in activeAgent.suggestions"
                :key="prompt"
                class="cmd-item"
                :style="{ '--agent-accent': activeAgent.color }"
              >
                <button type="button" @click="sendPrompt(prompt)">
                  <span class="cmd-no">{{ String(i + 1).padStart(2, '0') }}</span>
                  <span class="cmd-text">{{ prompt }}</span>
                  <span class="cmd-run">RUN</span>
                </button>
              </li>
            </ol>
          </div>
        </aside>

        <!-- 右：Context brief + Chat 控制台 -->
        <main class="copilot-workspace">
          <!-- Context brief -->
          <article
            class="brief-card"
            :style="{ '--agent-accent': activeAgent.color }"
          >
            <div class="brief-stamp" aria-hidden="true">
              <span class="stamp-ring"></span>
              <span class="stamp-orb">{{ activeAgent.code }}</span>
            </div>

            <div class="brief-body">
              <div class="brief-top">
                <span class="brief-kicker">任务简报 · {{ activeAgent.code }}</span>
                <span class="brief-live">
                  <i></i> 在线
                </span>
              </div>

              <div class="brief-main">
                <h3 class="brief-name">{{ activeAgent.name }}</h3>
                <p class="brief-desc">{{ activeAgent.longDescription }}</p>
              </div>

              <div class="brief-meta">
                <div class="meta-col">
                  <span class="meta-label">能力</span>
                  <span class="meta-value">{{ activeAgent.capability }}</span>
                </div>
                <div class="meta-col">
                  <span class="meta-label">响应速度</span>
                  <span class="meta-value">{{ activeAgent.sla }}</span>
                </div>
                <div class="meta-col meta-actions">
                  <span class="meta-label">快捷跳转</span>
                  <div class="meta-actions-row">
                    <button
                      v-for="action in activeAgent.actions"
                      :key="action.path"
                      type="button"
                      class="meta-action"
                      @click="$router.push(action.path)"
                    >
                      <span class="meta-action-arrow">↗</span>
                      {{ action.label }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <!-- Chat 控制台 -->
          <div class="atelier-host">
            <AgentAssistantPanel
              :key="activeAgent.type"
              ref="chatRef"
              :agent-id="currentConfiguredAgent?.id"
              :type="activeAgent.type"
              :title="`${activeAgent.name} Copilot`"
              :icon="activeAgent.icon"
              :color="activeAgent.color"
              :placeholder="activeAgent.placeholder"
              :suggestions="activeAgent.suggestions"
              :session-id="`agent-copilot-${activeAgent.type}`"
            />
          </div>
        </main>
      </section>
    </div>

    <el-drawer
      v-model="drawerOpen"
      :title="drawerTitle"
      direction="rtl"
      size="440px"
      :with-header="true"
      class="copilot-drawer"
    >
      <template v-if="drawerType === 'model'">
        <div class="drawer-section">
          <p class="drawer-section-desc">为「{{ activeAgent.name }}」选择服务商、模型、Base URL;支持一键测试连通性。</p>

          <el-form label-position="top" class="model-form">
            <el-form-item label="服务商">
              <el-select
                :model-value="currentConfiguredAgent?.config?.provider || ''"
                :disabled="modelSaving || !currentConfiguredAgent"
                placeholder="加载中…"
                @change="handleProviderSelect"
              >
                <el-option
                  v-for="preset in providerPresets"
                  :key="preset.value"
                  :value="preset.value"
                  :label="preset.label"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="模型">
              <el-select
                :model-value="currentModelInfo.model"
                :disabled="modelSaving || !currentConfiguredAgent"
                placeholder="选择模型"
                @change="handleModelSelect"
              >
                <el-option
                  v-for="model in currentModelOptions"
                  :key="model.value"
                  :value="model.value"
                  :label="model.label"
                />
                <el-option
                  v-if="currentModelInfo.model && !currentModelInPreset"
                  :value="currentModelInfo.model"
                  :label="currentModelInfo.model"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="常用 Base URL">
              <el-select
                v-model="baseUrlPreset"
                :disabled="!currentProviderPreset"
                placeholder="选择常用地址"
                @change="handleBaseUrlPresetSelect"
              >
                <el-option
                  v-for="url in commonBaseUrls"
                  :key="url"
                  :value="url"
                  :label="url"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="Base URL（留空使用默认）">
              <el-input
                :model-value="currentBaseUrl"
                :disabled="modelSaving || !currentConfiguredAgent"
                placeholder="https://…"
                @blur="handleBaseUrlChange"
              />
            </el-form-item>
          </el-form>

          <div class="drawer-actions">
            <button
              type="button"
              class="test-btn"
              :disabled="testing || !currentConfiguredAgent"
              @click="handleTestConnection"
            >
              {{ testing ? '测试中…' : '↻ 测试连接' }}
            </button>
            <span
              class="key-pill"
              :class="{
                'is-ok': !!testResult && testResult.ok,
                'is-fail': !!testResult && !testResult.ok,
              }"
              :title="testResult?.error || ''"
            >
              <template v-if="testing">测试中…</template>
              <template v-else-if="testResult">
                {{ testResult.ok
                  ? `✓ ${testResult.latencyMs}ms${testResult.reply ? ` · ${testResult.reply.slice(0, 24)}` : ''}`
                  : `✗ ${testResult.error || '连接失败'}` }}
              </template>
              <template v-else>{{ modelSaving ? '保存中…' : currentModelInfo.keyStatus }}</template>
            </span>
          </div>
        </div>
      </template>

      <template v-else-if="drawerType === 'supervisor'">
        <div class="drawer-section" :style="{ '--agent-accent': activeAgent.color }">
          <p class="drawer-section-desc">一句话需求,Supervisor 自动识别意图并路由到对应 Agent 协同完成。</p>

          <el-form label-position="top" class="model-form">
            <el-form-item label="任务描述">
              <el-input
                v-model="supervisorMessage"
                type="textarea"
                :rows="3"
                placeholder="例如：分析客户合作风险"
                @keydown.enter.exact.prevent="runSupervisor"
              />
            </el-form-item>
          </el-form>

          <div class="drawer-actions">
            <button
              type="button"
              class="test-btn"
              :disabled="supervising"
              @click="runSupervisor"
            >
              {{ supervising ? '编排中…' : '启动协作' }}
            </button>
          </div>

          <div v-if="supervisorResult" class="supervisor-result">
            <div class="agent-tags">
              <span class="intent-tag">{{ supervisorResult.plan.intent }}</span>
              <span v-for="agent in supervisorResult.plan.agents" :key="agent" class="agent-tag">
                {{ agentName(agent) }}
              </span>
            </div>
            <ol class="plan-list">
              <li v-for="step in supervisorResult.plan.steps" :key="`${step.agentType}-${step.taskType}`">
                <strong>{{ agentName(step.agentType) }}</strong>
                <span>{{ step.reason }}</span>
              </li>
            </ol>
            <p class="supervisor-reply">{{ supervisorResult.reply }}</p>
          </div>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AgentAssistantPanel from '@/components/AgentAssistantPanel.vue'
import {
  getAgentModelPresets,
  getConfigurableAgents,
  testAgentConnection,
  updateAgentModelConfig,
  type AgentChatType,
} from '@/api/agent'
import { superviseAgentTask, type SupervisorResult } from '@/api/agent-runtime'
import type { Agent, AgentProviderPreset } from '@/types'
import { suggestBaseUrls } from '@/constants/llm'

interface AgentOption {
  type: AgentChatType
  code: string
  mono: string
  name: string
  icon: string
  color: string
  description: string
  longDescription: string
  capability: string
  sla: string
  placeholder: string
  suggestions: string[]
  actions: Array<{ label: string; icon: string; path: string }>
}

const agents: AgentOption[] = [
  {
    type: 'FINANCE',
    code: 'FIN-01',
    mono: '¥',
    name: '财务 Agent',
    icon: 'Money',
    color: '#2f8f67',
    description: '发票、记账、经营分析',
    longDescription: '账务核算、发票归集、利润复盘、现金流预测。给一个口径，它能跑完整套数。',
    capability: '发票核验 · 分类复盘 · 现金流',
    sla: 'avg. 2.4s / reply',
    placeholder: '问财务 Agent：比如帮我分析现金流、检查发票、生成报表口径...',
    suggestions: [
      '帮我总结当前收入、支出和净利润',
      '待审发票应该优先处理哪些？',
      '帮我检查最近交易有没有异常分类',
      '生成一段本月财务经营摘要',
    ],
    actions: [
      { label: '发票管理', icon: 'Document', path: '/finance/invoice' },
      { label: '记账管理', icon: 'Tickets', path: '/finance/transaction' },
      { label: '财务报表', icon: 'DataAnalysis', path: '/finance/report' },
    ],
  },
  {
    type: 'CUSTOMER_SERVICE',
    code: 'CUS-02',
    mono: '✉',
    name: '客服 Agent',
    icon: 'Service',
    color: '#3b5bdb',
    description: '对话、工单、回复建议',
    longDescription: '对话分流、回复口径、情绪识别、转人工判断。把客户问题拆成可执行步骤。',
    capability: '对话分流 · 工单优先级 · 情绪识别',
    sla: 'avg. 1.8s / reply',
    placeholder: '问客服 Agent：比如帮我拟回复、整理工单、判断是否转人工...',
    suggestions: [
      '帮我总结今天待处理工单',
      '给一个投诉客户回复模板',
      '哪些对话需要优先跟进？',
      '帮我把客户问题拆成处理步骤',
    ],
    actions: [
      { label: '对话管理', icon: 'ChatDotRound', path: '/customer-service/conversation' },
      { label: '工单管理', icon: 'Ticket', path: '/customer-service/ticket' },
    ],
  },
  {
    type: 'LEGAL',
    code: 'LAW-03',
    mono: '§',
    name: '法务 Agent',
    icon: 'DocumentChecked',
    color: '#c8772e',
    description: '合同审查、合规风险',
    longDescription: '合同条款检查、风险标注、合规清单、到期事项处理。把模糊的法务语言变成清单。',
    capability: '合同审查 · 合规扫描 · 风险标注',
    sla: 'avg. 3.1s / reply',
    placeholder: '问法务 Agent：比如检查合同风险、整理合规清单、提示到期事项...',
    suggestions: [
      '帮我列出合同审查重点',
      '即将到期合同该怎么处理？',
      '生成一份合规检查清单',
      '帮我识别采购合同常见风险',
    ],
    actions: [
      { label: '合同管理', icon: 'Document', path: '/legal/contract' },
      { label: '合规检查', icon: 'CircleCheck', path: '/legal/compliance' },
    ],
  },
  {
    type: 'ADMIN',
    code: 'ADM-04',
    mono: '◴',
    name: '行政 Agent',
    icon: 'OfficeBuilding',
    color: '#c44a3f',
    description: '日程、任务、会议行动项',
    longDescription: '日程同步、会议纪要、待办拆解、行动项提炼。把一天的混乱压成一条时间线。',
    capability: '日程同步 · 任务拆解 · 会议纪要',
    sla: 'avg. 2.0s / reply',
    placeholder: '问行政 Agent：比如拆解任务、安排日程、提炼会议行动项...',
    suggestions: [
      '帮我安排今天的工作优先级',
      '把待办任务拆成下一步行动',
      '生成会议纪要行动项模板',
      '提醒我哪些事项可能逾期',
    ],
    actions: [
      { label: '日程管理', icon: 'Calendar', path: '/admin/schedule' },
      { label: '任务管理', icon: 'List', path: '/admin/task' },
      { label: '会议纪要', icon: 'Memo', path: '/admin/meeting' },
    ],
  },
]

const route = useRoute()

function normalizeAgentType(value: unknown): AgentChatType {
  const type = typeof value === 'string' ? value : 'FINANCE'
  return agents.some((agent) => agent.type === type) ? (type as AgentChatType) : 'FINANCE'
}

const activeType = ref<AgentChatType>(normalizeAgentType(route.query.agent))
const activeAgent = computed(
  () => agents.find((agent) => agent.type === activeType.value) || agents[0],
)

watch(
  () => route.query.agent,
  (agent) => {
    activeType.value = normalizeAgentType(agent)
  },
)

// 命令从 quick list 发送时，通知 AgentAssistantPanel 的 chat
const chatRef = ref<InstanceType<typeof AgentAssistantPanel> | null>(null)
function sendPrompt(prompt: string) {
  chatRef.value?.receivePrompt(prompt)
}

// ============== 侧边抽屉(模型接入 / Supervisor 编排) ==============
type DrawerType = 'model' | 'supervisor' | null
const drawerType = ref<DrawerType>(null)
const drawerOpen = ref(false)
const drawerTitle = computed(() => {
  if (drawerType.value === 'model') return '模型接入'
  if (drawerType.value === 'supervisor') return '多 Agent 协作编排'
  return ''
})
function openDrawer(type: DrawerType) {
  if (drawerType.value === type) {
    // 再次点击同按钮 → 切换关闭
    drawerOpen.value = false
    return
  }
  drawerType.value = type
  drawerOpen.value = true
}
watch(drawerOpen, (open) => {
  if (!open) {
    // 关闭后清空类型,避免下次默认打开沿用上一次的脏状态
    setTimeout(() => {
      if (!drawerOpen.value) drawerType.value = null
    }, 250)
  }
})

const supervising = ref(false)
const supervisorMessage = ref('分析客户合作风险')
const supervisorResult = ref<SupervisorResult | null>(null)

function agentName(type: AgentChatType) {
  return agents.find((agent) => agent.type === type)?.name || type
}

async function runSupervisor() {
  const message = supervisorMessage.value.trim()
  if (!message || supervising.value) return
  supervising.value = true
  try {
    const res = await superviseAgentTask({
      message,
      sessionId: 'agent-copilot-supervisor',
      metadata: { source: 'agent-copilot' },
    })
    supervisorResult.value = res.data
  } finally {
    supervising.value = false
  }
}

// ============== 模型选择 ==============
const baseUrlPreset = ref<string>('')
const configuredAgents = ref<Agent[]>([])
const providerPresets = ref<AgentProviderPreset[]>([])
const modelSaving = ref(false)
const testing = ref(false)
const testResult = ref<{ ok: boolean; latencyMs: number; reply?: string; error?: string } | null>(null)

const currentConfiguredAgent = computed(() =>
  configuredAgents.value.find((agent) => agent.type === activeType.value),
)
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
    configuredAgents.value = agentsRes.data || []
    providerPresets.value = presetsRes.data || []
  } catch {
    configuredAgents.value = []
    providerPresets.value = []
  }
}

async function handleProviderSelect(provider: string) {
  const preset = providerPresets.value.find((item) => item.value === provider)
  if (!preset) return
  const previousProvider = currentConfiguredAgent.value?.config?.provider
  const providerChanged = !!previousProvider && previousProvider !== preset.value
  await saveCurrentModelConfig({
    provider: preset.value,
    model: preset.defaultModel || currentConfiguredAgent.value?.config?.model || '',
    baseUrl: preset.defaultBaseUrl,
    apiKeyRequired: preset.apiKeyRequired,
    // 切服务商：强制清空 apiKey，防止跨 provider 串用
    apiKey: providerChanged ? '' : undefined,
  })
  if (providerChanged) {
    testResult.value = null
  }
}

async function handleModelSelect(model: string) {
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

async function handleBaseUrlPresetSelect(url: string) {
  if (!url) return
  testResult.value = null
  await saveCurrentModelConfig({ baseUrl: url })
  // 选完即重置,placeholder 重新出现,允许重复选同一项
  baseUrlPreset.value = ''
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

async function saveCurrentModelConfig(patch: Partial<Agent['config']>) {
  const agent = currentConfiguredAgent.value
  if (!agent || modelSaving.value) return
  const nextConfig: Agent['config'] = {
    provider: agent.config.provider,
    model: agent.config.model,
    temperature: agent.config.temperature,
    maxTokens: agent.config.maxTokens,
    enableMemory: agent.config.enableMemory,
    enableTools: agent.config.enableTools,
    apiKey: agent.config.apiKey ?? '',
    baseUrl: agent.config.baseUrl ?? '',
    systemPrompt: agent.config.systemPrompt ?? '',
    apiKeyRequired: agent.config.apiKeyRequired,
    ...patch,
  }
  modelSaving.value = true
  try {
    const res = await updateAgentModelConfig(agent.id, nextConfig)
    const index = configuredAgents.value.findIndex((item) => item.id === agent.id)
    if (index >= 0) configuredAgents.value[index] = res.data
  } catch (err) {
    console.error('[Copilot] updateAgentModelConfig failed:', err)
  } finally {
    modelSaving.value = false
  }
}

// 切换 Agent 时，回到该 Agent 的当前配置
watch(activeType, () => {
  baseUrlPreset.value = ''
  // 配置切换由 currentConfiguredAgent computed 自动响应，无需额外动作
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

// ============== 页面底色 + 玻璃拟态 ==============
.copilot-page {
  position: relative;
  min-height: 100vh;
  padding: 18px 24px 28px;
  color: rgb(var(--text));
  font-family: var(--font-body);
  overflow: hidden;
}

.copilot-stage {
  position: relative;
  max-width: 1320px;
  margin: 0 auto;
}

// ============== 顶部工具条 ==============
.copilot-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  max-width: 1320px;
  margin: 0 auto 12px;
  padding: 8px 14px;
  background: rgb(var(--surface) / 0.92);
  border: 1px solid rgb(var(--line) / 0.6);
  border-radius: 1rem;
  box-shadow: $shadow-sm;
  backdrop-filter: blur(12px);
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.topbar-title {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: rgb(var(--muted));
}

.topbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 600;
  color: rgb(var(--muted));
  background: transparent;
  border: 1px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  transition: color 0.18s ease, background 0.18s ease, border-color 0.18s ease;

  .topbar-btn-glyph {
    font-size: 14px;
    line-height: 1;
    color: rgb(var(--faint));
    transition: color 0.18s ease;
  }

  &:hover {
    color: rgb(var(--text));
    background: rgb(var(--elev) / 0.6);
  }

  &.is-active {
    color: rgb(var(--accent-strong));
    background: rgb(var(--accent-2) / 0.12);
    border-color: rgb(var(--accent) / 0.4);

    .topbar-btn-glyph {
      color: var(--agent-accent, rgb(var(--accent-strong)));
    }
  }
}

.live-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.14em;
  color: rgb(var(--success));
  background: rgb(var(--success) / 0.1);
  border: 1px solid rgb(var(--success) / 0.4);
  border-radius: 999px;

  i {
    width: 6px;
    height: 6px;
    background: rgb(var(--success));
    border-radius: 999px;
    box-shadow: 0 0 0 3px rgb(var(--success) / 0.18);
    animation: live-pulse 1.6s ease-in-out infinite;
  }
}

@keyframes live-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

// ============== 主体两列 ==============
.copilot-grid {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  gap: 28px;
  align-items: stretch;
  animation: rise 0.9s 0.1s $transition-timing both;
}

// ============== 左 rail ==============
.copilot-rail {
  display: flex;
  flex-direction: column;
  gap: 22px;
  position: sticky;
  top: 12px;
}

.rail-block {
  background:
    linear-gradient(145deg, rgb(var(--surface) / 0.98), rgb(var(--surface) / 0.92));
  border: 1px solid rgb(var(--line) / 0.6);
  padding: 20px;
  border-radius: 1.25rem;
  box-shadow: $shadow-soft;
  backdrop-filter: blur(14px);
}

.rail-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 14px;

  h2 {
    margin: 0;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 16px;
    letter-spacing: -0.01em;
    color: rgb(var(--text));
  }
}

.rail-num {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: rgb(var(--accent-strong));
  padding: 4px 8px;
  border-radius: 999px;
  background: rgb(var(--accent-2) / 0.12);
}

.rail-hint {
  margin-left: auto;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  color: rgb(var(--faint));
}

// --- Agent tiles ---
.agent-rail {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.agent-tile {
  --agent-accent: #{$primary-color};
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 18px;
  text-align: left;
  cursor: pointer;
  background: rgb(var(--surface) / 0.92);
  border: 1px solid rgb(var(--line) / 0.6);
  border-radius: 1.125rem;
  box-shadow: $shadow-soft;
  overflow: hidden;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  backdrop-filter: blur(10px);

  // 左侧激活条(已移除渐变色条)
  .tile-rail {
    display: none;
  }

  // 大号装饰字符（背景水印，去掉斜体）
  .tile-watermark {
    position: absolute;
    right: -10px;
    bottom: -28px;
    font-family: var(--font-body);
    font-size: 120px;
    font-weight: 700;
    line-height: 1;
    color: var(--agent-accent);
    opacity: 0.05;
    pointer-events: none;
    transition: opacity 0.32s ease, transform 0.4s ease;
    user-select: none;
  }

  .tile-head {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .tile-mono {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    font-family: var(--font-body);
    font-size: 16px;
    font-weight: 600;
    color: #fff;
    background: linear-gradient(135deg, var(--agent-accent), rgb(var(--accent)));
    border-radius: 10px;
    transition: transform 0.2s ease;
    box-shadow: 0 6px 16px -8px var(--agent-accent);
  }

  .tile-status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.12em;
    color: rgb(var(--muted));

    i {
      width: 6px;
      height: 6px;
      background: rgb(var(--success));
      border-radius: 50%;
      box-shadow: 0 0 0 3px rgb(var(--success) / 0.18);
      animation: tilePulse 1.8s ease-in-out infinite;
    }
  }

  .tile-body {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .tile-name {
    margin: 0;
    font-family: var(--font-body);
    font-size: 16px;
    font-weight: 600;
    color: rgb(var(--text));
    transition: color 0.2s ease;
  }

  .tile-desc {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: rgb(var(--muted));
    transition: color 0.2s ease;
  }

  .tile-foot {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding-top: 10px;
  }

  .tile-code {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.1em;
    color: rgb(var(--muted));
    font-variant-numeric: tabular-nums;
  }

  .tile-meta {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 500;
    letter-spacing: 0.08em;
    color: rgb(var(--faint));
  }

  .tile-dot {
    color: rgb(var(--faint) / 0.6);
  }

  &:hover {
    border-color: rgb(var(--accent) / 0.5);
    transform: translateY(-2px);
    box-shadow: $shadow-glow;

    .tile-watermark {
      opacity: 0.08;
      transform: translateX(-2px);
    }

    .tile-mono {
      transform: scale(1.06);
    }
  }

  &.is-active {
    background: linear-gradient(135deg, var(--agent-accent), rgb(var(--accent-strong)));
    border-color: transparent;
    box-shadow: 0 18px 48px -16px var(--agent-accent), inset 0 1px 0 rgb(255 255 255 / 0.2);

    .tile-rail { height: 70%; }

    .tile-watermark {
      opacity: 0.14;
      color: white;
      transform: translateX(-3px);
    }

    .tile-mono {
      background: rgb(255 255 255 / 0.22);
      color: white;
      border-color: rgb(255 255 255 / 0.32);
      transform: scale(1.06);
      box-shadow: none;
    }

    .tile-status {
      color: rgb(255 255 255 / 0.92);
      i {
        background: white;
        box-shadow: 0 0 0 3px rgb(255 255 255 / 0.25);
      }
    }

    .tile-name,
    .tile-desc { color: white; }
    .tile-desc { color: rgb(255 255 255 / 0.82); }
    .tile-code,
    .tile-meta { color: rgb(255 255 255 / 0.78); }
    .tile-dot { color: rgb(255 255 255 / 0.45); }
  }
}

@keyframes tilePulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(0.92);
    opacity: 0.85;
  }
}

// --- 命令清单 ---
.cmd-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cmd-item button {
  width: 100%;
  display: grid;
  grid-template-columns: 36px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  text-align: left;
  cursor: pointer;
  background: rgb(var(--surface) / 0.75);
  border: 1px solid rgb(var(--line) / 0.6);
  border-radius: 0.875rem;
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
  backdrop-filter: blur(6px);

  .cmd-no {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.1em;
    color: rgb(var(--faint));
    font-variant-numeric: tabular-nums;
  }

  .cmd-text {
    font-size: 12px;
    line-height: 1.4;
    color: rgb(var(--text));
  }

  .cmd-run {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.1em;
    color: rgb(var(--muted));
    padding: 3px 9px;
    border: 0;
    background: rgb(var(--elev) / 0.8);
    border-radius: 999px;
    transition: all 0.2s ease;
  }

  &:hover {
    background: rgb(var(--surface));
    border-color: rgb(var(--accent) / 0.45);
    transform: translateX(2px);

    .cmd-no { color: rgb(var(--accent-strong)); }

    .cmd-run {
      color: #fff;
      background: var(--agent-accent);
    }
  }
}

// ============== 右 workspace ==============
.copilot-workspace {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
  min-height: calc(100vh - 200px);
}

.atelier-host {
  flex: 1 1 auto;
  min-height: 640px;
  display: flex;
}

// --- Brief card (Atelier Blue 同步) ---
.brief-card {
  --agent-accent: #{$primary-color};
  position: relative;
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 14px;
  padding: 14px 18px 12px;
  background: rgba(255, 253, 243, 0.78);
  border: 1px solid rgba(13, 71, 161, 0.18);
  border-radius: 4px;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.6) inset,
    0 8px 18px -14px rgba(13, 27, 42, 0.18);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(13, 71, 161, 0.04) 1px, transparent 1px);
    background-size: 100% 22px;
    background-position: 0 22px;
    mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.55), transparent 80%);
  }

  > * { position: relative; z-index: 1; }
}

.brief-stamp {
  position: relative;
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--agent-accent) 40%, #b8893a);
  border-radius: 4px;
  background: linear-gradient(135deg, #fffdf3 0%, #f5ecd2 100%);
  box-shadow:
    0 3px 0 color-mix(in srgb, var(--agent-accent) 26%, transparent),
    0 1px 0 rgba(255, 255, 255, 0.6) inset;
  transform: rotate(-3deg);
  transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);

  .brief-card:hover & { transform: rotate(-5deg) translateY(-1px); }

  .stamp-ring {
    position: absolute;
    inset: 4px;
    border: 1px solid color-mix(in srgb, var(--agent-accent) 50%, transparent);
    border-radius: 2px;
  }
}

.stamp-orb {
  font-family: 'Source Serif 4', 'Noto Serif SC', Georgia, serif;
  font-size: 18px;
  font-weight: 700;
  color: var(--agent-accent);
  letter-spacing: 0.04em;
}

.brief-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.brief-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brief-kicker {
  font-family: var(--font-mono);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #8a5a18;
}

.brief-live {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: color-mix(in srgb, var(--agent-accent) 70%, #082558);
  padding: 1px 8px;
  border: 1px solid color-mix(in srgb, var(--agent-accent) 24%, transparent);
  border-radius: 2px;
  background: color-mix(in srgb, var(--agent-accent) 8%, transparent);

  i {
    width: 5px;
    height: 5px;
    background: var(--agent-accent);
    border-radius: 50%;
    box-shadow: 0 0 6px var(--agent-accent);
    animation: pulse 1.8s ease-in-out infinite;
  }
}

.brief-main {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  margin: 2px 0 4px;
}

.brief-name {
  margin: 0;
  font-family: var(--font-body);
  font-weight: 600;
  font-style: italic;
  font-size: 18px;
  letter-spacing: -0.01em;
  color: #082558;
}

.brief-desc {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: #3c5578;
  max-width: 720px;
  font-style: italic;
}

.brief-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  padding-top: 8px;
  border-top: 1px dashed rgba(13, 71, 161, 0.18);
}

.meta-col {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.meta-label {
  font-family: var(--font-mono);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8a5a18;
}

.meta-value {
  font-size: 12px;
  font-weight: 600;
  color: #082558;
  font-variant-numeric: tabular-nums;
}

.meta-actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.meta-action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  font-family: 'Source Serif 4', 'Noto Serif SC', Georgia, serif;
  font-size: 11.5px;
  font-style: italic;
  font-weight: 500;
  color: #082558;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid color-mix(in srgb, var(--agent-accent) 22%, rgba(13, 71, 161, 0.18));
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.18s ease;

  .meta-action-arrow {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 10px;
    font-style: normal;
    color: var(--agent-accent);
  }

  &:hover {
    color: #fff;
    background: var(--agent-accent);
    border-color: var(--agent-accent);
    .meta-action-arrow { color: #fff; }
  }
}

// ============== 侧边抽屉(模型接入 / Supervisor 编排) ==============
.copilot-drawer {
  :deep(.el-drawer__header) {
    margin-bottom: 0;
    padding: 18px 22px 14px;
    font-family: var(--font-body);
    font-size: 15px;
    font-weight: 600;
    color: rgb(var(--text));
    border-bottom: 1px solid rgb(var(--line) / 0.5);
  }

  :deep(.el-drawer__body) {
    padding: 0;
  }
}

.drawer-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 22px 28px;
}

.drawer-section-desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: rgb(var(--muted));
}

.model-form {
  :deep(.el-form-item) {
    margin-bottom: 14px;

    &:last-child { margin-bottom: 0; }
  }

  :deep(.el-form-item__label) {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgb(var(--faint));
    line-height: 1.4;
    padding-bottom: 4px;
  }

  :deep(.el-select),
  :deep(.el-input) {
    width: 100%;
  }

  :deep(.el-input__wrapper),
  :deep(.el-textarea__inner) {
    background: rgb(var(--surface) / 0.85);
    box-shadow: 0 0 0 1px rgb(var(--line) / 0.7);
    border-radius: 10px;
    transition: box-shadow 0.15s ease;
  }

  :deep(.el-input__wrapper.is-focus),
  :deep(.el-textarea__inner:focus) {
    box-shadow: 0 0 0 1px rgb(var(--accent) / 0.55);
  }

  :deep(.el-input.is-disabled .el-input__wrapper),
  :deep(.el-textarea.is-disabled .el-textarea__inner) {
    opacity: 0.55;
  }

  :deep(.el-input__inner),
  :deep(.el-textarea__inner) {
    font-family: var(--font-body);
    font-size: 12px;
    color: rgb(var(--text));
  }
}

.drawer-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding-top: 4px;
}

.test-btn {
  flex: 0 0 auto;
  height: 34px;
  padding: 0 16px;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: rgb(var(--on-accent));
  background: linear-gradient(135deg, rgb(var(--accent-strong)), rgb(var(--accent)));
  border: 1px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
  box-shadow: 0 6px 16px -10px rgb(var(--accent) / 0.6);

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 22px -12px rgb(var(--accent) / 0.7);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
  }
}

.key-pill {
  flex: 0 0 auto;
  max-width: 100%;
  padding: 5px 12px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-align: center;
  color: rgb(var(--muted));
  background: rgb(var(--elev) / 0.7);
  border: 1px solid rgb(var(--line) / 0.6);
  border-radius: 999px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;

  &.is-ok {
    color: rgb(var(--success));
    background: rgb(var(--success) / 0.1);
    border-color: rgb(var(--success) / 0.45);
  }

  &.is-fail {
    color: rgb(var(--danger));
    background: rgb(var(--danger) / 0.1);
    border-color: rgb(var(--danger) / 0.5);
  }
}

.supervisor-result {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px dashed rgb(var(--line) / 0.8);
}

.agent-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.intent-tag,
.agent-tag {
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}

.intent-tag {
  color: rgb(var(--on-accent));
  background: linear-gradient(135deg, rgb(var(--accent-strong)), rgb(var(--accent)));
}

.agent-tag {
  color: rgb(var(--accent-strong));
  background: rgb(var(--accent-2) / 0.1);
  border: 1px solid rgb(var(--accent) / 0.24);
}

.plan-list {
  display: grid;
  gap: 6px;
  margin: 0;
  padding-left: 18px;
  color: rgb(var(--muted));
  font-size: 12px;

  strong {
    margin-right: 8px;
    color: rgb(var(--text));
  }
}

.supervisor-reply {
  max-height: 160px;
  margin: 12px 0 0;
  padding: 12px;
  overflow: auto;
  white-space: pre-wrap;
  color: rgb(var(--text));
  background: rgb(var(--elev) / 0.55);
  border: 1px solid rgb(var(--line) / 0.45);
  border-radius: 12px;
  line-height: 1.6;
}

// ============== 动画 ==============
@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.18); }
}

// ============== 响应式 ==============
@media (max-width: 1080px) {
  .copilot-grid { grid-template-columns: 1fr; }
  .copilot-rail { position: static; }
  .agent-rail {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .brief-meta { grid-template-columns: 1fr 1fr; }
  .copilot-workspace { min-height: 0; }
  .atelier-host { min-height: 520px; }
}

@media (max-width: 720px) {
  .copilot-page { padding: 24px 18px 40px; }
  .agent-rail { grid-template-columns: 1fr; }
  .brief-meta { grid-template-columns: 1fr; }
  .brief-card { grid-template-columns: 44px minmax(0, 1fr); padding: 12px 14px 10px; }
  .brief-stamp { width: 44px; height: 44px; }
  .stamp-orb { font-size: 14px; }
  .brief-name { font-size: 16px; }
  .atelier-host { min-height: 480px; }
}
</style>
