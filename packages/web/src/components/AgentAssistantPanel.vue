<template>
  <section class="agent-console" :style="{ '--agent-accent': color }">
    <header class="console-bar">
      <div class="console-meta">
        <span class="console-led">
          <i></i><i></i><i></i>
        </span>
        <span class="console-path">
          ~/opc/{{ shortCode }}/<em>copilot</em>
        </span>
      </div>
      <div class="console-counters">
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

    <ChatPanel
      class="console-chat"
      :messages="messages"
      :typing="loading"
      :placeholder="placeholder"
      :accent="color"
      @send="sendMessage"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ChatPanel from '@/components/ChatPanel.vue'
import { chatWithAgentType, type AgentChatType } from '@/api/agent'

interface Message {
  id: string
  role: 'user' | 'agent' | 'system'
  content: string
  timestamp: string
}

const props = withDefaults(
  defineProps<{
    type: AgentChatType
    title: string
    icon: string
    color?: string
    placeholder?: string
    suggestions?: string[]
  }>(),
  {
    color: '#155e52',
    placeholder: '直接向这个 Agent 描述你要处理的事情...',
    suggestions: () => [],
  },
)

const loading = ref(false)
const messages = ref<Message[]>([
  {
    id: crypto.randomUUID(),
    role: 'system',
    content: `${props.title} 已就绪。可以直接提问，也可以从左侧快捷命令发送。`,
    timestamp: currentTime(),
  },
])

const txCount = computed(() => messages.value.filter((m) => m.role === 'user').length)
const rxCount = computed(() => messages.value.filter((m) => m.role === 'agent').length)
const shortCode = computed(() => {
  const map: Partial<Record<AgentChatType, string>> = {
    FINANCE: 'finance',
    CUSTOMER_SERVICE: 'service',
    LEGAL: 'legal',
    ADMIN: 'admin',
  }
  return map[props.type] || 'agent'
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
    const res = await chatWithAgentType(props.type, message)
    messages.value.push({
      id: crypto.randomUUID(),
      role: 'agent',
      content: res.data.reply || '我暂时没有生成有效回复，请稍后再试。',
      timestamp: currentTime(),
    })
  } catch {
    messages.value.push({
      id: crypto.randomUUID(),
      role: 'agent',
      content: '这次没有连上 Agent 服务。你可以稍后重试，或者先在对应业务页面继续操作。',
      timestamp: currentTime(),
    })
  } finally {
    loading.value = false
  }
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
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(26, 36, 33, 0.1);
  border-radius: $border-radius-lg;
  box-shadow: $shadow-md;
  overflow: hidden;
  height: 560px;
  animation: consoleIn 0.7s 0.2s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.console-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 12px 18px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--agent-accent) 7%, white), rgba(255, 255, 255, 0.4)),
    rgba(247, 247, 243, 0.92);
  border-bottom: 1px solid rgba(26, 36, 33, 0.1);
}

.console-meta {
  display: flex;
  align-items: center;
  gap: 14px;
}

.console-led {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  i {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--agent-accent) 30%, white);
    box-shadow: inset 0 0 0 1px rgba(26, 36, 33, 0.1);

    &:first-child {
      background: #d95951;
    }
    &:nth-child(2) {
      background: #d9a441;
    }
    &:last-child {
      background: #2f8f67;
    }
  }
}

.console-path {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11.5px;
  color: $text-secondary;
  letter-spacing: 0.04em;

  em {
    font-style: normal;
    color: color-mix(in srgb, var(--agent-accent) 80%, $text-primary);
    font-weight: 700;
  }
}

.console-counters {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
}

.counter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: $text-secondary;
  letter-spacing: 0.06em;
}

.counter-label {
  font-weight: 700;
  color: $text-placeholder;
}

.counter-value {
  color: $text-primary;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.counter-sep {
  color: rgba(26, 36, 33, 0.25);
}

.counter-status {
  margin-left: 4px;
  padding: 3px 8px;
  font-weight: 700;
  font-size: 10px;
  letter-spacing: 0.12em;
  color: color-mix(in srgb, var(--agent-accent) 78%, $text-primary);
  background: color-mix(in srgb, var(--agent-accent) 8%, white);
  border: 1px solid color-mix(in srgb, var(--agent-accent) 22%, transparent);
  border-radius: 4px;
}

.console-chat {
  flex: 1;
  border: none;
  border-radius: $border-radius-md;
  background: transparent;
}

@keyframes consoleIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 900px) {
  .agent-console {
    height: 520px;
  }

  .console-bar {
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>