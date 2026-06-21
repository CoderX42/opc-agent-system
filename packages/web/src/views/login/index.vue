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
  background: #f5f5ef;
}

.login-story {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 38px 46px 30px;
  overflow: hidden;
  color: #f4f8f3;
  background:
    radial-gradient(circle at 82% 18%, rgba(201, 242, 123, 0.13), transparent 24%),
    radial-gradient(circle at 10% 90%, rgba(57, 123, 255, 0.12), transparent 28%),
    #0d211c;
}

.story-grid {
  position: absolute;
  inset: 0;
  opacity: 0.14;
  background-image:
    linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px);
  background-size: 46px 46px;
  mask-image: linear-gradient(135deg, black, transparent 72%);
}

.story-brand, .story-content, .story-footer { position: relative; z-index: 1; }
.story-brand { display: flex; align-items: center; gap: 12px; }
.brand-mark {
  width: 41px;
  height: 41px;
  display: grid;
  place-items: center;
  color: #10251f;
  background: $accent-color;
  border-radius: 13px 13px 13px 4px;
  font-size: 21px;
  font-weight: 850;
}
.story-brand > div:last-child { display: flex; flex-direction: column; }
.story-brand strong { font-size: 13px; font-weight: 800; letter-spacing: .11em; }
.story-brand span { margin-top: 2px; color: rgba(235, 243, 236, .42); font-size: 9px; letter-spacing: .08em; text-transform: uppercase; }

.story-content { width: min(670px, 92%); margin: auto 0; padding: 60px 0; }
.story-kicker { display: flex; align-items: center; gap: 9px; color: rgba(236, 244, 237, .48); font-size: 9px; font-weight: 750; letter-spacing: .15em; }
.story-kicker i { width: 20px; height: 2px; background: $accent-color; }
.story-content h1 { margin-top: 21px; font-size: clamp(48px, 5.2vw, 76px); font-weight: 660; line-height: 1.08; letter-spacing: -.06em; }
.story-content h1 em { color: $accent-color; font-style: normal; }
.story-content > p { max-width: 540px; margin-top: 22px; color: rgba(236, 244, 237, .57); font-size: 14px; line-height: 1.85; }

.story-agents { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 38px; }
.story-agent { display: flex; align-items: center; gap: 9px; padding: 10px; background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.07); border-radius: 12px; backdrop-filter: blur(8px); }
.story-agent > span { width: 31px; height: 31px; display: grid; place-items: center; flex: 0 0 31px; color: #fff; border-radius: 9px; }
.story-agent > div { min-width: 0; display: flex; flex-direction: column; }
.story-agent strong { font-size: 10px; }
.story-agent small { margin-top: 2px; color: rgba(234,242,235,.38); font-size: 8px; white-space: nowrap; }

.story-footer { display: flex; align-items: center; justify-content: space-between; color: rgba(234,242,235,.38); font-size: 9px; letter-spacing: .08em; }
.story-footer > span:first-child { display: flex; align-items: center; gap: 7px; }
.story-footer i { width: 7px; height: 7px; background: $accent-color; border-radius: 50%; box-shadow: 0 0 0 4px rgba(201,242,123,.08); }

.login-entry { min-height: 100vh; display: flex; flex-direction: column; padding: 30px 46px 24px; }
.entry-top { display: flex; align-items: center; justify-content: flex-end; gap: 12px; color: $text-secondary; font-size: 11px; }
.entry-top :deep(.el-button) { min-height: 34px; }
.login-card { width: min(420px, 100%); margin: auto; padding: 42px 0; }
.mobile-brand { display: none; }
.login-index { color: $primary-color; font-size: 9px; font-weight: 800; letter-spacing: .14em; }
.login-header h2 { margin-top: 9px; color: $text-primary; font-size: 36px; font-weight: 730; letter-spacing: -.055em; }
.login-header p { margin-top: 7px; color: $text-secondary; font-size: 13px; }

.login-form { margin-top: 34px; }
.login-form :deep(.el-form-item) { margin-bottom: 20px; }
.login-form :deep(.el-form-item__label) { padding-bottom: 7px; color: $text-regular; font-size: 11px; font-weight: 680; }
.login-form :deep(.el-input__wrapper) { min-height: 48px; padding: 0 14px; background: rgba(255,255,255,.76); }
.login-options { display: flex; align-items: center; justify-content: space-between; margin: -3px 0 22px; }
.login-options :deep(.el-checkbox__label), .login-options :deep(.el-link__inner) { font-size: 11px; }
.login-btn { width: 100%; min-height: 50px; display: flex; }
.login-btn :deep(span) { width: 100%; display: flex; align-items: center; justify-content: space-between; }

.trust-note { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 20px; color: $text-placeholder; font-size: 9px; }
.entry-footer { color: $text-placeholder; font-size: 9px; text-align: center; letter-spacing: .04em; }

@media (max-width: 1020px) {
  .login-shell { grid-template-columns: minmax(420px, .9fr) minmax(430px, 1fr); }
  .story-agents { grid-template-columns: repeat(2, 1fr); }
  .story-content h1 { font-size: 50px; }
}

@media (max-width: 780px) {
  .login-shell { display: block; }
  .login-story { display: none; }
  .login-entry { padding: 24px; background: radial-gradient(circle at 90% 0%, rgba(201,242,123,.22), transparent 32%), #f5f5ef; }
  .entry-top { display: none; }
  .login-card { padding: 26px 0; }
  .mobile-brand { display: flex; align-items: center; gap: 11px; margin-bottom: 54px; color: $text-primary; letter-spacing: .08em; }
  .mobile-brand .brand-mark { width: 36px; height: 36px; font-size: 18px; }
  .entry-footer { margin-top: auto; }
}
</style>
