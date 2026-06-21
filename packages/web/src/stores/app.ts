import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  // ==================== State ====================
  const sidebarCollapsed = ref(false)
  const pageLoading = ref(false)
  const activeMenu = ref('')

  // 通知相关
  const notificationCount = ref(0)
  const notifications = ref<Array<{
    id: string
    title: string
    content: string
    type: 'info' | 'success' | 'warning' | 'error'
    read: boolean
    timestamp: string
  }>>([])

  // ==================== Actions ====================

  /** 切换侧边栏折叠状态 */
  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  /** 设置页面加载状态 */
  function setPageLoading(loading: boolean) {
    pageLoading.value = loading
  }

  /** 设置当前激活菜单 */
  function setActiveMenu(menu: string) {
    activeMenu.value = menu
  }

  /** 添加通知 */
  function addNotification(notification: Omit<typeof notifications.value[0], 'id' | 'read' | 'timestamp'>) {
    notifications.value.unshift({
      ...notification,
      id: `notification-${Date.now()}`,
      read: false,
      timestamp: new Date().toISOString(),
    })
    notificationCount.value = notifications.value.filter((n) => !n.read).length
  }

  /** 标记所有通知为已读 */
  function markAllNotificationsRead() {
    notifications.value.forEach((n) => {
      n.read = true
    })
    notificationCount.value = 0
  }

  /** 清除通知 */
  function clearNotifications() {
    notifications.value = []
    notificationCount.value = 0
  }

  return {
    sidebarCollapsed,
    pageLoading,
    activeMenu,
    notificationCount,
    notifications,
    toggleSidebar,
    setPageLoading,
    setActiveMenu,
    addNotification,
    markAllNotificationsRead,
    clearNotifications,
  }
})
