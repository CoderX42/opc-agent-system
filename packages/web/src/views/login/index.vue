<template>
  <main class="login-shell">
    <section class="login-story">
      <div class="story-grid"></div>
      <header class="story-brand">
        <div class="brand-mark">O</div>
        <div><strong>OPC AGENT</strong><span>Digital workforce system</span></div>
      </header>

      <div class="story-content">
        <span class="story-kicker"><i></i> BUILT FOR ONE-PERSON COMPANIES</span>
        <h1>一个人经营，<br><em>一支团队协作。</em></h1>
        <p>让财务、客服、法务和行政数字员工承担重复工作，把你的注意力留给真正重要的决策。</p>

        <div class="story-agents">
          <div v-for="agent in storyAgents" :key="agent.label" class="story-agent">
            <span :style="{ background: agent.color }"><el-icon><component :is="agent.icon" /></el-icon></span>
            <div><strong>{{ agent.label }}</strong><small>{{ agent.caption }}</small></div>
          </div>
        </div>
      </div>

      <footer class="story-footer">
        <span><i></i> 所有服务运行正常</span>
        <span>OPC / 2026</span>
      </footer>
    </section>

    <section class="login-entry">
      <div class="entry-top">
        <span>首次使用？</span>
        <el-button plain>创建账户</el-button>
      </div>

      <div class="login-card">
        <div class="mobile-brand"><div class="brand-mark">O</div><strong>OPC AGENT</strong></div>
        <div class="login-header">
          <span class="login-index">SECURE WORKSPACE</span>
          <h2>欢迎回来</h2>
          <p>登录你的数字员工工作空间</p>
        </div>

        <el-form
          ref="loginFormRef"
          :model="loginForm"
          :rules="loginRules"
          class="login-form"
          size="large"
          label-position="top"
          @keyup.enter="handleLogin"
        >
          <el-form-item label="用户名或邮箱" prop="username">
            <el-input
              v-model="loginForm.username"
              placeholder="name@company.com"
              prefix-icon="User"
              clearable
            />
          </el-form-item>

          <el-form-item label="密码" prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="至少 6 位字符"
              prefix-icon="Lock"
              show-password
            />
          </el-form-item>

          <div class="login-options">
            <el-checkbox v-model="rememberMe">保持登录</el-checkbox>
            <el-link type="primary" :underline="false">忘记密码？</el-link>
          </div>

          <el-button
            type="primary"
            :loading="loading"
            class="login-btn"
            @click="handleLogin"
          >
            <span>{{ loading ? '正在进入工作空间...' : '进入工作空间' }}</span>
            <el-icon v-if="!loading"><ArrowRight /></el-icon>
          </el-button>
        </el-form>

        <div class="trust-note">
          <el-icon><Lock /></el-icon>
          <span>连接使用加密通道保护</span>
        </div>
      </div>

      <footer class="entry-footer">© 2026 OPC Agent System · 隐私 · 帮助</footer>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const loginFormRef = ref<FormInstance>()
const loading = ref(false)
const rememberMe = ref(false)

const storyAgents = [
  { label: '财务', caption: '数据清晰', icon: 'Money', color: '#397bff' },
  { label: '客服', caption: '及时响应', icon: 'Service', color: '#2f9e72' },
  { label: '法务', caption: '风险可控', icon: 'DocumentChecked', color: '#e68a3f' },
  { label: '行政', caption: '事务有序', icon: 'OfficeBuilding', color: '#d95951' },
]

const loginForm = reactive({
  username: '',
  password: '',
})

const loginRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度为2-20个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 32, message: '密码长度为6-32个字符', trigger: 'blur' },
  ],
}

async function handleLogin() {
  if (!loginFormRef.value) return

  await loginFormRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    try {
      await userStore.login({
        username: loginForm.username,
        password: loginForm.password,
      })
      ElMessage.success('登录成功')
      const redirect = (route.query.redirect as string) || '/'
      router.push(redirect)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '登录失败'
      ElMessage.error(message)
    } finally {
      loading.value = false
    }
  })
}
</script>

<style lang="scss" scoped>
.login-shell {
  width: 100%;
  min-height: 100%;
  display: grid;
  grid-template-columns: minmax(520px, 1.15fr) minmax(460px, 0.85fr);
  background: $page-bg;
}

.login-story {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 34px 42px 26px;
  overflow: hidden;
  color: #faf3e2;
  border-right: 2px solid $forest;
  background:
    repeating-linear-gradient(90deg, rgba(250, 243, 226, 0.03) 0 1px, transparent 1px 32px),
    repeating-linear-gradient(rgba(250, 243, 226, 0.03) 0 1px, transparent 1px 32px),
    $forest;
}

.story-grid {
  position: absolute;
  inset: 0;
  opacity: 0.08;
  background-image:
    linear-gradient(rgba(183, 153, 110, 0.2) 1px, transparent 1px),
    linear-gradient(90deg, rgba(183, 153, 110, 0.2) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: linear-gradient(135deg, black, transparent 72%);
}

.story-brand, .story-content, .story-footer { position: relative; z-index: 1; }
.story-brand { display: flex; align-items: center; gap: 12px; }
.brand-mark {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  color: $forest;
  background: $brass;
  border: 2px solid #faf3e2;
  font-family: var(--font-display);
  font-size: 20px;
  font-style: italic;
  font-weight: 600;
  box-shadow: 3px 3px 0 rgba(250, 243, 226, 0.1);
}
.story-brand > div:last-child { display: flex; flex-direction: column; }
.story-brand strong { 
  font-family: var(--font-display);
  font-size: 13px; 
  font-weight: 500;
  font-style: italic;
  letter-spacing: .08em; 
}
.story-brand span { 
  margin-top: 2px; 
  font-family: var(--font-mono);
  font-size: 8px; 
  font-weight: 500;
  letter-spacing: .14em; 
  text-transform: uppercase;
  color: rgba(250, 243, 226, .42); 
}

.story-content { width: min(670px, 92%); margin: auto 0; padding: 50px 0; }
.story-kicker { 
  display: flex; 
  align-items: center; 
  gap: 10px; 
  font-family: var(--font-mono);
  font-size: 9px; 
  font-weight: 500;
  letter-spacing: .2em;
  text-transform: uppercase;
  color: rgba(250, 243, 226, .48); 
}
.story-kicker i { width: 24px; height: 2px; background: $brass; }
.story-content h1 { 
  margin-top: 18px; 
  font-family: var(--font-display);
  font-size: clamp(44px, 5vw, 72px); 
  font-weight: 500;
  font-style: italic;
  font-variation-settings: 'opsz' 96, 'SOFT' 30;
  line-height: 1.08; 
  letter-spacing: -.02em; 
}
.story-content h1 em { color: $brass; font-style: italic; }
.story-content > p { 
  max-width: 540px; 
  margin-top: 20px; 
  font-family: var(--font-display);
  font-size: 13px; 
  font-weight: 300;
  font-style: italic;
  line-height: 1.7; 
  color: rgba(250, 243, 226, .57); 
}

.story-agents { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 34px; }
.story-agent { 
  display: flex; 
  align-items: center; 
  gap: 9px; 
  padding: 10px; 
  background: rgba(250, 243, 226, 0.05); 
  border: 1px solid rgba(183, 153, 110, 0.2);
  backdrop-filter: blur(8px);
}
.story-agent > span { 
  width: 30px; 
  height: 30px; 
  display: grid; 
  place-items: center; 
  flex: 0 0 30px; 
  color: #faf3e2; 
  border: 1.5px solid $forest;
}
.story-agent > div { min-width: 0; display: flex; flex-direction: column; }
.story-agent strong { 
  font-family: var(--font-display);
  font-size: 10px; 
  font-weight: 500;
  font-style: italic;
}
.story-agent small { 
  margin-top: 2px; 
  font-family: var(--font-mono);
  font-size: 8px; 
  font-weight: 500;
  letter-spacing: 0.08em;
  color: rgba(250, 243, 226, .38); 
  white-space: nowrap; 
}

.story-footer { 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  font-family: var(--font-mono);
  font-size: 8px; 
  font-weight: 500;
  letter-spacing: .12em;
  color: rgba(250, 243, 226, .38); 
}
.story-footer > span:first-child { display: flex; align-items: center; gap: 7px; }
.story-footer i { 
  width: 6px; 
  height: 6px; 
  background: $success-color; 
  border: 1px solid #faf3e2;
  animation: status-blink 1.2s steps(2, jump-none) infinite;
}

@keyframes status-blink { 50% { opacity: 0.35; } }

.login-entry { min-height: 100vh; display: flex; flex-direction: column; padding: 26px 42px 22px; }
.entry-top { 
  display: flex; 
  align-items: center; 
  justify-content: flex-end; 
  gap: 12px; 
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.1em;
  color: $text-secondary; 
}
.entry-top :deep(.el-button) { 
  min-height: 34px; 
  border-radius: 0;
  border: 1.5px solid $forest;
  font-family: var(--font-body);
  font-weight: 600;
}
.login-card { width: min(420px, 100%); margin: auto; padding: 38px 0; }
.mobile-brand { display: none; }
.login-index { 
  font-family: var(--font-mono);
  font-size: 9px; 
  font-weight: 500;
  letter-spacing: .18em;
  text-transform: uppercase;
  padding: 2px 6px;
  border: 1px solid $brass;
  background: $cream-warm;
  color: $brass-deep;
}
.login-header h2 { 
  margin-top: 9px; 
  font-family: var(--font-display);
  font-size: 32px; 
  font-weight: 500;
  font-style: italic;
  font-variation-settings: 'opsz' 96;
  letter-spacing: -.02em; 
  color: $forest;
}
.login-header p { 
  margin-top: 7px; 
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 300;
  font-style: italic;
  color: $text-secondary; 
}

.login-form { margin-top: 30px; }
.login-form :deep(.el-form-item) { margin-bottom: 18px; }
.login-form :deep(.el-form-item__label) { 
  padding-bottom: 6px; 
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: $text-regular; 
}
.login-form :deep(.el-input__wrapper) { 
  min-height: 46px; 
  padding: 0 14px; 
  background: $cream; 
  border: 2px solid $forest;
  border-radius: 0;
  box-shadow: 3px 3px 0 rgba(31, 42, 36, 0.1);
}
.login-options { display: flex; align-items: center; justify-content: space-between; margin: -3px 0 20px; }
.login-options :deep(.el-checkbox__label) { 
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.08em;
}
.login-options :deep(.el-link__inner) { 
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.08em;
}
.login-btn { 
  width: 100%; 
  min-height: 48px; 
  display: flex; 
  background: $brass;
  border-color: $brass;
  border-radius: 0;
  box-shadow: 4px 4px 0 rgba(31, 42, 36, 0.2);
}
.login-btn :deep(span) { 
  width: 100%; 
  display: flex; 
  align-items: center; 
  justify-content: space-between;
  font-family: var(--font-body);
  font-weight: 600;
  color: $forest;
}

.trust-note { 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  gap: 6px; 
  margin-top: 18px; 
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: $text-secondary; 
}
.entry-footer { 
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-align: center; 
  color: $text-placeholder; 
}

@media (max-width: 1020px) {
  .login-shell { grid-template-columns: minmax(420px, .9fr) minmax(430px, 1fr); }
  .story-agents { grid-template-columns: repeat(2, 1fr); }
  .story-content h1 { font-size: 46px; }
}

@media (max-width: 780px) {
  .login-shell { display: block; }
  .login-story { display: none; }
  .login-entry { padding: 24px; background: $page-bg; }
  .entry-top { display: none; }
  .login-card { padding: 26px 0; }
  .mobile-brand { 
    display: flex; 
    align-items: center; 
    gap: 11px; 
    margin-bottom: 48px; 
    letter-spacing: .08em; 
  }
  .mobile-brand .brand-mark { width: 36px; height: 36px; font-size: 18px; }
  .mobile-brand strong { 
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 500;
    font-style: italic;
    color: $forest;
  }
  .entry-footer { margin-top: auto; }
}
</style>
