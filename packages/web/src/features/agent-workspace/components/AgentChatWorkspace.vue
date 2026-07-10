<template>
  <section class="agent-chat-workspace" :class="[`is-${variant}`, { 'is-responding': status === 'responding' }]" :style="chatStyle">
    <header class="chat-header">
      <div class="chat-identity">
        <span class="agent-mark" aria-hidden="true">{{ agent.code.slice(0, 2) }}</span>
        <div>
          <p class="eyebrow">{{ contextLabel || '协作会话' }}</p>
          <h2>{{ agent.name }}</h2>
        </div>
      </div>
      <div class="chat-status" :class="`status-${status}`" aria-live="polite">
        <span class="status-dot" aria-hidden="true"></span>
        {{ statusLabel }}
      </div>
    </header>

    <div ref="messageListRef" class="message-list" role="log" :aria-label="`${agent.name} 对话记录`" @scroll="handleScroll">
      <div class="conversation-intro">
        <span>{{ agent.code }}</span>
        <i></i>
        <span>PRIVATE WORKSPACE</span>
      </div>

      <article
        v-for="message in messages"
        :key="message.id"
        class="message-row"
        :class="[`role-${message.role}`, `message-${message.state}`]"
      >
        <div class="message-meta">
          <span>{{ roleLabel(message.role) }}</span>
          <time>{{ message.createdAt }}</time>
        </div>
        <div class="message-body">
          <template v-for="(block, index) in message.blocks" :key="`${message.id}-${index}`">
            <div v-if="block.type === 'markdown'" class="markdown-block" v-html="renderMarkdown(block.text)"></div>
            <div v-else-if="block.type === 'error'" class="error-block" role="alert">
              <strong>本次回复未完成</strong>
              <p>{{ block.message }}</p>
              <button v-if="block.retryable" type="button" @click="$emit('retry')">重新尝试</button>
            </div>
            <div v-else-if="block.type === 'run'" class="run-summary">
              <span>任务 {{ block.taskId.slice(0, 8) }}</span>
              <span>{{ runtimeLabel(block.status) }}</span>
              <span v-if="block.tools">{{ block.tools }} 个工具</span>
              <span v-if="block.references">{{ block.references }} 条依据</span>
            </div>
            <details v-else-if="block.type === 'tool-call'" class="tool-block">
              <summary>已完成工具调用：{{ block.name }}</summary>
              <pre v-if="block.output">{{ block.output }}</pre>
              <p v-else>已返回业务结果。</p>
            </details>
            <div v-else-if="block.type === 'citations'" class="citation-block">
              <span>参考依据</span>
              <button v-for="citation in block.items" :key="citation.id" type="button" :title="citation.category">
                {{ citation.title }}
              </button>
            </div>
          </template>
        </div>
      </article>

      <div v-if="status === 'responding'" class="processing-row" aria-live="polite">
        <span class="processing-pulse" aria-hidden="true"></span>
        <span>{{ agent.shortName }} 正在处理请求</span>
        <span class="processing-copy">同步任务完成后将返回完整结果</span>
      </div>
    </div>

    <button v-if="showJumpToLatest" type="button" class="jump-latest" @click="scrollToLatest">有新回复，回到底部</button>

    <form class="chat-composer" @submit.prevent="submit">
      <label class="sr-only" :for="inputId">向 {{ agent.name }} 发送消息</label>
      <textarea
        :id="inputId"
        ref="inputRef"
        :value="modelValue"
        :placeholder="agent.placeholder"
        rows="1"
        :disabled="status === 'responding'"
        @input="updateDraft"
        @keydown="handleKeydown"
      ></textarea>
      <div class="composer-footer">
        <span>{{ composerHint }}</span>
        <div class="composer-actions">
          <button v-if="status === 'responding'" class="button-secondary" type="button" @click="$emit('cancel')">停止等待</button>
          <button v-else class="button-primary" type="submit" :disabled="!modelValue.trim()">发送</button>
        </div>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { renderMarkdown } from '@/utils/markdown'
import type { AgentPresentation } from '../domain/agentCatalog'
import type { ConversationMessage, ConversationStatus } from '../domain/chat'

const props = withDefaults(defineProps<{
  agent: AgentPresentation
  messages: ConversationMessage[]
  modelValue: string
  status: ConversationStatus
  variant?: 'page' | 'embedded' | 'sheet'
  contextLabel?: string
}>(), {
  variant: 'page',
  contextLabel: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  send: [value: string]
  cancel: []
  retry: []
}>()

const inputId = `agent-chat-input-${Math.random().toString(36).slice(2, 8)}`
const inputRef = ref<HTMLTextAreaElement>()
const messageListRef = ref<HTMLElement>()
const showJumpToLatest = ref(false)
const shouldFollowOutput = ref(true)

const chatStyle = computed(() => ({
  '--agent-accent': props.agent.accent,
  '--agent-soft': props.agent.softAccent,
}))
const statusLabel = computed(() => ({
  idle: '可开始委派',
  responding: '正在处理',
  cancelled: '已停止等待',
  failed: '需要处理',
}[props.status]))
const composerHint = computed(() => props.status === 'responding' ? '你可以停止等待；本次同步任务可能仍在服务端完成。' : 'Enter 发送 · Shift + Enter 换行')

function roleLabel(role: ConversationMessage['role']) {
  return { user: '你', assistant: props.agent.shortName, system: '系统' }[role]
}

function runtimeLabel(status: string) {
  const labels: Record<string, string> = {
    WAITING: '排队中', PLANNING: '已规划', RUNNING: '运行中', TOOL_CALLING: '调用工具', COMPLETED: '已完成', FAILED: '失败',
  }
  return labels[status] || status
}

function updateDraft(event: Event) {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
  autoGrow(target)
}

function autoGrow(target = inputRef.value) {
  if (!target) return
  target.style.height = 'auto'
  target.style.height = `${Math.min(target.scrollHeight, 168)}px`
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
  event.preventDefault()
  submit()
}

function submit() {
  if (!props.modelValue.trim() || props.status === 'responding') return
  emit('send', props.modelValue)
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.style.height = 'auto'
      inputRef.value.focus()
    }
  })
}

function handleScroll() {
  const list = messageListRef.value
  if (!list) return
  const distance = list.scrollHeight - list.scrollTop - list.clientHeight
  shouldFollowOutput.value = distance < 80
  if (shouldFollowOutput.value) showJumpToLatest.value = false
}

function scrollToLatest() {
  const list = messageListRef.value
  if (!list) return
  list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' })
  showJumpToLatest.value = false
}

watch(() => [props.messages.length, props.status], () => {
  nextTick(() => {
    if (shouldFollowOutput.value) {
      const list = messageListRef.value
      if (list) list.scrollTop = list.scrollHeight
    } else {
      showJumpToLatest.value = true
    }
  })
}, { deep: true })

watch(() => props.modelValue, () => nextTick(() => autoGrow()))
</script>

<style scoped lang="scss">
.agent-chat-workspace {
  --aw-ink: #17201c;
  --aw-muted: #68736d;
  --aw-line: #d8ded9;
  --aw-canvas: #f4f5f1;
  --aw-surface: #ffffff;
  --aw-primary: #c7462b;
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  color: var(--aw-ink);
  background: var(--aw-surface);
  border: 1px solid var(--aw-line);
  border-radius: 12px;
  font-family: 'IBM Plex Sans', 'Noto Sans SC', 'PingFang SC', sans-serif;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 76px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--aw-line);
}

.chat-identity { display: flex; min-width: 0; align-items: center; gap: 12px; }
.agent-mark { display: grid; width: 40px; height: 40px; flex: 0 0 40px; place-items: center; color: #fff; background: var(--agent-accent); border-radius: 8px; font: 700 10px/1 'IBM Plex Mono', monospace; letter-spacing: .06em; }
.eyebrow { margin: 0 0 3px; color: var(--aw-muted); font: 700 10px/1 'IBM Plex Mono', monospace; letter-spacing: .12em; text-transform: uppercase; }
.chat-identity h2 { margin: 0; font-size: 17px; font-weight: 700; letter-spacing: -.015em; }
.chat-status { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 7px; padding: 6px 9px; border: 1px solid var(--aw-line); border-radius: 999px; color: var(--aw-muted); font-size: 12px; font-weight: 650; }
.status-dot { width: 7px; height: 7px; border-radius: 50%; background: #9aa39e; }
.status-responding { color: #7a4b0e; border-color: #e4c998; background: #fff8e9; }
.status-responding .status-dot { background: #c27b18; animation: pulse 1.4s ease-in-out infinite; }
.status-failed { color: #98392e; border-color: #e6b6af; background: #fff4f2; }
.status-failed .status-dot { background: #b9382e; }
.status-idle .status-dot { background: #287a58; }

.message-list { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 0 clamp(16px, 3vw, 42px) 28px; background: var(--aw-canvas); scroll-behavior: smooth; }
.conversation-intro { display: flex; align-items: center; gap: 10px; padding: 14px 0; color: var(--aw-muted); font: 600 10px/1 'IBM Plex Mono', monospace; letter-spacing: .1em; }
.conversation-intro i { width: 28px; height: 1px; background: var(--aw-line); }
.message-row { display: grid; grid-template-columns: 108px minmax(0, 680px); gap: 20px; margin: 0 0 20px; animation: message-in .2s ease both; }
.message-meta { display: flex; align-items: baseline; gap: 8px; padding-top: 12px; color: var(--aw-muted); font: 600 11px/1 'IBM Plex Mono', monospace; }
.message-meta time { font-weight: 500; opacity: .7; }
.message-body { min-width: 0; padding: 14px 16px; border: 1px solid var(--aw-line); border-radius: 10px; background: var(--aw-surface); box-shadow: 0 1px 0 rgb(23 32 28 / .03); }
.role-user { justify-content: end; grid-template-columns: minmax(0, 580px) 108px; }
.role-user .message-meta { grid-column: 2; grid-row: 1; justify-content: flex-end; }
.role-user .message-body { grid-column: 1; grid-row: 1; background: var(--agent-soft); border-color: color-mix(in srgb, var(--agent-accent) 32%, #d8ded9); }
.role-system .message-body { color: var(--aw-muted); background: #fff; border-style: dashed; font-size: 13px; }
.markdown-block :deep(.atelier-md) { display: grid; gap: 10px; }
.markdown-block :deep(.md-p) { margin: 0; font-size: 14px; line-height: 1.72; }
.markdown-block :deep(.md-h) { margin: 0; font-size: 15px; line-height: 1.45; }
.markdown-block :deep(.md-list) { display: grid; gap: 5px; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6; }
.markdown-block :deep(.md-table-wrap) { overflow-x: auto; border: 1px solid var(--aw-line); }
.markdown-block :deep(.md-table) { min-width: 440px; border-collapse: collapse; font-size: 13px; }
.markdown-block :deep(.md-table th), .markdown-block :deep(.md-table td) { padding: 8px 10px; border-bottom: 1px solid var(--aw-line); text-align: left; }
.markdown-block :deep(.md-table th) { background: #eef1ed; }
.markdown-block :deep(.md-code) { padding: 1px 5px; background: #edf0ec; border-radius: 4px; font-family: 'IBM Plex Mono', monospace; font-size: .88em; }
.run-summary, .citation-block { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--aw-line); color: var(--aw-muted); font: 600 10px/1.4 'IBM Plex Mono', monospace; }
.run-summary span { padding: 4px 6px; background: #f0f2ef; border-radius: 4px; }
.tool-block { margin-top: 10px; color: var(--aw-muted); font-size: 12px; }
.tool-block summary { cursor: pointer; color: var(--aw-ink); font-weight: 650; }
.tool-block pre { max-height: 140px; overflow: auto; padding: 10px; background: #eef1ed; border-radius: 6px; font: 11px/1.55 'IBM Plex Mono', monospace; white-space: pre-wrap; }
.citation-block button { max-width: 180px; overflow: hidden; padding: 4px 7px; color: var(--aw-ink); border: 1px solid var(--aw-line); border-radius: 4px; background: #fff; cursor: pointer; font: inherit; text-overflow: ellipsis; white-space: nowrap; }
.citation-block button:hover { border-color: var(--agent-accent); color: var(--agent-accent); }
.error-block { padding: 12px; color: #873126; border: 1px solid #e4b6af; border-radius: 7px; background: #fff4f2; }
.error-block p { margin: 6px 0 10px; font-size: 13px; line-height: 1.55; }
.error-block button { min-height: 32px; padding: 0 10px; color: #fff; border: 0; border-radius: 5px; background: #9e392b; cursor: pointer; font-weight: 650; }
.processing-row { display: flex; align-items: center; gap: 9px; margin: 0 0 18px 128px; color: #7c4b0e; font-size: 13px; }
.processing-copy { color: var(--aw-muted); font-size: 12px; }
.processing-pulse { width: 9px; height: 9px; border-radius: 50%; background: #c27b18; animation: pulse 1.4s ease-in-out infinite; }
.jump-latest { position: absolute; right: 20px; bottom: 100px; min-height: 36px; padding: 0 12px; color: #fff; border: 0; border-radius: 999px; background: var(--aw-ink); box-shadow: 0 8px 18px rgb(23 32 28 / .18); cursor: pointer; font-size: 12px; }
.chat-composer { flex: 0 0 auto; padding: 14px 18px 16px; border-top: 1px solid var(--aw-line); background: var(--aw-surface); }
.chat-composer textarea { display: block; width: 100%; min-height: 48px; max-height: 168px; resize: none; padding: 12px; color: var(--aw-ink); border: 1px solid var(--aw-line); border-radius: 8px; outline: none; background: #fbfcfa; font: 14px/1.55 'IBM Plex Sans', 'Noto Sans SC', sans-serif; }
.chat-composer textarea:focus { border-color: var(--agent-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--agent-accent) 13%, transparent); }
.chat-composer textarea:disabled { opacity: .64; cursor: wait; }
.composer-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 10px; color: var(--aw-muted); font-size: 12px; }
.composer-actions { display: flex; gap: 8px; }
.button-primary, .button-secondary { min-height: 38px; padding: 0 14px; border-radius: 6px; cursor: pointer; font: 650 13px/1 'IBM Plex Sans', 'Noto Sans SC', sans-serif; }
.button-primary { color: #fff; border: 1px solid var(--aw-primary); background: var(--aw-primary); }
.button-primary:hover:not(:disabled) { background: #a73722; }
.button-primary:disabled { opacity: .45; cursor: not-allowed; }
.button-secondary { color: var(--aw-ink); border: 1px solid var(--aw-line); background: #fff; }
.button-secondary:hover { border-color: var(--aw-ink); }
.is-embedded .chat-header { min-height: 64px; padding: 12px 14px; }
.is-embedded .message-list { padding-right: 16px; padding-left: 16px; }
.is-embedded .message-row { grid-template-columns: 74px minmax(0, 1fr); gap: 10px; }
.is-embedded .role-user { grid-template-columns: minmax(0, 1fr) 74px; }
.is-embedded .processing-row { margin-left: 84px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
@keyframes pulse { 50% { opacity: .38; transform: scale(.85); } }
@keyframes message-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
@media (max-width: 720px) {
  .agent-chat-workspace { border-radius: 0; border-right: 0; border-left: 0; }
  .chat-header { min-height: 66px; padding: 10px 14px; }
  .agent-mark { width: 36px; height: 36px; flex-basis: 36px; }
  .chat-identity h2 { font-size: 15px; }
  .chat-status { padding: 5px 7px; font-size: 11px; }
  .message-list { padding-right: 14px; padding-left: 14px; }
  .message-row, .role-user { grid-template-columns: 1fr; gap: 6px; }
  .role-user .message-meta, .role-user .message-body { grid-column: auto; grid-row: auto; justify-content: flex-start; }
  .message-meta { padding-top: 0; }
  .message-body { padding: 12px; }
  .processing-row { margin-left: 0; flex-wrap: wrap; }
  .processing-copy { width: 100%; margin-left: 18px; }
  .chat-composer { padding: 12px 14px calc(14px + env(safe-area-inset-bottom, 0px)); }
  .composer-footer { align-items: flex-end; }
  .composer-footer > span { max-width: 180px; line-height: 1.35; }
}
@media (prefers-reduced-motion: reduce) { .agent-chat-workspace *, .agent-chat-workspace *::before, .agent-chat-workspace *::after { animation: none !important; scroll-behavior: auto !important; transition: none !important; } }

/* Conversation material matches the app shell while preserving agent accents. */
.agent-chat-workspace { --aw-ink:#092d68; --aw-muted:#496f9f; --aw-line:rgb(151 202 242 / .42); --aw-canvas:rgb(229 244 255 / .4); --aw-surface:rgb(255 255 255 / .62); --aw-primary:#0866f7; border-color:rgb(255 255 255 / .78); border-radius:22px; background:linear-gradient(145deg, rgb(255 255 255 / .72), rgb(228 245 255 / .44)); box-shadow:$shadow-soft; backdrop-filter:blur(26px) saturate(145%); font-family:var(--font-body); }
.chat-header { border-bottom-color:rgb(var(--line) / .32); background:rgb(255 255 255 / .18); }.agent-mark { border:1px solid rgb(255 255 255 / .52); border-radius:14px; box-shadow:0 8px 16px color-mix(in srgb, var(--agent-accent) 24%, transparent), inset 0 1px 0 rgb(255 255 255 / .45); }.chat-status { border-color:rgb(255 255 255 / .75); background:rgb(255 255 255 / .44); box-shadow:inset 0 1px 0 rgb(255 255 255 / .76); }
.message-list { background:linear-gradient(135deg, rgb(238 248 255 / .62), rgb(221 241 255 / .35)); }.conversation-intro { color:var(--aw-muted); }.message-body { border-color:rgb(255 255 255 / .78); border-radius:18px; background:rgb(255 255 255 / .68); box-shadow:0 7px 18px rgb(21 102 181 / .07), inset 0 1px 0 rgb(255 255 255 / .86); backdrop-filter:blur(14px); }.role-user .message-body { background:linear-gradient(145deg, color-mix(in srgb, var(--agent-soft) 76%, white), rgb(255 255 255 / .58)); border-color:color-mix(in srgb, var(--agent-accent) 18%, white); }.role-system .message-body { background:rgb(255 255 255 / .4); }
.run-summary, .citation-block { border-top-color:rgb(var(--line) / .32); }.run-summary span { border:1px solid rgb(255 255 255 / .7); border-radius:8px; background:rgb(255 255 255 / .5); }.citation-block button { border-color:rgb(255 255 255 / .72); border-radius:9px; background:rgb(255 255 255 / .5); }.chat-composer { border-top-color:rgb(var(--line) / .32); background:rgb(255 255 255 / .24); }.chat-composer textarea { border-color:rgb(255 255 255 / .82); border-radius:16px; background:rgb(255 255 255 / .62); box-shadow:inset 0 1px 0 #fff; }.button-primary { border-color:rgb(255 255 255 / .3); border-radius:13px; background:linear-gradient(135deg, #0752e1, #087fff 54%, #00c9eb); box-shadow:0 10px 22px rgb(0 105 237 / .2), inset 0 1px 0 rgb(255 255 255 / .42); }.button-secondary { border-color:rgb(255 255 255 / .78); border-radius:13px; background:rgb(255 255 255 / .48); }
</style>
