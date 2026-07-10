<template>
  <main class="auth-shell">
    <section class="auth-story">
      <div class="story-grid"></div>
      <header class="story-brand">
        <div class="brand-mark"><img src="/brand/opc-cloud-logo.png" alt="OPC Agent 云端标识" /></div>
        <div><strong>OPC AGENT</strong><span>Digital workforce system</span></div>
      </header>
      <div class="story-content">
        <span class="story-kicker"><i></i> SET NEW PASSWORD</span>
        <h1>设置新密码，<br><em>恢复账户访问。</em></h1>
        <p>请设置一个包含字母与数字、至少 8 位的新密码。重置成功后可使用新密码登录。</p>
      </div>
      <footer class="story-footer">
        <span><i></i> 所有服务运行正常</span>
        <span>OPC / 2026</span>
      </footer>
    </section>

    <section class="auth-entry">
      <div class="entry-top">
        <span>需要帮助？</span>
        <el-button plain @click="goLogin">返回登录</el-button>
      </div>

      <div class="auth-card">
        <div class="mobile-brand"><div class="brand-mark"><img src="/brand/opc-cloud-logo.png" alt="OPC Agent 云端标识" /></div><strong>OPC AGENT</strong></div>

        <!-- 无效令牌提示 -->
        <template v-if="invalidToken">
          <div class="auth-header">
            <span class="auth-index danger">LINK INVALID</span>
            <h2>链接无效</h2>
            <p>重置链接缺失或格式不正确，请重新申请密码重置。</p>
          </div>
          <div class="result-card">
            <el-icon class="result-icon danger"><CircleCloseFilled /></el-icon>
            <p>请通过忘记密码页面重新获取重置链接。</p>
            <el-button class="auth-btn" @click="goForgot">
              <span>前往忘记密码</span>
            </el-button>
          </div>
        </template>

        <!-- 重置成功 -->
        <template v-else-if="success">
          <div class="auth-header">
            <span class="auth-index success">PASSWORD UPDATED</span>
            <h2>密码已重置</h2>
            <p>你的账户密码已成功更新，请使用新密码登录。</p>
          </div>
          <div class="result-card">
            <el-icon class="result-icon success"><CircleCheckFilled /></el-icon>
            <p>即将跳转到登录页...</p>
            <el-button class="auth-btn" @click="goLogin">
              <span>立即登录</span>
            </el-button>
          </div>
        </template>

        <!-- 重置表单 -->
        <template v-else>
          <div class="auth-header">
            <span class="auth-index">RESET PASSWORD</span>
            <h2>设置新密码</h2>
            <p>请输入并确认你的新密码</p>
          </div>

          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            class="auth-form"
            size="large"
            label-position="top"
            @keyup.enter="handleReset"
          >
            <el-form-item label="新密码" prop="password">
              <el-input
                v-model="form.password"
                type="password"
                placeholder="至少 8 位，包含字母与数字"
                prefix-icon="Lock"
                show-password
              />
              <div v-if="form.password" class="password-strength">
                <div class="strength-bar">
                  <span
                    v-for="seg in 3"
                    :key="seg"
                    class="strength-seg"
                    :class="strengthClass(seg)"
                  ></span>
                </div>
                <span class="strength-text">{{ passwordAssessment.hint }}</span>
              </div>
            </el-form-item>

            <el-form-item label="确认新密码" prop="confirmPassword">
              <el-input
                v-model="form.confirmPassword"
                type="password"
                placeholder="再次输入新密码"
                prefix-icon="Lock"
                show-password
              />
            </el-form-item>

            <el-button
              type="primary"
              :loading="loading"
              class="auth-btn"
              @click="handleReset"
            >
              <span>{{ loading ? '正在重置...' : '重置密码' }}</span>
              <el-icon v-if="!loading"><ArrowRight /></el-icon>
            </el-button>
          </el-form>

          <div class="trust-note">
            <el-icon><Lock /></el-icon>
            <span>连接使用加密通道保护</span>
          </div>
        </template>
      </div>

      <footer class="entry-footer">© 2026 OPC Agent System · 隐私 · 帮助</footer>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { resetPassword } from '@/api/auth'
import { assessPassword, isPasswordAcceptable } from '@/utils/password'

const router = useRouter()
const route = useRoute()

const formRef = ref<FormInstance>()
const loading = ref(false)
const success = ref(false)

/** 从 URL 查询参数中获取重置令牌 */
const token = computed(() => (route.query.token as string) || '')
const invalidToken = computed(() => !token.value)

const form = reactive({
  password: '',
  confirmPassword: '',
})

const passwordAssessment = computed(() => assessPassword(form.password))

function strengthClass(seg: number) {
  const map: Record<number, string> = { 1: 'weak', 2: 'medium', 3: 'strong' }
  const level =
    passwordAssessment.value.strength === 'strong'
      ? 3
      : passwordAssessment.value.strength === 'medium'
        ? 2
        : passwordAssessment.value.strength === 'weak'
          ? 1
          : 0
  if (seg <= level) return map[level]
  return ''
}

const validateConfirmPassword = (
  _rule: unknown,
  value: string,
  callback: (error?: Error) => void,
) => {
  if (!value) {
    callback(new Error('请再次输入新密码'))
  } else if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules: FormRules = {
  password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        if (!value) {
          callback(new Error('请输入新密码'))
        } else if (!isPasswordAcceptable(value)) {
          callback(new Error('密码至少 8 位，且需同时包含字母与数字'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
  confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }],
}

function goLogin() {
  router.push('/login')
}

function goForgot() {
  router.push('/forgot-password')
}

async function handleReset() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      await resetPassword({ token: token.value, newPassword: form.password })
      success.value = true
      ElMessage.success('密码已重置')
      // 3 秒后自动跳转到登录页
      setTimeout(() => router.push('/login'), 3000)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '重置失败'
      ElMessage.error(message)
    } finally {
      loading.value = false
    }
  })
}
</script>

<style lang="scss" scoped>
.auth-shell { width: 100%; min-height: 100%; display: grid; grid-template-columns: minmax(520px, 1.15fr) minmax(460px, 0.85fr); background: $page-bg; }
.auth-story { position: relative; min-height: 100vh; display: flex; flex-direction: column; padding: 34px 42px 26px; overflow: hidden; color: #fff; border-right: 1px solid rgba(255,255,255,0.1); background: linear-gradient(145deg, $primary-dark, $bg-sidebar); }
.story-grid { position: absolute; inset: 0; opacity: 0.06; background-image: linear-gradient(rgba(255,255,255,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.25) 1px, transparent 1px); background-size: 42px 42px; }
.story-brand, .story-content, .story-footer { position: relative; z-index: 1; }
.story-brand { display: flex; align-items: center; gap: 12px; }
.brand-mark { width: 40px; height: 40px; display: grid; place-items: center; color: #fff; background: $forest; border-radius: $border-radius-md; font-size: 20px; font-weight: 700; }
.story-brand > div:last-child { display: flex; flex-direction: column; }
.story-brand strong { font-size: 14px; font-weight: 600; letter-spacing: .02em; }
.story-brand span { margin-top: 2px; font-family: var(--font-mono); font-size: 8px; letter-spacing: .14em; text-transform: uppercase; color: rgba(250, 243, 226, .42); }
.story-content { width: min(670px, 92%); margin: auto 0; padding: 50px 0; }
.story-kicker { display: flex; align-items: center; gap: 10px; font-family: var(--font-mono); font-size: 9px; letter-spacing: .2em; text-transform: uppercase; color: rgba(250, 243, 226, .48); }
.story-kicker i { width: 24px; height: 2px; background: $brass; }
.story-content h1 { margin-top: 18px; font-family: var(--font-display); font-size: clamp(44px, 5vw, 72px); font-weight: 500; line-height: 1.08; letter-spacing: -.02em; }
.story-content h1 em { color: $brass; font-style: italic; }
.story-content > p { max-width: 540px; margin-top: 20px; font-size: 13px; font-weight: 300; line-height: 1.7; color: rgba(250, 243, 226, .57); }
.story-footer { display: flex; align-items: center; justify-content: space-between; font-family: var(--font-mono); font-size: 8px; letter-spacing: .12em; color: rgba(250, 243, 226, .38); }
.story-footer > span:first-child { display: flex; align-items: center; gap: 7px; }
.story-footer i { width: 6px; height: 6px; background: $success-color; border: 1px solid rgba(255,255,255,0.2); animation: status-blink 1.2s steps(2, jump-none) infinite; }
@keyframes status-blink { 50% { opacity: 0.35; } }

.auth-entry { min-height: 100vh; display: flex; flex-direction: column; padding: 26px 42px 22px; }
.entry-top { display: flex; align-items: center; justify-content: flex-end; gap: 12px; font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.1em; color: $text-secondary; }
.entry-top :deep(.el-button) { min-height: 34px; border-radius: $border-radius-md; border: 1.5px solid $forest; font-weight: 600; }
.auth-card { width: min(420px, 100%); margin: auto; padding: 38px 0; }
.mobile-brand { display: none; }
.auth-index { font-family: var(--font-mono); font-size: 9px; letter-spacing: .18em; text-transform: uppercase; padding: 2px 6px; border: 1px solid $brass; background: $cream-warm; color: $brass-deep; }
.auth-index.success { border-color: $success-color; color: $success-color; }
.auth-index.danger { border-color: $danger-color; color: $danger-color; }
.auth-header h2 { margin-top: 9px; font-family: var(--font-display); font-size: 32px; font-weight: 500; letter-spacing: -.02em; color: $forest; }
.auth-header p { margin-top: 7px; font-size: 12px; font-weight: 300; color: $text-secondary; }

.auth-form { margin-top: 26px; }
.auth-form :deep(.el-form-item) { margin-bottom: 18px; }
.auth-form :deep(.el-form-item__label) { padding-bottom: 6px; font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: $text-regular; }
.auth-form :deep(.el-input__wrapper) { min-height: 46px; padding: 0 14px; background: #fff; border: 1px solid $border-color; border-radius: $border-radius-md; box-shadow: none; }
.auth-form :deep(.el-input__wrapper.is-focus) { border-color: $forest; box-shadow: 0 0 0 3px rgba(8, 102, 247, 0.1); }

.password-strength { margin-top: 8px; display: flex; align-items: center; gap: 10px; }
.strength-bar { display: flex; gap: 4px; flex: 0 0 120px; }
.strength-seg { flex: 1; height: 4px; border-radius: 2px; background: rgb(var(--line)); transition: background 0.24s; }
.strength-seg.weak { background: $danger-color; }
.strength-seg.medium { background: $warning-color; }
.strength-seg.strong { background: $success-color; }
.strength-text { font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.06em; color: $text-secondary; }

.auth-btn { width: 100%; min-height: 48px; display: flex; background: $brass; border-color: $brass; border-radius: $border-radius-md; box-shadow: $shadow-md; }
.auth-btn :deep(span) { width: 100%; display: flex; align-items: center; justify-content: space-between; font-weight: 600; color: $forest; }

.result-card { margin-top: 26px; padding: 24px; border: 1px solid $border-color; border-radius: $border-radius-md; background: $cream-warm; text-align: center; }
.result-icon { font-size: 36px; color: $forest; margin-bottom: 12px; }
.result-icon.success { color: $success-color; }
.result-icon.danger { color: $danger-color; }
.result-card p { font-size: 12px; line-height: 1.7; color: $text-regular; margin-bottom: 18px; }
.result-card .auth-btn { width: auto; min-width: 160px; margin: 0 auto; }

.trust-note { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 18px; font-family: var(--font-mono); font-size: 8px; letter-spacing: 0.08em; color: $text-secondary; }
.entry-footer { font-family: var(--font-mono); font-size: 8px; letter-spacing: 0.08em; text-align: center; color: $text-placeholder; }

@media (max-width: 1020px) { .auth-shell { grid-template-columns: minmax(420px, .9fr) minmax(430px, 1fr); } .story-content h1 { font-size: 46px; } }
@media (max-width: 780px) {
  .auth-shell { display: block; }
  .auth-story { display: none; }
  .auth-entry { padding: 24px; background: $page-bg; }
  .entry-top { display: none; }
  .auth-card { padding: 26px 0; }
  .mobile-brand { display: flex; align-items: center; gap: 11px; margin-bottom: 48px; }
  .mobile-brand .brand-mark { width: 36px; height: 36px; font-size: 18px; }
  .mobile-brand strong { font-size: 14px; color: $forest; }
  .entry-footer { margin-top: auto; }
}

/* 液态玻璃视觉 */
.auth-shell { position: relative; isolation: isolate; overflow: hidden; background: transparent; }
.auth-shell::before, .auth-shell::after { content:''; position:absolute; z-index:-1; border-radius:999px; pointer-events:none; filter:blur(2px); }
.auth-shell::before { width:62vw; height:62vw; top:-35vw; right:-17vw; background:radial-gradient(circle, rgb(69 190 255 / .5), transparent 67%); }
.auth-shell::after { width:50vw; height:50vw; bottom:-34vw; left:27vw; background:radial-gradient(circle, rgb(0 158 247 / .22), transparent 68%); }
.auth-story { margin:16px 0 16px 16px; min-height:calc(100vh - 32px); border:1px solid rgb(255 255 255 / .52); border-radius:30px; background:linear-gradient(138deg, rgb(4 62 201 / .96), rgb(6 128 243 / .89) 55%, rgb(0 198 229 / .77)), url('/brand/opc-cloud-logo.png') center / cover; box-shadow:0 30px 70px rgb(0 92 190 / .25), inset 0 1px 0 rgb(255 255 255 / .32); }
.auth-story::after { content:''; position:absolute; inset:0; border-radius:inherit; pointer-events:none; background:radial-gradient(circle at 80% 70%, rgb(255 255 255 / .26), transparent 20%), linear-gradient(120deg, transparent 30%, rgb(255 255 255 / .1) 50%, transparent 70%); }
.story-grid { opacity:.18; mix-blend-mode:screen; }
.brand-mark { overflow:hidden; border:1px solid rgb(255 255 255 / .58); border-radius:15px; background:#fff; box-shadow:0 10px 22px rgb(0 41 141 / .22); }
.brand-mark img { display:block; width:100%; height:100%; object-fit:cover; object-position:50% 46%; transform:scale(1.18); }
.story-brand span, .story-kicker, .story-content > p, .story-footer { color:rgb(255 255 255 / .68); }
.story-kicker i { background:#baf4ff; box-shadow:0 0 14px rgb(186 244 255 / .64); }
.story-content h1 { text-shadow:0 6px 26px rgb(0 54 165 / .18); }
.story-content h1 em { color:#d9fbff; }
.auth-entry { position:relative; }
.auth-card { padding:34px; border:1px solid rgb(255 255 255 / .78); border-radius:28px; background:linear-gradient(145deg, rgb(255 255 255 / .76), rgb(233 247 255 / .48)); box-shadow:$shadow-lg; backdrop-filter:blur(28px) saturate(145%); }
.auth-index { border:0; border-radius:999px; color:rgb(var(--accent-strong)); background:rgb(var(--accent) / .1); }
.auth-header h2 { color:rgb(var(--text)); font-family:var(--font-display); font-weight:700; letter-spacing:-.045em; }
.auth-header p { color:rgb(var(--muted)); }
.auth-btn { background:linear-gradient(135deg, #0750df, #087fff 52%, #00c9eb); border-color:rgb(255 255 255 / .35); box-shadow:0 14px 28px rgb(0 105 237 / .24), inset 0 1px 0 rgb(255 255 255 / .45); }
.auth-btn :deep(span) { color:#fff; }
.entry-top :deep(.el-button) { border-color:rgb(255 255 255 / .82); color:rgb(var(--accent-strong)); background:rgb(255 255 255 / .48); }
@media (max-width: 780px) { .auth-entry { min-height:100dvh; background:transparent; } .auth-card { padding:26px; } }
</style>
