<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">系统设置</h2>
    </div>

    <el-tabs v-model="activeTab" class="settings-tabs">
      <!-- 个人信息 -->
      <el-tab-pane label="个人信息" name="profile">
        <el-card shadow="never">
          <el-form :model="profileForm" label-width="100px" style="max-width: 500px;">
            <el-form-item label="头像">
              <el-avatar :size="64" :src="userStore.avatar || undefined">
                {{ userStore.nickname?.charAt(0) || 'U' }}
              </el-avatar>
              <el-button size="small" style="margin-left: 12px;">更换头像</el-button>
            </el-form-item>
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
            <el-form-item>
              <el-button type="primary" @click="handleSaveProfile">保存</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <!-- 修改密码 -->
      <el-tab-pane label="修改密码" name="password">
        <el-card shadow="never">
          <el-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" label-width="100px" style="max-width: 500px;">
            <el-form-item label="当前密码" prop="oldPassword">
              <el-input v-model="passwordForm.oldPassword" type="password" show-password placeholder="请输入当前密码" />
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword">
              <el-input v-model="passwordForm.newPassword" type="password" show-password placeholder="请输入新密码" />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input v-model="passwordForm.confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleChangePassword">修改密码</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <!-- Agent配置 -->
      <el-tab-pane label="Agent配置" name="agents">
        <el-card shadow="never">
          <div class="agent-config-list">
            <div v-for="agent in agentConfigs" :key="agent.name" class="agent-config-item">
              <div class="agent-info">
                <el-icon :size="24" :color="agent.color"><component :is="agent.icon" /></el-icon>
                <div>
                  <h4>{{ agent.name }}</h4>
                  <p>{{ agent.description }}</p>
                </div>
              </div>
              <div class="agent-actions">
                <el-switch v-model="agent.enabled" active-text="启用" inactive-text="禁用" />
                <el-button type="primary" plain size="small" @click="handleConfigAgent(agent)">配置</el-button>
              </div>
            </div>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 通知设置 -->
      <el-tab-pane label="通知设置" name="notification">
        <el-card shadow="never">
          <el-form label-width="160px" style="max-width: 600px;">
            <el-form-item label="系统通知">
              <el-switch v-model="notificationSettings.system" />
            </el-form-item>
            <el-form-item label="邮件通知">
              <el-switch v-model="notificationSettings.email" />
            </el-form-item>
            <el-form-item label="任务到期提醒">
              <el-switch v-model="notificationSettings.taskReminder" />
            </el-form-item>
            <el-form-item label="合同到期提醒">
              <el-switch v-model="notificationSettings.contractReminder" />
            </el-form-item>
            <el-form-item label="工单分配通知">
              <el-switch v-model="notificationSettings.ticketAssign" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSaveNotification">保存设置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- Agent 配置弹窗 -->
    <el-dialog v-model="configDialogVisible" :title="`配置 ${currentConfigAgent?.name || ''}`" width="560px" destroy-on-close class="agent-config-dialog">
      <template v-if="currentConfigAgent">
        <el-form :model="configForm" label-width="100px">
          <el-form-item label="基础模型">
            <el-select v-model="configForm.model" style="width: 100%;">
              <el-option label="GPT-4o" value="gpt-4o" />
              <el-option label="GPT-4o Mini" value="gpt-4o-mini" />
              <el-option label="Claude 3.5 Sonnet" value="claude-3.5-sonnet" />
              <el-option label="通义千问 Max" value="qwen-max" />
            </el-select>
          </el-form-item>
          <el-form-item label="温度参数">
            <el-slider v-model="configForm.temperature" :min="0" :max="1" :step="0.1" show-input />
          </el-form-item>
          <el-form-item label="系统提示词">
            <el-input v-model="configForm.systemPrompt" type="textarea" :rows="5" placeholder="请输入系统提示词" />
          </el-form-item>
          <el-form-item label="启用记忆">
            <el-switch v-model="configForm.enableMemory" />
          </el-form-item>
          <el-form-item label="启用工具">
            <el-switch v-model="configForm.enableTools" />
          </el-form-item>
        </el-form>
      </template>
      <template #footer>
        <el-button @click="configDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveAgentConfig">保存配置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useUserStore } from '@/stores/user'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'

const userStore = useUserStore()
const activeTab = ref('profile')
const passwordFormRef = ref<FormInstance>()

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

const agentConfigs = ref([
  { name: '财务Agent', icon: 'Money', description: '发票管理、记账、财务报表', color: '#409eff', enabled: true },
  { name: '客服Agent', icon: 'Service', description: '对话管理、工单处理', color: '#67c23a', enabled: true },
  { name: '法务Agent', icon: 'DocumentChecked', description: '合同管理、合规检查', color: '#e6a23c', enabled: true },
  { name: '行政Agent', icon: 'OfficeBuilding', description: '日程、任务、会议纪要', color: '#f56c6c', enabled: true },
])

const notificationSettings = reactive({
  system: true,
  email: false,
  taskReminder: true,
  contractReminder: true,
  ticketAssign: true,
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

const configDialogVisible = ref(false)
const currentConfigAgent = ref<any>(null)
const configForm = reactive({
  model: 'gpt-4o-mini',
  temperature: 0.7,
  systemPrompt: '',
  enableMemory: true,
  enableTools: true,
})

function handleConfigAgent(agent: any) {
  currentConfigAgent.value = agent
  configForm.model = 'gpt-4o-mini'
  configForm.temperature = 0.7
  configForm.systemPrompt = `你是${agent.name}，请按照既定职责为团队提供专业、可靠的协助。`
  configForm.enableMemory = true
  configForm.enableTools = true
  configDialogVisible.value = true
}

function saveAgentConfig() {
  ElMessage.success(`${currentConfigAgent.value?.name || ''} 配置已保存`)
  configDialogVisible.value = false
}
</script>

<style lang="scss" scoped>
.settings-tabs {
  :deep(.el-tabs__content) {
    padding: 0;
  }
  :deep(.el-tabs__header) {
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 2px solid $forest;
  }
  :deep(.el-tabs__nav-wrap::after) {
    display: none;
  }
  :deep(.el-tabs__item) {
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 500;
    font-style: italic;
    color: $text-secondary;
    padding: 8px 20px;
    margin-right: 2px;
    background: $cream-warm;
    border: 2px solid $forest;
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

.agent-config-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.agent-config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: $cream;
  border: 2px solid $forest;
  box-shadow: 3px 3px 0 rgba(31, 42, 36, 0.08);
  transition: all $transition-duration;

  &:hover {
    background-color: $cream-warm;
    box-shadow: 4px 4px 0 rgba(31, 42, 36, 0.16);
    transform: translateY(-1px);
  }
}

.agent-info {
  display: flex;
  align-items: center;
  gap: 14px;

  h4 { 
    font-family: var(--font-display);
    font-size: 15px; 
    font-weight: 500;
    font-style: italic;
    font-variation-settings: 'opsz' 96;
    color: $forest;
    margin-bottom: 4px; 
  }
  p { 
    font-size: 12px; 
    color: $text-secondary; 
    font-family: var(--font-body);
  }
}

.agent-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}
</style>
