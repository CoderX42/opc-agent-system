<template>
  <section class="agent-console" :style="{ '--agent-accent': color }">
    <header class="console-bar">
      <div class="console-meta">
        <span class="agent-orb" aria-hidden="true">
          <span class="orb-core">{{ orbInitial }}</span>
        </span>
        <span class="console-led" aria-hidden="true">
          <i></i><i></i><i></i>
        </span>
        <div class="console-title-block">
          <strong>{{ title }}</strong>
          <span class="console-path">~/opc/{{ shortCode }}/<em>runtime</em></span>
        </div>
      </div>
      <div class="console-counters">
        <span class="runtime-pill" :class="{ active: runtimeEnabled }">
          {{ runtimeEnabled ? 'RUNTIME' : 'CHAT' }}
        </span>
        <span class="counter">
          <span class="counter-label">TX</span>
          <span class="counter-value">{{ String(txCount).padStart(3, '0') }}</span>
        </span>
        <span class="counter-sep">/</span>
        <span class="counter">
          <span class="counter-label">RX</span>
          <span class="counter-value">{{ String(rxCount).padStart(3, '0') }}</span>
        </span>
        <span class="counter-status">
          {{ loading ? '响应中…' : '就绪' }}
        </span>
      </div>
    </header>

    <div class="runtime-strip">
      <button
        v-for="stage in runtimeStages"
        :key="stage.key"
        type="button"
        class="runtime-stage"
        :class="{ hot: stage.hot, active: activeStage === stage.key }"
        @click="activeStage = activeStage === stage.key ? null : stage.key"
      >
        <i>{{ stage.no }}</i>
        {{ stage.label }}
      </button>
    </div>

    <section v-if="activeStageDetail" class="runtime-detail-card">
      <header>
        <span>{{ activeStageDetail.no }}</span>
        <strong>{{ activeStageDetail.title }}</strong>
        <button type="button" @click="activeStage = null">×</button>
      </header>
      <p>{{ activeStageDetail.description }}</p>
      <pre>{{ activeStageDetail.payload }}</pre>
    </section>

    <div v-if="suggestions.length" class="command-deck">
      <button
        v-for="suggestion in suggestions.slice(0, 4)"
        :key="suggestion"
        type="button"
        class="command-chip"
        :disabled="loading"
        @click="receivePrompt(suggestion)"
      >
        <span>RUN</span>
        {{ suggestion }}
      </button>
    </div>

    <ChatPanel
      class="console-chat"
      :messages="messages"
      :typing="loading"
      :placeholder="placeholder"
      :accent="color"
      @send="sendMessage"
    />

    <footer v-if="lastRuntimeMeta" class="runtime-meta">
      <div class="meta-chip">
        <span>Task</span>
        <strong>{{ lastRuntimeMeta.taskId }}</strong>
      </div>
      <div class="meta-chip" :class="`status-${lastRuntimeMeta.status.toLowerCase()}`">
        <span>Status</span>
        <strong>{{ lastRuntimeMeta.status }}</strong>
      </div>
      <div class="meta-chip">
        <span>Tools</span>
        <strong>{{ lastRuntimeMeta.tools || '0' }}</strong>
      </div>
      <div class="meta-chip">
        <span>RAG</span>
        <strong>{{ lastRuntimeMeta.references || '0' }}</strong>
      </div>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
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

.agent-console {
  --agent-accent: #{$primary-color};
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  isolation: isolate;
  border: 1px solid color-mix(in srgb, var(--agent-accent) 22%, rgba(11, 24, 42, 0.18));
  border-radius: 24px;
  background:
    radial-gradient(circle at 12% -8%, color-mix(in srgb, var(--agent-accent) 34%, transparent), transparent 34%),
    radial-gradient(circle at 92% 0%, rgba(255, 255, 255, 0.92), transparent 26%),
    linear-gradient(145deg, rgba(247, 250, 247, 0.96), rgba(231, 237, 231, 0.86) 48%, rgba(255, 255, 255, 0.94));
  box-shadow:
    0 28px 80px rgba(13, 27, 42, 0.16),
    0 1px 0 rgba(255, 255, 255, 0.7) inset;
  animation: consoleIn 0.7s 0.08s cubic-bezier(0.2, 0.8, 0.2, 1) both;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -2;
    background-image:
      linear-gradient(rgba(13, 27, 42, 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(13, 27, 42, 0.03) 1px, transparent 1px);
    background-size: 28px 28px;
    mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.75), transparent 70%);
  }

  &::after {
    content: '';
    position: absolute;
    inset: 10px;
    z-index: -1;
    pointer-events: none;
    border: 1px solid rgba(255, 255, 255, 0.62);
    border-radius: 18px;
  }
}

.console-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 16px 18px 14px;
  border-bottom: 1px solid rgba(13, 27, 42, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.3)),
    color-mix(in srgb, var(--agent-accent) 8%, transparent);
  backdrop-filter: blur(16px);
}

.console-meta {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 12px;
}

.agent-orb {
  position: relative;
  display: grid;
  flex: 0 0 46px;
  width: 46px;
  height: 46px;
  place-items: center;
  border-radius: 16px;
  background:
    radial-gradient(circle at 34% 24%, rgba(255, 255, 255, 0.92), transparent 23%),
    linear-gradient(135deg, color-mix(in srgb, var(--agent-accent) 88%, #0b182a), color-mix(in srgb, var(--agent-accent) 42%, #ffffff));
  box-shadow:
    0 18px 36px color-mix(in srgb, var(--agent-accent) 22%, transparent),
    0 0 0 1px rgba(255, 255, 255, 0.56) inset;

  &::after {
    content: '';
    position: absolute;
    inset: -5px;
    border: 1px solid color-mix(in srgb, var(--agent-accent) 35%, transparent);
    border-radius: 20px;
    animation: orbPulse 2.4s ease-in-out infinite;
  }
}

.orb-core {
  color: #fff;
  font-family: 'DIN Condensed', 'Arial Narrow', ui-sans-serif, sans-serif;
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  text-shadow: 0 1px 12px rgba(0, 0, 0, 0.24);
}

.console-led {
  display: inline-grid;
  gap: 4px;

  i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--agent-accent) 42%, white);
    box-shadow: 0 0 14px currentColor;

    &:first-child { color: #d95951; background: #d95951; }
    &:nth-child(2) { color: #d9a441; background: #d9a441; }
    &:last-child { color: #2f8f67; background: #2f8f67; }
  }
}

.console-title-block {
  display: grid;
  min-width: 0;
  gap: 4px;

  strong {
    overflow: hidden;
    color: #0d1b2a;
    font-size: 16px;
    font-weight: 900;
    letter-spacing: -0.02em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.console-path {
  overflow: hidden;
  color: rgba(13, 27, 42, 0.54);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10.5px;
  letter-spacing: 0.08em;
  text-overflow: ellipsis;
  white-space: nowrap;

  em {
    color: color-mix(in srgb, var(--agent-accent) 86%, #0d1b2a);
    font-style: normal;
    font-weight: 900;
  }
}

.console-counters {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border: 1px solid rgba(13, 27, 42, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.52);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.7) inset;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
}

.runtime-pill,
.counter-status {
  padding: 4px 8px;
  border-radius: 999px;
  font-weight: 900;
  letter-spacing: 0.1em;
}

.runtime-pill {
  color: rgba(13, 27, 42, 0.54);
  background: rgba(13, 27, 42, 0.06);

  &.active {
    color: #fff;
    background: linear-gradient(135deg, color-mix(in srgb, var(--agent-accent) 92%, #0d1b2a), var(--agent-accent));
    box-shadow: 0 8px 18px color-mix(in srgb, var(--agent-accent) 20%, transparent);
  }
}

.counter {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: rgba(13, 27, 42, 0.62);
}

.counter-label {
  color: rgba(13, 27, 42, 0.4);
  font-weight: 900;
}

.counter-value {
  color: #0d1b2a;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.counter-sep {
  color: rgba(13, 27, 42, 0.22);
}

.counter-status {
  color: color-mix(in srgb, var(--agent-accent) 86%, #0d1b2a);
  background: color-mix(in srgb, var(--agent-accent) 12%, white);
}

.runtime-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  padding: 12px 14px 0;
}

.runtime-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  gap: 7px;
  padding: 8px 6px;
  border: 1px solid rgba(13, 27, 42, 0.08);
  border-radius: 12px;
  color: rgba(13, 27, 42, 0.55);
  background: rgba(255, 255, 255, 0.48);
  cursor: pointer;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;

  i {
    color: color-mix(in srgb, var(--agent-accent) 70%, #0d1b2a);
    font-style: normal;
  }

  &.hot {
    color: #0d1b2a;
    border-color: color-mix(in srgb, var(--agent-accent) 28%, transparent);
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--agent-accent) 12%, white), rgba(255, 255, 255, 0.72));
    box-shadow: 0 8px 22px color-mix(in srgb, var(--agent-accent) 10%, transparent);
  }

  &.active,
  &:hover {
    transform: translateY(-1px);
    color: #0d1b2a;
    border-color: color-mix(in srgb, var(--agent-accent) 45%, transparent);
    background: color-mix(in srgb, var(--agent-accent) 14%, white);
    box-shadow: 0 10px 24px color-mix(in srgb, var(--agent-accent) 14%, transparent);
  }
}

.runtime-detail-card {
  margin: 10px 14px 0;
  padding: 12px;
  border: 1px solid color-mix(in srgb, var(--agent-accent) 24%, rgba(13, 27, 42, 0.1));
  border-radius: 16px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.84), color-mix(in srgb, var(--agent-accent) 7%, white));
  box-shadow: 0 14px 32px rgba(13, 27, 42, 0.08);

  header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 7px;

    span {
      padding: 2px 6px;
      border-radius: 999px;
      color: #fff;
      background: var(--agent-accent);
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 10px;
      font-weight: 900;
    }

    strong {
      flex: 1;
      color: #0d1b2a;
      font-size: 13px;
      font-weight: 900;
    }

    button {
      width: 22px;
      height: 22px;
      border: 0;
      border-radius: 50%;
      color: rgba(13, 27, 42, 0.62);
      background: rgba(13, 27, 42, 0.06);
      cursor: pointer;
    }
  }

  p {
    margin: 0 0 8px;
    color: rgba(13, 27, 42, 0.62);
    font-size: 12px;
  }

  pre {
    max-height: 108px;
    margin: 0;
    padding: 10px;
    overflow: auto;
    border: 1px solid rgba(13, 27, 42, 0.08);
    border-radius: 12px;
    color: #203047;
    background: rgba(248, 250, 252, 0.8);
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 11px;
    line-height: 1.55;
    white-space: pre-wrap;
  }
}

.command-deck {
  display: flex;
  gap: 8px;
  padding: 10px 14px 12px;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar { display: none; }
}

.command-chip {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 8px;
  max-width: 260px;
  padding: 8px 12px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--agent-accent) 18%, rgba(13, 27, 42, 0.12));
  border-radius: 999px;
  color: #243447;
  background: rgba(255, 255, 255, 0.62);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.7) inset;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;

  span {
    padding: 2px 5px;
    border-radius: 999px;
    color: #fff;
    background: var(--agent-accent);
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.08em;
  }

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--agent-accent) 42%, transparent);
    background: color-mix(in srgb, var(--agent-accent) 8%, white);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
}

.console-chat {
  flex: 1;
  min-height: 0;
  margin: 0 12px 12px;
  overflow: hidden;
  border: 1px solid rgba(13, 27, 42, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.42);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.72) inset;
}

.console-chat :deep(.chat-messages) {
  background-image:
    radial-gradient(circle at 16px 16px, rgba(13, 27, 42, 0.045) 1px, transparent 1px),
    linear-gradient(180deg, rgba(255, 255, 255, 0.25), transparent 42%);
  background-size: 22px 22px, 100% 100%;
}

.console-chat :deep(.message-bubble) {
  border-radius: 16px;
  box-shadow:
    0 10px 24px rgba(13, 27, 42, 0.06),
    0 1px 0 rgba(255, 255, 255, 0.72) inset;
}

.console-chat :deep(.agent .message-bubble) {
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--agent-accent) 9%, white), rgba(255, 255, 255, 0.94));
}

.console-chat :deep(.user .message-bubble) {
  background:
    linear-gradient(135deg, #0d1b2a, color-mix(in srgb, var(--agent-accent) 34%, #0d1b2a));
}

.console-chat :deep(.cmdline) {
  border-radius: 16px;
  border-color: color-mix(in srgb, var(--agent-accent) 18%, rgba(13, 27, 42, 0.16));
  background: rgba(255, 255, 255, 0.78);
}

.runtime-meta {
  display: grid;
  grid-template-columns: 1.6fr repeat(3, minmax(0, 0.8fr));
  gap: 8px;
  padding: 0 12px 12px;
}

.meta-chip {
  min-width: 0;
  padding: 9px 10px;
  border: 1px solid rgba(13, 27, 42, 0.08);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.56);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.7) inset;

  span,
  strong {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    margin-bottom: 4px;
    color: rgba(13, 27, 42, 0.42);
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  strong {
    color: #0d1b2a;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 10.5px;
  }
}

.status-completed strong {
  color: #2f8f67;
}

.status-failed strong {
  color: #d95951;
}

@keyframes consoleIn {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes orbPulse {
  0%, 100% {
    opacity: 0.45;
    transform: scale(1);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.08);
  }
}

@media (max-width: 900px) {
  .agent-console {
    height: 100%;
    min-height: 480px;
    border-radius: 18px;
  }

  .console-bar {
    grid-template-columns: 1fr;
  }

  .console-counters {
    justify-content: space-between;
  }

  .runtime-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .runtime-meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
