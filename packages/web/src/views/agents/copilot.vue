<template>
  <div class="agent-workspace-shell copilot-v2">
    <header class="workspace-bar">
      <div class="workspace-brand">
        <RouterLink to="/dashboard" class="brand-link"><img src="/brand/opc-cloud-logo.png" alt="OPC Agent" /></RouterLink>
        <span>AGENT WORKSPACE</span>
      </div>
      <nav class="workspace-nav" aria-label="工作区导航">
        <RouterLink to="/dashboard">工作台</RouterLink>
        <RouterLink to="/office">办公区</RouterLink>
        <span class="is-active">Copilot</span>
      </nav>
      <div class="workspace-actions">
        <button type="button" class="text-action" @click="collaborationOpen = true">协作编排</button>
        <button type="button" class="primary-action" @click="reset">新建会话</button>
      </div>
    </header>

    <main class="copilot-grid">
      <button type="button" class="mobile-agent-trigger" @click="agentPickerOpen = !agentPickerOpen">
        <span>当前：{{ activeAgent.name }}</span>
        <strong>{{ agentPickerOpen ? '收起' : '切换 Agent' }}</strong>
      </button>
      <aside class="agent-rail" :class="{ 'is-mobile-open': agentPickerOpen }" aria-label="选择 Agent">
        <div class="rail-heading">
          <span>01 / AGENTS</span>
          <p>选择一个专属 Agent，继续其独立会话。</p>
        </div>
        <div class="agent-list">
          <button
            v-for="agent in agents"
            :key="agent.type"
            type="button"
            class="agent-option"
            :class="{ 'is-active': activeType === agent.type }"
            :style="{ '--agent-accent': agent.accent, '--agent-soft': agent.softAccent }"
            @click="selectAgent(agent.type)"
          >
            <span class="agent-index">{{ agent.code }}</span>
            <span class="agent-option-main">
              <strong>{{ agent.name }}</strong>
              <small>{{ agent.description }}</small>
            </span>
            <span class="agent-ready">可用</span>
          </button>
        </div>
        <section class="session-note">
          <span>当前会话</span>
          <strong>{{ activeAgent.code }} / {{ sessionId.slice(-8) }}</strong>
          <p>切换 Agent 会保留各自的会话和草稿。</p>
        </section>
      </aside>

      <section class="conversation-stage">
        <div class="stage-topline">
          <div>
            <span>直接委派</span>
            <p>{{ activeAgent.description }}</p>
          </div>
          <button type="button" class="inspect-toggle" :aria-pressed="inspectorOpen" @click="inspectorOpen = !inspectorOpen">
            {{ inspectorOpen ? '收起执行详情' : '显示执行详情' }}
          </button>
        </div>
        <AgentChatWorkspace
          v-model="draft"
          :agent="activeAgent"
          :messages="messages"
          :status="status"
          context-label="专属 Copilot"
          @send="send"
          @cancel="cancel"
          @retry="retry"
        />
      </section>

      <aside v-if="inspectorOpen" class="run-inspector" aria-label="执行详情">
        <div class="inspector-heading">
          <span>02 / RUN</span>
          <h2>执行详情</h2>
        </div>
        <template v-if="run">
          <div class="run-status-card">
            <span>任务状态</span>
            <strong>{{ statusText(run.status) }}</strong>
            <small>{{ run.taskId }}</small>
          </div>
          <section class="inspector-section">
            <h3>工具调用 <span>{{ run.tools.length }}</span></h3>
            <p v-if="!run.tools.length">本次没有调用业务工具。</p>
            <ul v-else>
              <li v-for="tool in run.tools" :key="tool.name">{{ tool.name }}</li>
            </ul>
          </section>
          <section class="inspector-section">
            <h3>参考依据 <span>{{ run.references.length }}</span></h3>
            <p v-if="!run.references.length">本次没有命中知识引用。</p>
            <ul v-else>
              <li v-for="item in run.references" :key="item.id">{{ item.title }}</li>
            </ul>
          </section>
        </template>
        <div v-else class="inspector-empty">
          <span>等待第一项任务</span>
          <p>执行完成后，这里会展示真实返回的任务、工具和依据。</p>
        </div>
      </aside>
    </main>

    <el-drawer v-model="collaborationOpen" title="多 Agent 协作" direction="rtl" size="min(480px, 100vw)">
      <div class="collaboration-panel">
        <p>用一句话描述跨部门目标。系统会识别需要参与的 Agent 并返回协作计划。</p>
        <label for="supervisor-message">目标描述</label>
        <textarea id="supervisor-message" v-model="supervisorMessage" rows="4" placeholder="例如：分析客户合作风险，并给出合同、回款与跟进建议。"></textarea>
        <button class="primary-action" type="button" :disabled="supervising || !supervisorMessage.trim()" @click="runSupervisor">
          {{ supervising ? '正在编排…' : '开始协作' }}
        </button>
        <div v-if="supervisorError" class="supervisor-error" role="alert">{{ supervisorError }}</div>
        <div v-if="supervisorResult" class="supervisor-result">
          <span>{{ supervisorResult.plan.intent }}</span>
          <ol>
            <li v-for="step in supervisorResult.plan.steps" :key="`${step.agentType}-${step.taskType}`">
              <strong>{{ agentName(step.agentType) }}</strong>
              <p>{{ step.reason }}</p>
            </li>
          </ol>
          <div v-html="renderMarkdown(supervisorResult.reply)"></div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { superviseAgentTask, type SupervisorResult } from '@/api/agent-runtime'
import { renderMarkdown } from '@/utils/markdown'
import AgentChatWorkspace from '@/features/agent-workspace/components/AgentChatWorkspace.vue'
import { AGENT_CATALOG, getAgentPresentation } from '@/features/agent-workspace/domain/agentCatalog'
import { useAgentConversation } from '@/features/agent-workspace/composables/useAgentConversation'
import type { AgentChatType } from '@/api/agent'

const route = useRoute()
const router = useRouter()
const agents = AGENT_CATALOG
const activeType = ref<AgentChatType>(normalizeType(route.query.agent))
const activeAgent = computed(() => getAgentPresentation(activeType.value))
const sessionId = computed(() => `copilot-v2-${activeType.value.toLowerCase()}`)
const { messages, draft, status, run, send, cancel, retry, reset } = useAgentConversation({
  sessionId,
  title: computed(() => activeAgent.value.name),
  type: activeType,
})
const inspectorOpen = ref(true)
const agentPickerOpen = ref(false)
const collaborationOpen = ref(false)
const supervisorMessage = ref('')
const supervising = ref(false)
const supervisorError = ref('')
const supervisorResult = ref<SupervisorResult | null>(null)

function normalizeType(value: unknown): AgentChatType {
  return agents.some((agent) => agent.type === value) ? value as AgentChatType : 'FINANCE'
}

function selectAgent(type: AgentChatType) {
  activeType.value = type
  agentPickerOpen.value = false
  void router.replace({ query: { ...route.query, agent: type } })
}

function statusText(status: string) {
  const map: Record<string, string> = { WAITING: '排队中', PLANNING: '已规划', RUNNING: '运行中', TOOL_CALLING: '调用工具', COMPLETED: '已完成', FAILED: '失败' }
  return map[status] || status
}

function agentName(type: AgentChatType) {
  return getAgentPresentation(type).name
}

async function runSupervisor() {
  if (!supervisorMessage.value.trim() || supervising.value) return
  supervising.value = true
  supervisorError.value = ''
  supervisorResult.value = null
  try {
    const response = await superviseAgentTask({ message: supervisorMessage.value.trim(), sessionId: 'copilot-v2-supervisor', metadata: { source: 'copilot-v2' } })
    supervisorResult.value = response.data
  } catch (error: any) {
    supervisorError.value = error?.response?.data?.message || error?.message || '协作编排暂时不可用。'
  } finally {
    supervising.value = false
  }
}

watch(() => route.query.agent, (value) => { activeType.value = normalizeType(value) })
</script>

<style scoped lang="scss">
.agent-workspace-shell { --aw-ink:#17201c; --aw-muted:#68736d; --aw-line:#d8ded9; --aw-canvas:#f4f5f1; --aw-primary:#c7462b; min-height:100dvh; color:var(--aw-ink); background:var(--aw-canvas); font-family:'IBM Plex Sans','Noto Sans SC','PingFang SC',sans-serif; }
.workspace-bar { display:flex; align-items:center; gap:24px; min-height:68px; padding:0 28px; border-bottom:1px solid var(--aw-line); background:#fff; }
.workspace-brand { display:flex; align-items:center; gap:10px; color:var(--aw-muted); font:700 11px/1 'IBM Plex Mono',monospace; letter-spacing:.12em; }
.brand-link { color:var(--aw-ink); text-decoration:none; font-size:15px; letter-spacing:.02em; }
.workspace-nav { display:flex; align-items:center; gap:16px; margin-right:auto; font-size:13px; font-weight:650; }
.workspace-nav a, .workspace-nav span { color:var(--aw-muted); text-decoration:none; }
.workspace-nav .is-active { color:var(--aw-ink); }
.workspace-actions { display:flex; align-items:center; gap:8px; }
.text-action, .primary-action, .inspect-toggle { min-height:38px; padding:0 12px; border-radius:6px; cursor:pointer; font:650 13px/1 'IBM Plex Sans','Noto Sans SC',sans-serif; }
.text-action, .inspect-toggle { color:var(--aw-ink); border:1px solid var(--aw-line); background:#fff; }
.primary-action { color:#fff; border:1px solid var(--aw-primary); background:var(--aw-primary); }
.primary-action:disabled { opacity:.48; cursor:not-allowed; }
.copilot-grid { display:grid; grid-template-columns:260px minmax(0,1fr) 278px; gap:16px; box-sizing:border-box; height:calc(100dvh - 68px); max-width:1600px; margin:0 auto; padding:16px 24px; }
.mobile-agent-trigger { display:none; }
.agent-rail, .run-inspector { min-width:0; }
.agent-rail { display:flex; flex-direction:column; gap:16px; }
.rail-heading { padding:8px 4px 2px; }
.rail-heading span, .inspector-heading > span { color:var(--aw-muted); font:700 10px/1 'IBM Plex Mono',monospace; letter-spacing:.12em; }
.rail-heading p { margin:8px 0 0; color:var(--aw-muted); font-size:12px; line-height:1.55; }
.agent-list { display:grid; gap:8px; }
.agent-option { display:grid; grid-template-columns:54px minmax(0,1fr); align-items:center; gap:10px; width:100%; min-height:82px; padding:12px; color:var(--aw-ink); border:1px solid var(--aw-line); border-radius:10px; background:#fff; cursor:pointer; text-align:left; transition:border-color .18s ease, background .18s ease; }
.agent-option:hover { border-color:var(--agent-accent); }
.agent-option.is-active { border-color:var(--agent-accent); background:var(--agent-soft); box-shadow:inset 3px 0 0 var(--agent-accent); }
.agent-index { color:var(--agent-accent); font:700 10px/1.35 'IBM Plex Mono',monospace; letter-spacing:.04em; }
.agent-option-main { display:grid; gap:5px; min-width:0; }
.agent-option strong { font-size:14px; }
.agent-option small { overflow:hidden; color:var(--aw-muted); font-size:11px; line-height:1.3; text-overflow:ellipsis; white-space:nowrap; }
.agent-ready { grid-column:2; color:#287a58; font:650 10px/1 'IBM Plex Mono',monospace; }
.session-note { margin-top:auto; padding:14px; border:1px solid var(--aw-line); border-radius:9px; background:#fff; }
.session-note span { display:block; margin-bottom:6px; color:var(--aw-muted); font:700 10px/1 'IBM Plex Mono',monospace; letter-spacing:.1em; text-transform:uppercase; }
.session-note strong { display:block; font:650 11px/1.4 'IBM Plex Mono',monospace; overflow-wrap:anywhere; }
.session-note p { margin:9px 0 0; color:var(--aw-muted); font-size:12px; line-height:1.5; }
.conversation-stage { display:flex; flex-direction:column; min-width:0; min-height:0; gap:10px; }
.stage-topline { display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:42px; padding:0 2px; }
.stage-topline span { color:var(--aw-muted); font:700 10px/1 'IBM Plex Mono',monospace; letter-spacing:.12em; text-transform:uppercase; }
.stage-topline p { margin:5px 0 0; font-size:13px; font-weight:650; }
.conversation-stage :deep(.agent-chat-workspace) { flex:1 1 auto; min-height:0; }
.run-inspector { padding:18px; border:1px solid var(--aw-line); border-radius:12px; background:#fff; }
.inspector-heading h2 { margin:8px 0 22px; font-size:18px; letter-spacing:-.02em; }
.run-status-card { display:grid; gap:6px; padding:14px; color:#fff; background:var(--aw-ink); border-radius:8px; }
.run-status-card span { color:#c8d0ca; font:700 10px/1 'IBM Plex Mono',monospace; letter-spacing:.08em; text-transform:uppercase; }
.run-status-card strong { font-size:18px; }
.run-status-card small { color:#c8d0ca; overflow:hidden; font:500 10px/1.4 'IBM Plex Mono',monospace; text-overflow:ellipsis; white-space:nowrap; }
.inspector-section { padding:18px 0; border-bottom:1px solid var(--aw-line); }
.inspector-section h3 { display:flex; justify-content:space-between; margin:0 0 10px; font-size:13px; }
.inspector-section h3 span { color:var(--aw-muted); font:650 11px/1 'IBM Plex Mono',monospace; }
.inspector-section p, .inspector-section li { color:var(--aw-muted); font-size:12px; line-height:1.55; }
.inspector-section p { margin:0; }
.inspector-section ul { display:grid; gap:7px; margin:0; padding-left:17px; }
.inspector-empty { margin-top:72px; color:var(--aw-muted); text-align:center; }
.inspector-empty span { font:700 10px/1 'IBM Plex Mono',monospace; letter-spacing:.1em; text-transform:uppercase; }
.inspector-empty p { font-size:12px; line-height:1.55; }
.collaboration-panel { display:grid; gap:16px; font-family:'IBM Plex Sans','Noto Sans SC',sans-serif; }
.collaboration-panel > p { margin:0; color:#68736d; font-size:13px; line-height:1.6; }
.collaboration-panel label { color:#68736d; font:700 11px/1 'IBM Plex Mono',monospace; letter-spacing:.08em; text-transform:uppercase; }
.collaboration-panel textarea { width:100%; padding:12px; resize:vertical; color:#17201c; border:1px solid #d8ded9; border-radius:8px; background:#fbfcfa; font:14px/1.55 'IBM Plex Sans','Noto Sans SC',sans-serif; outline:none; }
.collaboration-panel textarea:focus { border-color:#c7462b; box-shadow:0 0 0 3px rgb(199 70 43 / .12); }
.supervisor-error { padding:10px; color:#96392e; border-radius:7px; background:#fff1ef; font-size:13px; }
.supervisor-result { display:grid; gap:12px; padding-top:16px; border-top:1px solid #d8ded9; }
.supervisor-result > span { color:#1f775a; font:700 11px/1 'IBM Plex Mono',monospace; letter-spacing:.08em; }
.supervisor-result ol { display:grid; gap:9px; margin:0; padding-left:20px; }
.supervisor-result li strong { font-size:13px; }
.supervisor-result li p { margin:3px 0 0; color:#68736d; font-size:12px; line-height:1.5; }
.supervisor-result :deep(.atelier-md) { color:#17201c; font-size:13px; line-height:1.6; }
@media (max-width:1180px) { .copilot-grid { grid-template-columns:230px minmax(0,1fr); } .run-inspector { grid-column:1 / -1; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; } .inspector-heading { grid-row:1; } .inspector-heading h2 { margin-bottom:0; } .run-status-card { grid-row:1; } .inspector-section { padding:0; border:0; } .inspector-empty { margin:0; text-align:left; } }
@media (max-width:820px) { .workspace-bar { flex-wrap:wrap; gap:12px; padding:12px 16px; } .workspace-nav { order:3; width:100%; margin-right:0; } .workspace-actions { margin-left:auto; } .workspace-actions :deep(.model-health), .text-action { display:none; } .copilot-grid { display:block; height:auto; padding:12px; } .mobile-agent-trigger { display:flex; align-items:center; justify-content:space-between; width:100%; min-height:44px; margin-bottom:10px; padding:0 12px; color:var(--aw-ink); border:1px solid var(--aw-line); border-radius:8px; background:#fff; cursor:pointer; font:650 13px/1 'IBM Plex Sans','Noto Sans SC',sans-serif; } .mobile-agent-trigger strong { color:var(--aw-muted); font:700 10px/1 'IBM Plex Mono',monospace; letter-spacing:.06em; } .agent-rail { display:none; margin-bottom:12px; } .agent-rail.is-mobile-open { display:flex; } .agent-list { grid-template-columns:repeat(2,minmax(0,1fr)); } .agent-option { min-height:72px; grid-template-columns:1fr; gap:4px; } .agent-ready { grid-column:auto; } .session-note { display:none; } .conversation-stage :deep(.agent-chat-workspace) { height:calc(100dvh - 204px); min-height:440px; } .run-inspector { display:block; margin-top:12px; } .run-inspector > * + * { margin-top:16px; } .inspector-section { padding:16px 0; border-bottom:1px solid var(--aw-line); } }
@media (max-width:520px) { .workspace-brand span { display:none; } .workspace-actions .primary-action { min-width:44px; padding:0 10px; font-size:0; } .workspace-actions .primary-action::after { content:'+'; font-size:20px; } .agent-list { gap:6px; } .agent-option { padding:10px; } .agent-option small { display:none; } .stage-topline { min-height:36px; } .stage-topline p { max-width:210px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .inspect-toggle { min-height:34px; padding:0 8px; font-size:11px; } }
@media (prefers-reduced-motion:reduce) { .copilot-v2 *, .copilot-v2 *::before, .copilot-v2 *::after { transition:none!important; animation:none!important; } }

/* A light, layered workspace rather than a flat control console. */
.agent-workspace-shell { --aw-ink:#092d68; --aw-muted:#496f9f; --aw-line:rgb(151 202 242 / .42); --aw-canvas:transparent; --aw-primary:#0866f7; background:transparent; font-family:var(--font-body); }
.workspace-bar { min-height:78px; padding:0 26px; border:1px solid rgb(255 255 255 / .76); border-radius:0 0 24px 24px; background:rgb(255 255 255 / .52); box-shadow:0 8px 24px rgb(27 102 179 / .08); backdrop-filter:blur(28px) saturate(150%); }
.brand-link { display:grid; width:38px; height:38px; overflow:hidden; border:1px solid rgb(255 255 255 / .86); border-radius:13px; background:#fff; box-shadow:0 6px 16px rgb(0 107 216 / .16); }.brand-link img { width:100%; height:100%; object-fit:cover; object-position:50% 46%; transform:scale(1.18); }
.workspace-brand { color:var(--aw-muted); }.workspace-nav .is-active { color:var(--aw-ink); }.text-action, .inspect-toggle { border-color:rgb(255 255 255 / .78); border-radius:13px; background:rgb(255 255 255 / .5); box-shadow:inset 0 1px 0 #fff; }.primary-action { border-color:rgb(255 255 255 / .3); border-radius:13px; background:linear-gradient(135deg, #0752e1, #087fff 54%, #00c9eb); box-shadow:0 10px 22px rgb(0 105 237 / .2), inset 0 1px 0 rgb(255 255 255 / .42); }
.copilot-grid { max-width:1700px; gap:18px; padding:22px 28px; }.agent-rail, .run-inspector { border:1px solid rgb(255 255 255 / .75); border-radius:22px; background:linear-gradient(145deg, rgb(255 255 255 / .67), rgb(228 245 255 / .42)); box-shadow:$shadow-soft; backdrop-filter:blur(23px) saturate(145%); }.agent-rail { padding:14px; }.rail-heading { padding:7px 4px 10px; }.agent-option { border-color:rgb(255 255 255 / .7); border-radius:16px; background:rgb(255 255 255 / .44); }.agent-option:hover { border-color:var(--agent-accent); background:rgb(255 255 255 / .7); }.agent-option.is-active { border-color:rgb(0 137 246 / .35); background:linear-gradient(135deg, rgb(224 246 255 / .8), rgb(255 255 255 / .62)); box-shadow:inset 3px 0 0 var(--agent-accent), 0 8px 18px rgb(0 102 205 / .08); }.session-note { border-color:rgb(255 255 255 / .68); border-radius:16px; background:rgb(255 255 255 / .42); }
.stage-topline { min-height:50px; padding:0 10px; border:1px solid rgb(255 255 255 / .65); border-radius:18px; background:rgb(255 255 255 / .36); box-shadow:inset 0 1px 0 rgb(255 255 255 / .7); backdrop-filter:blur(16px); }.run-inspector { padding:18px; }.run-status-card { border-radius:16px; background:linear-gradient(135deg, #0751df, #008ef3 60%, #00c8e8); box-shadow:0 12px 24px rgb(0 105 237 / .16), inset 0 1px 0 rgb(255 255 255 / .35); }.collaboration-panel { font-family:var(--font-body); }
@media (max-width:820px) { .workspace-bar { min-height:unset; padding:12px 16px; border-radius:0; }.copilot-grid { padding:12px; }.agent-rail { padding:10px; } }
</style>
