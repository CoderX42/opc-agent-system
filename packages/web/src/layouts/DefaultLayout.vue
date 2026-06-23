<template>
  <el-container class="layout-container">
    <!-- 侧边栏 -->
    <el-aside :width="sidebarCollapsed ? '76px' : '248px'" class="layout-aside">
      <div class="logo-container">
        <div class="logo-mark">O</div>
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
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()

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
  background:
    repeating-linear-gradient(90deg, rgba(250, 243, 226, 0.03) 0 1px, transparent 1px 24px),
    $bg-sidebar;
  transition: width $transition-duration $transition-timing;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-right: 2px solid rgba(250, 243, 226, 0.1);
}

.logo-container {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  padding: 0 18px;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(250, 243, 226, 0.1);
}

.logo-mark {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  flex: 0 0 40px;
  color: $forest;
  background: $brass;
  border: 2px solid $forest;
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
  font-style: italic;
  box-shadow: 3px 3px 0 rgba(250, 243, 226, 0.1);
}

.logo-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.logo-text {
  color: #faf3e2;
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  font-style: italic;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.logo-caption {
  margin-top: 2px;
  color: rgba(250, 243, 226, 0.46);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.menu-label {
  padding: 14px 24px 10px;
  color: rgba(250, 243, 226, 0.32);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.sidebar-menu {
  --el-menu-active-color: $brass;
  --el-menu-bg-color: transparent;
  --el-menu-hover-bg-color: rgba(250, 243, 226, 0.06);
  --el-menu-text-color: #e8e0d2;

  border-right: none;
  background-color: transparent;

  :deep(.el-menu) {
    background-color: transparent;
  }

  :deep(.el-menu-item),
  :deep(.el-sub-menu__title) {
    height: 46px;
    margin: 3px 10px;
    color: #e8e0d2;
    border: 1.5px solid transparent;
    transition: all 160ms ease;

    .el-icon,
    span {
      color: inherit;
    }

    &:hover {
      color: #faf3e2;
      background-color: rgba(250, 243, 226, 0.06);
      border-color: rgba(183, 153, 110, 0.2);
    }

    &.is-active {
      color: $brass;
      background-color: rgba(183, 153, 110, 0.1);
      border-color: rgba(183, 153, 110, 0.4);
      box-shadow: inset 3px 0 $brass;
    }
  }

  :deep(.el-sub-menu.is-open > .el-sub-menu__title) {
    color: #faf3e2;
    background-color: rgba(250, 243, 226, 0.06);
  }

  :deep(.el-menu--inline) {
    margin: 2px 10px 6px;
    padding: 4px 0;
    background-color: rgba(31, 42, 36, 0.3);
    border: 1px solid rgba(250, 243, 226, 0.08);
  }

  :deep(.el-sub-menu .el-menu-item) {
    min-width: auto;
    margin: 2px 6px;
    padding-left: 42px !important;
    color: #e8e0d2;
    background-color: transparent;
    border: 1px solid transparent;

    &:hover {
      color: #faf3e2;
      background-color: rgba(250, 243, 226, 0.06);
      border-color: rgba(183, 153, 110, 0.15);
    }

    &.is-active {
      color: $brass;
      background-color: rgba(183, 153, 110, 0.1);
      border-color: rgba(183, 153, 110, 0.3);
      box-shadow: inset 3px 0 $brass;
    }
  }
}

:global(.el-menu--popup) {
  --el-menu-active-color: $brass;
  --el-menu-bg-color: #26302a;
  --el-menu-hover-bg-color: rgba(250, 243, 226, 0.08);
  --el-menu-text-color: #e8e0d2;

  padding: 6px;
  background-color: #26302a;
  border: 2px solid $forest;
  box-shadow: 6px 8px 0 rgba(31, 42, 36, 0.2);
}

:global(.el-menu--popup .el-menu-item) {
  height: 40px;
  color: #e8e0d2;
  border: 1px solid transparent;

  &:hover {
    color: #faf3e2;
    background-color: rgba(250, 243, 226, 0.08);
    border-color: rgba(183, 153, 110, 0.2);
  }

  &.is-active {
    color: $brass;
    background-color: rgba(183, 153, 110, 0.1);
    border-color: rgba(183, 153, 110, 0.3);
  }
}

.system-status {
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 62px;
  margin: 12px;
  padding: 12px;
  color: #e8e0d2;
  background: rgba(250, 243, 226, 0.04);
  border: 1.5px solid rgba(250, 243, 226, 0.1);

  &.is-collapsed { justify-content: center; }
}

.status-pulse {
  width: 9px;
  height: 9px;
  flex: 0 0 9px;
  background: #8dd8a3;
  border: 2px solid rgba(141, 216, 163, 0.28);
  animation: status-blink 1.2s steps(2, jump-none) infinite;
}

@keyframes status-blink { 50% { opacity: 0.35; } }

.status-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong { 
    font-family: var(--font-display);
    font-size: 12px;
    font-weight: 500;
    font-style: italic;
  }
  span { 
    color: rgba(232, 224, 210, 0.45); 
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
  background: rgba(250, 243, 226, 0.92);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 2px solid $forest;
  backdrop-filter: blur(18px);
  z-index: 10;
  flex-shrink: 0;
  box-shadow: 0 2px 0 rgba(183, 153, 110, 0.2) inset;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.collapse-btn {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  padding: 0;
  background: $cream;
  border: 2px solid $forest;
  cursor: pointer;
  color: $forest;
  box-shadow: 3px 3px 0 rgba(31, 42, 36, 0.12);
  transition: color $transition-duration, transform $transition-duration, box-shadow $transition-duration;

  &:hover {
    color: $forest;
    transform: translateY(-2px);
    box-shadow: 5px 5px 0 rgba(31, 42, 36, 0.16);
  }

  &:active {
    transform: translateY(1px);
    box-shadow: 2px 2px 0 rgba(31, 42, 36, 0.14);
  }
}

.route-heading {
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong {
    font-family: var(--font-display);
    font-size: 17px;
    font-weight: 500;
    font-style: italic;
    letter-spacing: -0.01em;
    color: $forest;
  }
}

.route-eyebrow {
  color: $brass-deep;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  padding: 0;
  background: $cream;
  border: 2px solid $forest;
  cursor: pointer;
  color: $forest;
  box-shadow: 3px 3px 0 rgba(31, 42, 36, 0.12);
  transition: color $transition-duration, transform $transition-duration, box-shadow $transition-duration;

  &:hover {
    color: $forest;
    transform: translateY(-2px);
    box-shadow: 5px 5px 0 rgba(31, 42, 36, 0.16);
  }

  &:active {
    transform: translateY(1px);
    box-shadow: 2px 2px 0 rgba(31, 42, 36, 0.14);
  }
}

.notification-badge :deep(.el-badge__content) {
  background: $danger-color;
  border-color: $cream;
}

.command-search {
  width: 230px;
  height: 38px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 9px 0 12px;
  color: $text-secondary;
  background: $cream-warm;
  border: 2px solid $forest;
  cursor: pointer;
  box-shadow: 3px 3px 0 rgba(31, 42, 36, 0.12);
  transition: all 160ms ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 5px 5px 0 rgba(31, 42, 36, 0.16);
  }

  span { flex: 1; text-align: left; font-size: 12px; }
  kbd {
    padding: 2px 5px;
    font-size: 9px;
    font-family: var(--font-mono);
    color: $forest;
    background: $cream;
    border: 1px solid $forest;
  }
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px 6px 6px;
  border: 2px solid $forest;
  background: $cream;
  cursor: pointer;
  box-shadow: 3px 3px 0 rgba(31, 42, 36, 0.12);
  transition: all 160ms ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 5px 5px 0 rgba(31, 42, 36, 0.16);
  }
}

.user-info :deep(.el-avatar) {
  width: 36px;
  height: 36px;
  background: $brass;
  color: $forest;
  font-family: var(--font-display);
  font-weight: 500;
  font-style: italic;
  border: 2px solid $forest;
}

.user-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;

  .user-name {
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 500;
    font-style: italic;
    color: $forest;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-role {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 500;
    letter-spacing: 0.12em;
    color: $brass-deep;
    text-transform: uppercase;
  }
}

.user-arrow { color: $forest; font-size: 14px; }

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
</style>
