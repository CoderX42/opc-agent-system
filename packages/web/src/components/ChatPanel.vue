<template>
  <div class="chat-panel">
    <!-- 消息列表 -->
    <div class="chat-messages" ref="messagesContainerRef">
      <div v-for="msg in messages" :key="msg.id" class="message-item" :class="msg.role">
        <div class="message-avatar">
          <el-avatar :size="32" :style="{ backgroundColor: getAvatarColor(msg.role) }">
            {{ getAvatarText(msg.role) }}
          </el-avatar>
        </div>
        <div class="message-body">
          <div class="message-meta">
            <span class="message-sender">{{ getSenderName(msg.role) }}</span>
            <span class="message-time">{{ msg.timestamp }}</span>
          </div>
          <div class="message-bubble" v-html="formatContent(msg.content)"></div>
        </div>
      </div>
      <div v-if="typing" class="typing-indicator">
        <el-avatar :size="24" style="background-color: #67c23a;">AI</el-avatar>
        <span>正在输入...</span>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="chat-input-area">
      <el-input
        v-model="inputText"
        type="textarea"
        :rows="2"
        :placeholder="placeholder"
        resize="none"
        @keydown.enter.exact.prevent="handleSend"
      />
      <div class="chat-input-actions">
        <el-button icon="Paperclip" circle size="small" title="添加附件" />
        <el-button type="primary" icon="Promotion" circle size="small" @click="handleSend" :disabled="!inputText.trim()" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'

interface ChatMessage {
  id: string
  role: 'user' | 'agent' | 'system'
  content: string
  timestamp: string
}

const props = withDefaults(defineProps<{
  messages?: ChatMessage[]
  placeholder?: string
  typing?: boolean
}>(), {
  messages: () => [],
  placeholder: '输入消息...',
  typing: false,
})

const emit = defineEmits<{
  send: [content: string]
}>()

const inputText = ref('')
const messagesContainerRef = ref<HTMLElement>()

function getAvatarColor(role: string) {
  const map: Record<string, string> = { user: '#409eff', agent: '#67c23a', system: '#909399' }
  return map[role] || '#909399'
}

function getAvatarText(role: string) {
  const map: Record<string, string> = { user: '我', agent: 'AI', system: '系' }
  return map[role] || '?'
}

function getSenderName(role: string) {
  const map: Record<string, string> = { user: '我', agent: 'AI助手', system: '系统' }
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

function handleSend() {
  if (!inputText.value.trim()) return
  emit('send', inputText.value)
  inputText.value = ''
}

watch(() => props.messages, () => {
  scrollToBottom()
}, { deep: true })
</script>

<style lang="scss" scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid $border-lighter;
  border-radius: $border-radius-md;
  overflow: hidden;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  @include custom-scrollbar;
}

.message-item {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;

  &.user { flex-direction: row-reverse; }
}

.message-body { max-width: 70%; }

.message-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.user .message-meta { flex-direction: row-reverse; }

.message-sender { font-size: 12px; font-weight: 600; color: $text-primary; }
.message-time { font-size: 11px; color: $text-placeholder; }

.message-bubble {
  padding: 10px 14px;
  border-radius: $border-radius-md;
  background-color: $bg-color;
  line-height: 1.6;
  word-break: break-word;
}

.user .message-bubble { background-color: #409eff; color: #fff; }
.agent .message-bubble { background-color: #f0f9eb; }
.system .message-bubble { background-color: #f4f4f5; font-size: 12px; }

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  font-size: 12px;
  color: $text-secondary;
}

.chat-input-area {
  padding: 12px 16px;
  border-top: 1px solid $border-lighter;
  background: $bg-white;
}

.chat-input-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
</style>
