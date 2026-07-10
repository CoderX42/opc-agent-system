<template>
  <el-container class="layout-container">
    <!-- 侧边栏 -->
    <el-aside :width="sidebarCollapsed ? '76px' : '248px'" class="layout-aside">
      <div class="logo-container">
        <div class="logo-mark"><img src="/brand/opc-cloud-logo.png" alt="OPC Agent 云端标识" /></div>
        <div v-show="!sidebarCollapsed" class="logo-copy">
          <span class="logo-text">OPC AGENT</span>
          <span class="logo-caption">Digital workforce</span>
        </div>
      </div>

      <el-scrollbar>
        <div v-show="!sidebarCollapsed" class="menu-label">工作空间</div>
        <el-menu
          :default-active="activeMenu"
          :collapse="sidebarCollapsed"
          :collapse-transition="false"
          class="sidebar-menu"
          @select="handleMenuSelect"
        >
          <el-menu-item index="/dashboard">
            <el-icon><Monitor /></el-icon>
            <template #title>工作台</template>
          </el-menu-item>

          <el-menu-item index="/office">
            <el-icon><OfficeBuilding /></el-icon>
            <template #title>办公区</template>
          </el-menu-item>

          <el-menu-item index="/agents/copilot">
            <el-icon><MagicStick /></el-icon>
            <template #title>Agent 助手</template>
          </el-menu-item>

          <!-- 财务Agent -->
          <el-sub-menu index="/finance">
            <template #title>
              <el-icon><Money /></el-icon>
              <span>财务Agent</span>
            </template>
            <el-menu-item index="/finance/index">财务概览</el-menu-item>
            <el-menu-item index="/finance/invoice">发票管理</el-menu-item>
            <el-menu-item index="/finance/transaction">记账管理</el-menu-item>
            <el-menu-item index="/finance/report">财务报表</el-menu-item>
          </el-sub-menu>

          <!-- 客服Agent -->
          <el-sub-menu index="/customer-service">
            <template #title>
              <el-icon><Service /></el-icon>
              <span>客服Agent</span>
            </template>
            <el-menu-item index="/customer-service/index">客服概览</el-menu-item>
            <el-menu-item index="/customer-service/conversation">对话管理</el-menu-item>
            <el-menu-item index="/customer-service/ticket">工单管理</el-menu-item>
          </el-sub-menu>

          <!-- 法务Agent -->
          <el-sub-menu index="/legal">
            <template #title>
              <el-icon><DocumentChecked /></el-icon>
              <span>法务Agent</span>
            </template>
            <el-menu-item index="/legal/index">法务概览</el-menu-item>
            <el-menu-item index="/legal/contract">合同管理</el-menu-item>
            <el-menu-item index="/legal/compliance">合规检查</el-menu-item>
          </el-sub-menu>

          <!-- 行政Agent -->
          <el-sub-menu index="/admin">
            <template #title>
              <el-icon><OfficeBuilding /></el-icon>
              <span>行政Agent</span>
            </template>
            <el-menu-item index="/admin/index">行政概览</el-menu-item>
            <el-menu-item index="/admin/schedule">日程管理</el-menu-item>
            <el-menu-item index="/admin/task">任务管理</el-menu-item>
            <el-menu-item index="/admin/meeting">会议纪要</el-menu-item>
          </el-sub-menu>

          <el-menu-item index="/settings">
            <el-icon><Setting /></el-icon>
            <template #title>系统设置</template>
          </el-menu-item>
        </el-menu>
      </el-scrollbar>

      <div class="system-status" :class="{ 'is-collapsed': sidebarCollapsed }">
        <span class="status-pulse"></span>
        <div v-show="!sidebarCollapsed" class="status-copy">
          <strong>系统在线</strong>
          <span>4 个 Agent 正常运行</span>
        </div>
      </div>
    </el-aside>

    <!-- 右侧区域 -->
    <el-container class="layout-main-container">
      <!-- 顶部栏 -->
      <el-header class="layout-header" height="72px">
        <div class="header-left">
          <button class="collapse-btn" type="button" aria-label="切换导航栏" @click="appStore.toggleSidebar">
            <el-icon :size="18"><Fold v-if="!sidebarCollapsed" /><Expand v-else /></el-icon>
          </button>

          <div class="route-heading">
            <span class="route-eyebrow">OPERATIONS / {{ breadcrumbs[0]?.title || '工作空间' }}</span>
            <strong>{{ breadcrumbs[breadcrumbs.length - 1]?.title || '工作台' }}</strong>
          </div>
        </div>

        <div class="header-right">
          <button class="command-search" type="button">
            <el-icon><Search /></el-icon>
            <span>搜索功能或任务</span>
            <kbd>⌘ K</kbd>
          </button>

          <!-- 通知 -->
          <el-badge :value="appStore.notificationCount" :hidden="appStore.notificationCount === 0" class="notification-badge">
            <button class="header-icon" type="button" aria-label="通知">
              <el-icon :size="18"><Bell /></el-icon>
            </button>
          </el-badge>

          <!-- 用户信息 -->
          <el-dropdown trigger="click" @command="handleUserCommand">
            <div class="user-info">
              <el-avatar :size="36" :src="userStore.avatar || undefined">
                {{ userStore.nickname?.charAt(0) || userStore.username?.charAt(0) || 'O' }}
              </el-avatar>
              <div class="user-copy">
                <span class="user-name">{{ userStore.nickname || userStore.username || 'OPC Owner' }}</span>
                <span class="user-role">管理员</span>
              </div>
              <el-icon class="user-arrow"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>个人信息
                </el-dropdown-item>
                <el-dropdown-item command="settings">
                  <el-icon><Setting /></el-icon>系统设置
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 主内容区 -->
      <el-main class="layout-main">
        <transition name="backend-banner">
          <div v-if="isDesktop && showBackendBanner" class="backend-banner" :class="bannerTone">
            <div class="banner-copy">
              <el-icon :size="16"><WarningFilled v-if="backendTone === 'danger'" /><Loading v-else-if="backendTone === 'pending'" /><CircleCheck v-else /></el-icon>
              <div>
                <strong>{{ bannerTitle }}</strong>
                <span>{{ bannerMessage }}</span>
              </div>
            </div>
            <div class="banner-actions">
              <el-button size="small" :loading="restartingBackend" @click="handleManualRestart">重试启动</el-button>
              <button class="banner-close" type="button" aria-label="关闭" @click="dismissBanner">×</button>
            </div>
          </div>
        </transition>
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>

      <!-- 桌面端 Toast 队列 -->
      <div v-if="isDesktop && desktop.toasts.length" class="desktop-toast-stack">
        <div v-for="t in desktop.toasts" :key="t.id" class="desktop-toast" :class="`toast-${t.type}`">
          <strong>{{ t.title }}</strong>
          <span v-if="t.message">{{ t.message }}</span>
          <button type="button" aria-label="关闭" @click="desktop.dismissToast(t.id)">×</button>
        </div>
      </div>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { useDesktopStore } from '@/stores/desktop'
import { ElMessage, ElMessageBox } from 'element-plus'
import { startDesktopBackendHeartbeat } from '@/api/request'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()
const desktop = useDesktopStore()
const isDesktop = computed(() => desktop.isDesktop)

const bannerDismissed = ref(false)
const restartingBackend = ref(false)

const backendTone = computed<'ok' | 'pending' | 'danger'>(() => {
  if (desktop.backendUnreachable || !desktop.backend.running) return 'danger'
  if (desktop.backendChecking) return 'pending'
  return 'ok'
})
const bannerTone = computed(() => `tone-${backendTone.value}`)
const showBackendBanner = computed(() => bannerTone.value !== 'ok' && !bannerDismissed.value)
const bannerTitle = computed(() => {
  if (desktop.backendUnreachable) return '后端不可达'
  if (!desktop.backend.running) return '后端服务已退出'
  if (desktop.backendChecking) return '正在连接后端…'
  return '后端在线'
})
const bannerMessage = computed(() => {
  if (desktop.backend.lastError) return desktop.backend.lastError
  if (backendTone.value === 'pending') return `最近心跳：${desktop.backendLastCheckedAt ? new Date(desktop.backendLastCheckedAt).toLocaleTimeString() : '尚未检测'}`
  return `API：${desktop.backend.apiBaseUrl || '等待响应'}`
})

function dismissBanner() {
  bannerDismissed.value = true
}

async function handleManualRestart() {
  if (!window.opcDesktop) return
  restartingBackend.value = true
  try {
    const res = await window.opcDesktop.restartBackend()
    if (res.success) {
      ElMessage.success('后端已重启')
      bannerDismissed.value = false
    } else {
      ElMessage.error(res.message || '重启失败')
    }
  } finally {
    restartingBackend.value = false
  }
}

// 桌面端事件订阅（仅 desktop 环境）
let cleanupBackendCrashed = () => {}
let cleanupUpdateDownloaded = () => {}
let cleanupUpdateAvailable = () => {}
let cleanupThemeChanged = () => {}
let cleanupShortcutCommand = () => {}
let cleanupMenuCommand = () => {}
let cleanupDeepLink = () => {}
let stopHeartbeat = () => {}

onMounted(() => {
  if (!isDesktop.value) return
  stopHeartbeat = startDesktopBackendHeartbeat(5000) || (() => {})
  if (window.opcDesktop) {
    cleanupBackendCrashed = window.opcDesktop.onBackendCrashed((info) => desktop.markBackendCrashed(info))
    cleanupUpdateAvailable = window.opcDesktop.onUpdateAvailable((info) => desktop.setUpdateAvailable(info))
    cleanupUpdateDownloaded = window.opcDesktop.onUpdateDownloaded((info) => desktop.setUpdateDownloaded(info))
    cleanupThemeChanged = window.opcDesktop.onThemeChanged((info) => desktop.setTheme(info))
    cleanupShortcutCommand = window.opcDesktop.onShortcutCommand(() => {
      // 业务可路由到具体页面，这里仅做示例提示
      ElMessage.info('全局快捷键已触发')
    })
    cleanupMenuCommand = window.opcDesktop.onMenuCommand(() => {
      ElMessage.info('菜单命令触发')
    })
    cleanupDeepLink = window.opcDesktop.onDeepLink((url) => {
      ElMessage.info(`深链：${url}`)
    })
  }
})

onBeforeUnmount(() => {
  cleanupBackendCrashed()
  cleanupUpdateDownloaded()
  cleanupUpdateAvailable()
  cleanupThemeChanged()
  cleanupShortcutCommand()
  cleanupMenuCommand()
  cleanupDeepLink()
  stopHeartbeat()
})

const sidebarCollapsed = computed(() => appStore.sidebarCollapsed)

const activeMenu = computed(() => {
  return route.path
})

const breadcrumbs = computed(() => {
  const matched = route.matched.filter((item) => item.meta?.title)
  return matched.map((item) => ({
    path: item.path,
    title: item.meta.title as string,
  }))
})

watch(
  () => route.path,
  (path) => {
    appStore.setActiveMenu(path)
  },
  { immediate: true }
)

function handleMenuSelect(index: string) {
  if (index === '/office') {
    const officeRoute = router.resolve({ path: '/office' })
    window.open(officeRoute.href, '_blank', 'noopener,noreferrer')
    return
  }

  if (index === '/agents/copilot') {
    const copilotRoute = router.resolve({ path: '/agents/copilot', query: route.query })
    window.open(copilotRoute.href, '_blank', 'noopener,noreferrer')
    return
  }

  if (index !== route.path) void router.push(index)
}

async function handleUserCommand(command: string) {
  switch (command) {
    case 'profile':
      break
    case 'settings':
      router.push('/settings')
      break
    case 'logout':
      try {
        await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        })
      } catch {
        break
      }
      try {
        await userStore.logout()
      } catch (err) {
        console.error('[Logout] API failed:', err)
      } finally {
        userStore.resetState()
        router.push('/login')
      }
      break
  }
}
</script>

<style lang="scss" scoped>
.layout-container {
  width: 100%;
  height: 100%;
}

.layout-aside {
  position: relative;
  z-index: 20;
  background: rgb(var(--surface));
  color: rgb(var(--text));
  transition: width $transition-duration $transition-timing;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgb(var(--line) / 0.6);
}

.logo-container {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  padding: 0 18px;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.logo-mark {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  flex: 0 0 36px;
  color: #fff;
  background: linear-gradient(135deg, #0d47a1, #1677ff);
  border-radius: 12px;
  font-family: var(--font-body);
  font-size: 18px;
  font-weight: 700;
}

.logo-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.logo-text {
  color: rgb(var(--text));
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.logo-caption {
  margin-top: 1px;
  color: rgb(var(--muted));
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.menu-label {
  padding: 12px 18px 8px;
  color: rgba(255,255,255,0.35);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.sidebar-menu {
  --el-menu-active-color: rgb(var(--accent));
  --el-menu-bg-color: transparent;
  --el-menu-hover-bg-color: rgb(var(--elev));
  --el-menu-text-color: rgb(var(--muted));

  border-right: none;
  background-color: transparent;

  :deep(.el-menu) {
    background-color: transparent;
  }

  :deep(.el-menu-item),
  :deep(.el-sub-menu__title) {
    height: 44px;
    margin: 2px 8px;
    color: rgb(var(--muted));
    border-radius: 12px;
    transition: all 160ms ease;

    .el-icon,
    span {
      color: inherit;
    }

    &:hover {
      color: rgb(var(--text));
      background-color: rgb(var(--elev));
    }

    &.is-active {
      color: rgb(var(--accent-strong));
      background: rgb(var(--accent) / 0.1);
      font-weight: 600;
    }
  }

  :deep(.el-sub-menu.is-open > .el-sub-menu__title) {
    color: rgb(var(--text));
    background-color: rgb(var(--elev) / 0.6);
  }

  :deep(.el-menu--inline) {
    margin: 2px 6px 4px;
    padding: 2px 0;
    background-color: rgb(var(--elev) / 0.5);
    border-radius: 12px;
  }

  :deep(.el-sub-menu .el-menu-item) {
    min-width: auto;
    margin: 1px 4px;
    padding-left: 40px !important;
    color: rgb(var(--muted));

    &:hover {
      color: rgb(var(--text));
      background-color: rgb(var(--elev));
    }

    &.is-active {
      color: rgb(var(--accent-strong));
      background: rgb(var(--accent) / 0.08);
    }
  }
}

:global(.el-menu--popup) {
  --el-menu-active-color: #fff;
  --el-menu-bg-color: #0f2a4a;
  --el-menu-hover-bg-color: rgba(255,255,255,0.08);
  --el-menu-text-color: rgba(255,255,255,0.85);

  padding: 6px;
  background-color: #0f2a4a;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: $border-radius-md;
  box-shadow: $shadow-lg;
}

:global(.el-menu--popup .el-menu-item) {
  height: 38px;
  color: rgba(255,255,255,0.85);
  border-radius: $border-radius-sm;

  &:hover {
    color: #fff;
    background-color: rgba(255,255,255,0.08);
  }

  &.is-active {
    color: #fff;
    background: linear-gradient(90deg, $forest, $primary-light);
  }
}

.system-status {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  margin: 10px 12px;
  padding: 10px 12px;
  color: rgba(255,255,255,0.75);
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: $border-radius-md;

  &.is-collapsed { justify-content: center; }
}

.status-pulse {
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  background: #22c55e;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.25);
  animation: status-blink 2s ease-in-out infinite;
}

@keyframes status-blink { 50% { opacity: 0.6; } }

.status-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;

  strong { 
    font-family: var(--font-body);
    font-size: 12px;
    font-weight: 600;
  }
  span { 
    color: rgba(255,255,255,0.45); 
    font-family: var(--font-mono);
    font-size: 9px; 
    white-space: nowrap;
    letter-spacing: 0.06em;
  }
}

.layout-main-container {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.layout-header {
  position: relative;
  background: rgb(var(--surface) / 0.96);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid rgb(var(--line) / 0.7);
  z-index: 10;
  flex-shrink: 0;
  /* Electron 桌面端隐藏原生标题栏后，用 web 内容作为窗口拖拽区 */
  -webkit-app-region: drag;
}

/* backdrop-filter 与 -webkit-app-region:drag 同元素共存会触发 Chromium 拖拽失效 bug，
   故将毛玻璃视觉效果下沉到伪元素，主元素保持纯拖拽语义 */
.layout-header::before {
  content: '';
  position: absolute;
  inset: 0;
  backdrop-filter: blur(18px);
  z-index: -1;
  pointer-events: none;
}

/* 顶部栏内所有可交互元素必须排除拖拽，否则无法点击 */
.layout-header .collapse-btn,
.layout-header .command-search,
.layout-header .header-icon,
.layout-header .notification-badge,
.layout-header .user-info {
  -webkit-app-region: no-drag;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.collapse-btn {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  padding: 0;
  background: rgb(var(--surface) / 0.7);
  border: 1px solid rgb(var(--line));
  border-radius: 12px;
  cursor: pointer;
  color: rgb(var(--muted));
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);

  &:hover {
    color: rgb(var(--accent));
    border-color: rgb(var(--accent) / 0.5);
    background: rgb(var(--elev));
    transform: translateY(-1px);
  }
}

.route-heading {
  display: flex;
  flex-direction: column;
  gap: 1px;

  strong {
    font-family: var(--font-body);
    font-size: 16px;
    font-weight: 600;
    color: $text-primary;
  }
}

.route-eyebrow {
  color: $text-secondary;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  padding: 0;
  background: rgb(var(--surface) / 0.7);
  border: 1px solid rgb(var(--line));
  border-radius: 12px;
  cursor: pointer;
  color: rgb(var(--muted));
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);

  &:hover {
    color: rgb(var(--accent));
    border-color: rgb(var(--accent) / 0.5);
    background: rgb(var(--elev));
    transform: translateY(-1px);
  }
}

.notification-badge :deep(.el-badge__content) {
  background: $danger-color;
  border-color: $cream;
}

.command-search {
  width: 220px;
  height: 36px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 10px 0 12px;
  color: rgb(var(--muted));
  background: rgb(var(--surface) / 0.7);
  border: 1px solid rgb(var(--line));
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);

  &:hover {
    border-color: rgb(var(--accent) / 0.5);
    background: rgb(var(--elev));
    color: rgb(var(--text));
    transform: translateY(-1px);
  }

  span { flex: 1; text-align: left; font-size: 12px; }
  kbd {
    padding: 1px 6px;
    font-size: 9px;
    font-family: var(--font-mono);
    color: rgb(var(--muted));
    background: rgb(var(--elev));
    border: 1px solid rgb(var(--line) / 0.6);
    border-radius: 4px;
  }
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 8px 4px 4px;
  border: 1px solid rgb(var(--line));
  background: rgb(var(--surface) / 0.7);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);

  &:hover {
    border-color: rgb(var(--accent) / 0.5);
    background: rgb(var(--elev));
    transform: translateY(-1px);
  }
}

.user-info :deep(.el-avatar) {
  width: 32px;
  height: 32px;
  background: $forest;
  color: #fff;
  font-family: var(--font-body);
  font-weight: 600;
  border: 1px solid rgba(255,255,255,0.3);
}

.user-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;

  .user-name {
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 600;
    color: $text-primary;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-role {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 500;
    letter-spacing: 0.08em;
    color: $text-secondary;
    text-transform: uppercase;
  }
}

.user-arrow { color: $text-secondary; font-size: 14px; }

.layout-main {
  flex: 1;
  overflow: auto;
  padding: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.22s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// ── 桌面端 后端状态条 ─────────────────────────────────────────────────────
.backend-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 12px 18px;
  margin-bottom: 14px;
  font-family: var(--font-body);
  font-size: 13px;
  background: rgb(var(--surface) / 0.96);
  border: 1px solid rgb(var(--line) / 0.6);
  border-radius: 0.875rem;
  box-shadow: $shadow-sm;

  strong { display: block; color: rgb(var(--text)); font-weight: 600; }
  span { display: block; color: rgb(var(--muted)); font-size: 12px; line-height: 1.5; }
}
.banner-copy {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.banner-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.banner-close {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: rgb(var(--muted));
  font-size: 18px;
  &:hover { background: rgb(var(--elev)); color: rgb(var(--text)); }
}

.tone-danger {
  background: rgb(var(--danger) / 0.08);
  border-color: rgb(var(--danger) / 0.4);
  strong { color: rgb(var(--danger)); }
}
.tone-pending {
  background: rgb(var(--warning) / 0.08);
  border-color: rgb(var(--warning) / 0.4);
  strong { color: rgb(var(--warning)); }
}
.tone-ok { display: none; }

.backend-banner-enter-active,
.backend-banner-leave-active {
  transition: all 0.25s ease;
}
.backend-banner-enter-from,
.backend-banner-leave-to {
  transform: translateY(-6px);
  opacity: 0;
}

// ── 桌面端 Toast ──────────────────────────────────────────────────────────
.desktop-toast-stack {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}
.desktop-toast {
  position: relative;
  display: grid;
  gap: 4px;
  min-width: 240px;
  max-width: 360px;
  padding: 12px 36px 12px 14px;
  color: #fff;
  background: rgba(15, 23, 42, 0.92);
  border-radius: 10px;
  box-shadow: $shadow-lg;
  pointer-events: auto;
  animation: toast-in 0.25s ease;

  strong { font-size: 13px; font-weight: 600; }
  span { font-size: 12px; opacity: 0.8; line-height: 1.5; }

  button {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    background: transparent;
    border: none;
    cursor: pointer;
    color: #fff;
    opacity: 0.7;
    font-size: 16px;
    border-radius: 4px;
    &:hover { opacity: 1; background: rgba(255,255,255,0.15); }
  }

  &.toast-success { background: linear-gradient(135deg, #16a34a, #15803d); }
  &.toast-error { background: linear-gradient(135deg, #dc2626, #b91c1c); }
  &.toast-warning { background: linear-gradient(135deg, #d97706, #b45309); }
  &.toast-info { background: linear-gradient(135deg, #2563eb, #1d4ed8); }
}

@keyframes toast-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Liquid Glass shell — desktop and browser share this exact frame. */
.layout-container {
  background: transparent;
}

.layout-aside {
  margin: 12px 0 12px 12px;
  border: 1px solid rgb(255 255 255 / .78);
  border-radius: 26px;
  background: linear-gradient(160deg, rgb(255 255 255 / .7), rgb(223 242 255 / .43));
  box-shadow: $shadow-soft;
  backdrop-filter: blur(28px) saturate(155%);
}

.logo-container {
  height: 78px;
  padding: 0 17px;
  border-bottom: 1px solid rgb(var(--line) / .27);
}

.logo-mark {
  width: 42px;
  height: 42px;
  flex-basis: 42px;
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / .88);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 7px 18px rgb(0 104 214 / .16), inset 0 1px 0 #fff;
}

.logo-mark img { width: 100%; height: 100%; display: block; object-fit: cover; object-position: 50% 46%; transform: scale(1.18); }
.logo-text { letter-spacing: -.02em; color: rgb(var(--text)); font-size: 15px; }
.logo-caption { color: rgb(var(--accent-strong)); }
.menu-label { color: rgb(var(--faint)); padding: 17px 18px 7px; }

.sidebar-menu {
  --el-menu-hover-bg-color: rgb(255 255 255 / .52);
  --el-menu-text-color: rgb(var(--muted));
}
.sidebar-menu :deep(.el-menu-item), .sidebar-menu :deep(.el-sub-menu__title) { height: 46px; margin: 3px 10px; border: 1px solid transparent; border-radius: 15px; }
.sidebar-menu :deep(.el-menu-item:hover), .sidebar-menu :deep(.el-sub-menu__title:hover) { color:rgb(var(--accent-strong)); border-color:rgb(255 255 255 / .65); background:rgb(255 255 255 / .5); }
.sidebar-menu :deep(.el-menu-item.is-active) { color:#fff; border-color:rgb(255 255 255 / .38); background:linear-gradient(125deg, #0753e5, #0787fa 58%, #00c7e9); box-shadow:0 9px 20px rgb(0 113 231 / .2), inset 0 1px 0 rgb(255 255 255 / .37); }
.sidebar-menu :deep(.el-menu--inline) { background:rgb(255 255 255 / .3); border:1px solid rgb(255 255 255 / .5); border-radius:15px; }
.sidebar-menu :deep(.el-sub-menu .el-menu-item.is-active) { color:rgb(var(--accent-strong)); border-color:transparent; background:rgb(var(--accent) / .1); box-shadow:none; }

.system-status { margin: 10px 12px 14px; color: rgb(var(--muted)); border: 1px solid rgb(255 255 255 / .7); border-radius:16px; background:rgb(255 255 255 / .4); box-shadow:inset 0 1px 0 rgb(255 255 255 / .8); }
.status-copy span { color: rgb(var(--faint)); }

.layout-main-container { padding: 12px 12px 12px 0; }
.layout-header { min-height:76px; padding:0 22px; border:1px solid rgb(255 255 255 / .78); border-radius:26px; background:rgb(255 255 255 / .53); box-shadow:$shadow-sm; }
/* Liquid Glass 毛玻璃效果同样下沉到伪元素，避免与 -webkit-app-region:drag 冲突 */
.layout-header::before { border-radius:26px; backdrop-filter:blur(28px) saturate(155%); }
.collapse-btn, .header-icon { width:40px; height:40px; border:1px solid rgb(255 255 255 / .78); border-radius:14px; background:rgb(255 255 255 / .55); box-shadow:inset 0 1px 0 #fff, 0 5px 14px rgb(29 105 184 / .08); }
.collapse-btn:hover, .header-icon:hover { color:rgb(var(--accent-strong)); border-color:rgb(255 255 255 / .95); background:rgb(255 255 255 / .75); }
.route-heading strong { color:rgb(var(--text)); font-size:17px; letter-spacing:-.025em; }
.route-eyebrow { color:rgb(var(--accent-strong)); font-size:9px; }
.command-search { height:40px; border:1px solid rgb(255 255 255 / .78); border-radius:14px; background:rgb(255 255 255 / .55); box-shadow:inset 0 1px 0 #fff; }
.command-search:hover { border-color:rgb(255 255 255 / .95); background:rgb(255 255 255 / .75); }
.user-info { border:1px solid rgb(255 255 255 / .78); border-radius:15px; background:rgb(255 255 255 / .55); box-shadow:inset 0 1px 0 #fff; }
.user-info :deep(.el-avatar) { background:linear-gradient(135deg, #0753e5, #00bfe7); }
.layout-main { margin-top:12px; border:1px solid rgb(255 255 255 / .66); border-radius:26px; background:rgb(255 255 255 / .22); box-shadow:inset 0 1px 0 rgb(255 255 255 / .7); backdrop-filter:blur(12px); }
.desktop-toast { border:1px solid rgb(255 255 255 / .35); border-radius:18px; background:rgb(8 73 170 / .84); box-shadow:$shadow-lg; backdrop-filter:blur(24px); }

@media (max-width: 760px) {
  .layout-aside { margin:0; border-radius:0; }
  .layout-main-container { padding:0; }
  .layout-header, .layout-main { border-radius:0; border-right:0; border-left:0; }
  .layout-main { margin-top:0; }
  .command-search, .user-copy, .user-arrow { display:none; }
}
</style>
