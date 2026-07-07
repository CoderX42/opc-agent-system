import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { getToken } from '@/utils'
import { useUserStore } from '@/stores/user'

NProgress.configure({ showSpinner: false })

/** 静态路由 */
export const constantRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', hidden: true },
  },
  {
    path: '/office/:agentType?',
    name: 'Office',
    component: () => import('@/views/office/index.vue'),
    meta: { title: '数字员工办公区', icon: 'OfficeBuilding' },
  },
  {
    path: '/agents/copilot',
    name: 'AgentCopilot',
    component: () => import('@/views/agents/copilot.vue'),
    meta: { title: 'Agent 助手', icon: 'MagicStick', standalone: true },
  },

  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '工作台', icon: 'Monitor' },
      },
    ],
  },
  {
    path: '/finance',
    component: () => import('@/layouts/DefaultLayout.vue'),
    redirect: '/finance/index',
    meta: { title: '财务Agent', icon: 'Money' },
    children: [
      {
        path: 'index',
        name: 'FinanceOverview',
        component: () => import('@/views/finance/index.vue'),
        meta: { title: '财务概览' },
      },
      {
        path: 'invoice',
        name: 'FinanceInvoice',
        component: () => import('@/views/finance/invoice.vue'),
        meta: { title: '发票管理' },
      },
      {
        path: 'transaction',
        name: 'FinanceTransaction',
        component: () => import('@/views/finance/transaction.vue'),
        meta: { title: '记账管理' },
      },
      {
        path: 'report',
        name: 'FinanceReport',
        component: () => import('@/views/finance/report.vue'),
        meta: { title: '财务报表' },
      },
    ],
  },
  {
    path: '/customer-service',
    component: () => import('@/layouts/DefaultLayout.vue'),
    redirect: '/customer-service/index',
    meta: { title: '客服Agent', icon: 'Service' },
    children: [
      {
        path: 'index',
        name: 'CustomerServiceOverview',
        component: () => import('@/views/customer-service/index.vue'),
        meta: { title: '客服概览' },
      },
      {
        path: 'conversation',
        name: 'Conversation',
        component: () => import('@/views/customer-service/conversation.vue'),
        meta: { title: '对话管理' },
      },
      {
        path: 'ticket',
        name: 'Ticket',
        component: () => import('@/views/customer-service/ticket.vue'),
        meta: { title: '工单管理' },
      },
    ],
  },
  {
    path: '/legal',
    component: () => import('@/layouts/DefaultLayout.vue'),
    redirect: '/legal/index',
    meta: { title: '法务Agent', icon: 'DocumentChecked' },
    children: [
      {
        path: 'index',
        name: 'LegalOverview',
        component: () => import('@/views/legal/index.vue'),
        meta: { title: '法务概览' },
      },
      {
        path: 'contract',
        name: 'Contract',
        component: () => import('@/views/legal/contract.vue'),
        meta: { title: '合同管理' },
      },
      {
        path: 'compliance',
        name: 'Compliance',
        component: () => import('@/views/legal/compliance.vue'),
        meta: { title: '合规检查' },
      },
    ],
  },
  {
    path: '/admin',
    component: () => import('@/layouts/DefaultLayout.vue'),
    redirect: '/admin/index',
    meta: { title: '行政Agent', icon: 'OfficeBuilding' },
    children: [
      {
        path: 'index',
        name: 'AdminOverview',
        component: () => import('@/views/admin/index.vue'),
        meta: { title: '行政概览' },
      },
      {
        path: 'schedule',
        name: 'Schedule',
        component: () => import('@/views/admin/schedule.vue'),
        meta: { title: '日程管理' },
      },
      {
        path: 'task',
        name: 'Task',
        component: () => import('@/views/admin/task.vue'),
        meta: { title: '任务管理' },
      },
      {
        path: 'meeting',
        name: 'Meeting',
        component: () => import('@/views/admin/meeting.vue'),
        meta: { title: '会议纪要' },
      },
    ],
  },
  {
    path: '/settings',
    component: () => import('@/layouts/DefaultLayout.vue'),
    children: [
      {
        path: '',
        name: 'Settings',
        component: () => import('@/views/settings/index.vue'),
        meta: { title: '系统设置', icon: 'Setting' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '404', hidden: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes: constantRoutes,
  scrollBehavior: () => ({ left: 0, top: 0 }),
})

// ==================== 路由守卫 ====================

const whiteList = ['/login']

router.beforeEach(async (to, _from, next) => {
  NProgress.start()

  // 设置页面标题
  document.title = to.meta.title
    ? `${to.meta.title} - ${import.meta.env.VITE_APP_TITLE}`
    : import.meta.env.VITE_APP_TITLE

  const token = getToken()

  if (token) {
    if (to.path === '/login') {
      // 已登录，跳转到首页
      next({ path: '/' })
      NProgress.done()
    } else {
      const userStore = useUserStore()
      if (userStore.user) {
        next()
      } else {
        try {
          await userStore.fetchUserInfo()
          next()
        } catch {
          // 获取用户信息失败 → 强制登出
          userStore.resetState()
          next(`/login?redirect=${to.path}`)
          NProgress.done()
        }
      }
    }
  } else {
    if (whiteList.includes(to.path)) {
      next()
    } else {
      next(`/login?redirect=${to.path}`)
      NProgress.done()
    }
  }
})

router.afterEach(() => {
  NProgress.done()
})

export default router
