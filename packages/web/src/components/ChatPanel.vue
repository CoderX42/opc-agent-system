<template>
  <div class="chat-panel" :style="{ '--agent-accent': accent }">
    <!-- 消息流:蓝图纸底 -->
    <div class="chat-messages" ref="messagesContainerRef">
      <!-- 装订线 -->
      <div class="binding-line" aria-hidden="true"></div>
      <div class="binding-holes" aria-hidden="true">
        <span v-for="n in 18" :key="n"></span>
      </div>

      <!-- 空态:工作室的「第一页」 -->
      <div v-if="!messages.length && !typing" class="empty-cover">
        <div class="empty-corner empty-corner-tl">┌</div>
        <div class="empty-corner empty-corner-tr">┐</div>
        <div class="empty-corner empty-corner-bl">└</div>
        <div class="empty-corner empty-corner-br">┘</div>
        <div class="empty-stamp">BLUEPRINT&nbsp;·&nbsp;{{ blueprintCode }}</div>
        <h2 class="empty-title">卷宗空白,等待第一笔记录</h2>
        <p class="empty-sub">{{ emptyHint }}</p>
        <div class="empty-rule"></div>
        <div class="empty-meta">
          <span>№ 0001</span>
          <span class="empty-dot">·</span>
          <span>在岗 {{ agentInitial }}</span>
          <span class="empty-dot">·</span>
          <span>{{ formattedNow }}</span>
        </div>
      </div>

      <!-- 消息条目 -->
      <article
        v-for="(msg, index) in messages"
        :key="msg.id"
        class="message"
        :class="['role-' + msg.role, { 'is-pending': msg.id === lastSentId && msg.role === 'user' }]"
        :style="{ animationDelay: `${Math.min(index * 0.04, 0.32)}s` }"
      >
        <div class="line-no">{{ String(index + 1).padStart(2, '0') }}</div>

        <div class="message-card">
          <!-- Agent 消息:传输带 -->
          <header v-if="msg.role === 'agent'" class="card-header agent-header">
            <span class="signal-dot" aria-hidden="true"></span>
            <span class="sender-code">{{ getSenderName('agent') }}</span>
            <span class="timestamp">{{ msg.timestamp }}</span>
            <span class="card-corner tl">┌</span>
            <span class="card-corner tr">┐</span>
          </header>

          <!-- 用户消息:便签头 -->
          <header v-if="msg.role === 'user'" class="card-header user-header">
            <span class="pin" aria-hidden="true">
              <span class="pin-hole"></span>
            </span>
            <span class="sender-code">{{ getSenderName('user') }}</span>
            <span class="timestamp">{{ msg.timestamp }}</span>
          </header>

          <!-- 系统消息:条形戳 -->
          <header v-if="msg.role === 'system'" class="card-header system-header">
            <span class="sys-tag">SYSTEM</span>
            <span class="timestamp">{{ msg.timestamp }}</span>
          </header>

          <!-- 正文 -->
          <div class="card-body" v-html="formatContent(msg.content)"></div>
        </div>
      </article>

      <!-- Typing:扫描线 -->
      <transition name="decode">
        <div v-if="typing" class="decoding" aria-live="polite">
          <div class="scan-line" aria-hidden="true"></div>
          <div class="decode-row">
            <span class="line-no decode-no">··</span>
            <div class="decode-card">
              <header class="card-header agent-header">
                <span class="signal-dot" aria-hidden="true"></span>
                <span class="sender-code">{{ getSenderName('agent') }}</span>
                <span class="timestamp">decoding</span>
                <span class="card-corner tl">┌</span>
                <span class="card-corner tr">┐</span>
              </header>
              <div class="decode-text">
                <span>D</span><span>E</span><span>C</span><span>O</span><span>D</span><span>I</span><span>N</span><span>G</span>
                <span class="decode-dot"></span>
                <span class="decode-dot"></span>
                <span class="decode-dot"></span>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- 输入:工作台 -->
    <div class="chat-input-area">
      <div class="workbench">
        <div class="bench-ruler" aria-hidden="true">
          <span v-for="n in 24" :key="n" :class="{ 'is-mark': n % 4 === 0 }">{{ n % 4 === 0 ? n : '·' }}</span>
        </div>

        <div class="cmdline">
          <span class="prompt-sigil" aria-hidden="true">§</span>
          <textarea
            ref="textareaRef"
            v-model="inputText"
            class="cmdline-input"
            :placeholder="placeholder"
            rows="1"
            @keydown.enter.exact.prevent="handleSend"
            @input="autoGrow"
          ></textarea>
          <div class="cmdline-foot">
            <div class="meta-strip">
              <span class="meta-cell">
                <em>LEN</em>
                <strong>{{ inputLength }}</strong>
              </span>
              <span class="meta-cell">
                <em>LN</em>
                <strong>{{ lineCount }}</strong>
              </span>
              <span class="meta-cell hint">↵ 发送 · ⇧↵ 换行</span>
            </div>
            <button
              type="button"
              class="send-btn"
              :disabled="!inputText.trim()"
              :aria-label="inputText.trim() ? '提交问题' : '请先输入'"
              @click="handleSend"
            >
              <span class="send-key" aria-hidden="true">
                <span class="key-base"></span>
                <span class="key-top"></span>
              </span>
              <span class="send-label">送 出</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, onMounted, computed, onBeforeUnmount } from 'vue'
import { renderMarkdown } from '@/utils/markdown'

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
    emptyHint?: string
  }>(),
  {
    messages: () => [],
    placeholder: '在这里写下你的问题…',
    typing: false,
    accent: '#1677ff',
    emptyHint: '把任务交给值班 Agent,它会在这里写回处理记录。',
  },
)

const emit = defineEmits<{
  send: [content: string]
}>()

const inputText = ref('')
const messagesContainerRef = ref<HTMLElement>()
const textareaRef = ref<HTMLTextAreaElement>()
const lastSentId = ref<string | null>(null)
const now = ref(new Date())

let nowTimer: number | null = null

const agentInitial = computed(() => 'AI')
const inputLength = computed(() => Array.from(inputText.value).length)
const lineCount = computed(() => Math.max(1, inputText.value.split('\n').length))
const formattedNow = computed(() => formatNow(now.value))
const blueprintCode = computed(() => formatBlueprint(now.value))

function pad(n: number) { return String(n).padStart(2, '0') }
function formatNow(d: Date) {
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function formatBlueprint(d: Date) {
  // 24小时制时:分 + 当日年内第几天
  const start = new Date(d.getFullYear(), 0, 0)
  const day = Math.floor((d.getTime() - start.getTime()) / 86400000)
  return `${pad(d.getHours())}${pad(d.getMinutes())}-D${String(day).padStart(3, '0')}`
}

function getSenderName(role: string) {
  const map: Record<string, string> = { user: 'YOU·自', agent: 'AGENT·值', system: 'SYS' }
  return map[role] || role
}

function formatContent(content: string) {
  return renderMarkdown(content)
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainerRef.value) {
      messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight
    }
  })
}

function autoGrow(e?: Event) {
  const el = (e?.target as HTMLTextAreaElement) || textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 180) + 'px'
}

function handleSend() {
  if (!inputText.value.trim()) return
  const text = inputText.value
  lastSentId.value = crypto.randomUUID()
  emit('send', text)
  inputText.value = ''
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto'
      textareaRef.value.focus()
    }
  })
}

watch(
  () => props.messages,
  () => {
    scrollToBottom()
    const lastUser = [...props.messages].reverse().find((m) => m.role === 'user')
    if (lastUser) lastSentId.value = lastUser.id
  },
  { deep: true },
)

onMounted(() => {
  scrollToBottom()
  nowTimer = window.setInterval(() => { now.value = new Date() }, 30_000)
  // 自动聚焦
  nextTick(() => textareaRef.value?.focus())
})

onBeforeUnmount(() => {
  if (nowTimer) clearInterval(nowTimer)
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: transparent;
  overflow: hidden;
  font-family: var(--font-body, 'Source Serif 4', 'Noto Serif SC', Georgia, serif);
}

// ============== 消息流:蓝图纸 ==============
.chat-messages {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 18px 20px 18px 56px;
  scroll-behavior: smooth;
  background-color: #fbfaf3;
  background-image:
    // 蓝图方格
    linear-gradient(rgba(13, 71, 161, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(13, 71, 161, 0.045) 1px, transparent 1px),
    // 装订孔竖向微纹理
    linear-gradient(90deg, rgba(184, 137, 58, 0.04) 1px, transparent 1px);
  background-size: 24px 24px, 24px 24px, 96px 100%;
  background-position: 0 0, 0 0, 28px 0;
  // 暖噪点(SVG noise)
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.35;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.06  0 0 0 0 0.05  0 0 0 0 0.02  0 0 0 0.06 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
    mix-blend-mode: multiply;
  }
  @include custom-scrollbar;
}

// 装订线(中偏左)
.binding-line {
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: 38px;
  width: 0;
  border-left: 1px dashed rgba(184, 137, 58, 0.42);
  pointer-events: none;
}

.binding-holes {
  position: absolute;
  top: 28px;
  bottom: 28px;
  left: 22px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;

  span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(184, 137, 58, 0.18);
    box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.18);
  }
}

// ============== 空态:第一页 ==============
.empty-cover {
  position: relative;
  margin: 12px 0 24px;
  padding: 36px 32px 28px;
  border: 1px solid rgba(13, 71, 161, 0.12);
  background: rgba(255, 255, 255, 0.6);
  text-align: center;
  isolation: isolate;
}

.empty-corner {
  position: absolute;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 16px;
  color: color-mix(in srgb, var(--agent-accent) 60%, #082558);
  opacity: 0.55;

  &-tl { top: 6px; left: 8px; }
  &-tr { top: 6px; right: 8px; }
  &-bl { bottom: 6px; left: 8px; }
  &-br { bottom: 6px; right: 8px; }
}

.empty-stamp {
  display: inline-block;
  padding: 2px 8px;
  border: 1px solid rgba(184, 137, 58, 0.5);
  color: #8a5a18;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.18em;
  transform: rotate(-1.5deg);
}

.empty-title {
  margin: 14px 0 6px;
  font-size: 22px;
  font-weight: 600;
  font-style: italic;
  letter-spacing: -0.01em;
  color: #082558;
}

.empty-sub {
  margin: 0 auto 18px;
  max-width: 380px;
  font-size: 13px;
  line-height: 1.6;
  color: #3c5578;
  font-style: italic;
}

.empty-rule {
  width: 64px;
  height: 1px;
  margin: 0 auto 14px;
  background: linear-gradient(90deg, transparent, rgba(184, 137, 58, 0.5), transparent);
}

.empty-meta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.06em;
  color: #6f86a6;
}

.empty-dot { color: rgba(184, 137, 58, 0.6); }

// ============== 消息条目 ==============
.message {
  position: relative;
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr);
  gap: 14px;
  margin: 0 0 22px;
  animation: cardIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both;

  &.role-user {
    grid-template-columns: minmax(0, 1fr) 26px;
    .line-no { order: 2; text-align: right; }
    .message-card { order: 1; }
  }

  &.is-pending .message-card { animation: noteIn 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
}

.line-no {
  align-self: flex-start;
  padding-top: 8px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #6f86a6;
  font-variant-numeric: tabular-nums;
  user-select: none;
}

.role-user .line-no { color: #b8893a; }

.message-card {
  position: relative;
  min-width: 0;
  max-width: min(82%, 720px);
  padding: 0;
  background: transparent;
  border: none;
}

.role-user .message-card {
  max-width: min(70%, 560px);
  justify-self: end;
  transform: rotate(-0.4deg);
  transform-origin: top right;
}

// ============== 卡片头 ==============
.card-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 22px;
  padding: 0 8px 0 10px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.agent-header {
  color: #082558;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--agent-accent) 14%, transparent), color-mix(in srgb, var(--agent-accent) 0%, transparent) 60%);
  border-bottom: 1px solid color-mix(in srgb, var(--agent-accent) 28%, rgba(13, 71, 161, 0.18));
}

.signal-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--agent-accent);
  box-shadow: 0 0 8px var(--agent-accent);
  animation: signalPulse 1.6s ease-in-out infinite;
}

.sender-code { color: color-mix(in srgb, var(--agent-accent) 84%, #082558); }
.timestamp {
  margin-left: auto;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: #6f86a6;
  text-transform: none;
  font-variant-numeric: tabular-nums;
}

.card-corner {
  position: absolute;
  top: 100%;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  line-height: 1;
  color: color-mix(in srgb, var(--agent-accent) 50%, #082558);
  transform: translateY(-1px);

  &.tl { left: -1px; }
  &.tr { right: -1px; }
}

// 用户头:便签样式
.user-header {
  color: #5a4318;
  background: linear-gradient(180deg, #f7eed8 0%, #f1e6c4 100%);
  border-bottom: 1px dashed rgba(184, 137, 58, 0.5);
  border-radius: 2px 2px 0 0;
}

.user-header .sender-code { color: #8a5a18; }
.user-header .timestamp { color: rgba(138, 90, 24, 0.7); }

.pin {
  position: relative;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #fff 0%, #c44a3f 35%, #8a2a1f 100%);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
  flex: 0 0 10px;
}

.pin-hole {
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.4);
}

// 系统头
.system-header {
  color: #6f86a6;
  background: rgba(111, 134, 166, 0.08);
  border-bottom: 1px dashed rgba(111, 134, 166, 0.3);
}

.sys-tag {
  padding: 1px 5px;
  background: #6f86a6;
  color: #fff;
  font-size: 8.5px;
  border-radius: 2px;
}

// ============== 正文 ==============
.card-body {
  position: relative;
  padding: 12px 14px 14px;
  font-size: 14.5px;
  line-height: 1.7;
  color: #1a1810;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(13, 71, 161, 0.12);
  border-top: none;
  border-radius: 0 0 2px 2px;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.6) inset,
    0 8px 24px -16px rgba(13, 71, 161, 0.18);
  font-family: var(--font-body, 'Source Serif 4', 'Noto Serif SC', Georgia, serif);
  font-style: italic;
}

.role-agent .card-body {
  background: rgba(255, 255, 255, 0.88);
  border-color: color-mix(in srgb, var(--agent-accent) 22%, rgba(13, 71, 161, 0.12));
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.7) inset,
    0 12px 28px -16px color-mix(in srgb, var(--agent-accent) 28%, transparent);
}

.role-agent .card-body::before {
  // 印章点(右下角)
  content: '';
  position: absolute;
  right: 10px;
  bottom: 8px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background:
    radial-gradient(circle, color-mix(in srgb, var(--agent-accent) 28%, transparent) 0%, transparent 70%);
  pointer-events: none;
}

.role-user .card-body {
  background: linear-gradient(180deg, #fffdf3 0%, #faf1d6 100%);
  border: 1px solid rgba(184, 137, 58, 0.35);
  border-top: none;
  color: #3a2810;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.6) inset,
    0 14px 28px -18px rgba(184, 137, 58, 0.5);
  font-style: normal;
  font-weight: 500;
}

.role-user .card-body::before {
  // 便签折角
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 18px;
  height: 18px;
  background: linear-gradient(225deg, #fbfaf3 50%, rgba(184, 137, 58, 0.25) 50%);
  box-shadow: -1px 1px 0 rgba(184, 137, 58, 0.18);
}

.role-system .card-body {
  background: rgba(111, 134, 166, 0.06);
  border: 1px dashed rgba(111, 134, 166, 0.3);
  border-top: none;
  color: #6f86a6;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  font-style: normal;
}

// ============== Markdown 渲染 ==============
.card-body :deep(.atelier-md) {
  display: grid;
  gap: 10px;
}

.card-body :deep(.md-p) {
  margin: 0;
  color: inherit;
}

.card-body :deep(.md-h) {
  position: relative;
  margin: 6px 0 2px;
  font-style: normal;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #082558;
}

.card-body :deep(.md-h1) {
  display: inline-block;
  padding: 6px 14px;
  font-size: 18px;
  border-bottom: 2px solid color-mix(in srgb, var(--agent-accent) 60%, transparent);
}

.card-body :deep(.md-h2) {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15.5px;
}

.card-body :deep(.md-h2::before) {
  content: '§';
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 13px;
  color: var(--agent-accent);
}

.card-body :deep(.md-h3),
.card-body :deep(.md-h4) {
  font-size: 14px;
  color: color-mix(in srgb, var(--agent-accent) 70%, #082558);
}

.card-body :deep(.md-hr) {
  width: 100%;
  height: 1px;
  margin: 4px 0;
  border: 0;
  background: linear-gradient(90deg, transparent, rgba(13, 71, 161, 0.16), transparent);
}

.card-body :deep(.md-list) {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 4px 0 4px 22px;
  font-style: normal;
}

.card-body :deep(.md-list li) {
  padding-left: 2px;
}

.card-body :deep(.md-quote) {
  position: relative;
  margin: 0;
  padding: 8px 12px 8px 22px;
  color: #5a4318;
  font-style: italic;
  border-left: 3px double rgba(184, 137, 58, 0.5);
  background: rgba(247, 238, 216, 0.4);
}

.card-body :deep(.md-quote::before) {
  content: '“';
  position: absolute;
  left: 6px;
  top: 2px;
  font-size: 18px;
  line-height: 1;
  color: rgba(184, 137, 58, 0.7);
}

.card-body :deep(.md-table-wrap) {
  overflow: auto;
  border: 1px solid rgba(13, 71, 161, 0.16);
  background: #fff;
  font-style: normal;
}

.card-body :deep(.md-table) {
  width: 100%;
  min-width: 480px;
  border-collapse: collapse;
  font-size: 13px;
}

.card-body :deep(.md-table th) {
  padding: 8px 12px;
  color: #082558;
  background: color-mix(in srgb, var(--agent-accent) 6%, #fff);
  border-bottom: 1px solid rgba(13, 71, 161, 0.18);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
}

.card-body :deep(.md-table td) {
  padding: 8px 12px;
  border-bottom: 1px solid rgba(13, 71, 161, 0.08);
  color: #2a3a52;
  font-style: normal;
  vertical-align: top;
}

.card-body :deep(.md-table tr:last-child td) { border-bottom: 0; }
.card-body :deep(.md-table tbody tr:nth-child(even)) {
  background: rgba(13, 71, 161, 0.025);
}

.card-body :deep(.md-code) {
  padding: 1px 6px;
  border: 1px solid rgba(13, 71, 161, 0.18);
  color: #082558;
  background: rgba(13, 71, 161, 0.06);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.88em;
  font-style: normal;
}

.card-body :deep(strong) {
  color: #082558;
  font-weight: 700;
  font-style: normal;
}

.card-body :deep(em) { color: color-mix(in srgb, var(--agent-accent) 78%, #082558); }

// ============== 加载:解码 ==============
.decoding {
  position: relative;
  margin: 0 0 18px;
  overflow: hidden;
  animation: cardIn 0.4s ease both;
}

.scan-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 30%;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--agent-accent) 18%, transparent) 50%, transparent);
  animation: scan 1.6s ease-in-out infinite;
  pointer-events: none;
}

.decode-row {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr);
  gap: 14px;
}

.decode-no {
  padding-top: 8px;
  color: var(--agent-accent);
  text-align: right;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.decode-card {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid color-mix(in srgb, var(--agent-accent) 18%, rgba(13, 71, 161, 0.12));
  border-radius: 0 0 2px 2px;
  box-shadow: 0 12px 24px -16px color-mix(in srgb, var(--agent-accent) 22%, transparent);
}

.decode-text {
  display: flex;
  align-items: baseline;
  gap: 4px;
  padding: 14px 16px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.32em;
  color: color-mix(in srgb, var(--agent-accent) 60%, #082558);

  span:not(.decode-dot) {
    display: inline-block;
    animation: glyph 1.2s ease-in-out infinite;
  }
  span:nth-child(2) { animation-delay: 0.08s; }
  span:nth-child(3) { animation-delay: 0.16s; }
  span:nth-child(4) { animation-delay: 0.24s; }
  span:nth-child(5) { animation-delay: 0.32s; }
  span:nth-child(6) { animation-delay: 0.4s; }
  span:nth-child(7) { animation-delay: 0.48s; }
  span:nth-child(8) { animation-delay: 0.56s; }
}

.decode-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  margin-left: 2px;
  animation: bounce 1.2s infinite ease-in-out;
}
.decode-dot:nth-child(10) { animation-delay: 0.15s; }
.decode-dot:nth-child(11) { animation-delay: 0.3s; }

.decode-enter-active, .decode-leave-active {
  transition: opacity 0.2s ease, transform 0.25s ease;
}
.decode-enter-from, .decode-leave-to { opacity: 0; transform: translateY(4px); }

// ============== 输入:工作台 ==============
.chat-input-area {
  position: relative;
  padding: 12px 18px 14px 64px;
  background: linear-gradient(180deg, #f7f3e8 0%, #efe6ce 100%);
  border-top: 1px solid rgba(184, 137, 58, 0.4);
  box-shadow: 0 -10px 24px -16px rgba(13, 71, 161, 0.18);
}

.workbench {
  position: relative;
}

.bench-ruler {
  display: flex;
  gap: 1px;
  height: 14px;
  padding: 0 2px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 8px;
  color: #b8893a;
  letter-spacing: 0.04em;
  user-select: none;

  span {
    flex: 1 1 0;
    text-align: center;
    line-height: 14px;
  }
  span.is-mark { color: #8a5a18; font-weight: 700; }
}

.cmdline {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px 8px;
  background: #fffdf3;
  border: 1px solid rgba(184, 137, 58, 0.42);
  border-radius: 2px;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.7) inset,
    0 8px 18px -12px rgba(13, 71, 161, 0.16);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(13, 71, 161, 0.04) 1px, transparent 1px);
    background-size: 100% 22px;
    pointer-events: none;
  }

  &:focus-within {
    border-color: color-mix(in srgb, var(--agent-accent) 60%, #b8893a);
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--agent-accent) 12%, transparent),
      0 1px 0 rgba(255, 255, 255, 0.7) inset;
  }
}

.prompt-sigil {
  position: absolute;
  left: -28px;
  top: 12px;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  font-family: 'Source Serif 4', 'Noto Serif SC', Georgia, serif;
  font-size: 18px;
  font-weight: 700;
  color: #8a5a18;
  border: 1px solid rgba(184, 137, 58, 0.5);
  border-radius: 2px;
  background: #fffdf3;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  transform: rotate(-3deg);
}

.cmdline-input {
  position: relative;
  width: 100%;
  min-height: 32px;
  max-height: 180px;
  padding: 4px 2px 0;
  font-family: var(--font-body, 'Source Serif 4', 'Noto Serif SC', Georgia, serif);
  font-size: 15px;
  line-height: 22px;
  color: #2a3a52;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  z-index: 1;

  &::placeholder {
    color: rgba(138, 90, 24, 0.5);
    font-style: italic;
  }
}

.cmdline-foot {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding-top: 6px;
  border-top: 1px dashed rgba(184, 137, 58, 0.4);
  z-index: 1;
}

.meta-strip {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.meta-cell {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  color: #8a5a18;

  em {
    font-style: normal;
    letter-spacing: 0.1em;
    color: rgba(138, 90, 24, 0.6);
  }
  strong {
    font-weight: 700;
    color: #5a4318;
    font-variant-numeric: tabular-nums;
  }
}

.meta-cell.hint {
  font-family: var(--font-body, serif);
  font-size: 11px;
  font-style: italic;
  color: rgba(138, 90, 24, 0.7);
  letter-spacing: 0;
}

.send-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px 6px 8px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #fff;
  background: linear-gradient(180deg, #082558 0%, #051a3e 100%);
  border: 1px solid #082558;
  border-radius: 2px;
  cursor: pointer;
  text-transform: uppercase;
  transition: transform 0.15s ease, box-shadow 0.18s ease, background 0.18s ease;

  .send-key {
    position: relative;
    width: 14px;
    height: 14px;
    display: inline-block;
  }
  .key-base {
    position: absolute;
    left: 4px;
    right: 4px;
    bottom: 0;
    height: 7px;
    background: linear-gradient(180deg, #b8893a, #8a5a18);
    border-radius: 1px 1px 2px 2px;
  }
  .key-top {
    position: absolute;
    left: 2px;
    right: 2px;
    top: 0;
    height: 8px;
    background: linear-gradient(180deg, #f0d791, #c8943a);
    border-radius: 50% 50% 1px 1px / 60% 60% 1px 1px;
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.4) inset;
  }

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    background: linear-gradient(180deg, #0a2e6b 0%, #082558 100%);
    box-shadow: 0 8px 18px -8px rgba(8, 37, 88, 0.5);

    .key-top { transform: translateY(1px); }
  }

  &:disabled {
    opacity: 0.42;
    cursor: not-allowed;
    background: linear-gradient(180deg, #6f86a6, #4a6080);
    border-color: #4a6080;
  }
}

// ============== 动画 ==============
@keyframes cardIn {
  0% { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes noteIn {
  0% { opacity: 0; transform: rotate(-0.4deg) translateY(8px) scale(0.98); }
  100% { opacity: 1; transform: rotate(-0.4deg) translateY(0) scale(1); }
}

@keyframes signalPulse {
  0%, 100% { box-shadow: 0 0 6px var(--agent-accent); opacity: 1; }
  50% { box-shadow: 0 0 14px var(--agent-accent); opacity: 0.65; }
}

@keyframes scan {
  0% { transform: translateX(-110%); }
  100% { transform: translateX(380%); }
}

@keyframes glyph {
  0%, 100% { opacity: 0.3; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-2px); }
}

@keyframes bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
  40% { transform: translateY(-3px); opacity: 1; }
}

@keyframes pop {
  0% { opacity: 0; transform: translateY(6px) scale(0.98); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

// ============== 响应式 ==============
@media (max-width: 768px) {
  .chat-messages { padding: 18px 16px 18px 44px; }
  .binding-line { left: 30px; }
  .binding-holes { left: 14px; }
  .line-no { font-size: 9px; }
  .card-body { font-size: 14px; }
  .empty-cover { padding: 24px 20px 20px; }
  .empty-title { font-size: 18px; }
  .chat-input-area { padding: 10px 14px 12px 44px; }
  .prompt-sigil { left: -22px; width: 18px; height: 18px; font-size: 14px; }
  .meta-strip { gap: 6px; }
  .meta-cell.hint { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .message, .decoding, .signal-dot, .scan-line, .decode-text span, .decode-dot { animation: none !important; }
}
</style>
