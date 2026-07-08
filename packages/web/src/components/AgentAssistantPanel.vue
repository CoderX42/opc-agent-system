<template>
  <section class="agent-atelier" :style="{ '--agent-accent': color }">
    <!-- 值班工匠胸卡 -->
    <header class="badge-card">
      <div class="badge-stamp" aria-hidden="true">
        <span class="stamp-ring"></span>
        <span class="stamp-ring stamp-ring-2"></span>
        <span class="stamp-code">{{ agentCode }}</span>
        <span class="stamp-orb">{{ orbInitial }}</span>
      </div>

      <div class="badge-info">
        <div class="badge-name-row">
          <strong class="badge-name">{{ title }}</strong>
          <span class="badge-status" :class="{ 'is-busy': loading }">
            <span class="status-led"></span>
            {{ loading ? '在岗·处理中' : '在岗·值守' }}
          </span>
        </div>
        <div class="badge-path">~/opc/<em>{{ shortCode }}</em>/runtime&nbsp;·&nbsp;SESSION&nbsp;<em>{{ sessionShort }}</em></div>
        <div class="badge-meta">
          <span class="meta-cell"><em>TX</em><strong>{{ String(txCount).padStart(3, '0') }}</strong></span>
          <span class="meta-sep">/</span>
          <span class="meta-cell"><em>RX</em><strong>{{ String(rxCount).padStart(3, '0') }}</strong></span>
          <span class="meta-sep">/</span>
          <span class="meta-cell"><em>MODE</em><strong>{{ runtimeEnabled ? 'RUNTIME' : 'CHAT' }}</strong></span>
          <span class="meta-sep">/</span>
          <span class="meta-cell clock"><em>本地</em><strong>{{ clockText }}</strong></span>
        </div>
      </div>

      <div class="badge-corner tl">┌</div>
      <div class="badge-corner tr">┐</div>
      <div class="badge-corner bl">└</div>
      <div class="badge-corner br">┘</div>
    </header>

    <!-- 工序条 -->
    <div class="process-strip" :class="{ 'is-running': loading }">
      <div class="process-line" aria-hidden="true"></div>
      <button
        v-for="(stage, idx) in runtimeStages"
        :key="stage.key"
        type="button"
        class="process-step"
        :class="{ hot: stage.hot, active: activeStage === stage.key, done: stage.hot && !loading }"
        :style="{ animationDelay: `${idx * 0.08}s` }"
        @click="activeStage = activeStage === stage.key ? null : stage.key"
      >
        <span class="step-no">{{ stage.no }}</span>
        <span class="step-label">{{ stage.label }}</span>
        <span class="step-mark" aria-hidden="true"></span>
      </button>
    </div>

    <section v-if="activeStageDetail" class="process-detail">
      <header>
        <span class="detail-no">{{ activeStageDetail.no }}</span>
        <strong>{{ activeStageDetail.title }}</strong>
        <button type="button" aria-label="关闭" @click="activeStage = null">×</button>
      </header>
      <p>{{ activeStageDetail.description }}</p>
      <pre>{{ activeStageDetail.payload }}</pre>
    </section>

    <!-- 快捷命令 -->
    <div v-if="suggestions.length" class="command-deck">
      <span class="deck-label">⌘ 快捷调用</span>
      <div class="deck-row">
        <button
          v-for="suggestion in suggestions.slice(0, 4)"
          :key="suggestion"
          type="button"
          class="command-chip"
          :disabled="loading"
          @click="receivePrompt(suggestion)"
        >
          <span class="chip-arrow">↗</span>
          {{ suggestion }}
        </button>
      </div>
    </div>

    <!-- 聊天卷宗 -->
    <ChatPanel
      class="atelier-chat"
      :messages="messages"
      :typing="loading"
      :placeholder="placeholder"
      :accent="color"
      :empty-hint="emptyHint"
      @send="sendMessage"
    />

    <!-- 卷宗尾注 -->
    <footer v-if="lastRuntimeMeta" class="ledger-footer">
      <span class="ledger-line"></span>
      <div class="footer-chips">
        <div class="meta-chip">
          <em>任务</em>
          <strong>{{ lastRuntimeMeta.taskId.slice(0, 8) }}</strong>
        </div>
        <div class="meta-chip" :class="`status-${lastRuntimeMeta.status.toLowerCase()}`">
          <em>状态</em>
          <strong>{{ lastRuntimeMeta.status }}</strong>
        </div>
        <div class="meta-chip">
          <em>工具</em>
          <strong>{{ lastRuntimeMeta.tools || 0 }}</strong>
        </div>
        <div class="meta-chip">
          <em>引用</em>
          <strong>{{ lastRuntimeMeta.references || 0 }}</strong>
        </div>
      </div>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import ChatPanel from '@/components/ChatPanel.vue'
import { chatWithAgent, chatWithAgentType, type AgentChatType } from '@/api/agent'
import { executeAgentTask, type AgentTaskStatus } from '@/api/agent-runtime'

interface Message {
  id: string
  role: 'user' | 'agent' | 'system'
  content: string
  timestamp: string
}

type RuntimeStageKey = 'memory' | 'rag' | 'tools' | 'llm'

const props = withDefaults(
  defineProps<{
    type: AgentChatType
    agentId?: string
    title: string
    icon: string
    color?: string
    placeholder?: string
    suggestions?: string[]
    runtimeEnabled?: boolean
    sessionId?: string
  }>(),
  {
    color: '#155e52',
    placeholder: '直接向这个 Agent 描述你要处理的事情...',
    suggestions: () => [],
    runtimeEnabled: true,
  },
)

const loading = ref(false)
const messages = ref<Message[]>([
  {
    id: crypto.randomUUID(),
    role: 'system',
    content: `${props.title} 已接入 Agent Runtime。可以直接提问，也可以从左侧快捷命令发送。`,
    timestamp: currentTime(),
  },
])
const lastRuntimeMeta = ref<{
  taskId: string
  status: AgentTaskStatus
  tools: number
  references: number
  memorySummary: string
  ragReferences: string[]
  toolNames: string[]
  llmSummary: string
} | null>(null)
const activeStage = ref<RuntimeStageKey | null>(null)

const txCount = computed(() => messages.value.filter((m) => m.role === 'user').length)
const rxCount = computed(() => messages.value.filter((m) => m.role === 'agent').length)
const orbInitial = computed(() => {
  const map: Partial<Record<AgentChatType, string>> = {
    FINANCE: '¥',
    CUSTOMER_SERVICE: '✉',
    LEGAL: '§',
    ADMIN: '◴',
  }
  return map[props.type] || 'AI'
})
const shortCode = computed(() => {
  const map: Partial<Record<AgentChatType, string>> = {
    FINANCE: 'finance',
    CUSTOMER_SERVICE: 'service',
    LEGAL: 'legal',
    ADMIN: 'admin',
  }
  return map[props.type] || 'agent'
})
const agentCode = computed(() => {
  const map: Partial<Record<AgentChatType, string>> = {
    FINANCE: 'OP-01·¥',
    CUSTOMER_SERVICE: 'OP-02·✉',
    LEGAL: 'OP-03·§',
    ADMIN: 'OP-04·◴',
  }
  return map[props.type] || 'OP-00·AI'
})
const sessionShort = computed(() => (props.sessionId || `copilot-${shortCode.value}`).slice(-6))
const now = ref(new Date())
let clockTimer: number | null = null
const clockText = computed(() => {
  const d = now.value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
})
const emptyHint = computed(() => `把任务交给 ${props.title},它会在这份卷宗里写下处理记录。`)

onMounted(() => {
  clockTimer = window.setInterval(() => { now.value = new Date() }, 30_000)
})
onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer)
})
const runtimeStages = computed<Array<{ key: RuntimeStageKey; no: string; label: string; hot: boolean }>>(() => [
  { key: 'memory', no: '01', label: 'Memory', hot: Boolean(lastRuntimeMeta.value) },
  { key: 'rag', no: '02', label: 'RAG', hot: Boolean(lastRuntimeMeta.value?.references) },
  { key: 'tools', no: '03', label: 'Tools', hot: Boolean(lastRuntimeMeta.value?.tools) },
  { key: 'llm', no: '04', label: 'LLM', hot: loading.value || Boolean(lastRuntimeMeta.value) },
])
const activeStageDetail = computed(() => {
  if (!activeStage.value) return null
  const meta = lastRuntimeMeta.value
  const fallback = '尚未执行 Runtime 任务。发送一条消息后，这里会展示该阶段的执行详情。'
  const details = {
    memory: {
      no: '01',
      title: 'Memory 上下文',
      description: '短期会话记忆和长期记忆会在这里参与 Prompt 组装。',
      payload: meta?.memorySummary || fallback,
    },
    rag: {
      no: '02',
      title: 'RAG 知识检索',
      description: '展示本次任务命中的知识库引用。',
      payload: meta?.ragReferences.length ? meta.ragReferences.join('\n') : '本次没有命中知识库引用。',
    },
    tools: {
      no: '03',
      title: 'Tool Calling',
      description: '展示本次 Runtime 自动调用的业务工具。',
      payload: meta?.toolNames.length ? meta.toolNames.join('\n') : '本次没有触发工具调用。',
    },
    llm: {
      no: '04',
      title: 'LLM 生成',
      description: '展示模型生成阶段的任务状态和结果摘要。',
      payload: meta?.llmSummary || fallback,
    },
  }
  return details[activeStage.value]
})

function currentTime() {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

async function sendMessage(content: string) {
  const message = content.trim()
  if (!message || loading.value) return

  messages.value.push({
    id: crypto.randomUUID(),
    role: 'user',
    content: message,
    timestamp: currentTime(),
  })

  loading.value = true
  try {
    const reply = props.runtimeEnabled ? await sendRuntimeTask(message) : await sendLegacyChat(message)
    messages.value.push({
      id: crypto.randomUUID(),
      role: 'agent',
      content: reply || '我暂时没有生成有效回复，请稍后再试。',
      timestamp: currentTime(),
    })
  } catch (err: any) {
    const backendMessage = err?.response?.data?.message
    const reason = Array.isArray(backendMessage)
      ? backendMessage.join('；')
      : backendMessage || err?.message || ''
    const hint = /api.?key|401|authorized|credentials/i.test(reason)
      ? '（请检查服务商 API Key / Base URL 是否有效）'
      : /not found|404|model/i.test(reason)
      ? '（请检查模型名称是否正确）'
      : ''
    messages.value.push({
      id: crypto.randomUUID(),
      role: 'agent',
      content: `这次没有连上 Agent 服务：${reason || '未知错误'}${hint}`,
      timestamp: currentTime(),
    })
  } finally {
    loading.value = false
  }
}

async function sendRuntimeTask(message: string) {
  const res = await executeAgentTask({
    agentId: props.agentId,
    agentType: props.agentId ? undefined : props.type,
    taskType: `${shortCode.value}_copilot`,
    message,
    sessionId: props.sessionId || `copilot-${shortCode.value}`,
  })
  lastRuntimeMeta.value = {
    taskId: res.data.task.id,
    status: res.data.task.status,
    tools: res.data.toolResults.length,
    references: res.data.references.length,
    memorySummary: `Session: ${props.sessionId || `copilot-${shortCode.value}`}\nTask: ${res.data.task.id}\n状态: ${res.data.task.status}`,
    ragReferences: res.data.references.map((item, index) => `${index + 1}. ${item.title}（${item.category}，score=${item.relevanceScore}）`),
    toolNames: res.data.toolResults.map((item, index) => `${index + 1}. ${item.tool}`),
    llmSummary: `Agent: ${res.data.agentType || props.type}\nTask: ${res.data.task.taskType}\n状态: ${res.data.task.status}\n回复长度: ${res.data.reply.length} 字`,
  }
  const refs = res.data.references.length
    ? `\n\n参考知识：${res.data.references.map((item) => item.title).join('、')}`
    : ''
  const tools = res.data.toolResults.length
    ? `\n\n已调用工具：${res.data.toolResults.map((item) => item.tool).join('、')}`
    : ''
  return `${res.data.reply}${tools}${refs}`
}

async function sendLegacyChat(message: string) {
  const res = props.agentId
    ? await chatWithAgent(props.agentId, message)
    : await chatWithAgentType(props.type, message)
  return res.data.reply
}

// 暴露给父组件（Quick commands 触发）
function receivePrompt(prompt: string) {
  void sendMessage(prompt)
}
defineExpose({ receivePrompt })
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.agent-atelier {
  --agent-accent: #{$primary-color};
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  isolation: isolate;
  background:
    radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--agent-accent) 8%, transparent), transparent 40%),
    #fbfaf3;
  border: 1px solid color-mix(in srgb, var(--agent-accent) 26%, rgba(13, 71, 161, 0.18));
  box-shadow:
    0 22px 60px -28px rgba(13, 27, 42, 0.22),
    0 1px 0 rgba(255, 255, 255, 0.6) inset;
  animation: atelierIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(13, 71, 161, 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(13, 71, 161, 0.035) 1px, transparent 1px);
    background-size: 24px 24px, 24px 24px;
    background-position: -1px -1px;
    mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.6), transparent 70%);
  }

  > * { position: relative; z-index: 1; }
}

// ============== 值班工匠胸卡 ==============
.badge-card {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 16px;
  padding: 16px 20px 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--agent-accent) 24%, rgba(13, 71, 161, 0.18));
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.1)),
    color-mix(in srgb, var(--agent-accent) 6%, transparent);
}

.badge-stamp {
  position: relative;
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  flex: 0 0 64px;
  border-radius: 4px;
  background: linear-gradient(135deg, #fffdf3 0%, #f5ecd2 100%);
  border: 1px solid color-mix(in srgb, var(--agent-accent) 40%, #b8893a);
  box-shadow:
    0 4px 0 color-mix(in srgb, var(--agent-accent) 30%, transparent),
    0 1px 0 rgba(255, 255, 255, 0.6) inset;
  transform: rotate(-3deg);
  transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);

  .badge-card:hover & { transform: rotate(-5deg) translateY(-1px); }
}

.stamp-ring {
  position: absolute;
  inset: 4px;
  border: 1px solid color-mix(in srgb, var(--agent-accent) 50%, transparent);
  border-radius: 2px;
  pointer-events: none;

  &-2 {
    inset: 8px;
    border-style: dashed;
    border-color: rgba(184, 137, 58, 0.5);
  }
}

.stamp-code {
  position: absolute;
  top: 4px;
  left: 0;
  right: 0;
  text-align: center;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 7.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #8a5a18;
}

.stamp-orb {
  font-family: 'Source Serif 4', 'Noto Serif SC', Georgia, serif;
  font-size: 26px;
  font-weight: 700;
  line-height: 1;
  color: var(--agent-accent);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6);
}

.badge-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.badge-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.badge-name {
  font-family: var(--font-body, 'Source Serif 4', 'Noto Serif SC', Georgia, serif);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #082558;
  font-style: italic;
}

.badge-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 1px 8px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: color-mix(in srgb, var(--agent-accent) 70%, #082558);
  background: color-mix(in srgb, var(--agent-accent) 10%, white);
  border: 1px solid color-mix(in srgb, var(--agent-accent) 22%, transparent);
  border-radius: 2px;

  &.is-busy {
    color: #a23a2b;
    background: rgba(196, 74, 63, 0.08);
    border-color: rgba(196, 74, 63, 0.32);
  }
}

.status-led {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--agent-accent);
  box-shadow: 0 0 6px var(--agent-accent);
  animation: ledPulse 1.6s ease-in-out infinite;
}

.badge-status.is-busy .status-led {
  background: #c44a3f;
  box-shadow: 0 0 6px #c44a3f;
  animation-duration: 0.8s;
}

.badge-path {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.04em;
  color: #6f86a6;

  em {
    font-style: normal;
    color: color-mix(in srgb, var(--agent-accent) 70%, #082558);
    font-weight: 700;
  }
}

.badge-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 4px;
  border-top: 1px dashed rgba(13, 71, 161, 0.18);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10.5px;
  color: #3c5578;
}

.meta-cell {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  em { font-style: normal; color: #6f86a6; letter-spacing: 0.1em; font-size: 9px; }
  strong { font-weight: 700; color: #082558; font-variant-numeric: tabular-nums; }
}

.meta-sep { color: rgba(184, 137, 58, 0.6); }

.meta-cell.clock strong::before {
  content: '◷';
  display: inline-block;
  margin-right: 3px;
  color: var(--agent-accent);
}

.badge-corner {
  position: absolute;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  line-height: 1;
  color: color-mix(in srgb, var(--agent-accent) 55%, #082558);
  opacity: 0.55;
  pointer-events: none;
  &.tl { top: 4px; left: 6px; }
  &.tr { top: 4px; right: 6px; }
  &.bl { bottom: 4px; left: 6px; }
  &.br { bottom: 4px; right: 6px; }
}

// ============== 工序条 ==============
.process-strip {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  padding: 10px 20px 8px;
  background: rgba(247, 243, 232, 0.55);
  border-bottom: 1px dashed rgba(13, 71, 161, 0.18);

  &.is-running::after {
    content: '';
    position: absolute;
    left: 20px;
    right: 20px;
    bottom: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--agent-accent), transparent);
    background-size: 200% 100%;
    animation: flowLine 1.6s linear infinite;
  }
}

.process-line {
  position: absolute;
  left: 28px;
  right: 28px;
  top: 24px;
  height: 1px;
  background: repeating-linear-gradient(90deg, rgba(13, 71, 161, 0.2) 0 4px, transparent 4px 8px);
  pointer-events: none;
}

.process-step {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px 2px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  color: #6f86a6;
  z-index: 1;
  transition: color 0.2s ease;

  &:hover { color: color-mix(in srgb, var(--agent-accent) 80%, #082558); }

  &.hot { color: #082558; }
  &.active { color: var(--agent-accent); }
  &.done .step-mark { background: var(--agent-accent); box-shadow: 0 0 8px var(--agent-accent); }
}

.step-no {
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: inherit;
  opacity: 0.7;
}

.step-label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.step-mark {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(13, 71, 161, 0.2);
  border: 1px solid rgba(13, 71, 161, 0.32);
  transition: all 0.2s ease;
}

.process-step.hot .step-mark { background: #082558; border-color: #082558; }
.process-step.active .step-mark {
  background: var(--agent-accent);
  border-color: var(--agent-accent);
  box-shadow: 0 0 10px var(--agent-accent);
  transform: scale(1.3);
}

// ============== 工序详情 ==============
.process-detail {
  margin: 0 20px 12px;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--agent-accent) 24%, rgba(13, 71, 161, 0.18));
  background: rgba(255, 255, 255, 0.78);
  animation: atelierIn 0.3s ease both;

  header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    color: #082558;
  }
  .detail-no {
    padding: 1px 5px;
    background: var(--agent-accent);
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.1em;
    border-radius: 2px;
  }
  strong {
    flex: 1;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }
  button {
    width: 20px;
    height: 20px;
    border: none;
    background: transparent;
    color: #6f86a6;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    &:hover { color: #c44a3f; }
  }
  p {
    margin: 0 0 8px;
    font-size: 12px;
    color: #3c5578;
    line-height: 1.5;
  }
  pre {
    margin: 0;
    padding: 8px 10px;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 11px;
    line-height: 1.5;
    color: #082558;
    background: rgba(13, 71, 161, 0.05);
    border: 1px dashed rgba(13, 71, 161, 0.18);
    border-radius: 2px;
    white-space: pre-wrap;
    word-break: break-word;
  }
}

// ============== 快捷命令 ==============
.command-deck {
  padding: 10px 20px 8px;
  border-bottom: 1px dashed rgba(13, 71, 161, 0.18);
  background: rgba(255, 255, 255, 0.3);
}

.deck-label {
  display: block;
  margin-bottom: 6px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #8a5a18;
  text-transform: uppercase;
}

.deck-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.command-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  font-family: var(--font-body, 'Source Serif 4', 'Noto Serif SC', Georgia, serif);
  font-size: 12px;
  font-style: italic;
  color: #082558;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid color-mix(in srgb, var(--agent-accent) 22%, rgba(13, 71, 161, 0.18));
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.18s ease;

  .chip-arrow {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    color: var(--agent-accent);
    font-size: 10px;
    font-style: normal;
  }

  &:hover:not(:disabled) {
    color: #fff;
    background: var(--agent-accent);
    border-color: var(--agent-accent);
    transform: translateY(-1px);
    .chip-arrow { color: #fff; }
  }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

// ============== Chat 卷宗容器 ==============
.atelier-chat {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
}

// ============== 卷宗尾注 ==============
.ledger-footer {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 20px 10px;
  background: linear-gradient(180deg, #f7f3e8 0%, #efe6ce 100%);
  border-top: 1px solid rgba(184, 137, 58, 0.4);
}

.ledger-line {
  position: absolute;
  left: 20px;
  right: 20px;
  top: 4px;
  height: 0;
  border-top: 1px dashed rgba(184, 137, 58, 0.5);
  pointer-events: none;
}

.footer-chips {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
}

.meta-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(13, 71, 161, 0.18);
  border-radius: 2px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  em {
    font-style: normal;
    color: #6f86a6;
    letter-spacing: 0.08em;
  }
  strong {
    color: #082558;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  &.status-completed { border-color: rgba(0, 168, 132, 0.4); strong { color: #00a884; } }
  &.status-failed    { border-color: rgba(196, 74, 63, 0.42); strong { color: #c44a3f; } }
  &.status-running   { border-color: rgba(184, 137, 58, 0.5); strong { color: #8a5a18; } }
}

// ============== 动画 ==============
@keyframes atelierIn {
  0% { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes ledPulse {
  0%, 100% { box-shadow: 0 0 4px currentColor; opacity: 1; }
  50% { box-shadow: 0 0 12px currentColor; opacity: 0.6; }
}

@keyframes flowLine {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

// ============== 响应式 ==============
@media (max-width: 768px) {
  .badge-card { padding: 12px 14px 10px; gap: 12px; }
  .badge-stamp { width: 52px; height: 52px; flex-basis: 52px; }
  .stamp-orb { font-size: 22px; }
  .badge-name { font-size: 17px; }
  .badge-meta { gap: 6px; font-size: 10px; }
  .process-strip { padding: 8px 12px 6px; }
  .process-line { left: 20px; right: 20px; }
  .step-label { font-size: 9.5px; letter-spacing: 0.04em; }
  .command-deck { padding: 8px 12px 6px; }
  .deck-row { gap: 4px; }
  .command-chip { padding: 4px 8px; font-size: 11px; }
  .process-detail { margin: 0 12px 10px; }
  .ledger-footer { padding: 6px 12px 8px; }
  .footer-chips { gap: 4px; }
  .meta-chip { padding: 2px 6px; font-size: 9.5px; }
}
</style>
