<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">对话管理</h2>
      <div class="page-actions">
        <el-button type="primary" icon="Plus">新建对话</el-button>
      </div>
    </div>

    <el-row :gutter="16" class="conversation-layout">
      <!-- 对话列表 -->
      <el-col :span="8">
        <el-card shadow="never" class="conversation-list-card">
          <template #header>
            <el-input v-model="searchKeyword" placeholder="搜索客户..." prefix-icon="Search" clearable size="small" />
          </template>
          <div v-loading="conversationLoading" class="conversation-list">
            <el-empty v-if="!conversationLoading && filteredConversations.length === 0" description="暂无对话" :image-size="60" />
            <div
              v-for="conv in filteredConversations"
              :key="conv.id"
              class="conversation-item"
              :class="{ active: selectedConversation?.id === conv.id }"
              @click="selectConversation(conv)"
            >
              <div class="conv-header">
                <span class="conv-name">{{ conv.customerName }}</span>
                <el-tag :type="conv.status === 'ACTIVE' ? 'success' : conv.status === 'PENDING' ? 'warning' : 'info'" size="small">
                  {{ conv.status === 'ACTIVE' ? '进行中' : conv.status === 'PENDING' ? '等待中' : '已关闭' }}
                </el-tag>
              </div>
              <p class="conv-summary">{{ conv.summary || '（暂无摘要）' }}</p>
              <span class="conv-time">{{ formatDateTime(conv.updatedAt) }}</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 对话详情 -->
      <el-col :span="16">
        <el-card shadow="never" class="chat-card">
          <template #header>
            <div class="chat-header">
              <span class="chat-title">{{ selectedConversation?.customerName || '对话详情' }}</span>
              <el-button v-if="selectedConversation" size="small" type="danger" plain @click="handleClose">关闭对话</el-button>
            </div>
          </template>
          <template v-if="selectedConversation">
            <div v-loading="messagesLoading" class="chat-messages" ref="messagesRef">
              <el-empty v-if="!messagesLoading && messages.length === 0" description="暂无消息" :image-size="60" />
              <div v-for="msg in messages" :key="msg.id" class="message-item" :class="msg.role">
                <div class="message-avatar">
                  <el-avatar :size="32" :style="{ backgroundColor: msg.role === 'user' ? '#409eff' : msg.role === 'agent' ? '#67c23a' : '#909399' }">
                    {{ msg.role === 'user' ? '客' : msg.role === 'agent' ? 'AI' : '系' }}
                  </el-avatar>
                </div>
                <div class="message-content">
                  <div class="message-bubble">{{ msg.content }}</div>
                  <span class="message-time">{{ formatTime(msg.timestamp || (msg as any).createdAt) }}</span>
                </div>
              </div>
            </div>

            <div class="chat-input">
              <el-input
                v-model="inputMessage"
                type="textarea"
                :rows="3"
                placeholder="输入消息... (Enter发送)"
                :disabled="sending"
                @keydown.enter.exact.prevent="sendMessage"
              />
              <el-button type="primary" :loading="sending" @click="sendMessage" :disabled="!inputMessage.trim()">发送</el-button>
            </div>
          </template>
          <template v-else>
            <el-empty description="请选择一个对话" />
          </template>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getConversationList,
  getConversationMessages,
  sendMessage as apiSendMessage,
  closeConversation,
} from '@/api/customer-service'
import type { Conversation, Message } from '@/types'

const searchKeyword = ref('')
const selectedConversation = ref<Conversation | null>(null)
const inputMessage = ref('')
const messagesRef = ref<HTMLElement>()

const conversationList = ref<Conversation[]>([])
const conversationLoading = ref(false)
const messages = ref<Message[]>([])
const messagesLoading = ref(false)
const sending = ref(false)

async function fetchConversations() {
  conversationLoading.value = true
  try {
    const res = await getConversationList({ page: 1, pageSize: 50 })
    conversationList.value = res.data.items || []
  } catch {
    conversationList.value = []
  } finally {
    conversationLoading.value = false
  }
}

async function fetchMessages(conversationId: string) {
  messagesLoading.value = true
  try {
    const res = await getConversationMessages(conversationId, { page: 1, pageSize: 100 })
    messages.value = (res.data.items || []).reverse()
  } catch {
    messages.value = []
  } finally {
    messagesLoading.value = false
  }
  await nextTick()
  if (messagesRef.value) messagesRef.value.scrollTop = messagesRef.value.scrollHeight
}

const filteredConversations = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return conversationList.value
  return conversationList.value.filter(c => c.customerName?.toLowerCase().includes(kw))
})

function selectConversation(conv: Conversation) {
  selectedConversation.value = conv
  fetchMessages(conv.id)
}

async function sendMessage() {
  const content = inputMessage.value.trim()
  if (!content || !selectedConversation.value || sending.value) return
  sending.value = true
  // 乐观追加用户消息
  const tempUserMsg: Message = {
    id: `tmp-${Date.now()}`,
    conversationId: selectedConversation.value.id,
    role: 'user',
    content,
    timestamp: new Date().toISOString(),
  }
  messages.value.push(tempUserMsg)
  inputMessage.value = ''
  await nextTick()
  if (messagesRef.value) messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  try {
    const res = await apiSendMessage(selectedConversation.value.id, content)
    // 用真实消息替换临时消息 + 追加 agent 回复
    const idx = messages.value.findIndex(m => m.id === tempUserMsg.id)
    if (idx >= 0 && res.data?.userMessage) messages.value[idx] = res.data.userMessage as Message
    if (res.data?.reply) messages.value.push(res.data.reply as Message)
  } finally {
    sending.value = false
    await nextTick()
    if (messagesRef.value) messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

async function handleClose() {
  if (!selectedConversation.value) return
  try {
    await ElMessageBox.confirm('确定关闭该对话吗？', '提示', { type: 'warning' })
    await closeConversation(selectedConversation.value.id)
    ElMessage.success('对话已关闭')
    selectedConversation.value = null
    messages.value = []
    fetchConversations()
  } catch { /* 用户取消 */ }
}

function formatTime(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function formatDateTime(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

watch(() => selectedConversation.value?.id, (id) => {
  if (!id) messages.value = []
})

onMounted(fetchConversations)
</script>

<style lang="scss" scoped>
.conversation-layout {
  height: calc(100vh - 140px);
}

.conversation-list-card {
  height: 100%;
  :deep(.el-card__body) {
    padding: 0;
    height: calc(100% - 60px);
    overflow: hidden;
  }
}

.conversation-list {
  height: 100%;
  overflow-y: auto;
  @include custom-scrollbar;
}

.conversation-item {
  padding: 12px 16px;
  border-bottom: 1px solid $border-lighter;
  cursor: pointer;
  transition: background-color $transition-duration;

  &:hover { background-color: $bg-color; }
  &.active { background-color: #ecf5ff; }
}

.conv-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.conv-name { font-weight: 600; font-size: 14px; }
.conv-summary { font-size: 12px; color: $text-secondary; margin-bottom: 4px; @include text-ellipsis(1); }
.conv-time { font-size: 11px; color: $text-placeholder; }

.chat-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  :deep(.el-card__body) {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 0;
    overflow: hidden;
  }
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-title { font-weight: 600; font-size: 15px; }

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
  &.system { justify-content: center; }
}

.message-content { max-width: 70%; }

.message-bubble {
  padding: 10px 14px;
  border-radius: $border-radius-md;
  background-color: $bg-color;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.user .message-bubble { background-color: #409eff; color: #fff; }
.agent .message-bubble { background-color: #f0f9eb; }

.message-time {
  display: block;
  font-size: 11px;
  color: $text-placeholder;
  margin-top: 4px;
}

.user .message-time { text-align: right; }

.chat-input {
  padding: 12px 16px;
  border-top: 1px solid $border-lighter;
  display: flex;
  gap: 12px;
  align-items: flex-end;
}
</style>
