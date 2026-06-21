<template>
  <section class="pixel-office" aria-label="OPC 像素办公室地图">
    <div class="office-skyline">
      <span v-for="i in 18" :key="i" :style="{ height: `${14 + (i % 5) * 7}px` }"></span>
    </div>

    <div class="corridor corridor-horizontal">
      <i v-for="i in 8" :key="`h-${i}`" :style="{ '--delay': `${i * 0.22}s` }"></i>
    </div>
    <div class="corridor corridor-vertical">
      <i v-for="i in 6" :key="`v-${i}`" :style="{ '--delay': `${i * 0.26}s` }"></i>
    </div>

    <button
      v-for="agent in agents"
      :key="agent.id"
      type="button"
      class="pixel-room"
      :class="[`room-${agent.type}`, `status-${agent.status}`, { selected: selectedAgentId === agent.id }]"
      :style="{ '--accent': agent.accent }"
      :aria-label="`查看 ${agent.name}`"
      @click="$emit('select', agent.id)"
    >
      <span class="room-wall"></span>
      <span class="room-floor"></span>

      <span class="room-sign">
        <span>{{ agent.roomName }}</span>
        <strong>{{ agent.name }}</strong>
      </span>
      <span class="room-status">
        <i></i>{{ statusLabel(agent.status) }}
      </span>

      <span class="task-bubble">
        <span>{{ agent.currentTask }}</span>
      </span>

      <span class="agent-sprite">
        <AgentAvatar :type="agent.type" :status="avatarStatus(agent.status)" :size="92" />
      </span>

      <span class="pixel-desk">
        <span class="desk-monitor"><i></i><i></i><i></i></span>
        <span class="desk-board"></span>
        <span class="desk-legs"></span>
      </span>

      <span v-if="agent.type === 'finance'" class="room-props finance-props">
        <span class="ledger-stack"><i></i><i></i><i></i></span>
        <span class="profit-chart"><i></i><i></i><i></i><i></i></span>
        <span class="invoice-tray"></span>
      </span>

      <span v-else-if="agent.type === 'service'" class="room-props service-props">
        <span class="chat-wall"><i></i><i></i><i></i></span>
        <span class="ticket-stack"><i></i><i></i><i></i></span>
        <span class="headset-hook"></span>
      </span>

      <span v-else-if="agent.type === 'legal'" class="room-props legal-props">
        <span class="contract-paper"><i></i><i></i><i></i></span>
        <span class="risk-tag">RISK</span>
        <span class="pixel-stamp"></span>
      </span>

      <span v-else class="room-props admin-props">
        <span class="pixel-calendar"><b>21</b></span>
        <span class="todo-board"><i></i><i></i><i></i></span>
        <span class="file-flow"><i></i><i></i></span>
      </span>

      <span class="room-progress">
        <span><b>{{ agent.progress }}%</b></span>
        <i><b :style="{ width: `${agent.progress}%` }"></b></i>
      </span>
    </button>

    <div class="opc-console" aria-label="OPC 中央调度台">
      <span class="console-light"></span>
      <strong>OPC</strong>
      <small>CONTROL HUB</small>
      <span class="console-screen"><i></i><i></i><i></i></span>
    </div>
  </section>
</template>

<script setup lang="ts">
import AgentAvatar from './AgentAvatar.vue'
import type { OfficeAgent, OfficeAgentStatus } from '@/stores/agentOffice'

defineProps<{
  agents: OfficeAgent[]
  selectedAgentId: string
}>()

defineEmits<{
  select: [agentId: string]
}>()

function statusLabel(status: OfficeAgentStatus) {
  return {
    running: '运行中',
    waiting: '等待确认',
    error: '异常',
    idle: '空闲',
    paused: '已暂停',
    completed: '已完成',
  }[status]
}

function avatarStatus(status: OfficeAgentStatus) {
  return {
    running: 'working',
    waiting: 'waiting',
    error: 'error',
    idle: 'idle',
    paused: 'offline',
    completed: 'idle',
  }[status] as 'working' | 'waiting' | 'error' | 'idle' | 'offline'
}
</script>

<style lang="scss" scoped>
.pixel-office {
  --wall: #d8c39f;
  --floor-a: #d9c49f;
  --floor-b: #ceb58c;
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(360px, 1fr));
  grid-template-rows: repeat(2, minmax(300px, 1fr));
  gap: 50px 64px;
  min-width: 780px;
  min-height: 684px;
  padding: 24px;
  border: 4px solid #26372f;
  background:
    linear-gradient(90deg, transparent calc(50% - 36px), #b7996e calc(50% - 36px), #b7996e calc(50% + 36px), transparent calc(50% + 36px)),
    linear-gradient(transparent calc(50% - 29px), #b7996e calc(50% - 29px), #b7996e calc(50% + 29px), transparent calc(50% + 29px)),
    #efe1cb;
  box-shadow:
    0 0 0 4px #fff9f0,
    0 0 0 7px #26372f,
    10px 14px 0 rgba(38, 55, 47, 0.14);
  overflow: hidden;
  image-rendering: pixelated;
}

.office-skyline {
  position: absolute;
  inset: 0 0 auto;
  display: flex;
  align-items: flex-end;
  gap: 7px;
  height: 24px;
  padding: 0 12px;
  background: #26372f;
  overflow: hidden;
}

.office-skyline span {
  width: 20px;
  background: #b7996e;
  box-shadow: inset 4px 0 rgba(255, 249, 240, 0.18);
}

.pixel-room {
  --accent: #4b8fcb;
  position: relative;
  display: block;
  min-width: 0;
  min-height: 300px;
  padding: 0;
  color: #1f2a24;
  text-align: left;
  border: 4px solid #26372f;
  border-radius: 0;
  background: transparent;
  box-shadow:
    inset 0 0 0 3px rgba(255, 249, 240, 0.55),
    7px 8px 0 rgba(38, 55, 47, 0.18);
  cursor: pointer;
  overflow: hidden;
  transition: transform 140ms steps(2, end), box-shadow 140ms ease, filter 140ms ease;
}

.pixel-room:hover,
.pixel-room:focus-visible {
  transform: translateY(-4px);
  box-shadow:
    inset 0 0 0 3px rgba(255, 249, 240, 0.78),
    9px 12px 0 rgba(38, 55, 47, 0.22),
    0 0 0 4px color-mix(in srgb, var(--accent) 55%, transparent);
  outline: 0;
}

.pixel-room:active {
  transform: translateY(1px);
  box-shadow: 3px 4px 0 rgba(38, 55, 47, 0.2);
}

.pixel-room.selected {
  box-shadow:
    inset 0 0 0 3px #fff9f0,
    0 0 0 5px var(--accent),
    10px 12px 0 rgba(38, 55, 47, 0.2);
}

.room-wall {
  position: absolute;
  inset: 0 0 56%;
  background:
    linear-gradient(rgba(38, 55, 47, 0.08) 2px, transparent 2px) 0 0 / 18px 18px,
    color-mix(in srgb, var(--accent) 12%, #fff9f0);
  border-bottom: 4px solid #26372f;
}

.room-floor {
  position: absolute;
  inset: 44% 0 0;
  background:
    linear-gradient(45deg, var(--floor-a) 25%, transparent 25%) 0 0 / 24px 24px,
    linear-gradient(45deg, transparent 75%, var(--floor-a) 75%) 0 0 / 24px 24px,
    linear-gradient(45deg, transparent 75%, var(--floor-b) 75%) 12px -12px / 24px 24px,
    linear-gradient(45deg, var(--floor-b) 25%, transparent 25%) 12px -12px / 24px 24px,
    #e4d1af;
}

.room-sign {
  position: absolute;
  top: 12px;
  left: 14px;
  z-index: 4;
  display: grid;
  gap: 2px;
  padding: 5px 8px;
  border: 3px solid #26372f;
  background: #fff9f0;
  box-shadow: 4px 4px 0 rgba(38, 55, 47, 0.18);
}

.room-sign span {
  color: #6e766f;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.1em;
}

.room-sign strong {
  font-size: 12px;
  font-weight: 900;
}

.room-status {
  position: absolute;
  top: 13px;
  right: 13px;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  color: #fff;
  border: 3px solid #26372f;
  background: var(--status-color, #4b8fcb);
  font-size: 11px;
  font-weight: 900;
}

.room-status i {
  width: 8px;
  height: 8px;
  background: #fff;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.25);
}

.status-running { --status-color: #4b8fcb; }
.status-waiting { --status-color: #d9a441; }
.status-error { --status-color: #d66b52; }
.status-idle { --status-color: #4f8f68; }
.status-paused { --status-color: #89918c; }
.status-completed { --status-color: #26372f; }
.status-paused .room-status i { background: #d7dbd8; box-shadow: none; }
.status-running .room-status i,
.status-error .room-status i { animation: status-blink 1s steps(2, jump-none) infinite; }

.task-bubble {
  position: absolute;
  top: 66px;
  left: 16px;
  z-index: 5;
  display: grid;
  max-width: 174px;
  padding: 6px 8px;
  border: 3px solid #26372f;
  background: #fff9f0;
  box-shadow: 4px 4px 0 rgba(38, 55, 47, 0.18);
}

.task-bubble::after {
  position: absolute;
  left: 24px;
  bottom: -10px;
  width: 12px;
  height: 12px;
  content: '';
  background: #fff9f0;
  border-right: 3px solid #26372f;
  border-bottom: 3px solid #26372f;
}

.task-bubble span { display: -webkit-box; overflow: hidden; font-size: 11px; line-height: 1.35; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }

.agent-sprite {
  position: absolute;
  bottom: 50px;
  left: 38px;
  z-index: 7;
  display: grid;
  justify-items: center;
}

.pixel-desk {
  position: absolute;
  right: 20px;
  bottom: 48px;
  z-index: 6;
  width: 150px;
  height: 118px;
}

.desk-monitor {
  position: absolute;
  top: 0;
  left: 36px;
  display: grid;
  gap: 4px;
  width: 82px;
  height: 54px;
  padding: 8px;
  border: 4px solid #26372f;
  background: color-mix(in srgb, var(--accent) 65%, #fff9f0);
  box-shadow: 5px 5px 0 rgba(38, 55, 47, 0.18);
}

.desk-monitor::after {
  position: absolute;
  bottom: -18px;
  left: 31px;
  width: 18px;
  height: 16px;
  content: '';
  border: 3px solid #26372f;
  background: #6e766f;
}

.desk-monitor i { height: 4px; background: rgba(255, 249, 240, 0.82); }
.desk-board { position: absolute; right: 0; bottom: 24px; left: 0; height: 35px; border: 4px solid #26372f; background: #9d704c; box-shadow: inset 0 7px #bd916a; }
.desk-legs::before,
.desk-legs::after { position: absolute; bottom: 0; width: 15px; height: 30px; content: ''; background: #26372f; }
.desk-legs::before { left: 18px; }
.desk-legs::after { right: 18px; }

.room-props { position: absolute; inset: 0; z-index: 3; pointer-events: none; }

.ledger-stack { position: absolute; right: 22px; top: 76px; display: grid; gap: 3px; }
.ledger-stack i { width: 68px; height: 14px; border: 3px solid #26372f; background: #6f9878; }
.ledger-stack i:nth-child(2) { background: #c79358; transform: translateX(-8px); }
.ledger-stack i:nth-child(3) { background: #d2a274; transform: translateX(4px); }
.profit-chart { position: absolute; top: 134px; right: 26px; display: flex; align-items: flex-end; gap: 5px; width: 96px; height: 58px; padding: 7px; border: 3px solid #26372f; background: #fff9f0; }
.profit-chart i { flex: 1; background: #4b8fcb; }
.profit-chart i:nth-child(1) { height: 28%; }
.profit-chart i:nth-child(2) { height: 50%; }
.profit-chart i:nth-child(3) { height: 42%; }
.profit-chart i:nth-child(4) { height: 82%; }
.invoice-tray { position: absolute; left: 164px; bottom: 64px; width: 46px; height: 36px; border: 3px solid #26372f; background: repeating-linear-gradient(#fff9f0 0 7px, #b7996e 8px 10px); }

.chat-wall { position: absolute; top: 82px; right: 22px; display: grid; gap: 7px; }
.chat-wall i { position: relative; width: 82px; height: 25px; border: 3px solid #26372f; background: #fff9f0; }
.chat-wall i:nth-child(2) { transform: translateX(-18px); background: #e7f1e9; }
.chat-wall i::after { position: absolute; bottom: -8px; left: 10px; width: 9px; height: 9px; content: ''; background: inherit; border-right: 3px solid #26372f; border-bottom: 3px solid #26372f; }
.ticket-stack { position: absolute; top: 174px; right: 28px; display: flex; gap: 4px; }
.ticket-stack i { width: 23px; height: 34px; border: 3px solid #26372f; background: #d9a441; }
.headset-hook { position: absolute; left: 158px; bottom: 60px; width: 34px; height: 38px; border: 6px solid #26372f; border-bottom: 0; border-radius: 20px 20px 0 0; }

.contract-paper { position: absolute; top: 78px; right: 28px; width: 82px; height: 106px; padding: 16px 10px; border: 3px solid #26372f; background: #fff9f0; box-shadow: 5px 5px 0 rgba(38, 55, 47, 0.18); }
.contract-paper i { display: block; height: 5px; margin-bottom: 8px; background: #b7996e; }
.contract-paper i:nth-child(2) { width: 72%; }
.risk-tag { position: absolute; top: 154px; right: 82px; padding: 5px 7px; color: #fff; border: 3px solid #26372f; background: #d66b52; font-size: 10px; font-weight: 900; transform: rotate(-5deg); }
.pixel-stamp { position: absolute; left: 158px; bottom: 60px; width: 42px; height: 42px; border: 6px double #d66b52; background: rgba(214, 107, 82, 0.18); }

.pixel-calendar { position: absolute; top: 78px; right: 28px; display: grid; place-items: center; width: 86px; height: 78px; border: 3px solid #26372f; background: linear-gradient(#d66b52 0 24px, #fff9f0 24px); box-shadow: 5px 5px 0 rgba(38, 55, 47, 0.18); }
.pixel-calendar b { padding-top: 19px; font-size: 26px; }
.todo-board { position: absolute; top: 172px; right: 24px; width: 98px; padding: 10px; border: 3px solid #26372f; background: #fff9f0; }
.todo-board i { display: block; height: 5px; margin: 5px 0; background: linear-gradient(90deg, #4f8f68 0 10px, transparent 10px 15px, #b7996e 15px); }
.file-flow { position: absolute; left: 158px; bottom: 64px; display: flex; gap: 4px; }
.file-flow i { width: 27px; height: 37px; border: 3px solid #26372f; background: #e8d0a9; }

.room-progress {
  position: absolute;
  right: 12px;
  bottom: 10px;
  left: 12px;
  z-index: 9;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 10px;
  padding: 4px 7px;
  border: 3px solid #26372f;
  background: #fff9f0;
}

.room-progress span { display: flex; align-items: baseline; gap: 6px; }
.room-progress span b { font-size: 14px; }
.room-progress > i { display: block; height: 10px; padding: 2px; border: 2px solid #26372f; background: #e5ded1; }
.room-progress > i b { display: block; height: 100%; background: var(--status-color, var(--accent)); transition: width 0.35s ease; }

.corridor { position: absolute; z-index: 11; display: flex; align-items: center; justify-content: space-around; pointer-events: none; }
.corridor-horizontal { top: calc(50% - 18px); right: 20px; left: 20px; height: 36px; }
.corridor-vertical { top: 20px; bottom: 20px; left: calc(50% - 18px); width: 36px; flex-direction: column; }
.corridor i { width: 7px; height: 7px; background: #fff9f0; box-shadow: 0 0 0 2px #26372f; animation: task-flow 2.4s linear infinite; animation-delay: var(--delay); }

.opc-console {
  position: absolute;
  z-index: 20;
  top: 50%;
  left: 50%;
  display: grid;
  place-items: center;
  width: 94px;
  height: 94px;
  color: #fff9f0;
  border: 4px solid #26372f;
  background: #3c574a;
  box-shadow: 0 0 0 5px #b7996e, 0 0 0 9px #26372f, 8px 10px 0 rgba(38, 55, 47, 0.2);
  transform: translate(-50%, -50%);
}

.opc-console strong { font-size: 24px; line-height: 1; }
.opc-console small { font-size: 8px; letter-spacing: 0.12em; }
.console-light { position: absolute; top: 7px; right: 7px; width: 8px; height: 8px; background: #8dd8a3; animation: status-blink 1.2s steps(2, jump-none) infinite; }
.console-screen { display: flex; gap: 3px; }
.console-screen i { width: 11px; height: 5px; background: #d9a441; }

@keyframes status-blink { 50% { opacity: 0.35; } }
@keyframes task-flow { 0% { transform: translateX(-7px); opacity: 0; } 35%, 70% { opacity: 1; } 100% { transform: translateX(7px); opacity: 0; } }

@media (max-width: 1280px) {
  .pixel-office { grid-template-columns: repeat(2, minmax(330px, 1fr)); min-width: 720px; }
  .task-bubble { max-width: 160px; }
}
</style>
