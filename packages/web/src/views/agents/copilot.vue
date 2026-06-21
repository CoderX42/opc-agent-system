<template>
  <div class="copilot-page">
    <div class="copilot-stage">
      <!-- ============ 主体两列：左 rail / 右控制台 ============ -->
      <section class="copilot-grid">
        <!-- 左：Agent 选择 + 命令清单 -->
        <aside class="copilot-rail">
          <div class="rail-block">
            <div class="agent-rail">
              <button
                v-for="(agent, i) in agents"
                :key="agent.type"
                type="button"
                class="agent-tile"
                :class="{ 'is-active': agent.type === activeAgent.type }"
                :style="{ '--agent-accent': agent.color }"
                @click="activeType = agent.type"
              >
                <span class="tile-rail" aria-hidden="true"></span>
                <span class="tile-watermark" aria-hidden="true">{{ agent.mono }}</span>

                <header class="tile-head">
                  <span class="tile-mono" aria-hidden="true">{{ agent.mono }}</span>
                  <span class="tile-status">
                    <i></i> 在岗
                  </span>
                </header>

                <div class="tile-body">
                  <h3 class="tile-name">{{ agent.name }}</h3>
                  <p class="tile-desc">{{ agent.description }}</p>
                </div>

                <footer class="tile-foot">
                  <span class="tile-code">No.{{ String(i + 1).padStart(2, '0') }} · {{ agent.code }}</span>
                  <span class="tile-meta">
                    <span>{{ agent.suggestions.length }} 命令</span>
                    <span class="tile-dot">·</span>
                    <span>{{ agent.actions.length }} 跳转</span>
                  </span>
                </footer>
              </button>
            </div>
          </div>

          <div class="rail-block">
            <ol class="cmd-list">
              <li
                v-for="(prompt, i) in activeAgent.suggestions"
                :key="prompt"
                class="cmd-item"
                :style="{ '--agent-accent': activeAgent.color }"
              >
                <button type="button" @click="sendPrompt(prompt)">
                  <span class="cmd-no">{{ String(i + 1).padStart(2, '0') }}</span>
                  <span class="cmd-text">{{ prompt }}</span>
                  <span class="cmd-run">RUN</span>
                </button>
              </li>
            </ol>
          </div>
        </aside>

        <!-- 右：Context brief + Chat 控制台 -->
        <main class="copilot-workspace">
          <!-- Context brief -->
          <article
            class="brief-card"
            :style="{ '--agent-accent': activeAgent.color }"
          >
            <div class="brief-top">
              <span class="brief-kicker">任务简报 · {{ activeAgent.code }}</span>
              <span class="brief-live">
                <i></i> 在线
              </span>
            </div>

            <div class="brief-main">
              <h3 class="brief-name">{{ activeAgent.name }}</h3>
              <p class="brief-desc">{{ activeAgent.longDescription }}</p>
            </div>

            <div class="brief-meta">
              <div class="meta-col">
                <span class="meta-label">能力</span>
                <span class="meta-value">{{ activeAgent.capability }}</span>
              </div>
              <div class="meta-col">
                <span class="meta-label">响应速度</span>
                <span class="meta-value">{{ activeAgent.sla }}</span>
              </div>
              <div class="meta-col meta-actions">
                <span class="meta-label">快捷跳转</span>
                <div class="meta-actions-row">
                  <button
                    v-for="action in activeAgent.actions"
                    :key="action.path"
                    type="button"
                    class="meta-action"
                    @click="$router.push(action.path)"
                  >
                    <span class="meta-action-arrow">↗</span>
                    {{ action.label }}
                  </button>
                </div>
              </div>
            </div>
          </article>

          <!-- Chat 控制台 -->
          <AgentAssistantPanel
            :key="activeAgent.type"
            :type="activeAgent.type"
            :title="`${activeAgent.name} Copilot`"
            :icon="activeAgent.icon"
            :color="activeAgent.color"
            :placeholder="activeAgent.placeholder"
            :suggestions="activeAgent.suggestions"
            @send="sendPrompt"
          />
        </main>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AgentAssistantPanel from '@/components/AgentAssistantPanel.vue'
import type { AgentChatType } from '@/api/agent'

interface AgentOption {
  type: AgentChatType
  code: string
  mono: string
  name: string
  icon: string
  color: string
  description: string
  longDescription: string
  capability: string
  sla: string
  placeholder: string
  suggestions: string[]
  actions: Array<{ label: string; icon: string; path: string }>
}

const agents: AgentOption[] = [
  {
    type: 'FINANCE',
    code: 'FIN-01',
    mono: '¥',
    name: '财务 Agent',
    icon: 'Money',
    color: '#2f8f67',
    description: '发票、记账、经营分析',
    longDescription: '账务核算、发票归集、利润复盘、现金流预测。给一个口径，它能跑完整套数。',
    capability: '发票核验 · 分类复盘 · 现金流',
    sla: 'avg. 2.4s / reply',
    placeholder: '问财务 Agent：比如帮我分析现金流、检查发票、生成报表口径...',
    suggestions: [
      '帮我总结当前收入、支出和净利润',
      '待审发票应该优先处理哪些？',
      '帮我检查最近交易有没有异常分类',
      '生成一段本月财务经营摘要',
    ],
    actions: [
      { label: '发票管理', icon: 'Document', path: '/finance/invoice' },
      { label: '记账管理', icon: 'Tickets', path: '/finance/transaction' },
      { label: '财务报表', icon: 'DataAnalysis', path: '/finance/report' },
    ],
  },
  {
    type: 'CUSTOMER_SERVICE',
    code: 'CUS-02',
    mono: '✉',
    name: '客服 Agent',
    icon: 'Service',
    color: '#3b5bdb',
    description: '对话、工单、回复建议',
    longDescription: '对话分流、回复口径、情绪识别、转人工判断。把客户问题拆成可执行步骤。',
    capability: '对话分流 · 工单优先级 · 情绪识别',
    sla: 'avg. 1.8s / reply',
    placeholder: '问客服 Agent：比如帮我拟回复、整理工单、判断是否转人工...',
    suggestions: [
      '帮我总结今天待处理工单',
      '给一个投诉客户回复模板',
      '哪些对话需要优先跟进？',
      '帮我把客户问题拆成处理步骤',
    ],
    actions: [
      { label: '对话管理', icon: 'ChatDotRound', path: '/customer-service/conversation' },
      { label: '工单管理', icon: 'Ticket', path: '/customer-service/ticket' },
    ],
  },
  {
    type: 'LEGAL',
    code: 'LAW-03',
    mono: '§',
    name: '法务 Agent',
    icon: 'DocumentChecked',
    color: '#c8772e',
    description: '合同审查、合规风险',
    longDescription: '合同条款检查、风险标注、合规清单、到期事项处理。把模糊的法务语言变成清单。',
    capability: '合同审查 · 合规扫描 · 风险标注',
    sla: 'avg. 3.1s / reply',
    placeholder: '问法务 Agent：比如检查合同风险、整理合规清单、提示到期事项...',
    suggestions: [
      '帮我列出合同审查重点',
      '即将到期合同该怎么处理？',
      '生成一份合规检查清单',
      '帮我识别采购合同常见风险',
    ],
    actions: [
      { label: '合同管理', icon: 'Document', path: '/legal/contract' },
      { label: '合规检查', icon: 'CircleCheck', path: '/legal/compliance' },
    ],
  },
  {
    type: 'ADMIN',
    code: 'ADM-04',
    mono: '◴',
    name: '行政 Agent',
    icon: 'OfficeBuilding',
    color: '#c44a3f',
    description: '日程、任务、会议行动项',
    longDescription: '日程同步、会议纪要、待办拆解、行动项提炼。把一天的混乱压成一条时间线。',
    capability: '日程同步 · 任务拆解 · 会议纪要',
    sla: 'avg. 2.0s / reply',
    placeholder: '问行政 Agent：比如拆解任务、安排日程、提炼会议行动项...',
    suggestions: [
      '帮我安排今天的工作优先级',
      '把待办任务拆成下一步行动',
      '生成会议纪要行动项模板',
      '提醒我哪些事项可能逾期',
    ],
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
const activeAgent = computed(
  () => agents.find((agent) => agent.type === activeType.value) || agents[0],
)

watch(
  () => route.query.agent,
  (agent) => {
    activeType.value = normalizeAgentType(agent)
  },
)

// 命令从 quick list 发送时，通知 AgentAssistantPanel 的 chat
const chatRef = ref<InstanceType<typeof AgentAssistantPanel> | null>(null)
function sendPrompt(prompt: string) {
  chatRef.value?.receivePrompt(prompt)
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

// ============== 字体加载 ==============
.copilot-page {
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,800;1,9..144,500&family=JetBrains+Mono:wght@400;500;700&family=Inter+Tight:wght@400;500;600;700&display=swap');
}

// ============== 页面底色 + 纸质网格 ==============
.copilot-page {
  position: relative;
  min-height: calc(100vh - #{$header-height});
  padding: 32px 36px 56px;
  background:
    radial-gradient(ellipse at 12% 0%, rgba(201, 242, 123, 0.08), transparent 50%),
    radial-gradient(ellipse at 100% 100%, rgba(59, 91, 219, 0.04), transparent 45%),
    #f4f2ec;
  color: $text-primary;
  font-family: 'Inter Tight', -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(to right, rgba(26, 36, 33, 0.045) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(26, 36, 33, 0.045) 1px, transparent 1px);
    background-size: 32px 32px;
    background-position: -1px -1px;
    pointer-events: none;
    mask-image: radial-gradient(ellipse at 50% 30%, black 40%, transparent 90%);
  }
}

.copilot-stage {
  position: relative;
  max-width: 1320px;
  margin: 0 auto;
}

// ============== 主体两列 ==============
.copilot-grid {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  gap: 28px;
  align-items: start;
  animation: rise 0.9s 0.1s $transition-timing both;
}

// ============== 左 rail ==============
.copilot-rail {
  display: flex;
  flex-direction: column;
  gap: 22px;
  position: sticky;
  top: 12px;
}

.rail-block {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(14px);
  border: 1px solid rgba(26, 36, 33, 0.1);
  border-radius: $border-radius-lg;
  padding: 20px;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.6) inset, $shadow-sm;
}

.rail-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 14px;

  h2 {
    margin: 0;
    font-family: 'Fraunces', Georgia, serif;
    font-weight: 600;
    font-size: 19px;
    letter-spacing: -0.01em;
    color: $text-primary;
  }
}

.rail-num {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: $text-secondary;
  padding: 3px 7px;
  border: 1px solid rgba(26, 36, 33, 0.2);
  border-radius: 4px;
}

.rail-hint {
  margin-left: auto;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  color: $text-placeholder;
}

// --- Agent tiles ---
.agent-rail {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.agent-tile {
  --agent-accent: #{$primary-color};
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px 14px 20px;
  text-align: left;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(26, 36, 33, 0.1);
  border-radius: 16px;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.6) inset, 0 1px 2px rgba(20, 35, 30, 0.03);
  overflow: hidden;
  transition:
    background-color 0.28s ease,
    border-color 0.28s ease,
    transform 0.28s ease,
    box-shadow 0.28s ease;

  // 左侧激活条
  .tile-rail {
    position: absolute;
    left: 6px;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 0;
    background: var(--agent-accent);
    border-radius: 2px;
    transition: height 0.36s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  // 大号衬线水印（背景）
  .tile-watermark {
    position: absolute;
    right: -10px;
    bottom: -28px;
    font-family: 'Fraunces', Georgia, serif;
    font-size: 120px;
    font-weight: 600;
    line-height: 1;
    color: var(--agent-accent);
    opacity: 0.05;
    pointer-events: none;
    transition: opacity 0.32s ease, transform 0.4s ease;
    user-select: none;
  }

  .tile-head {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .tile-mono {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    font-family: 'Fraunces', Georgia, serif;
    font-size: 18px;
    font-weight: 600;
    color: var(--agent-accent);
    background: color-mix(in srgb, var(--agent-accent) 12%, white);
    border: 1px solid color-mix(in srgb, var(--agent-accent) 22%, transparent);
    border-radius: 9px;
    transition:
      background-color 0.28s ease,
      color 0.28s ease,
      transform 0.32s ease,
      border-color 0.28s ease;
  }

  .tile-status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: $text-secondary;

    i {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: $success-color;
      box-shadow: 0 0 0 3px rgba(47, 143, 103, 0.14);
      animation: tilePulse 1.8s ease-in-out infinite;
    }
  }

  .tile-body {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .tile-name {
    margin: 0;
    font-family: 'Fraunces', Georgia, serif;
    font-size: 19px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: $text-primary;
    transition: color 0.28s ease;
  }

  .tile-desc {
    margin: 0;
    font-size: 12px;
    line-height: 1.45;
    color: $text-secondary;
    transition: color 0.28s ease;
  }

  .tile-foot {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding-top: 10px;
    border-top: 1px dashed rgba(26, 36, 33, 0.12);
  }

  .tile-code {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: $text-placeholder;
    font-variant-numeric: tabular-nums;
  }

  .tile-meta {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 10px;
    color: $text-placeholder;
  }

  .tile-dot {
    color: rgba(26, 36, 33, 0.25);
  }

  &:hover {
    border-color: color-mix(in srgb, var(--agent-accent) 32%, transparent);
    transform: translateY(-2px);
    box-shadow: 0 12px 28px color-mix(in srgb, var(--agent-accent) 10%, transparent);

    .tile-watermark {
      opacity: 0.09;
      transform: translateX(-2px);
    }

    .tile-mono {
      transform: scale(1.06);
    }
  }

  &.is-active {
    background: var(--agent-accent);
    border-color: var(--agent-accent);
    box-shadow:
      0 14px 36px color-mix(in srgb, var(--agent-accent) 28%, transparent),
      0 1px 0 rgba(255, 255, 255, 0.18) inset;

    .tile-rail {
      height: 70%;
    }

    .tile-watermark {
      opacity: 0.14;
      color: white;
      transform: translateX(-3px);
    }

    .tile-mono {
      background: rgba(255, 255, 255, 0.18);
      color: white;
      border-color: rgba(255, 255, 255, 0.32);
      transform: scale(1.06);
    }

    .tile-status {
      color: rgba(255, 255, 255, 0.92);

      i {
        background: white;
        box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.18);
      }
    }

    .tile-name,
    .tile-desc {
      color: white;
    }

    .tile-desc {
      color: rgba(255, 255, 255, 0.78);
    }

    .tile-foot {
      border-top-color: rgba(255, 255, 255, 0.18);
    }

    .tile-code,
    .tile-meta {
      color: rgba(255, 255, 255, 0.72);
    }

    .tile-dot {
      color: rgba(255, 255, 255, 0.4);
    }
  }
}

@keyframes tilePulse {
  0%, 100% {
    box-shadow: 0 0 0 3px rgba(47, 143, 103, 0.14);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(47, 143, 103, 0.06);
  }
}

// --- 命令清单 ---
.cmd-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cmd-item button {
  width: 100%;
  display: grid;
  grid-template-columns: 36px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 10px;
  transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;

  .cmd-no {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 11px;
    font-weight: 700;
    color: $text-placeholder;
    font-variant-numeric: tabular-nums;
  }

  .cmd-text {
    font-size: 13px;
    line-height: 1.4;
    color: $text-regular;
  }

  .cmd-run {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: $text-placeholder;
    padding: 3px 6px;
    border: 1px solid rgba(26, 36, 33, 0.15);
    border-radius: 3px;
    transition: color 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
  }

  &:hover {
    background: color-mix(in srgb, var(--agent-accent) 6%, white);
    border-color: color-mix(in srgb, var(--agent-accent) 18%, transparent);
    transform: translateX(2px);

    .cmd-no {
      color: var(--agent-accent);
    }

    .cmd-run {
      color: var(--agent-accent);
      border-color: var(--agent-accent);
      background: color-mix(in srgb, var(--agent-accent) 8%, white);
    }
  }
}

// ============== 右 workspace ==============
.copilot-workspace {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}

// --- Brief card ---
.brief-card {
  --agent-accent: #{$primary-color};
  position: relative;
  padding: 22px 24px 20px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--agent-accent) 6%, white), rgba(255, 255, 255, 0.96)),
    $bg-white;
  border: 1px solid color-mix(in srgb, var(--agent-accent) 18%, $border-light);
  border-radius: $border-radius-lg;
  box-shadow: $shadow-sm;
  overflow: hidden;
  transition: border-color 0.4s ease, box-shadow 0.4s ease;

  &::after {
    content: '';
    position: absolute;
    right: -40px;
    bottom: -40px;
    width: 180px;
    height: 180px;
    border-radius: 50%;
    background: radial-gradient(circle, color-mix(in srgb, var(--agent-accent) 14%, transparent), transparent 70%);
    pointer-events: none;
  }
}

.brief-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.brief-kicker {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: color-mix(in srgb, var(--agent-accent) 78%, $text-secondary);
}

.brief-live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: $success-color;

  i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: $success-color;
    box-shadow: 0 0 0 3px rgba(47, 143, 103, 0.18);
    animation: pulse 1.6s ease-in-out infinite;
  }
}

.brief-main {
  margin-bottom: 18px;
}

.brief-name {
  margin: 0 0 6px;
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 600;
  font-size: 28px;
  letter-spacing: -0.01em;
  color: $text-primary;
}

.brief-desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: $text-regular;
  max-width: 640px;
}

.brief-meta {
  display: grid;
  grid-template-columns: 1fr 1fr 1.4fr;
  gap: 18px;
  padding-top: 16px;
  border-top: 1px dashed rgba(26, 36, 33, 0.14);
}

.meta-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.meta-label {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: $text-placeholder;
}

.meta-value {
  font-size: 13px;
  font-weight: 600;
  color: $text-primary;
}

.meta-actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.meta-action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 600;
  color: color-mix(in srgb, var(--agent-accent) 80%, $text-primary);
  background: color-mix(in srgb, var(--agent-accent) 8%, white);
  border: 1px solid color-mix(in srgb, var(--agent-accent) 18%, transparent);
  border-radius: 999px;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.2s ease;

  .meta-action-arrow {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 11px;
  }

  &:hover {
    background: color-mix(in srgb, var(--agent-accent) 14%, white);
    transform: translateY(-1px);
  }
}

// ============== 动画 ==============
@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 3px rgba(47, 143, 103, 0.18);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(47, 143, 103, 0.08);
  }
}

// ============== 响应式 ==============
@media (max-width: 1080px) {
  .copilot-grid {
    grid-template-columns: 1fr;
  }

  .copilot-rail {
    position: static;
  }

  .agent-rail {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .brief-meta {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 720px) {
  .copilot-page {
    padding: 24px 18px 40px;
  }

  .hero-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .stat {
    &:nth-child(2) {
      border-right: none;
    }
  }

  .agent-rail {
    grid-template-columns: 1fr;
  }

  .brief-meta {
    grid-template-columns: 1fr;
  }
}
</style>