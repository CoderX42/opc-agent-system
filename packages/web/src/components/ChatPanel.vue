<template>
  <div class="chat-panel" :style="{ '--agent-accent': accent }">
    <!-- 消息列表 -->
    <div class="chat-messages" ref="messagesContainerRef">
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="message-item"
        :class="[msg.role, { 'is-pending': msg.id === lastSentId && msg.role === 'user' }]"
      >
        <div class="message-avatar" :class="msg.role">
          <span class="avatar-mark">
            <template v-if="msg.role === 'user'">我</template>
            <template v-else-if="msg.role === 'agent'">{{ agentInitial }}</template>
            <template v-else>·</template>
          </span>
        </div>
        <div class="message-body">
          <div class="message-meta">
            <span class="message-sender">{{ getSenderName(msg.role) }}</span>
            <span class="message-time">{{ msg.timestamp }}</span>
          </div>
          <div class="message-bubble" v-html="formatContent(msg.content)"></div>
        </div>
      </div>

      <transition name="typing">
        <div v-if="typing" class="typing-indicator">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="typing-label">{{ getSenderName('agent') }} 正在输入…</span>
        </div>
      </transition>
    </div>

    <!-- 输入命令行 -->
    <div class="chat-input-area">
      <div class="cmdline">
        <span class="prompt-arrow" aria-hidden="true">›</span>
        <textarea
          v-model="inputText"
          class="cmdline-input"
          :placeholder="placeholder"
          rows="1"
          @keydown.enter.exact.prevent="handleSend"
          @input="autoGrow"
        ></textarea>
        <div class="cmdline-actions">
          <span class="hint">Enter 发送 · Shift+Enter 换行</span>
          <button
            type="button"
            class="send-btn"
            :disabled="!inputText.trim()"
            @click="handleSend"
          >
            <span class="send-bracket">[</span>
            <span class="send-label">发 送</span>
            <span class="send-bracket">]</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, onMounted, computed } from 'vue'

interface ChatMessage {
  id: string
  role: 'user' | 'agent' | 'system'
  content: string
  timestamp: string
}

const props = withDefaults(
  defineProps<{
    messages?: ChatMessage[]
    placeholder?: string
    typing?: boolean
    accent?: string
  }>(),
  {
    messages: () => [],
    placeholder: '输入消息...',
    typing: false,
    accent: '#155e52',
  },
)

const emit = defineEmits<{
  send: [content: string]
}>()

const inputText = ref('')
const messagesContainerRef = ref<HTMLElement>()
const lastSentId = ref<string | null>(null)

const agentInitial = computed(() => 'AI')

function getSenderName(role: string) {
  const map: Record<string, string> = { user: 'YOU', agent: 'AGENT', system: 'SYSTEM' }
  return map[role] || role
}

function formatContent(content: string) {
  return content.replace(/\n/g, '<br/>')
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainerRef.value) {
      messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight
    }
  })
}

function autoGrow(e: Event) {
  const el = e.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}

function handleSend() {
  if (!inputText.value.trim()) return
  const text = inputText.value
  lastSentId.value = crypto.randomUUID()
  // 用一个临时的占位消息来表示刚发送的（不会渲染，仅用于动画）
  // 实际上真正的消息由父组件 push，我们仅记录「刚发送」用于下一条 user 消息的高亮
  emit('send', text)
  inputText.value = ''
  nextTick(() => {
    const ta = document.querySelector('.cmdline-input') as HTMLTextAreaElement | null
    if (ta) ta.style.height = 'auto'
  })
}

watch(
  () => props.messages,
  () => {
    scrollToBottom()
    // 把刚发出的那条 user 标记为 lastSent
    const lastUser = [...props.messages].reverse().find((m) => m.role === 'user')
    if (lastUser) lastSentId.value = lastUser.id
  },
  { deep: true },
)

onMounted(scrollToBottom)
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: transparent;
  overflow: hidden;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 22px;
  background-image:
    repeating-linear-gradient(
      0deg,
      transparent 0,
      transparent 31px,
      rgba(26, 36, 33, 0.04) 31px,
      rgba(26, 36, 33, 0.04) 32px
    );
  background-position: 0 14px;
  @include custom-scrollbar;
}

.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 18px;
  align-items: flex-start;

  &.user {
    flex-direction: row-reverse;
    text-align: right;

    .message-meta {
      justify-content: flex-end;
    }
  }

  &.system {
    opacity: 0.7;
  }

  &.is-pending {
    animation: pop 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
}

.message-avatar {
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(26, 36, 33, 0.1);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.6) inset;

  &.agent {
    background: color-mix(in srgb, var(--agent-accent) 12%, white);
    border-color: color-mix(in srgb, var(--agent-accent) 28%, transparent);
  }

  &.user {
    background: $text-primary;
    border-color: $text-primary;
  }

  &.system {
    background: rgba(26, 36, 33, 0.04);
  }
}

.avatar-mark {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: $text-secondary;

  .user & {
    color: white;
  }

  .agent & {
    color: color-mix(in srgb, var(--agent-accent) 86%, $text-primary);
  }
}

.message-body {
  max-width: 72%;
  min-width: 0;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
}

.message-sender {
  font-weight: 700;
  color: $text-secondary;
}

.user .message-sender {
  color: $text-primary;
}

.message-time {
  color: $text-placeholder;
  font-variant-numeric: tabular-nums;
}

.message-bubble {
  position: relative;
  padding: 11px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(26, 36, 33, 0.1);
  color: $text-primary;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
  text-align: left;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.6) inset;
}

.user .message-bubble {
  background: $text-primary;
  color: #f4f2ec;
  border-color: $text-primary;
}

.agent .message-bubble {
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--agent-accent) 5%, white), rgba(255, 255, 255, 0.95));
  border-color: color-mix(in srgb, var(--agent-accent) 22%, transparent);
}

.system .message-bubble {
  background: rgba(26, 36, 33, 0.04);
  border-color: rgba(26, 36, 33, 0.08);
  border-style: dashed;
  font-size: 12px;
  color: $text-secondary;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0 0 42px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10.5px;
  letter-spacing: 0.08em;
  color: $text-secondary;

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--agent-accent);
    animation: bounce 1.2s infinite ease-in-out;

    &:nth-child(2) {
      animation-delay: 0.15s;
    }
    &:nth-child(3) {
      animation-delay: 0.3s;
    }
  }

  .typing-label {
    margin-left: 6px;
  }
}

.typing-enter-active,
.typing-leave-active {
  transition: opacity 0.2s ease;
}
.typing-enter-from,
.typing-leave-to {
  opacity: 0;
}

// ============== 输入命令行 ==============
.chat-input-area {
  padding: 14px 18px 16px;
  background: rgba(255, 255, 255, 0.78);
  border-top: 1px solid rgba(26, 36, 33, 0.1);
  backdrop-filter: blur(8px);
}

.cmdline {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(26, 36, 33, 0.14);
  border-radius: 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus-within {
    border-color: color-mix(in srgb, var(--agent-accent) 50%, transparent);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--agent-accent) 10%, transparent);
  }
}

.prompt-arrow {
  display: none; // 在 flex row 时显示；这里用 column 布局
}

.cmdline-input {
  width: 100%;
  min-height: 28px;
  max-height: 160px;
  padding: 4px 2px;
  font-family: 'Inter Tight', -apple-system, 'PingFang SC', sans-serif;
  font-size: 14px;
  line-height: 1.55;
  color: $text-primary;
  background: transparent;
  border: none;
  outline: none;
  resize: none;

  &::placeholder {
    color: $text-placeholder;
    font-style: italic;
  }
}

.cmdline-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding-top: 4px;
  border-top: 1px dashed rgba(26, 36, 33, 0.1);
}

.hint {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  color: $text-placeholder;
}

.send-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: color-mix(in srgb, var(--agent-accent) 84%, $text-primary);
  background: color-mix(in srgb, var(--agent-accent) 8%, white);
  border: 1px solid color-mix(in srgb, var(--agent-accent) 30%, transparent);
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--agent-accent) 14%, white);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--agent-accent) 18%, transparent);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.send-bracket {
  color: color-mix(in srgb, var(--agent-accent) 50%, $text-placeholder);
}

// ============== 动画 ==============
@keyframes pop {
  0% {
    opacity: 0;
    transform: translateY(6px) scale(0.98);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  40% {
    transform: translateY(-5px);
    opacity: 1;
  }
}
</style>