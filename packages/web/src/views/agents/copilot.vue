<template>
  <div class="copilot-page">
    <div class="copilot-stage">
      <!-- ============ 主体两列：左 rail / 右控制台 ============ -->
      <section class="copilot-grid">
        <!-- 左：Agent 选择 + 命令清单 -->
        <aside class="copilot-rail">
          <div class="rail-block glass-card">
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

          <div class="rail-block glass-card">
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

// ============== 页面底色 + 玻璃拟态 ==============
.copilot-page {
  position: relative;
  min-height: calc(100vh - #{$header-height});
  padding: 28px 32px 48px;
  color: rgb(var(--text));
  font-family: var(--font-body);
  overflow: hidden;
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
  background:
    linear-gradient(145deg, rgb(var(--surface) / 0.98), rgb(var(--surface) / 0.92));
  border: 1px solid rgb(var(--line) / 0.6);
  padding: 20px;
  border-radius: 1.25rem;
  box-shadow: $shadow-soft;
  backdrop-filter: blur(14px);
}

.rail-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 14px;

  h2 {
    margin: 0;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 16px;
    letter-spacing: -0.01em;
    color: rgb(var(--text));
  }
}

.rail-num {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: rgb(var(--accent-strong));
  padding: 4px 8px;
  border-radius: 999px;
  background: rgb(var(--accent-2) / 0.12);
}

.rail-hint {
  margin-left: auto;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  color: rgb(var(--faint));
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
  padding: 16px 18px;
  text-align: left;
  cursor: pointer;
  background: rgb(var(--surface) / 0.92);
  border: 1px solid rgb(var(--line) / 0.6);
  border-radius: 1.125rem;
  box-shadow: $shadow-soft;
  overflow: hidden;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  backdrop-filter: blur(10px);

  // 左侧激活条
  .tile-rail {
    position: absolute;
    left: 8px;
    top: 12px;
    bottom: 12px;
    width: 4px;
    border-radius: 999px;
    background: linear-gradient(180deg, var(--agent-accent), rgb(var(--accent-2)));
    opacity: 0.55;
  }

  // 大号装饰字符（背景水印，去掉斜体）
  .tile-watermark {
    position: absolute;
    right: -10px;
    bottom: -28px;
    font-family: var(--font-body);
    font-size: 120px;
    font-weight: 700;
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
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    font-family: var(--font-body);
    font-size: 16px;
    font-weight: 600;
    color: #fff;
    background: linear-gradient(135deg, var(--agent-accent), rgb(var(--accent)));
    border-radius: 10px;
    transition: transform 0.2s ease;
    box-shadow: 0 6px 16px -8px var(--agent-accent);
  }

  .tile-status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.12em;
    color: rgb(var(--muted));

    i {
      width: 6px;
      height: 6px;
      background: rgb(var(--success));
      border-radius: 50%;
      box-shadow: 0 0 0 3px rgb(var(--success) / 0.18);
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
    font-family: var(--font-body);
    font-size: 16px;
    font-weight: 600;
    color: rgb(var(--text));
    transition: color 0.2s ease;
  }

  .tile-desc {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: rgb(var(--muted));
    transition: color 0.2s ease;
  }

  .tile-foot {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding-top: 10px;
  }

  .tile-code {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.1em;
    color: rgb(var(--muted));
    font-variant-numeric: tabular-nums;
  }

  .tile-meta {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 500;
    letter-spacing: 0.08em;
    color: rgb(var(--faint));
  }

  .tile-dot {
    color: rgb(var(--faint) / 0.6);
  }

  &:hover {
    border-color: rgb(var(--accent) / 0.5);
    transform: translateY(-2px);
    box-shadow: $shadow-glow;

    .tile-watermark {
      opacity: 0.08;
      transform: translateX(-2px);
    }

    .tile-mono {
      transform: scale(1.06);
    }
  }

  &.is-active {
    background: linear-gradient(135deg, var(--agent-accent), rgb(var(--accent-strong)));
    border-color: transparent;
    box-shadow: 0 18px 48px -16px var(--agent-accent), inset 0 1px 0 rgb(255 255 255 / 0.2);

    .tile-rail { height: 70%; }

    .tile-watermark {
      opacity: 0.14;
      color: white;
      transform: translateX(-3px);
    }

    .tile-mono {
      background: rgb(255 255 255 / 0.22);
      color: white;
      border-color: rgb(255 255 255 / 0.32);
      transform: scale(1.06);
      box-shadow: none;
    }

    .tile-status {
      color: rgb(255 255 255 / 0.92);
      i {
        background: white;
        box-shadow: 0 0 0 3px rgb(255 255 255 / 0.25);
      }
    }

    .tile-name,
    .tile-desc { color: white; }
    .tile-desc { color: rgb(255 255 255 / 0.82); }
    .tile-code,
    .tile-meta { color: rgb(255 255 255 / 0.78); }
    .tile-dot { color: rgb(255 255 255 / 0.45); }
  }
}

@keyframes tilePulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(0.92);
    opacity: 0.85;
  }
}

// --- 命令清单 ---
.cmd-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cmd-item button {
  width: 100%;
  display: grid;
  grid-template-columns: 36px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  text-align: left;
  cursor: pointer;
  background: rgb(var(--surface) / 0.75);
  border: 1px solid rgb(var(--line) / 0.6);
  border-radius: 0.875rem;
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
  backdrop-filter: blur(6px);

  .cmd-no {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.1em;
    color: rgb(var(--faint));
    font-variant-numeric: tabular-nums;
  }

  .cmd-text {
    font-size: 12px;
    line-height: 1.4;
    color: rgb(var(--text));
  }

  .cmd-run {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.1em;
    color: rgb(var(--muted));
    padding: 3px 9px;
    border: 0;
    background: rgb(var(--elev) / 0.8);
    border-radius: 999px;
    transition: all 0.2s ease;
  }

  &:hover {
    background: rgb(var(--surface));
    border-color: rgb(var(--accent) / 0.45);
    transform: translateX(2px);

    .cmd-no { color: rgb(var(--accent-strong)); }

    .cmd-run {
      color: #fff;
      background: var(--agent-accent);
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
    linear-gradient(135deg,
      rgb(var(--accent-2) / 0.15),
      rgb(var(--surface) / 0.96) 50%,
      rgb(var(--accent-3) / 0.12) 100%);
  border: 1px solid rgb(var(--line) / 0.6);
  border-radius: 1.25rem;
  box-shadow: $shadow-md;
  backdrop-filter: blur(14px);
  overflow: hidden;
  transition: box-shadow 0.4s ease;

  &::after {
    content: '';
    position: absolute;
    right: -40px;
    bottom: -40px;
    width: 180px;
    height: 180px;
    background: radial-gradient(circle, rgb(var(--agent-accent) / 0.18), transparent 70%);
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
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgb(var(--accent-strong));
}

.brief-live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: rgb(var(--success));
  padding: 4px 9px;
  border-radius: 999px;
  background: rgb(var(--success) / 0.1);

  i {
    width: 6px;
    height: 6px;
    background: rgb(var(--success));
    border-radius: 50%;
    box-shadow: 0 0 0 3px rgb(var(--success) / 0.2);
    animation: pulse 1.6s ease-in-out infinite;
  }
}

.brief-main {
  margin-bottom: 18px;
}

.brief-name {
  margin: 0 0 6px;
  font-family: var(--font-body);
  font-weight: 700;
  font-size: 26px;
  letter-spacing: -0.02em;
  color: rgb(var(--text));
}

.brief-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: rgb(var(--muted));
  max-width: 640px;
}

.brief-meta {
  display: grid;
  grid-template-columns: 1fr 1fr 1.4fr;
  gap: 16px;
  padding-top: 16px;
}

.meta-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.meta-label {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgb(var(--muted));
}

.meta-value {
  font-size: 13px;
  font-weight: 600;
  color: rgb(var(--text));
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
  padding: 6px 12px;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 600;
  color: rgb(var(--accent-strong));
  background: rgb(var(--surface) / 0.8);
  border: 1px solid rgb(var(--line) / 0.6);
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;

  .meta-action-arrow {
    font-family: var(--font-body);
    font-size: 11px;
  }

  &:hover {
    background: rgb(var(--accent-2) / 0.12);
    border-color: rgb(var(--accent) / 0.5);
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
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.18); }
}

// ============== 响应式 ==============
@media (max-width: 1080px) {
  .copilot-grid { grid-template-columns: 1fr; }
  .copilot-rail { position: static; }
  .agent-rail {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .brief-meta { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 720px) {
  .copilot-page { padding: 24px 18px 40px; }
  .agent-rail { grid-template-columns: 1fr; }
  .brief-meta { grid-template-columns: 1fr; }
}
</style>