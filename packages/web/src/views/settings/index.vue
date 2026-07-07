<template>
  <div class="page-container settings-page">
    <div class="page-header">
      <div>
        <span class="kicker">Control Room</span>
        <h2 class="page-title">系统设置</h2>
      </div>
      <div class="settings-header-actions">
        <div class="sync-pill">
          <span class="sync-dot"></span>
          配置已同步
        </div>
        <el-button type="primary" plain @click="handleSaveAll">保存全部</el-button>
      </div>
    </div>

    <section class="settings-hero">
      <div class="identity-panel">
        <el-avatar :size="72" :src="userStore.avatar || undefined" class="identity-avatar">
          {{ avatarInitial }}
        </el-avatar>
        <div class="identity-copy">
          <span class="kicker">Workspace Owner</span>
          <strong>{{ displayName }}</strong>
          <span>{{ profileForm.email }}</span>
        </div>
      </div>

      <div class="settings-metrics">
        <div v-for="item in settingStats" :key="item.label" class="metric-item">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <small>{{ item.note }}</small>
        </div>
      </div>
    </section>

    <el-tabs v-model="activeTab" class="settings-tabs" stretch>
      <el-tab-pane label="个人信息" name="profile">
        <el-card shadow="never" class="settings-card profile-card">
          <template #header>
            <div class="section-heading">
              <div>
                <span class="kicker">Profile</span>
                <h3>个人档案</h3>
              </div>
              <el-tag type="success" effect="plain">ACTIVE</el-tag>
            </div>
          </template>

          <div class="profile-grid">
            <aside class="profile-rail">
              <el-avatar :size="88" :src="userStore.avatar || undefined" class="profile-avatar">
                {{ avatarInitial }}
              </el-avatar>
              <strong>{{ displayName }}</strong>
              <span>{{ userStore.role || 'USER' }}</span>
              <el-button size="small" plain>更换头像</el-button>
            </aside>

            <el-form :model="profileForm" label-position="top" class="settings-form">
              <div class="form-grid">
                <el-form-item label="用户名">
                  <el-input v-model="profileForm.username" disabled />
                </el-form-item>
                <el-form-item label="昵称">
                  <el-input v-model="profileForm.nickname" placeholder="请输入昵称" />
                </el-form-item>
                <el-form-item label="邮箱">
                  <el-input v-model="profileForm.email" placeholder="请输入邮箱" />
                </el-form-item>
                <el-form-item label="手机号">
                  <el-input v-model="profileForm.phone" placeholder="请输入手机号" />
                </el-form-item>
              </div>
              <div class="form-actions">
                <span>用于登录展示、系统通知和操作记录归属。</span>
                <el-button type="primary" @click="handleSaveProfile">保存个人信息</el-button>
              </div>
            </el-form>
          </div>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="修改密码" name="password">
        <el-card shadow="never" class="settings-card">
          <template #header>
            <div class="section-heading">
              <div>
                <span class="kicker">Security</span>
                <h3>登录安全</h3>
              </div>
              <span class="section-note">建议定期轮换强密码</span>
            </div>
          </template>

          <div class="security-layout">
            <div class="security-note">
              <el-icon :size="26"><Lock /></el-icon>
              <strong>密码更新后将清空当前刷新令牌</strong>
              <span>请使用 6-32 位字符，避免与其他系统重复。</span>
            </div>
            <el-form
              ref="passwordFormRef"
              :model="passwordForm"
              :rules="passwordRules"
              label-position="top"
              class="settings-form password-form"
            >
              <el-form-item label="当前密码" prop="oldPassword">
                <el-input v-model="passwordForm.oldPassword" type="password" show-password placeholder="请输入当前密码" />
              </el-form-item>
              <el-form-item label="新密码" prop="newPassword">
                <el-input v-model="passwordForm.newPassword" type="password" show-password placeholder="请输入新密码" />
              </el-form-item>
              <el-form-item label="确认密码" prop="confirmPassword">
                <el-input v-model="passwordForm.confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
              </el-form-item>
              <div class="form-actions">
                <span>修改成功后请重新妥善保存新密码。</span>
                <el-button type="primary" @click="handleChangePassword">修改密码</el-button>
              </div>
            </el-form>
          </div>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="Agent配置" name="agents">
        <el-card shadow="never" class="settings-card">
          <template #header>
            <div class="section-heading">
              <div>
                <span class="kicker">Agents</span>
                <h3>数字员工配置</h3>
              </div>
              <span class="section-note">{{ enabledAgentCount }} / {{ agentConfigs.length }} 已启用</span>
            </div>
          </template>

          <div v-loading="agentsLoading" class="agent-config-grid">
            <div v-for="agent in agentConfigs" :key="agent.name" class="agent-config-item">
              <div class="agent-accent" :style="{ background: agent.color }"></div>
              <div class="agent-info">
                <div class="agent-icon" :style="{ color: agent.color }">
                  <el-icon :size="24"><component :is="agent.icon" /></el-icon>
                </div>
                <div>
                  <h4>{{ agent.name }}</h4>
                  <p>{{ agent.description }}</p>
                  <div class="agent-model-meta">
                    <el-tag size="small" effect="plain">{{ providerLabel(agent.config.provider) }}</el-tag>
                    <span>{{ agent.config.model || '未选择模型' }}</span>
                    <em>{{ agent.config.apiKey ? 'KEY 已配置' : '等待 API Key' }}</em>
                  </div>
                </div>
              </div>
              <div class="agent-actions">
                <el-tag :type="agent.enabled ? 'success' : 'info'" effect="plain">
                  {{ agent.enabled ? 'ONLINE' : 'PAUSED' }}
                </el-tag>
                <el-switch
                  v-model="agent.enabled"
                  :loading="Boolean(agentStatusUpdating[agent.id])"
                  @change="handleAgentEnabledChange(agent)"
                />
                <el-button type="primary" plain size="small" @click="handleConfigAgent(agent)">配置</el-button>
              </div>
            </div>
          </div>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="通知设置" name="notification">
        <el-card shadow="never" class="settings-card">
          <template #header>
            <div class="section-heading">
              <div>
                <span class="kicker">Notifications</span>
                <h3>通知偏好</h3>
              </div>
              <span class="section-note">{{ enabledNotificationCount }} 项开启</span>
            </div>
          </template>

          <div class="notification-list">
            <div v-for="item in notificationItems" :key="item.key" class="notification-item">
              <div>
                <strong>{{ item.title }}</strong>
                <span>{{ item.description }}</span>
              </div>
              <el-switch v-model="notificationSettings[item.key]" />
            </div>
          </div>
          <div class="form-actions notification-actions">
            <span>通知设置会影响工作台提醒和后续邮件推送策略。</span>
            <el-button type="primary" @click="handleSaveNotification">保存设置</el-button>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      v-model="configDialogVisible"
      :title="`配置 ${currentConfigAgent?.name || ''}`"
      width="760px"
      destroy-on-close
      class="agent-config-dialog"
    >
      <template v-if="currentConfigAgent">
        <div class="model-config-intro">
          <div>
            <span class="kicker">Model Access</span>
            <strong>{{ providerLabel(configForm.provider) }}</strong>
            <small>{{ activeProviderPreset?.description }}</small>
          </div>
          <el-tag effect="plain" :type="providerTagType(activeProviderPreset?.region)">
            {{ providerRegionLabel(activeProviderPreset?.region) }}
          </el-tag>
        </div>

        <el-form :model="configForm" label-position="top" class="settings-form model-config-form">
          <div class="form-grid">
            <el-form-item label="模型服务商">
              <el-select v-model="configForm.provider" filterable style="width: 100%;" @change="handleProviderChange">
                <el-option-group
                  v-for="group in providerGroups"
                  :key="group.region"
                  :label="providerRegionLabel(group.region)"
                >
                  <el-option
                    v-for="provider in group.providers"
                    :key="provider.value"
                    :label="provider.label"
                    :value="provider.value"
                  >
                    <div class="provider-option">
                      <span>{{ provider.label }}</span>
                      <small>{{ provider.protocol }}</small>
                    </div>
                  </el-option>
                </el-option-group>
              </el-select>
            </el-form-item>

            <el-form-item label="基础模型">
              <el-select
                v-model="configForm.model"
                filterable
                allow-create
                default-first-option
                style="width: 100%;"
                placeholder="选择或输入模型名"
              >
                <el-option
                  v-for="model in activeProviderPreset?.models || []"
                  :key="model.value"
                  :label="model.label"
                  :value="model.value"
                />
              </el-select>
            </el-form-item>
          </div>

          <div class="form-grid">
            <el-form-item label="API Key">
              <el-input
                v-model="configForm.apiKey"
                type="password"
                show-password
                clearable
                placeholder="请输入服务商 API Key；本地模型可留空"
              />
            </el-form-item>

            <el-form-item label="Base URL">
              <el-input
                v-model="configForm.baseUrl"
                clearable
                placeholder="例如 https://api.openai.com/v1 或 http://localhost:1234/v1"
              />
            </el-form-item>
          </div>

          <div class="model-tuning-grid">
            <el-form-item label="温度参数">
              <el-slider v-model="configForm.temperature" :min="0" :max="2" :step="0.1" show-input />
            </el-form-item>

            <el-form-item label="最大输出 Token">
              <el-input-number v-model="configForm.maxTokens" :min="256" :max="200000" :step="256" style="width: 100%;" />
            </el-form-item>
          </div>

          <el-form-item label="系统提示词">
            <el-input v-model="configForm.systemPrompt" type="textarea" :rows="5" placeholder="请输入系统提示词" />
          </el-form-item>

          <div class="model-switch-grid">
            <div class="model-switch-item">
              <div>
                <strong>启用记忆</strong>
                <span>保留多轮上下文策略，后续可接入长期记忆。</span>
              </div>
              <el-switch v-model="configForm.enableMemory" />
            </div>
            <div class="model-switch-item">
              <div>
                <strong>启用工具</strong>
                <span>允许 Agent 使用业务工具和知识库能力。</span>
              </div>
              <el-switch v-model="configForm.enableTools" />
            </div>
          </div>

          <div class="model-config-hint">
            <el-icon><Connection /></el-icon>
            <span>
              {{ activeProviderPreset?.apiKeyRequired ? '该服务商通常需要 API Key。' : '该接入方式允许不填写 API Key。' }}
              OpenAI 兼容服务会请求 <code>/chat/completions</code>，Ollama 会请求 <code>/api/chat</code>。
            </span>
          </div>
        </el-form>
      </template>
      <template #footer>
        <el-button @click="configDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="configSaving" @click="saveAgentConfig">保存配置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import {
  getAgentModelPresets,
  getConfigurableAgents,
  startAgent,
  stopAgent,
  updateAgentModelConfig,
} from '@/api/agent'
import type { Agent, AgentModelConfig, AgentModelProvider, AgentProviderPreset, AgentType } from '@/types'

const userStore = useUserStore()
const activeTab = ref('profile')
const passwordFormRef = ref<FormInstance>()

type AgentConfig = {
  id: string
  type: AgentType
  name: string
  icon: string
  description: string
  color: string
  enabled: boolean
  status: Agent['status']
  config: AgentModelConfig
}

type ProviderRegion = AgentProviderPreset['region']

type NotificationKey = 'system' | 'email' | 'taskReminder' | 'contractReminder' | 'ticketAssign'

type NotificationItem = {
  key: NotificationKey
  title: string
  description: string
}

const profileForm = reactive({
  username: userStore.username || 'admin',
  nickname: userStore.nickname || '管理员',
  email: 'admin@example.com',
  phone: '13800138000',
})

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const passwordRules: FormRules = {
  oldPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 32, message: '密码长度为6-32个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

const agentDisplayMeta: Record<AgentType, Pick<AgentConfig, 'name' | 'icon' | 'description' | 'color'>> = {
  FINANCE: { name: '财务Agent', icon: 'Money', description: '发票管理、记账、财务报表', color: '#409eff' },
  CUSTOMER_SERVICE: { name: '客服Agent', icon: 'Service', description: '对话管理、工单处理', color: '#67c23a' },
  LEGAL: { name: '法务Agent', icon: 'DocumentChecked', description: '合同管理、合规检查', color: '#e6a23c' },
  ADMIN: { name: '行政Agent', icon: 'OfficeBuilding', description: '日程、任务、会议纪要', color: '#f56c6c' },
}

const defaultPrompts: Record<AgentType, string> = {
  FINANCE: '你是严谨的财务助理，提供记账、发票和经营分析建议，不虚构数字。',
  CUSTOMER_SERVICE: '你是专业客服助理，回答清晰、友善，并在不确定时转人工。',
  LEGAL: '你是法务辅助工具，识别风险并明确提示内容不构成正式法律意见。',
  ADMIN: '你是行政助理，帮助拆解任务、日程和会议行动项。',
}

const fallbackProviderPresets: AgentProviderPreset[] = [
  {
    value: 'deepseek',
    label: 'DeepSeek',
    region: 'domestic',
    protocol: 'openai-compatible',
    defaultBaseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-v4-flash',
    apiKeyRequired: true,
    models: [
      { label: 'DeepSeek V4 Flash', value: 'deepseek-v4-flash' },
      { label: 'DeepSeek V4 Pro', value: 'deepseek-v4-pro' },
      { label: 'DeepSeek Chat (Legacy)', value: 'deepseek-chat' },
    ],
    description: '国产通用推理与代码能力，兼容 OpenAI Chat Completions。',
  },
  {
    value: 'moonshot',
    label: 'Kimi / Moonshot',
    region: 'domestic',
    protocol: 'openai-compatible',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'kimi-k2.6',
    apiKeyRequired: true,
    models: [
      { label: 'Kimi K2.6', value: 'kimi-k2.6' },
      { label: 'Kimi K2.7 Code', value: 'kimi-k2.7-code' },
    ],
    description: 'Kimi 常规对话模型，适合法务、长文档与知识问答。',
  },
  {
    value: 'kimi-code',
    label: 'Kimi Code',
    region: 'domestic',
    protocol: 'openai-compatible',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'kimi-k2.7-code',
    apiKeyRequired: true,
    models: [
      { label: 'Kimi K2.7 Code', value: 'kimi-k2.7-code' },
      { label: 'Kimi K2.6', value: 'kimi-k2.6' },
    ],
    description: '面向代码与 Agent 编排场景，可按官方模型名覆盖。',
  },
  {
    value: 'minimax',
    label: 'MiniMax',
    region: 'domestic',
    protocol: 'openai-compatible',
    defaultBaseUrl: 'https://api.minimax.io/v1',
    defaultModel: 'MiniMax-M3',
    apiKeyRequired: true,
    models: [
      { label: 'MiniMax M3', value: 'MiniMax-M3' },
      { label: 'MiniMax M2.7', value: 'MiniMax-M2.7' },
    ],
    description: '国产多模态与长上下文服务，支持 OpenAI 兼容接入。',
  },
  {
    value: 'qwen',
    label: '通义千问 / DashScope',
    region: 'domestic',
    protocol: 'openai-compatible',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    apiKeyRequired: true,
    models: [
      { label: 'Qwen Plus', value: 'qwen-plus' },
      { label: 'Qwen Max', value: 'qwen-max' },
    ],
    description: '阿里云百炼 / DashScope OpenAI 兼容模式。',
  },
  {
    value: 'zhipu',
    label: '智谱 GLM',
    region: 'domestic',
    protocol: 'openai-compatible',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-plus',
    apiKeyRequired: true,
    models: [
      { label: 'GLM-4 Plus', value: 'glm-4-plus' },
      { label: 'GLM-4 Air', value: 'glm-4-air' },
    ],
    description: '智谱 AI GLM 系列，适合通用办公与知识处理。',
  },
  {
    value: 'siliconflow',
    label: '硅基流动',
    region: 'domestic',
    protocol: 'openai-compatible',
    defaultBaseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'Qwen/Qwen2.5-72B-Instruct',
    apiKeyRequired: true,
    models: [
      { label: 'Qwen2.5 72B Instruct', value: 'Qwen/Qwen2.5-72B-Instruct' },
      { label: 'DeepSeek R1', value: 'deepseek-ai/DeepSeek-R1' },
    ],
    description: '聚合国产与开源大模型，OpenAI 兼容 API。',
  },
  {
    value: 'openai',
    label: 'OpenAI',
    region: 'international',
    protocol: 'openai-compatible',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    apiKeyRequired: true,
    models: [
      { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
      { label: 'GPT-4o', value: 'gpt-4o' },
      { label: 'GPT-4.1 Mini', value: 'gpt-4.1-mini' },
    ],
    description: 'OpenAI 官方 Chat Completions 兼容接入。',
  },
  {
    value: 'anthropic',
    label: 'Claude / Anthropic',
    region: 'international',
    protocol: 'anthropic',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-latest',
    apiKeyRequired: true,
    models: [
      { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-latest' },
      { label: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku-latest' },
    ],
    description: 'Anthropic Messages API，适合写作、法务审阅和长对话。',
  },
  {
    value: 'ollama',
    label: 'Ollama 本地模型',
    region: 'local',
    protocol: 'ollama',
    defaultBaseUrl: 'http://localhost:11434',
    defaultModel: 'llama3',
    apiKeyRequired: false,
    models: [
      { label: 'Llama 3', value: 'llama3' },
      { label: 'Qwen2.5', value: 'qwen2.5' },
      { label: 'DeepSeek R1', value: 'deepseek-r1' },
    ],
    description: '直接连接本机或局域网 Ollama 服务。',
  },
  {
    value: 'local-openai',
    label: '本地 OpenAI 兼容',
    region: 'local',
    protocol: 'openai-compatible',
    defaultBaseUrl: 'http://localhost:1234/v1',
    defaultModel: 'local-model',
    apiKeyRequired: false,
    models: [{ label: 'LM Studio 默认模型', value: 'local-model' }],
    description: '适配 LM Studio、vLLM、LocalAI 等本地 OpenAI 兼容服务。',
  },
  {
    value: 'custom-openai',
    label: '自定义 OpenAI 兼容',
    region: 'custom',
    protocol: 'openai-compatible',
    defaultBaseUrl: '',
    defaultModel: '',
    apiKeyRequired: false,
    models: [],
    description: '用于代理网关、企业私有模型平台或其他兼容服务。',
  },
]

const providerPresets = ref<AgentProviderPreset[]>(fallbackProviderPresets)
const agentConfigs = ref<AgentConfig[]>(Object.entries(agentDisplayMeta).map(([type, meta]) => ({
  id: '',
  type: type as AgentType,
  ...meta,
  enabled: true,
  status: 'ACTIVE',
  config: defaultAgentModelConfig(type as AgentType),
})))
const agentsLoading = ref(false)
const configSaving = ref(false)
const agentStatusUpdating = reactive<Record<string, boolean>>({})

const notificationSettings = reactive<Record<NotificationKey, boolean>>({
  system: true,
  email: false,
  taskReminder: true,
  contractReminder: true,
  ticketAssign: true,
})

const notificationItems: NotificationItem[] = [
  { key: 'system', title: '系统通知', description: '接收版本更新、服务状态和系统级提醒。' },
  { key: 'email', title: '邮件通知', description: '将重要事件同步到当前账号邮箱。' },
  { key: 'taskReminder', title: '任务到期提醒', description: '任务临近截止时间时提醒处理。' },
  { key: 'contractReminder', title: '合同到期提醒', description: '合同到期、续签和复审节点提醒。' },
  { key: 'ticketAssign', title: '工单分配通知', description: '客服工单被分配或升级时通知负责人。' },
]

const displayName = computed(() => profileForm.nickname || profileForm.username || 'OPC Owner')
const avatarInitial = computed(() => displayName.value.charAt(0).toUpperCase())
const enabledAgentCount = computed(() => agentConfigs.value.filter((agent) => agent.enabled).length)
const enabledNotificationCount = computed(() => notificationItems.filter((item) => notificationSettings[item.key]).length)
const settingStats = computed(() => [
  { label: 'Agent', value: `${enabledAgentCount.value}/${agentConfigs.value.length}`, note: '在线配置' },
  { label: '通知', value: `${enabledNotificationCount.value}`, note: '开启项' },
  { label: '角色', value: userStore.role || 'USER', note: '当前权限' },
])

const providerGroups = computed(() => {
  const order: ProviderRegion[] = ['domestic', 'international', 'local', 'custom']
  return order
    .map((region) => ({
      region,
      providers: providerPresets.value.filter((provider) => provider.region === region),
    }))
    .filter((group) => group.providers.length > 0)
})

onMounted(() => {
  void loadAgentSettings()
})

function handleSaveProfile() { ElMessage.success('个人信息已保存') }

async function handleChangePassword() {
  if (!passwordFormRef.value) return
  await passwordFormRef.value.validate()
  ElMessage.success('密码修改成功')
  passwordForm.oldPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
}

function handleSaveNotification() { ElMessage.success('通知设置已保存') }

function handleSaveAll() { ElMessage.success('系统设置已保存') }

const configDialogVisible = ref(false)
const currentConfigAgent = ref<AgentConfig | null>(null)
const configForm = reactive<AgentModelConfig>({
  provider: 'deepseek',
  model: 'deepseek-v4-flash',
  apiKey: '',
  baseUrl: 'https://api.deepseek.com',
  temperature: 0.7,
  maxTokens: 2000,
  systemPrompt: '',
  enableMemory: true,
  enableTools: true,
  apiKeyRequired: true,
})
const activeProviderPreset = computed(() => getProviderPreset(configForm.provider))

function handleConfigAgent(agent: AgentConfig) {
  currentConfigAgent.value = agent
  setConfigForm(agent.config, agent.type)
  configDialogVisible.value = true
}

function handleProviderChange(provider: AgentModelProvider) {
  const preset = getProviderPreset(provider)
  configForm.model = preset.defaultModel
  configForm.baseUrl = preset.defaultBaseUrl
  configForm.apiKeyRequired = preset.apiKeyRequired
}

async function saveAgentConfig() {
  if (!currentConfigAgent.value) return
  if (!currentConfigAgent.value.id) {
    ElMessage.warning('Agent 数据尚未同步，请确认后端服务可用')
    return
  }
  if (!configForm.model) {
    ElMessage.warning('请先选择或输入模型名称')
    return
  }
  if (!configForm.baseUrl) {
    ElMessage.warning('请填写 Base URL')
    return
  }

  configSaving.value = true
  try {
    const payload: AgentModelConfig = { ...configForm }
    const res = await updateAgentModelConfig(currentConfigAgent.value.id, payload)
    const updated = mapAgentToConfig(res.data)
    const index = agentConfigs.value.findIndex((item) => item.id === updated.id || item.type === updated.type)
    if (index >= 0) agentConfigs.value[index] = updated
    currentConfigAgent.value = updated
    ElMessage.success(`${updated.name} 配置已保存`)
    configDialogVisible.value = false
  } finally {
    configSaving.value = false
  }
}

async function handleAgentEnabledChange(agent: AgentConfig) {
  if (!agent.id) {
    ElMessage.warning('Agent 数据尚未同步，请确认后端服务可用')
    agent.enabled = !agent.enabled
    return
  }
  agentStatusUpdating[agent.id] = true
  const nextEnabled = agent.enabled
  try {
    const res = nextEnabled ? await startAgent(agent.id) : await stopAgent(agent.id)
    const updated = mapAgentToConfig(res.data)
    const index = agentConfigs.value.findIndex((item) => item.id === agent.id)
    if (index >= 0) agentConfigs.value[index] = updated
    ElMessage.success(`${updated.name} 已${updated.enabled ? '启用' : '暂停'}`)
  } catch (error) {
    agent.enabled = !nextEnabled
    throw error
  } finally {
    agentStatusUpdating[agent.id] = false
  }
}

async function loadAgentSettings() {
  agentsLoading.value = true
  try {
    const [presetsRes, agentsRes] = await Promise.all([
      getAgentModelPresets(),
      getConfigurableAgents(),
    ])
    providerPresets.value = presetsRes.data.length ? presetsRes.data : fallbackProviderPresets
    agentConfigs.value = agentsRes.data.map(mapAgentToConfig)
  } catch {
    ElMessage.warning('Agent 配置服务暂不可用，已显示本地默认配置')
  } finally {
    agentsLoading.value = false
  }
}

function mapAgentToConfig(agent: Agent): AgentConfig {
  const meta = agentDisplayMeta[agent.type]
  return {
    id: agent.id,
    type: agent.type,
    name: meta.name,
    icon: meta.icon,
    description: meta.description,
    color: meta.color,
    enabled: agent.status === 'ACTIVE',
    status: agent.status,
    config: normalizeModelConfig(agent.config, agent.type),
  }
}

function normalizeModelConfig(config: Partial<AgentModelConfig> | undefined, type: AgentType): AgentModelConfig {
  const fallback = defaultAgentModelConfig(type)
  const preset = getProviderPreset(config?.provider || fallback.provider)
  return {
    provider: preset.value,
    model: config?.model || preset.defaultModel || fallback.model,
    apiKey: config?.apiKey || '',
    baseUrl: config?.baseUrl || preset.defaultBaseUrl,
    temperature: typeof config?.temperature === 'number' ? config.temperature : fallback.temperature,
    maxTokens: typeof config?.maxTokens === 'number' ? config.maxTokens : fallback.maxTokens,
    systemPrompt: config?.systemPrompt || fallback.systemPrompt,
    enableMemory: typeof config?.enableMemory === 'boolean' ? config.enableMemory : fallback.enableMemory,
    enableTools: typeof config?.enableTools === 'boolean' ? config.enableTools : fallback.enableTools,
    apiKeyRequired: typeof config?.apiKeyRequired === 'boolean' ? config.apiKeyRequired : preset.apiKeyRequired,
  }
}

function defaultAgentModelConfig(type: AgentType): AgentModelConfig {
  const preset = fallbackProviderPresets[0]
  return {
    provider: preset.value,
    model: preset.defaultModel,
    apiKey: '',
    baseUrl: preset.defaultBaseUrl,
    temperature: 0.7,
    maxTokens: 2000,
    systemPrompt: defaultPrompts[type],
    enableMemory: true,
    enableTools: true,
    apiKeyRequired: preset.apiKeyRequired,
  }
}

function setConfigForm(config: AgentModelConfig, type: AgentType) {
  const normalized = normalizeModelConfig(config, type)
  configForm.provider = normalized.provider
  configForm.model = normalized.model
  configForm.apiKey = normalized.apiKey || ''
  configForm.baseUrl = normalized.baseUrl || ''
  configForm.temperature = normalized.temperature
  configForm.maxTokens = normalized.maxTokens
  configForm.systemPrompt = normalized.systemPrompt || defaultPrompts[type]
  configForm.enableMemory = normalized.enableMemory
  configForm.enableTools = normalized.enableTools
  configForm.apiKeyRequired = normalized.apiKeyRequired
}

function getProviderPreset(provider?: AgentModelProvider | string): AgentProviderPreset {
  return providerPresets.value.find((item) => item.value === provider) || fallbackProviderPresets[0]
}

function providerLabel(provider?: AgentModelProvider | string) {
  return getProviderPreset(provider).label
}

function providerRegionLabel(region?: ProviderRegion) {
  const labels: Record<ProviderRegion, string> = {
    domestic: '国产大模型',
    international: '国外大模型',
    local: '本地部署',
    custom: '自定义接入',
  }
  return region ? labels[region] : '模型接入'
}

function providerTagType(region?: ProviderRegion) {
  const types: Record<ProviderRegion, 'success' | 'warning' | 'info' | 'primary'> = {
    domestic: 'success',
    international: 'primary',
    local: 'warning',
    custom: 'info',
  }
  return region ? types[region] : 'info'
}
</script>

<style lang="scss" scoped>
.settings-page {
  --settings-panel: rgba(250, 243, 226, 0.88);
}

.settings-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sync-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  color: $forest;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: rgb(var(--success) / 0.1);
  border: 1px solid rgb(var(--success) / 0.4);
}

.sync-dot {
  width: 8px;
  height: 8px;
  background: rgb(var(--success));
  box-shadow: 0 0 0 4px rgb(var(--success) / 0.2);
}

.settings-hero {
  display: grid;
  grid-template-columns: minmax(280px, 1.15fr) minmax(360px, 1.85fr);
  gap: 16px;
  border-radius: 1.5rem;
  background: rgb(var(--surface) / 0.9);
  border: 1px solid rgb(var(--line) / 0.6);
  box-shadow: $shadow-soft;
  backdrop-filter: blur(8px);
  margin-bottom: 18px;
}

.identity-panel,
.settings-metrics {
  background: var(--settings-panel);
  border: 1px solid rgb(var(--line) / 0.7);
  box-shadow: $shadow-md;
}

.identity-panel {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
  padding: 18px;
}

.identity-avatar,
.profile-avatar {
  flex: 0 0 auto;
  font-family: var(--font-display);
  font-size: 30px;
  font-style: italic;
  color: $cream;
  background: $forest;
  border: 1px solid rgb(var(--line) / 0.7);
  box-shadow: $shadow-soft;
}

.identity-copy {
  display: grid;
  gap: 4px;
  min-width: 0;

  strong {
    overflow: hidden;
    font-family: var(--font-display);
    font-size: 24px;
    font-style: italic;
    font-weight: 500;
    color: $forest;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span:last-child {
    overflow: hidden;
    font-size: 12px;
    color: $text-secondary;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.settings-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.metric-item {
  display: grid;
  gap: 5px;
  padding: 18px;
  border-right: 1px solid $rule;

  &:last-child {
    border-right: none;
  }

  span {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
    color: $brass-deep;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  strong {
    font-family: var(--font-display);
    font-size: 28px;
    font-style: italic;
    font-weight: 500;
    color: $forest;
    line-height: 1;
  }

  small {
    font-size: 12px;
    color: $text-secondary;
  }
}

.settings-tabs {
  :deep(.el-tabs__content) {
    padding: 0;
  }

  :deep(.el-tabs__header) {
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgb(var(--line) / 0.6);
  }

  :deep(.el-tabs__nav) {
    width: 100%;
  }

  :deep(.el-tabs__nav-wrap::after) {
    display: none;
  }

  :deep(.el-tabs__item) {
    padding: 8px 20px;
    margin-right: 2px;
    font-family: var(--font-display);
    font-size: 14px;
    font-style: italic;
    font-weight: 500;
    color: $text-secondary;
    background: $cream-warm;
    border: 1px solid rgb(var(--line) / 0.7);
    border-bottom: none;
    transition: all $transition-duration;

    &:hover {
      color: $forest;
      background: $cream;
    }

    &.is-active {
      color: $forest;
      background: $cream;
      box-shadow: 0 -2px 0 $brass;
    }
  }
}

.settings-card {
  :deep(.el-card__body) {
    padding: 20px;
  }
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  h3 {
    margin-top: 3px;
    font-family: var(--font-display);
    font-size: 18px;
    font-style: italic;
    font-weight: 500;
    color: $forest;
  }
}

.section-note {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  color: $text-secondary;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.profile-grid,
.security-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 22px;
}

.profile-rail,
.security-note {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 18px;
  background:
    linear-gradient(135deg, rgba(183, 153, 110, 0.14), transparent 62%),
    $cream-warm;
  border: 1px solid rgb(var(--line) / 0.5);
}

.profile-rail {
  align-items: center;
  text-align: center;

  strong {
    font-family: var(--font-display);
    font-size: 18px;
    font-style: italic;
    font-weight: 500;
    color: $forest;
  }

  span {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
    color: $brass-deep;
    letter-spacing: 0.1em;
  }
}

.security-note {
  color: $forest;

  strong {
    font-size: 15px;
    line-height: 1.45;
  }

  span {
    font-size: 12px;
    line-height: 1.7;
    color: $text-secondary;
  }
}

.settings-form {
  min-width: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 18px;
}

.password-form {
  max-width: 560px;
}

.form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 6px;

  span {
    max-width: 420px;
    font-size: 12px;
    line-height: 1.6;
    color: $text-secondary;
  }
}

.agent-config-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.agent-config-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
  padding: 18px;
  overflow: hidden;
  background: $cream;
  border: 1px solid rgb(var(--line) / 0.7);
  box-shadow: $shadow-sm;
  transition: all $transition-duration;

  &:hover {
    background-color: $cream-warm;
    box-shadow: $shadow-soft;
    transform: translateY(-1px);
  }
}

.agent-accent {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 5px;
}

.agent-info {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;

  > div:last-child {
    min-width: 0;
  }

  h4 {
    margin-bottom: 4px;
    font-family: var(--font-display);
    font-size: 15px;
    font-style: italic;
    font-variation-settings: 'opsz' 96;
    font-weight: 500;
    color: $forest;
  }

  p {
    overflow: hidden;
    font-family: var(--font-body);
    font-size: 12px;
    color: $text-secondary;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.agent-model-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;

  span,
  em {
    font-family: var(--font-mono);
    font-size: 10px;
    font-style: normal;
    font-weight: 700;
    color: $text-secondary;
    letter-spacing: 0.02em;
  }

  span {
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  em {
    color: $brass-deep;
  }
}

.agent-icon {
  display: grid;
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  place-items: center;
  background: $cream-warm;
  border: 1px solid rgb(var(--line) / 0.5);
}

.agent-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
}

.notification-list {
  display: grid;
  gap: 12px;
}

.notification-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 16px 18px;
  background: $cream-warm;
  border: 1px solid rgb(var(--line) / 0.5);
  transition: all $transition-duration $transition-timing;

  &:hover {
    background: color-mix(in srgb, $brass 8%, $cream);
    transform: translateX(2px);
  }

  > div {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  strong {
    font-size: 14px;
    color: $forest;
  }

  span {
    font-size: 12px;
    line-height: 1.5;
    color: $text-secondary;
  }
}

.notification-actions {
  padding-top: 18px;
}

.model-config-intro {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 16px 18px;
  margin-bottom: 18px;
  background:
    linear-gradient(135deg, rgba(64, 158, 255, 0.08), transparent 58%),
    $cream-warm;
  border: 1px solid rgb(var(--line) / 0.5);

  > div {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  strong {
    font-family: var(--font-display);
    font-size: 22px;
    font-style: italic;
    font-weight: 500;
    color: $forest;
  }

  small {
    color: $text-secondary;
    line-height: 1.6;
  }
}

.model-config-form {
  :deep(.el-form-item__label) {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 800;
    color: $forest;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
}

.provider-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;

  small {
    font-family: var(--font-mono);
    font-size: 10px;
    color: $text-secondary;
  }
}

.model-tuning-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 18px;
}

.model-switch-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.model-switch-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  background: $cream;
  border: 1px solid rgb(var(--line) / 0.5);

  > div {
    display: grid;
    gap: 3px;
    min-width: 0;
  }

  strong {
    color: $forest;
    font-size: 14px;
  }

  span {
    color: $text-secondary;
    font-size: 12px;
    line-height: 1.5;
  }
}

.model-config-hint {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  color: $text-secondary;
  background: color-mix(in srgb, $brass 8%, $cream);
  border: 1px solid $rule;

  span {
    font-size: 12px;
    line-height: 1.65;
  }

  code {
    padding: 1px 4px;
    font-family: var(--font-mono);
    color: $forest;
    background: rgba(255, 255, 255, 0.5);
    border: 1px solid $rule;
  }
}

@media (max-width: 1100px) {
  .settings-hero,
  .profile-grid,
  .security-layout,
  .agent-config-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .settings-header-actions,
  .form-actions,
  .notification-item {
    align-items: stretch;
    flex-direction: column;
  }

  .settings-metrics,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .metric-item {
    border-right: none;
    border-bottom: 1px solid $rule;

    &:last-child {
      border-bottom: none;
    }
  }

  .agent-config-item {
    align-items: flex-start;
    flex-direction: column;
  }

  .agent-actions {
    justify-content: space-between;
    width: 100%;
  }

  .agent-model-meta span {
    max-width: 100%;
  }

  .model-config-intro,
  .model-switch-item {
    align-items: stretch;
    flex-direction: column;
  }

  .model-tuning-grid,
  .model-switch-grid {
    grid-template-columns: 1fr;
  }
}
</style>
