<template>
  <div class="page-container conversation-page">
    <div class="page-header conversation-page-header">
      <div>
        <span class="kicker">Live Conversations</span>
        <h2 class="page-title">对话管理</h2>
        <p class="page-subtitle">快速识别等待中的客户、查看上下文，并把回复交给客服 Agent 协同处理。</p>
      </div>
      <div class="page-actions">
        <el-button icon="Refresh" :loading="conversationLoading" @click="fetchConversations">刷新</el-button>
        <el-button type="primary" icon="Plus" @click="handleCreateConversation">新建对话</el-button>
      </div>
    </div>

    <el-row :gutter="16" class="conversation-layout">
      <!-- 对话列表 -->
      <el-col :xs="24" :lg="8" class="conversation-list-col">
        <el-card shadow="never" class="conversation-list-card">
          <template #header>
            <div class="list-tools">
              <el-input v-model="searchKeyword" placeholder="搜索客户或摘要..." prefix-icon="Search" clearable size="small" />
              <div class="list-tabs" role="tablist" aria-label="对话状态筛选">
                <button
                  v-for="tab in statusTabs"
                  :key="tab.value"
                  type="button"
                  :class="{ active: statusFilter === tab.value }"
                  @click="statusFilter = tab.value"
                >
                  {{ tab.label }}
                  <span>{{ getStatusCount(tab.value) }}</span>
                </button>
              </div>
            </div>
          </template>
          <div v-loading="conversationLoading" class="conversation-list">
            <div v-if="!conversationLoading && filteredConversations.length === 0" class="empty-state">
              <strong>没有匹配的对话</strong>
              <span>调整筛选条件，或新建一条客户对话。</span>
            </div>
            <div
              v-for="conv in filteredConversations"
              :key="conv.id"
              class="conversation-item"
              :class="{ active: selectedConversation?.id === conv.id }"
              @click="selectConversation(conv)"
            >
              <div class="conv-header">
                <div class="conv-customer">
                  <span class="conv-avatar">{{ getInitial(conv.customerName) }}</span>
                  <div>
                    <span class="conv-name">{{ conv.customerName || '匿名客户' }}</span>
                    <small>{{ getChannelText(conv.channel) }} · #{{ shortId(conv.id) }}</small>
                  </div>
                </div>
                <el-tag :type="getStatusType(conv.status)" size="small">{{ getStatusText(conv.status) }}</el-tag>
              </div>
              <p class="conv-summary">{{ conv.summary || '（暂无摘要）' }}</p>
              <div class="conv-footer">
                <span class="conv-time">{{ formatDateTime(conv.updatedAt) }}</span>
                <span class="conv-dot" :class="`is-${conv.status.toLowerCase()}`"></span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 对话详情 -->
      <el-col :xs="24" :lg="16" class="conversation-chat-col">
        <el-card shadow="never" class="chat-card">
          <template #header>
            <div class="chat-header">
              <div class="chat-heading">
                <span class="chat-title">{{ selectedConversation?.customerName || '对话详情' }}</span>
                <small v-if="selectedConversation">
                  {{ getChannelText(selectedConversation.channel) }} · {{ getStatusText(selectedConversation.status) }} · 更新于 {{ formatDateTime(selectedConversation.updatedAt) }}
                </small>
                <small v-else>从左侧选择对话，查看完整上下文。</small>
              </div>
              <div class="chat-actions" v-if="selectedConversation">
                <el-button size="small" icon="Tickets" @click="handleCreateTicket">转工单</el-button>
                <el-button size="small" type="danger" plain @click="handleClose">关闭对话</el-button>
              </div>
            </div>
          </template>
          <template v-if="selectedConversation">
            <div v-loading="messagesLoading" class="chat-messages" ref="messagesRef">
              <div class="conversation-summary">
                <span>对话摘要</span>
                <p>{{ selectedConversation.summary || '暂无摘要，客服 Agent 会根据后续消息自动补足上下文。' }}</p>
              </div>
              <div v-if="!messagesLoading && messages.length === 0" class="empty-state chat-empty">
                <strong>还没有消息</strong>
                <span>发送第一条消息，Agent 会自动生成回复。</span>
              </div>
              <div v-for="msg in messages" :key="msg.id" class="message-item" :class="msg.role">
                <div class="message-avatar">
                  <span>{{ msg.role === 'user' ? '客' : msg.role === 'agent' ? 'AI' : '系' }}</span>
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
                placeholder="输入消息，Enter 发送，Shift + Enter 换行"
                :disabled="sending"
                @keydown.enter.exact.prevent="sendMessage"
              />
              <div class="input-side">
                <span>{{ inputMessage.trim().length }}/10000</span>
                <el-button type="primary" :loading="sending" @click="sendMessage" :disabled="!inputMessage.trim()">发送</el-button>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="no-conversation">
              <div class="no-conversation-icon">CS</div>
              <h3>请选择一个对话</h3>
              <p>左侧会显示最近客户会话。你也可以新建一条对话，让 Agent 先接待。</p>
              <el-button type="primary" icon="Plus" @click="handleCreateConversation">新建对话</el-button>
            </div>
          </template>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="createDialogVisible" title="新建对话" width="520px" destroy-on-close>
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="92px">
        <el-form-item label="客户名称" prop="customerName">
          <el-input v-model="createForm.customerName" placeholder="例如：王女士 / 上海某客户" />
        </el-form-item>
        <el-form-item label="渠道" prop="channel">
          <el-radio-group v-model="createForm.channel">
            <el-radio-button label="WEB">网页</el-radio-button>
            <el-radio-button label="PHONE">电话</el-radio-button>
            <el-radio-button label="WECHAT">微信</el-radio-button>
            <el-radio-button label="EMAIL">邮件</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="摘要">
          <el-input v-model="createForm.summary" type="textarea" :rows="3" placeholder="可选：记录客户诉求或背景信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="confirmCreateConversation">创建并打开</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  createConversation,
  getConversationList,
  getConversationMessages,
  sendMessage as apiSendMessage,
  closeConversation,
  createTicketFromConversation,
} from '@/api/customer-service'
import type { Conversation, Message } from '@/types'

const searchKeyword = ref('')
const statusFilter = ref<'ALL' | Conversation['status']>('ALL')
const selectedConversation = ref<Conversation | null>(null)
const inputMessage = ref('')
const messagesRef = ref<HTMLElement>()
const createFormRef = ref<FormInstance>()

const conversationList = ref<Conversation[]>([])
const conversationLoading = ref(false)
const messages = ref<Message[]>([])
const messagesLoading = ref(false)
const sending = ref(false)
const creating = ref(false)
const createDialogVisible = ref(false)

const statusTabs: Array<{ label: string; value: 'ALL' | Conversation['status'] }> = [
  { label: '全部', value: 'ALL' },
  { label: '进行中', value: 'ACTIVE' },
  { label: '等待中', value: 'PENDING' },
  { label: '已关闭', value: 'CLOSED' },
]

const createForm = ref<{
  customerName: string
  channel: Conversation['channel']
  summary: string
}>({
  customerName: '',
  channel: 'WEB',
  summary: '',
})

const createRules: FormRules = {
  customerName: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
  channel: [{ required: true, message: '请选择渠道', trigger: 'change' }],
}

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
  return conversationList.value.filter((c) => {
    const statusMatched = statusFilter.value === 'ALL' || c.status === statusFilter.value
    const keywordMatched = !kw
      || c.customerName?.toLowerCase().includes(kw)
      || c.summary?.toLowerCase().includes(kw)
    return statusMatched && keywordMatched
  })
})

function selectConversation(conv: Conversation) {
  selectedConversation.value = conv
  fetchMessages(conv.id)
}

function handleCreateConversation() {
  createForm.value = { customerName: '', channel: 'WEB', summary: '' }
  createDialogVisible.value = true
}

async function confirmCreateConversation() {
  if (!createFormRef.value) return
  try {
    await createFormRef.value.validate()
  } catch { return }

  creating.value = true
  try {
    const res = await createConversation({
      customerName: createForm.value.customerName.trim(),
      channel: createForm.value.channel,
      summary: createForm.value.summary.trim() || undefined,
    })
    ElMessage.success('对话已创建')
    createDialogVisible.value = false
    await fetchConversations()
    const created = conversationList.value.find((item) => item.id === res.data.id) || res.data
    selectConversation(created)
  } finally {
    creating.value = false
  }
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
    if (res.data?.ticket) {
      ElMessage.warning(`已自动生成工单 #${shortId(res.data.ticket.id)}`)
      await fetchConversations()
      const current = conversationList.value.find((item) => item.id === selectedConversation.value?.id)
      if (current) selectedConversation.value = current
    }
  } finally {
    sending.value = false
    await nextTick()
    if (messagesRef.value) messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

async function handleCreateTicket() {
  if (!selectedConversation.value) return
  try {
    await ElMessageBox.confirm('确定要基于当前对话创建工单吗？', '转工单', { type: 'warning' })
    const res = await createTicketFromConversation(selectedConversation.value.id)
    ElMessage.success(`工单已创建 #${shortId(res.data.id)}`)
    await fetchConversations()
    const current = conversationList.value.find((item) => item.id === selectedConversation.value?.id)
    if (current) selectedConversation.value = current
  } catch { /* 用户取消 */ }
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
  if (Number.isNaN(d.getTime())) return '--:--'
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function formatDateTime(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function getInitial(name?: string) {
  return (name || '客').slice(0, 1).toUpperCase()
}

function shortId(id?: string) {
  return id ? id.slice(0, 8) : '--------'
}

function getChannelText(channel: string) {
  const map: Record<string, string> = { WEB: '网页', PHONE: '电话', EMAIL: '邮件', WECHAT: '微信' }
  return map[channel] || channel
}

function getStatusType(status: string) {
  const map = { ACTIVE: 'success', PENDING: 'warning', CLOSED: 'info' } as const
  return map[status as keyof typeof map] || 'info'
}

function getStatusText(status: string) {
  const map: Record<string, string> = { ACTIVE: '进行中', PENDING: '等待中', CLOSED: '已关闭' }
  return map[status] || status
}

function getStatusCount(status: 'ALL' | Conversation['status']) {
  if (status === 'ALL') return conversationList.value.length
  return conversationList.value.filter((item) => item.status === status).length
}

watch(() => selectedConversation.value?.id, (id) => {
  if (!id) messages.value = []
})

onMounted(fetchConversations)
</script>

<style lang="scss" scoped>
.conversation-page-header {
  align-items: flex-end;
}

.page-subtitle {
  max-width: 620px;
  margin-top: 6px;
  color: $text-secondary;
  line-height: 1.6;
}

.conversation-layout {
  min-height: calc(100vh - 172px);
}

.conversation-list-col,
.conversation-chat-col {
  min-height: 0;
}

.conversation-list-card {
  height: 100%;

  :deep(.el-card__body) {
    padding: 0;
    height: calc(100% - 112px);
    overflow: hidden;
  }
}

.list-tools {
  display: grid;
  gap: 10px;
}

.list-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;

  button {
    min-width: 0;
    padding: 7px 6px;
    color: $text-secondary;
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.06em;
    background: rgba(255, 255, 255, 0.32);
    border: 1px solid rgba(31, 42, 36, 0.14);
    cursor: pointer;
    transition: all 160ms $transition-timing;

    span {
      margin-left: 3px;
      color: $brass-deep;
    }

    &:hover,
    &.active {
      color: $cream;
      background: $forest;
      border-color: $forest;
      box-shadow: 2px 2px 0 rgba(31, 42, 36, 0.14);

      span {
        color: $brass;
      }
    }
  }
}

.conversation-list {
  height: 100%;
  overflow-y: auto;
  @include custom-scrollbar;
}

.conversation-item {
  position: relative;
  padding: 14px 16px 13px;
  border-bottom: 1px solid $rule;
  cursor: pointer;
  transition: all $transition-duration;

  &:hover {
    background-color: $cream-warm;
  }

  &.active { 
    background-color: color-mix(in srgb, $brass 10%, $cream);

    &::before {
      position: absolute;
      top: 12px;
      bottom: 12px;
      left: 0;
      width: 3px;
      content: '';
      background: $forest;
    }
  }
}

.conv-header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
  margin-bottom: 9px;
}

.conv-customer {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;

  small {
    display: block;
    margin-top: 2px;
    color: $text-placeholder;
    font-family: var(--font-mono);
    font-size: 10px;
  }
}

.conv-avatar {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  color: $cream;
  background: $forest;
  border: 1.5px solid $forest;
  font-family: var(--font-display);
  font-style: italic;
}

.conv-name { 
  display: block;
  max-width: 140px;
  font-family: var(--font-display);
  font-weight: 500;
  font-style: italic;
  font-size: 14px;
  color: $forest;
  @include text-ellipsis(1);
}

.conv-summary {
  font-size: 12px;
  color: $text-secondary;
  line-height: 1.5;
  margin-bottom: 8px;
  @include text-ellipsis(2);
}

.conv-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.conv-time { font-size: 11px; color: $text-placeholder; font-family: var(--font-mono); }

.conv-dot {
  width: 7px;
  height: 7px;
  background: $info-color;
  box-shadow: 0 0 0 4px color-mix(in srgb, $info-color 12%, transparent);

  &.is-active {
    background: $success-color;
    box-shadow: 0 0 0 4px color-mix(in srgb, $success-color 12%, transparent);
  }

  &.is-pending {
    background: $warning-color;
    box-shadow: 0 0 0 4px color-mix(in srgb, $warning-color 12%, transparent);
  }
}

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
  align-items: flex-start;
  gap: 14px;
}

.chat-heading {
  min-width: 0;

  small {
    display: block;
    margin-top: 4px;
    color: $text-placeholder;
    font-family: var(--font-mono);
    font-size: 10px;
    font-style: normal;
    letter-spacing: 0.04em;
  }
}

.chat-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.chat-title { 
  font-family: var(--font-display);
  font-weight: 500;
  font-style: italic;
  font-size: 15px;
  color: $forest;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 18px;
  background:
    linear-gradient(rgba(31, 42, 36, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(31, 42, 36, 0.03) 1px, transparent 1px),
    $bg-page;
  background-size: 28px 28px;
  @include custom-scrollbar;
}

.conversation-summary {
  margin-bottom: 18px;
  padding: 12px 14px;
  background: color-mix(in srgb, $brass 8%, $cream);
  border: 1px solid rgba(31, 42, 36, 0.16);

  span {
    display: block;
    margin-bottom: 5px;
    color: $brass-deep;
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.14em;
  }

  p {
    color: $text-regular;
    line-height: 1.6;
    font-size: 13px;
  }
}

.message-item {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;

  &.user { flex-direction: row-reverse; }
  &.system {
    justify-content: center;

    .message-avatar {
      display: none;
    }

    .message-content {
      max-width: 82%;
    }

    .message-bubble {
      color: $text-secondary;
      background: rgba(255, 255, 255, 0.42);
      border-style: dashed;
      box-shadow: none;
      text-align: center;
    }
  }
}

.message-avatar {
  width: 34px;
  height: 34px;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  color: $cream;
  background: $forest;
  border: 1.5px solid $forest;
  box-shadow: 2px 2px 0 rgba(31, 42, 36, 0.12);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 800;

  .agent & {
    color: $forest;
    background: color-mix(in srgb, $success-color 22%, $cream);
  }
}

.message-content { max-width: 70%; }

.message-bubble {
  padding: 12px 16px;
  background-color: $cream;
  border: 1.5px solid $forest;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  box-shadow: 2px 2px 0 rgba(31, 42, 36, 0.08);
}

.user .message-bubble { 
  background-color: $forest; 
  color: $cream;
  border-color: $forest;
}
.agent .message-bubble { 
  background-color: $cream;
  border-color: $forest;
}

.message-time {
  display: block;
  font-size: 10px;
  color: $text-placeholder;
  margin-top: 4px;
  font-family: var(--font-mono);
}

.user .message-time { text-align: right; }

.chat-input {
  padding: 14px 16px 16px;
  border-top: 2px solid $forest;
  display: flex;
  gap: 12px;
  align-items: flex-end;
  background: $cream;
}

.input-side {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;

  span {
    color: $text-placeholder;
    font-family: var(--font-mono);
    font-size: 10px;
  }
}

.empty-state,
.no-conversation {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  padding: 24px;
  color: $text-secondary;
  text-align: center;

  strong,
  h3 {
    margin-bottom: 6px;
    color: $forest;
    font-family: var(--font-display);
    font-size: 18px;
    font-style: italic;
    font-weight: 500;
  }

  span,
  p {
    max-width: 360px;
    line-height: 1.6;
  }
}

.chat-empty {
  min-height: 140px;
}

.no-conversation {
  min-height: 100%;
}

.no-conversation-icon {
  width: 62px;
  height: 62px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
  color: $cream;
  background: $forest;
  border: 2px solid $forest;
  box-shadow: 5px 5px 0 rgba(31, 42, 36, 0.12);
  font-family: var(--font-display);
  font-size: 22px;
  font-style: italic;
}

@media (max-width: 1200px) {
  .conversation-layout {
    min-height: auto;
  }

  .conversation-list-card {
    height: 420px;
    margin-bottom: 16px;
  }

  .chat-card {
    height: 680px;
  }
}

@media (max-width: 640px) {
  .conversation-page-header,
  .chat-header,
  .chat-input {
    align-items: stretch;
    flex-direction: column;
  }

  .page-actions,
  .chat-actions {
    justify-content: flex-start;
  }

  .list-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .message-content {
    max-width: 82%;
  }

  .input-side {
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}
</style>
