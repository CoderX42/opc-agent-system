<template>
  <div class="chat-panel" :style="{ '--agent-accent': accent }">
    <!-- 消息列表 -->
    <div class="chat-messages" ref="messagesContainerRef">
      <div v-if="!messages.length && !typing" class="message-skeleton" aria-hidden="true">
        <div class="skeleton-bubble skeleton-agent">
          <span class="skeleton-line w-70"></span>
          <span class="skeleton-line w-90"></span>
          <span class="skeleton-line w-50"></span>
        </div>
        <div class="skeleton-bubble skeleton-agent">
          <span class="skeleton-line w-85"></span>
          <span class="skeleton-line w-60"></span>
        </div>
      </div>
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
  return renderMarkdownCard(content)
}

function renderMarkdownCard(content: string) {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: string[] = []
  let paragraph: string[] = []

  function flushParagraph() {
    if (!paragraph.length) return
    blocks.push(`<p class="md-p">${paragraph.map(inlineMarkdown).join('<br/>')}</p>`)
    paragraph = []
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      flushParagraph()
      continue
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(trimmed)
    if (heading) {
      flushParagraph()
      const level = Math.min(heading[1].length, 4)
      blocks.push(`<h${level} class="md-h md-h${level}">${inlineMarkdown(heading[2])}</h${level}>`)
      continue
    }

    if (/^---+$/.test(trimmed)) {
      flushParagraph()
      blocks.push('<hr class="md-hr"/>')
      continue
    }

    if (isMarkdownTableStart(lines, index)) {
      flushParagraph()
      const tableLines: string[] = [lines[index], lines[index + 1]]
      index += 2
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        tableLines.push(lines[index])
        index += 1
      }
      index -= 1
      blocks.push(renderTable(tableLines))
      continue
    }

    if (/^>\s?/.test(trimmed)) {
      flushParagraph()
      const quoteLines = [trimmed.replace(/^>\s?/, '')]
      while (index + 1 < lines.length && /^>\s?/.test(lines[index + 1].trim())) {
        index += 1
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ''))
      }
      blocks.push(`<blockquote class="md-quote">${quoteLines.map(inlineMarkdown).join('<br/>')}</blockquote>`)
      continue
    }

    if (/^[-*]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) {
      flushParagraph()
      const ordered = /^\d+[.)]\s+/.test(trimmed)
      const items: string[] = []
      while (index < lines.length) {
        const item = lines[index].trim()
        const match = ordered ? /^\d+[.)]\s+(.+)$/.exec(item) : /^[-*]\s+(.+)$/.exec(item)
        if (!match) break
        items.push(`<li>${inlineMarkdown(match[1])}</li>`)
        index += 1
      }
      index -= 1
      blocks.push(`<${ordered ? 'ol' : 'ul'} class="md-list">${items.join('')}</${ordered ? 'ol' : 'ul'}>`)
      continue
    }

    paragraph.push(line)
  }

  flushParagraph()
  return `<div class="feishu-md-card">${blocks.join('')}</div>`
}

function isMarkdownTableStart(lines: string[], index: number) {
  const current = lines[index]?.trim()
  const next = lines[index + 1]?.trim()
  return Boolean(
    current?.startsWith('|') &&
    next?.startsWith('|') &&
    /^\|?[\s:-]+(\|[\s:-]+)+\|?$/.test(next),
  )
}

function renderTable(lines: string[]) {
  const rows = lines.map(splitTableRow)
  const header = rows[0] || []
  const body = rows.slice(2)
  return `
    <div class="md-table-wrap">
      <table class="md-table">
        <thead><tr>${header.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join('')}</tr></thead>
        <tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>
  `
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function inlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|\s)\*([^*]+)\*/g, '$1<em>$2</em>')
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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
  max-width: min(86%, 760px);
  min-width: 0;
}

.user .message-body {
  max-width: min(76%, 620px);
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
  padding: 13px 15px;
  border-radius: 16px;
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
    linear-gradient(180deg, color-mix(in srgb, var(--agent-accent) 4%, white), rgba(255, 255, 255, 0.98));
  border-color: color-mix(in srgb, var(--agent-accent) 22%, transparent);
  box-shadow:
    0 18px 46px rgba(15, 23, 42, 0.08),
    0 1px 0 rgba(255, 255, 255, 0.75) inset;
}

.agent .message-bubble::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  border-radius: 16px 0 0 16px;
  background: linear-gradient(180deg, var(--agent-accent), color-mix(in srgb, var(--agent-accent) 34%, white));
}

.agent .message-bubble :deep(.feishu-md-card) {
  display: grid;
  gap: 10px;
}

.message-bubble :deep(.md-p) {
  margin: 0;
  color: #243447;
}

.message-bubble :deep(.md-h) {
  position: relative;
  margin: 6px 0 2px;
  color: #17233d;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.message-bubble :deep(.md-h1) {
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--agent-accent) 18%, rgba(23, 35, 61, 0.08));
  border-radius: 14px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--agent-accent) 10%, white), rgba(255, 255, 255, 0.86));
  font-size: 18px;
}

.message-bubble :deep(.md-h2) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 4px;
  font-size: 15px;
}

.message-bubble :deep(.md-h2::before) {
  content: '';
  width: 7px;
  height: 18px;
  border-radius: 999px;
  background: var(--agent-accent);
}

.message-bubble :deep(.md-h3),
.message-bubble :deep(.md-h4) {
  font-size: 14px;
}

.message-bubble :deep(.md-hr) {
  width: 100%;
  height: 1px;
  margin: 2px 0;
  border: 0;
  background: linear-gradient(90deg, transparent, rgba(23, 35, 61, 0.16), transparent);
}

.message-bubble :deep(.md-list) {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 10px 12px 10px 30px;
  border: 1px solid rgba(23, 35, 61, 0.08);
  border-radius: 13px;
  background: rgba(248, 250, 252, 0.72);
}

.message-bubble :deep(.md-list li) {
  padding-left: 2px;
}

.message-bubble :deep(.md-quote) {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-left: 4px solid #f59e0b;
  border-radius: 12px;
  color: #7a4b00;
  background: linear-gradient(135deg, rgba(255, 251, 235, 0.98), rgba(255, 255, 255, 0.86));
}

.message-bubble :deep(.md-table-wrap) {
  overflow: auto;
  border: 1px solid rgba(23, 35, 61, 0.1);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
}

.message-bubble :deep(.md-table) {
  width: 100%;
  min-width: 520px;
  border-collapse: collapse;
  font-size: 13px;
}

.message-bubble :deep(.md-table th) {
  padding: 10px 12px;
  color: #17233d;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--agent-accent) 10%, white), #f8fafc);
  border-bottom: 1px solid rgba(23, 35, 61, 0.1);
  font-weight: 900;
  text-align: left;
  white-space: nowrap;
}

.message-bubble :deep(.md-table td) {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(23, 35, 61, 0.07);
  color: #344256;
  vertical-align: top;
}

.message-bubble :deep(.md-table tr:last-child td) {
  border-bottom: 0;
}

.message-bubble :deep(.md-table tbody tr:hover) {
  background: color-mix(in srgb, var(--agent-accent) 5%, white);
}

.message-bubble :deep(.md-code) {
  padding: 2px 5px;
  border-radius: 6px;
  color: color-mix(in srgb, var(--agent-accent) 78%, #17233d);
  background: color-mix(in srgb, var(--agent-accent) 10%, white);
  border: 1px solid color-mix(in srgb, var(--agent-accent) 18%, transparent);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.92em;
}

.message-bubble :deep(strong) {
  color: #17233d;
  font-weight: 900;
}

.system .message-bubble {
  background: rgba(26, 36, 33, 0.04);
  border-color: rgba(26, 36, 33, 0.08);
  border-style: dashed;
  font-size: 12px;
  color: $text-secondary;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}

.message-skeleton {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0 0;
}

.skeleton-bubble {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  max-width: 78%;
  border-radius: 12px 12px 12px 4px;
  background: rgba(8, 37, 88, 0.06);
  border: 1px solid rgba(8, 37, 88, 0.05);
}

.skeleton-line {
  display: block;
  height: 10px;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    rgba(8, 37, 88, 0.08) 0%,
    rgba(8, 37, 88, 0.16) 50%,
    rgba(8, 37, 88, 0.08) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.4s linear infinite;
}

.skeleton-line.w-50 { width: 50%; }
.skeleton-line.w-60 { width: 60%; }
.skeleton-line.w-70 { width: 70%; }
.skeleton-line.w-85 { width: 85%; }
.skeleton-line.w-90 { width: 90%; }

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
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
