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
  background: rgb(var(--surface) / 0.96);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid rgb(var(--line) / 0.7);
  backdrop-filter: blur(18px);
  z-index: 10;
  flex-shrink: 0;
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
</style>
