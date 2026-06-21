<template>
  <section class="agent-assistant" :style="{ '--agent-color': color }">
    <div class="assistant-header">
      <div class="assistant-title">
        <span class="assistant-icon">
          <el-icon><component :is="icon" /></el-icon>
        </span>
        <div>
          <span class="assistant-kicker">AGENT COPILOT</span>
          <h3>{{ title }}</h3>
        </div>
      </div>
      <span class="assistant-status"><i></i> 可交互</span>
    </div>

    <div class="assistant-prompts">
      <button
        v-for="prompt in suggestions"
        :key="prompt"
        type="button"
        @click="sendMessage(prompt)"
      >
        {{ prompt }}
      </button>
    </div>

    <ChatPanel
      class="assistant-chat"
      :messages="messages"
      :typing="loading"
      :placeholder="placeholder"
      @send="sendMessage"
    />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ChatPanel from '@/components/ChatPanel.vue'
import { chatWithAgentType, type AgentChatType } from '@/api/agent'

interface Message {
  id: string
  role: 'user' | 'agent' | 'system'
  content: string
  timestamp: string
}

const props = withDefaults(defineProps<{
  type: AgentChatType
  title: string
  icon: string
  color?: string
  placeholder?: string
  suggestions?: string[]
}>(), {
  color: '#155e52',
  placeholder: '直接向这个 Agent 描述你要处理的事情...',
  suggestions: () => [],
})

const loading = ref(false)
const messages = ref<Message[]>([
  {
    id: crypto.randomUUID(),
    role: 'system',
    content: `${props.title} 已就绪。你可以直接提问，也可以点击上方快捷问题。`,
    timestamp: currentTime(),
  },
])

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
</script>

<style lang="scss" scoped>
.agent-assistant {
  margin-bottom: 20px;
  overflow: hidden;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--agent-color) 9%, white), rgba(255, 255, 255, 0.9)),
    $bg-white;
  border: 1px solid color-mix(in srgb, var(--agent-color) 16%, $border-light);
  border-radius: $border-radius-lg;
  box-shadow: $shadow-sm;
}

.assistant-header {
  @include flex-between;
  gap: 16px;
  padding: 18px 20px 12px;
}

.assistant-title {
  display: flex;
  align-items: center;
  gap: 12px;

  h3 {
    color: $text-primary;
    font-size: 17px;
    font-weight: 760;
  }
}

.assistant-icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  color: color-mix(in srgb, var(--agent-color) 78%, #0d211c);
  background: color-mix(in srgb, var(--agent-color) 12%, white);
  border-radius: 12px;
}

.assistant-kicker {
  display: block;
  margin-bottom: 2px;
  color: $text-secondary;
  font-size: 10px;
  font-weight: 760;
  letter-spacing: 0.1em;
}

.assistant-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: $text-secondary;
  font-size: 12px;
  font-weight: 700;

  i {
    width: 8px;
    height: 8px;
    background: $success-color;
    border-radius: 50%;
    box-shadow: 0 0 0 4px rgba(47, 143, 103, 0.1);
  }
}

.assistant-prompts {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 0 20px 14px;

  button {
    padding: 7px 10px;
    color: color-mix(in srgb, var(--agent-color) 74%, $text-primary);
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid color-mix(in srgb, var(--agent-color) 14%, $border-light);
    border-radius: 999px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 680;
    transition: background-color $transition-duration, transform $transition-duration;

    &:hover {
      background: color-mix(in srgb, var(--agent-color) 10%, white);
      transform: translateY(-1px);
    }
  }
}

.assistant-chat {
  height: 360px;
  border-right: 0;
  border-bottom: 0;
  border-left: 0;
  border-radius: 0;
}

@media (max-width: 900px) {
  .assistant-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .assistant-chat {
    height: 420px;
  }
}
</style>
