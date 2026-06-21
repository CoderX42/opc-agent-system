<template>
  <div class="page-container copilot-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">Agent 助手</h2>
        <p class="page-subtitle">集中向四个数字员工提问、梳理事项和生成下一步建议。</p>
      </div>
      <div class="page-actions">
        <el-button icon="Monitor" @click="$router.push('/dashboard')">返回工作台</el-button>
      </div>
    </div>

    <section class="copilot-shell">
      <aside class="agent-switcher">
        <button
          v-for="agent in agents"
          :key="agent.type"
          type="button"
          class="agent-option"
          :class="{ 'is-active': agent.type === activeAgent.type }"
          :style="{ '--agent-color': agent.color }"
          @click="activeType = agent.type"
        >
          <span class="agent-option-icon">
            <el-icon><component :is="agent.icon" /></el-icon>
          </span>
          <span class="agent-option-copy">
            <strong>{{ agent.name }}</strong>
            <small>{{ agent.description }}</small>
          </span>
        </button>
      </aside>

      <main class="copilot-main">
        <div class="copilot-context" :style="{ '--agent-color': activeAgent.color }">
          <div>
            <span class="context-kicker">CURRENT AGENT</span>
            <h3>{{ activeAgent.name }}</h3>
            <p>{{ activeAgent.longDescription }}</p>
          </div>
          <div class="context-actions">
            <el-button
              v-for="action in activeAgent.actions"
              :key="action.label"
              :icon="action.icon"
              @click="$router.push(action.path)"
            >
              {{ action.label }}
            </el-button>
          </div>
        </div>

        <AgentAssistantPanel
          :key="activeAgent.type"
          :type="activeAgent.type"
          :title="`${activeAgent.name} Copilot`"
          :icon="activeAgent.icon"
          :color="activeAgent.color"
          :placeholder="activeAgent.placeholder"
          :suggestions="activeAgent.suggestions"
        />
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AgentAssistantPanel from '@/components/AgentAssistantPanel.vue'
import type { AgentChatType } from '@/api/agent'

interface AgentOption {
  type: AgentChatType
  name: string
  icon: string
  color: string
  description: string
  longDescription: string
  placeholder: string
  suggestions: string[]
  actions: Array<{ label: string; icon: string; path: string }>
}

const agents: AgentOption[] = [
  {
    type: 'FINANCE',
    name: '财务 Agent',
    icon: 'Money',
    color: '#2f8f67',
    description: '发票、记账、经营分析',
    longDescription: '适合处理发票识别、收支复盘、分类检查、经营摘要和报表口径。',
    placeholder: '问财务 Agent：比如帮我分析现金流、检查发票、生成报表口径...',
    suggestions: ['帮我总结当前收入、支出和净利润', '待审发票应该优先处理哪些？', '帮我检查最近交易有没有异常分类', '生成一段本月财务经营摘要'],
    actions: [
      { label: '发票管理', icon: 'Document', path: '/finance/invoice' },
      { label: '记账管理', icon: 'Tickets', path: '/finance/transaction' },
      { label: '财务报表', icon: 'DataAnalysis', path: '/finance/report' },
    ],
  },
  {
    type: 'CUSTOMER_SERVICE',
    name: '客服 Agent',
    icon: 'Service',
    color: '#397bff',
    description: '对话、工单、回复建议',
    longDescription: '适合整理客户问题、生成回复口径、判断优先级和规划转人工动作。',
    placeholder: '问客服 Agent：比如帮我拟回复、整理工单、判断是否转人工...',
    suggestions: ['帮我总结今天待处理工单', '给一个投诉客户回复模板', '哪些对话需要优先跟进？', '帮我把客户问题拆成处理步骤'],
    actions: [
      { label: '对话管理', icon: 'ChatDotRound', path: '/customer-service/conversation' },
      { label: '工单管理', icon: 'Ticket', path: '/customer-service/ticket' },
    ],
  },
  {
    type: 'LEGAL',
    name: '法务 Agent',
    icon: 'DocumentChecked',
    color: '#d9823d',
    description: '合同审查、合规风险',
    longDescription: '适合做合同条款检查、风险提示、合规清单和到期事项处理建议。',
    placeholder: '问法务 Agent：比如检查合同风险、整理合规清单、提示到期事项...',
    suggestions: ['帮我列出合同审查重点', '即将到期合同该怎么处理？', '生成一份合规检查清单', '帮我识别采购合同常见风险'],
    actions: [
      { label: '合同管理', icon: 'Document', path: '/legal/contract' },
      { label: '合规检查', icon: 'CircleCheck', path: '/legal/compliance' },
    ],
  },
  {
    type: 'ADMIN',
    name: '行政 Agent',
    icon: 'OfficeBuilding',
    color: '#d95951',
    description: '日程、任务、会议行动项',
    longDescription: '适合安排日程、拆解任务、提炼会议纪要和输出行动项。',
    placeholder: '问行政 Agent：比如拆解任务、安排日程、提炼会议行动项...',
    suggestions: ['帮我安排今天的工作优先级', '把待办任务拆成下一步行动', '生成会议纪要行动项模板', '提醒我哪些事项可能逾期'],
    actions: [
      { label: '日程管理', icon: 'Calendar', path: '/admin/schedule' },
      { label: '任务管理', icon: 'List', path: '/admin/task' },
      { label: '会议纪要', icon: 'Memo', path: '/admin/meeting' },
    ],
  },
]

const route = useRoute()

function normalizeAgentType(value: unknown): AgentChatType {
  const type = typeof value === 'string' ? value : 'FINANCE'
  return agents.some((agent) => agent.type === type) ? (type as AgentChatType) : 'FINANCE'
}

const activeType = ref<AgentChatType>(normalizeAgentType(route.query.agent))
const activeAgent = computed(() => agents.find((agent) => agent.type === activeType.value) || agents[0])

watch(
  () => route.query.agent,
  (agent) => {
    activeType.value = normalizeAgentType(agent)
  },
)
</script>

<style lang="scss" scoped>
.page-subtitle {
  margin-top: 6px;
  color: $text-secondary;
}

.copilot-shell {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 18px;
}

.agent-switcher {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.agent-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px;
  text-align: left;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid $border-light;
  border-radius: $border-radius-md;
  box-shadow: $shadow-sm;
  transition: border-color $transition-duration, background-color $transition-duration, transform $transition-duration;

  &:hover,
  &.is-active {
    border-color: color-mix(in srgb, var(--agent-color) 34%, $border-light);
    background: color-mix(in srgb, var(--agent-color) 8%, white);
    transform: translateY(-1px);
  }
}

.agent-option-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  flex: 0 0 38px;
  color: color-mix(in srgb, var(--agent-color) 74%, $text-primary);
  background: color-mix(in srgb, var(--agent-color) 12%, white);
  border-radius: 11px;
}

.agent-option-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;

  strong {
    color: $text-primary;
    font-size: 14px;
  }

  small {
    color: $text-secondary;
    line-height: 1.4;
  }
}

.copilot-main {
  min-width: 0;
}

.copilot-context {
  @include flex-between;
  gap: 18px;
  margin-bottom: 16px;
  padding: 18px 20px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--agent-color) 10%, white), rgba(255, 255, 255, 0.92));
  border: 1px solid color-mix(in srgb, var(--agent-color) 18%, $border-light);
  border-radius: $border-radius-lg;
  box-shadow: $shadow-sm;

  h3 {
    color: $text-primary;
    font-size: 22px;
    font-weight: 760;
  }

  p {
    margin-top: 4px;
    color: $text-secondary;
  }
}

.context-kicker {
  color: color-mix(in srgb, var(--agent-color) 76%, $text-secondary);
  font-size: 10px;
  font-weight: 760;
  letter-spacing: 0.12em;
}

.context-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

@media (max-width: 980px) {
  .copilot-shell {
    grid-template-columns: 1fr;
  }

  .agent-switcher {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .copilot-context {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 640px) {
  .agent-switcher {
    grid-template-columns: 1fr;
  }
}
</style>
