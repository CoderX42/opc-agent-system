<template>
  <main class="auth-shell">
    <section class="auth-story">
      <div class="story-grid"></div>
      <header class="story-brand">
        <div class="brand-mark"><img src="/brand/opc-cloud-logo.png" alt="OPC Agent 云端标识" /></div>
        <div><strong>OPC AGENT</strong><span>Digital workforce system</span></div>
      </header>

      <div class="story-content">
        <span class="story-kicker"><i></i> BUILT FOR ONE-PERSON COMPANIES</span>
        <h1>创建账户，<br><em>开启数字协作。</em></h1>
        <p>注册后即可拥有财务、客服、法务与行政四位数字员工，让重复事务交给系统处理。</p>
      </div>

      <footer class="story-footer">
        <span><i></i> 所有服务运行正常</span>
        <span>OPC / 2026</span>
      </footer>
    </section>

    <section class="auth-entry">
      <div class="entry-top">
        <span>已有账户？</span>
        <el-button plain @click="goLogin">返回登录</el-button>
      </div>

      <div class="auth-card">
        <div class="mobile-brand"><div class="brand-mark"><img src="/brand/opc-cloud-logo.png" alt="OPC Agent 云端标识" /></div><strong>OPC AGENT</strong></div>
        <div class="auth-header">
          <span class="auth-index">CREATE WORKSPACE</span>
          <h2>创建账户</h2>
          <p>填写信息以注册你的数字员工工作空间</p>
        </div>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          class="auth-form"
          size="large"
          label-position="top"
          @keyup.enter="handleRegister"
        >
          <el-form-item label="用户名" prop="username">
            <el-input
              v-model="form.username"
              placeholder="3-50 位字符"
              prefix-icon="User"
              clearable
            />
          </el-form-item>

          <el-form-item label="邮箱" prop="email">
            <el-input
              v-model="form.email"
              placeholder="name@company.com"
              prefix-icon="Message"
              clearable
            />
          </el-form-item>

          <el-form-item label="密码" prop="password">
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

          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input
              v-model="form.confirmPassword"
              type="password"
              placeholder="再次输入密码"
              prefix-icon="Lock"
              show-password
            />
          </el-form-item>

          <el-form-item prop="agreement" class="agreement-item">
            <el-checkbox v-model="form.agreement">
              我已阅读并同意
              <el-link type="primary" underline="never" @click.stop>服务条款</el-link>
              与
              <el-link type="primary" underline="never" @click.stop>隐私政策</el-link>
            </el-checkbox>
          </el-form-item>

          <el-button
            type="primary"
            :loading="loading"
            class="auth-btn"
            @click="handleRegister"
          >
            <span>{{ loading ? '正在创建账户...' : '创建账户' }}</span>
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
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { assessPassword, isPasswordAcceptable } from '@/utils/password'

const router = useRouter()
const userStore = useUserStore()

const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  agreement: false,
})

/** 密码强度评估结果 */
const passwordAssessment = computed(() => assessPassword(form.password))

/** 强度条分段样式 */
function strengthClass(seg: number) {
  const map: Record<number, string> = {
    1: 'weak',
    2: 'medium',
    3: 'strong',
  }
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
    callback(new Error('请再次输入密码'))
  } else if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const validateAgreement = (
  _rule: unknown,
  _value: boolean,
  callback: (error?: Error) => void,
) => {
  if (!form.agreement) {
    callback(new Error('请阅读并同意服务条款与隐私政策'))
  } else {
    callback()
  }
}

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度为 3-50 个字符', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        if (!value) {
          callback(new Error('请输入密码'))
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
  agreement: [{ validator: validateAgreement, trigger: 'change' }],
}

function goLogin() {
  router.push('/login')
}

async function handleRegister() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      await userStore.register({
        username: form.username,
        email: form.email,
        password: form.password,
      })
      ElMessage.success('账户创建成功，已自动登录')
      router.push('/')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '注册失败'
      ElMessage.error(message)
    } finally {
      loading.value = false
    }
  })
}
</script>

<style lang="scss" scoped>
.auth-shell {
  width: 100%;
  min-height: 100%;
  display: grid;
  grid-template-columns: minmax(520px, 1.15fr) minmax(460px, 0.85fr);
  background: $page-bg;
}

.auth-story {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 34px 42px 26px;
  overflow: hidden;
  color: #fff;
  border-right: 1px solid rgba(255,255,255,0.1);
  background: linear-gradient(145deg, $primary-dark, $bg-sidebar);
}

.story-grid {
  position: absolute;
  inset: 0;
  opacity: 0.06;
  background-image:
    linear-gradient(rgba(255,255,255,0.25) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.25) 1px, transparent 1px);
  background-size: 42px 42px;
}

.story-brand, .story-content, .story-footer { position: relative; z-index: 1; }
.story-brand { display: flex; align-items: center; gap: 12px; }
.brand-mark {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  color: #fff;
  background: $forest;
  border-radius: $border-radius-md;
  font-family: var(--font-body);
  font-size: 20px;
  font-weight: 700;
}
.story-brand > div:last-child { display: flex; flex-direction: column; }
.story-brand strong {
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: .02em;
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
  line-height: 1.7;
  color: rgba(250, 243, 226, .57);
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
  border: 1px solid rgba(255,255,255,0.2);
  animation: status-blink 1.2s steps(2, jump-none) infinite;
}

@keyframes status-blink { 50% { opacity: 0.35; } }

.auth-entry { min-height: 100vh; display: flex; flex-direction: column; padding: 26px 42px 22px; }
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
  border-radius: $border-radius-md;
  border: 1.5px solid $forest;
  font-family: var(--font-body);
  font-weight: 600;
}
.auth-card { width: min(420px, 100%); margin: auto; padding: 38px 0; }
.mobile-brand { display: none; }
.auth-index {
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
.auth-header h2 {
  margin-top: 9px;
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 500;
  letter-spacing: -.02em;
  color: $forest;
}
.auth-header p {
  margin-top: 7px;
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 300;
  color: $text-secondary;
}

.auth-form { margin-top: 26px; }
.auth-form :deep(.el-form-item) { margin-bottom: 18px; }
.auth-form :deep(.el-form-item__label) {
  padding-bottom: 6px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: $text-regular;
}
.auth-form :deep(.el-input__wrapper) {
  min-height: 46px;
  padding: 0 14px;
  background: #fff;
  border: 1px solid $border-color;
  border-radius: $border-radius-md;
  box-shadow: none;
}
.auth-form :deep(.el-input__wrapper.is-focus) {
  border-color: $forest;
  box-shadow: 0 0 0 3px rgba(8, 102, 247, 0.1);
}

/* 密码强度条 */
.password-strength {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.strength-bar {
  display: flex;
  gap: 4px;
  flex: 0 0 120px;
}
.strength-seg {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: rgb(var(--line));
  transition: background 0.24s;
}
.strength-seg.weak { background: $danger-color; }
.strength-seg.medium { background: $warning-color; }
.strength-seg.strong { background: $success-color; }
.strength-text {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: $text-secondary;
}

/* 协议复选 */
.agreement-item :deep(.el-checkbox__label) {
  font-family: var(--font-body);
  font-size: 12px;
  color: $text-regular;
}

.auth-btn {
  width: 100%;
  min-height: 48px;
  display: flex;
  background: $brass;
  border-color: $brass;
  border-radius: $border-radius-md;
  box-shadow: $shadow-md;
}
.auth-btn :deep(span) {
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
  .auth-shell { grid-template-columns: minmax(420px, .9fr) minmax(430px, 1fr); }
  .story-content h1 { font-size: 46px; }
}

@media (max-width: 780px) {
  .auth-shell { display: block; }
  .auth-story { display: none; }
  .auth-entry { padding: 24px; background: $page-bg; }
  .entry-top { display: none; }
  .auth-card { padding: 26px 0; }
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
    color: $forest;
  }
  .entry-footer { margin-top: auto; }
}

/* 与登录页一致的液态玻璃视觉 */
.auth-shell {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: transparent;
}
.auth-shell::before, .auth-shell::after { content:''; position:absolute; z-index:-1; border-radius:999px; pointer-events:none; filter:blur(2px); }
.auth-shell::before { width:62vw; height:62vw; top:-35vw; right:-17vw; background:radial-gradient(circle, rgb(69 190 255 / .5), transparent 67%); }
.auth-shell::after { width:50vw; height:50vw; bottom:-34vw; left:27vw; background:radial-gradient(circle, rgb(0 158 247 / .22), transparent 68%); }
.auth-story {
  margin:16px 0 16px 16px;
  min-height:calc(100vh - 32px);
  border:1px solid rgb(255 255 255 / .52);
  border-radius:30px;
  background:
    linear-gradient(138deg, rgb(4 62 201 / .96), rgb(6 128 243 / .89) 55%, rgb(0 198 229 / .77)),
    url('/brand/opc-cloud-logo.png') center / cover;
  box-shadow:0 30px 70px rgb(0 92 190 / .25), inset 0 1px 0 rgb(255 255 255 / .32);
}
.auth-story::after { content:''; position:absolute; inset:0; border-radius:inherit; pointer-events:none; background:radial-gradient(circle at 80% 70%, rgb(255 255 255 / .26), transparent 20%), linear-gradient(120deg, transparent 30%, rgb(255 255 255 / .1) 50%, transparent 70%); }
.story-grid { opacity:.18; mix-blend-mode:screen; }
.brand-mark { overflow:hidden; border:1px solid rgb(255 255 255 / .58); border-radius:15px; background:#fff; box-shadow:0 10px 22px rgb(0 41 141 / .22); }
.brand-mark img { display:block; width:100%; height:100%; object-fit:cover; object-position:50% 46%; transform:scale(1.18); }
.story-brand strong { letter-spacing:-.01em; }
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
