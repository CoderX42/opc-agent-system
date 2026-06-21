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
          router
          class="sidebar-menu"
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

// 监听路由变化，更新激活菜单
watch(
  () => route.path,
  (path) => {
    appStore.setActiveMenu(path)
  },
  { immediate: true }
)

/** 处理用户下拉菜单命令 */
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
        // 用户取消 → 不执行任何登出动作
        break
      }
      // 用户确认 → 强制走完登出流程（即使接口失败也要跳到登录页）
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
    radial-gradient(circle at 20% 0%, rgba(201, 242, 123, 0.1), transparent 30%),
    $bg-sidebar;
  transition: width $transition-duration $transition-timing;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.logo-container {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  padding: 0 18px;
  flex-shrink: 0;
}

.logo-mark {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  flex: 0 0 40px;
  color: #0d211c;
  background: $accent-color;
  border-radius: 13px 13px 13px 4px;
  font-size: 21px;
  font-weight: 850;
  box-shadow: 0 8px 22px rgba(201, 242, 123, 0.14);
}

.logo-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.logo-text {
  color: #f4f7f0;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.1em;
  white-space: nowrap;
}

.logo-caption {
  margin-top: 2px;
  color: rgba(232, 240, 234, 0.46);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.menu-label {
  padding: 12px 24px 8px;
  color: rgba(230, 239, 231, 0.32);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.sidebar-menu {
  --el-menu-active-color: #d9ff8a;
  --el-menu-bg-color: transparent;
  --el-menu-hover-bg-color: rgba(255, 255, 255, 0.1);
  --el-menu-text-color: #dce9df;

  border-right: none;
  background-color: transparent;

  :deep(.el-menu) {
    background-color: transparent;
  }

  :deep(.el-menu-item),
  :deep(.el-sub-menu__title) {
    height: 46px;
    margin: 3px 10px;
    color: #dce9df;
    border-radius: 11px;

    .el-icon,
    span {
      color: inherit;
    }

    &:hover {
      color: #fff;
      background-color: rgba(255, 255, 255, 0.1);
    }

    &.is-active {
      color: #d9ff8a;
      background-color: rgba(201, 242, 123, 0.16);
      box-shadow: inset 3px 0 $accent-color;
    }
  }

  :deep(.el-sub-menu.is-open > .el-sub-menu__title) {
    color: #fff;
    background-color: rgba(255, 255, 255, 0.08);
  }

  :deep(.el-menu--inline) {
    margin: 2px 10px 6px;
    padding: 4px 0;
    background-color: rgba(4, 22, 18, 0.3);
    border-radius: 12px;
  }

  :deep(.el-sub-menu .el-menu-item) {
    min-width: auto;
    margin: 2px 6px;
    padding-left: 42px !important;
    color: #e7f0e9;
    background-color: transparent;
    font-weight: 620;

    &:hover {
      color: #fff;
      background-color: rgba(255, 255, 255, 0.1);
    }

    &.is-active {
      color: #efffbd;
      background-color: rgba(201, 242, 123, 0.2);
      box-shadow: inset 3px 0 $accent-color;
    }
  }
}

:global(.el-menu--popup) {
  --el-menu-active-color: #d9ff8a;
  --el-menu-bg-color: #102922;
  --el-menu-hover-bg-color: rgba(255, 255, 255, 0.1);
  --el-menu-text-color: #e7f0e9;

  padding: 8px;
  background-color: #102922;
  border: 1px solid rgba(201, 242, 123, 0.16);
  border-radius: 12px;
  box-shadow: 0 18px 46px rgba(4, 22, 18, 0.28);
}

:global(.el-menu--popup .el-menu-item) {
  height: 40px;
  color: #e7f0e9;
  border-radius: 9px;
}

:global(.el-menu--popup .el-menu-item:hover) {
  color: #fff;
  background-color: rgba(255, 255, 255, 0.1);
}

:global(.el-menu--popup .el-menu-item.is-active) {
  color: #efffbd;
  background-color: rgba(201, 242, 123, 0.2);
}

.system-status {
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 62px;
  margin: 12px;
  padding: 12px;
  color: #e7eee8;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;

  &.is-collapsed { justify-content: center; }
}

.status-pulse {
  width: 9px;
  height: 9px;
  flex: 0 0 9px;
  background: $accent-color;
  border: 2px solid rgba(201, 242, 123, 0.28);
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgba(201, 242, 123, 0.08);
}

.status-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong { font-size: 12px; font-weight: 700; }
  span { color: rgba(231, 238, 232, 0.45); font-size: 10px; white-space: nowrap; }
}

.layout-main-container {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.layout-header {
  background: rgba(247, 247, 243, 0.88);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  border-bottom: 1px solid rgba(216, 222, 217, 0.8);
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
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  padding: 0;
  background: #fff;
  border: 1px solid $border-light;
  border-radius: 11px;
  cursor: pointer;
  color: $text-regular;
  box-shadow: $shadow-sm;
  transition: color $transition-duration, transform $transition-duration;

  &:hover {
    color: $primary-color;
    transform: translateY(-1px);
  }
}

.route-heading {
  display: flex;
  flex-direction: column;
  gap: 1px;

  strong {
    color: $text-primary;
    font-size: 17px;
    font-weight: 720;
    letter-spacing: -0.025em;
  }
}

.route-eyebrow {
  color: $text-placeholder;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.11em;
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
  background: #fff;
  border: 1px solid $border-light;
  border-radius: 11px;
  cursor: pointer;
  color: $text-regular;
  box-shadow: $shadow-sm;
  transition: color $transition-duration, transform $transition-duration;

  &:hover {
    color: $primary-color;
    transform: translateY(-1px);
  }
}

.command-search {
  width: 230px;
  height: 38px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 9px 0 12px;
  color: $text-secondary;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid $border-light;
  border-radius: 11px;
  cursor: pointer;

  span { flex: 1; text-align: left; font-size: 12px; }
  kbd {
    padding: 3px 6px;
    color: $text-secondary;
    background: #f0f2ed;
    border: 1px solid $border-light;
    border-radius: 6px;
    font-size: 10px;
    box-shadow: 0 1px 0 #d8ded9;
  }
}

.notification-badge {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 9px;
  cursor: pointer;
  padding: 4px 6px 4px 4px;
  border-radius: 12px;
  transition: background-color $transition-duration;

  &:hover {
    background-color: $bg-color;
  }
}

.user-name {
  font-size: 12px;
  font-weight: 700;
  color: $text-primary;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-copy { display: flex; flex-direction: column; line-height: 1.25; }
.user-role { color: $text-placeholder; font-size: 9px; }
.user-arrow { color: $text-placeholder; }

.layout-main {
  flex: 1;
  min-height: 0;
  background:
    radial-gradient(circle at 90% 0%, rgba(201, 242, 123, 0.13), transparent 24%),
    $bg-page;
  padding: 0;
  overflow-y: auto;
  overflow-x: hidden;
  @include custom-scrollbar;
}

@media (max-width: 1024px) {
  .command-search { width: 40px; padding: 0; justify-content: center; }
  .command-search span, .command-search kbd { display: none; }
}

@media (max-width: 760px) {
  .layout-header { padding: 0 14px; }
  .route-eyebrow, .user-copy { display: none; }
  .header-right { gap: 6px; }
}
</style>
