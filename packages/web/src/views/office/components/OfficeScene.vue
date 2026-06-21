<template>
  <section class="pixel-office" aria-label="OPC 像素办公室地图">
    <div class="office-ambient" aria-hidden="true"></div>
    <div class="office-light office-light-a" aria-hidden="true"></div>
    <div class="office-light office-light-b" aria-hidden="true"></div>

    <div class="office-skyline">
      <span v-for="i in 22" :key="i" :style="{ height: `${10 + (i % 6) * 8}px`, '--i': i }"></span>
    </div>

    <div class="ceiling-lights" aria-hidden="true">
      <i v-for="i in 6" :key="i" :style="{ '--i': i }"></i>
    </div>

    <div class="corridor corridor-horizontal">
      <i v-for="i in 10" :key="`h-${i}`" :style="{ '--delay': `${i * 0.18}s` }"></i>
    </div>
    <div class="corridor corridor-vertical">
      <i v-for="i in 8" :key="`v-${i}`" :style="{ '--delay': `${i * 0.22}s` }"></i>
    </div>

    <button
      v-for="(agent, idx) in agents"
      :key="agent.id"
      type="button"
      class="pixel-room"
      :class="[`room-${agent.type}`, `status-${agent.status}`, { selected: selectedAgentId === agent.id }]"
      :style="{ '--accent': agent.accent, '--idx': idx }"
      :aria-label="`查看 ${agent.name}`"
      @click="$emit('select', agent.id)"
    >
      <span class="room-wall"></span>
      <span class="room-floor"></span>
      <span class="room-vignette"></span>

      <span class="room-sign">
        <span class="room-dept">{{ agent.department }}</span>
        <strong>{{ agent.name }}</strong>
        <em class="room-roomname">{{ agent.roomName }}</em>
      </span>
      <span class="room-status">
        <i></i>{{ statusLabel(agent.status) }}
      </span>

      <span class="task-bubble">
        <span class="task-bubble-tag">CURRENT TASK</span>
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
        <span><b>{{ agent.progress }}%</b><em>PROGRESS</em></span>
        <i><b :style="{ width: `${agent.progress}%` }"></b></i>
      </span>
    </button>

    <div class="opc-console" aria-label="OPC 中央调度台">
      <span class="console-light"></span>
      <strong>OPC</strong>
      <small>CONTROL HUB</small>
      <span class="console-screen"><i></i><i></i><i></i></span>
      <span class="console-orbit" aria-hidden="true"></span>
    </div>

    <div class="office-floormarker" aria-hidden="true">
      <span>OPC 总部</span>
      <i></i>
      <small>FLOOR · 12F</small>
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
  padding: 30px 24px 24px;
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

/* Atmospheric lighting */
.office-ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 50% 50%, rgba(255, 240, 200, 0.18) 0%, transparent 50%);
  z-index: 1;
}

.office-light {
  position: absolute;
  pointer-events: none;
  border-radius: 50%;
  filter: blur(28px);
  z-index: 1;
}
.office-light-a {
  top: -30px; left: 12%;
  width: 240px; height: 240px;
  background: radial-gradient(circle, rgba(255, 213, 130, 0.32) 0%, transparent 70%);
  animation: ambient-drift 18s ease-in-out infinite;
}
.office-light-b {
  bottom: -40px; right: 8%;
  width: 280px; height: 280px;
  background: radial-gradient(circle, rgba(255, 250, 234, 0.22) 0%, transparent 70%);
  animation: ambient-drift 22s ease-in-out infinite reverse;
}

@keyframes ambient-drift {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
  50% { transform: translate(20px, -10px) scale(1.1); opacity: 1; }
}

.office-skyline {
  position: absolute;
  inset: 0 0 auto;
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 28px;
  padding: 0 14px;
  background: linear-gradient(180deg, #1f2a24 0%, #2c3a32 100%);
  overflow: hidden;
  z-index: 4;
}

.office-skyline span {
  width: 18px;
  background: #b7996e;
  box-shadow: inset 3px 0 rgba(255, 249, 240, 0.22);
  animation: window-flicker 4.2s ease-in-out infinite;
  animation-delay: calc(var(--i, 0) * 0.32s);
}

@keyframes window-flicker {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

/* Ceiling pendant lights */
.ceiling-lights {
  position: absolute;
  inset: 30px 24px auto;
  display: flex;
  justify-content: space-between;
  padding: 0 8%;
  pointer-events: none;
  z-index: 4;
}

.ceiling-lights i {
  width: 14px;
  height: 14px;
  background: radial-gradient(circle, #ffe7a8 0%, #d9a441 60%, #8d704a 100%);
  border: 2px solid #1f2a24;
  box-shadow:
    0 0 0 2px #fff9f0,
    0 8px 16px -4px rgba(217, 164, 65, 0.5);
  animation: ceiling-pulse 3.4s ease-in-out infinite;
  animation-delay: calc(var(--i, 0) * 0.4s);
}

@keyframes ceiling-pulse {
  0%, 100% { filter: brightness(0.85); }
  50% { filter: brightness(1.15); }
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
  animation: room-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  animation-delay: calc(var(--idx, 0) * 90ms + 200ms);
}

@keyframes room-pop {
  0% { opacity: 0; transform: translateY(10px) scale(0.96); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
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

.pixel-room.selected::after {
  content: '';
  position: absolute;
  inset: -4px;
  border: 2px dashed color-mix(in srgb, var(--accent) 50%, transparent);
  pointer-events: none;
  animation: selected-rotate 24s linear infinite;
  z-index: 12;
}

@keyframes selected-rotate {
  to { transform: rotate(360deg); }
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

.room-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 30%, transparent 30%, rgba(38, 55, 47, 0.18) 100%);
  pointer-events: none;
  z-index: 2;
}

.room-sign {
  position: absolute;
  top: 12px;
  left: 14px;
  z-index: 4;
  display: grid;
  gap: 1px;
  padding: 5px 9px 6px;
  border: 3px solid #26372f;
  background: #fff9f0;
  box-shadow: 4px 4px 0 rgba(38, 55, 47, 0.18);
}

.room-dept {
  color: var(--accent) !important;
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px !important;
  font-weight: 700;
  letter-spacing: 0.16em !important;
  text-transform: uppercase;
}

.room-sign strong {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 13px;
  font-weight: 600;
  font-style: italic;
  letter-spacing: -0.01em;
  line-height: 1.1;
}

.room-roomname {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  font-style: normal;
  font-weight: 500;
  color: #6e766f;
  letter-spacing: 0.08em;
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
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  box-shadow: 3px 3px 0 rgba(38, 55, 47, 0.22);
}

.room-status i {
  width: 6px;
  height: 6px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.32);
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
  top: 76px;
  left: 16px;
  z-index: 5;
  display: grid;
  gap: 2px;
  max-width: 178px;
  padding: 6px 9px 7px;
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

.task-bubble-tag {
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 7px !important;
  font-weight: 700;
  letter-spacing: 0.18em !important;
  text-transform: uppercase;
  color: var(--accent) !important;
}

.task-bubble > span:last-child {
  display: -webkit-box;
  overflow: hidden;
  font-size: 11px;
  line-height: 1.4;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.agent-sprite {
  position: absolute;
  bottom: 50px;
  left: 38px;
  z-index: 7;
  display: grid;
  justify-items: center;
  filter: drop-shadow(0 6px 0 rgba(38, 55, 47, 0.14));
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

.ledger-stack { position: absolute; right: 22px; top: 86px; display: grid; gap: 3px; }
.ledger-stack i { width: 68px; height: 14px; border: 3px solid #26372f; background: #6f9878; }
.ledger-stack i:nth-child(2) { background: #c79358; transform: translateX(-8px); }
.ledger-stack i:nth-child(3) { background: #d2a274; transform: translateX(4px); }
.profit-chart { position: absolute; top: 144px; right: 26px; display: flex; align-items: flex-end; gap: 5px; width: 96px; height: 58px; padding: 7px; border: 3px solid #26372f; background: #fff9f0; }
.profit-chart i { flex: 1; background: #4b8fcb; }
.profit-chart i:nth-child(1) { height: 28%; }
.profit-chart i:nth-child(2) { height: 50%; }
.profit-chart i:nth-child(3) { height: 42%; }
.profit-chart i:nth-child(4) { height: 82%; }
.invoice-tray { position: absolute; left: 164px; bottom: 64px; width: 46px; height: 36px; border: 3px solid #26372f; background: repeating-linear-gradient(#fff9f0 0 7px, #b7996e 8px 10px); }

.chat-wall { position: absolute; top: 92px; right: 22px; display: grid; gap: 7px; }
.chat-wall i { position: relative; width: 82px; height: 25px; border: 3px solid #26372f; background: #fff9f0; }
.chat-wall i:nth-child(2) { transform: translateX(-18px); background: #e7f1e9; }
.chat-wall i::after { position: absolute; bottom: -8px; left: 10px; width: 9px; height: 9px; content: ''; background: inherit; border-right: 3px solid #26372f; border-bottom: 3px solid #26372f; }
.ticket-stack { position: absolute; top: 184px; right: 28px; display: flex; gap: 4px; }
.ticket-stack i { width: 23px; height: 34px; border: 3px solid #26372f; background: #d9a441; }
.headset-hook { position: absolute; left: 158px; bottom: 60px; width: 34px; height: 38px; border: 6px solid #26372f; border-bottom: 0; border-radius: 20px 20px 0 0; }

.contract-paper { position: absolute; top: 88px; right: 28px; width: 82px; height: 106px; padding: 16px 10px; border: 3px solid #26372f; background: #fff9f0; box-shadow: 5px 5px 0 rgba(38, 55, 47, 0.18); }
.contract-paper i { display: block; height: 5px; margin-bottom: 8px; background: #b7996e; }
.contract-paper i:nth-child(2) { width: 72%; }
.risk-tag { position: absolute; top: 164px; right: 82px; padding: 5px 7px; color: #fff; border: 3px solid #26372f; background: #d66b52; font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700; letter-spacing: 0.1em; transform: rotate(-5deg); box-shadow: 2px 2px 0 rgba(38, 55, 47, 0.22); }
.pixel-stamp { position: absolute; left: 158px; bottom: 60px; width: 42px; height: 42px; border: 6px double #d66b52; background: rgba(214, 107, 82, 0.18); }

.pixel-calendar { position: absolute; top: 88px; right: 28px; display: grid; place-items: center; width: 86px; height: 78px; border: 3px solid #26372f; background: linear-gradient(#d66b52 0 24px, #fff9f0 24px); box-shadow: 5px 5px 0 rgba(38, 55, 47, 0.18); }
.pixel-calendar b { padding-top: 19px; font-size: 26px; }
.todo-board { position: absolute; top: 182px; right: 24px; width: 98px; padding: 10px; border: 3px solid #26372f; background: #fff9f0; }
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
  padding: 5px 8px 4px;
  border: 3px solid #26372f;
  background: #fff9f0;
}

.room-progress span { display: flex; align-items: baseline; gap: 6px; }
.room-progress span b {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 14px;
  font-weight: 600;
  font-style: italic;
  font-variant-numeric: tabular-nums;
}
.room-progress span em {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7px;
  font-weight: 700;
  font-style: normal;
  letter-spacing: 0.18em;
  color: #6e766f;
}
.room-progress > i { display: block; height: 10px; padding: 2px; border: 2px solid #26372f; background: #e5ded1; }
.room-progress > i b { display: block; height: 100%; background: var(--status-color, var(--accent)); transition: width 0.4s cubic-bezier(0.2, 0.7, 0.2, 1); }

.corridor { position: absolute; z-index: 11; display: flex; align-items: center; justify-content: space-around; pointer-events: none; }
.corridor-horizontal { top: calc(50% - 18px); right: 20px; left: 20px; height: 36px; }
.corridor-vertical { top: 20px; bottom: 20px; left: calc(50% - 18px); width: 36px; flex-direction: column; }
.corridor i {
  width: 6px;
  height: 6px;
  background: #fff9f0;
  box-shadow: 0 0 0 2px #26372f, 0 0 6px rgba(255, 249, 240, 0.5);
  animation: task-flow 2.4s linear infinite;
  animation-delay: var(--delay);
}

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
  background: radial-gradient(circle at 30% 30%, #4f6f5a 0%, #1f2a24 80%);
  box-shadow: 0 0 0 5px #b7996e, 0 0 0 9px #26372f, 8px 10px 0 rgba(38, 55, 47, 0.2);
  transform: translate(-50%, -50%);
  animation: console-breathe 3.6s ease-in-out infinite;
}

@keyframes console-breathe {
  0%, 100% { box-shadow: 0 0 0 5px #b7996e, 0 0 0 9px #26372f, 8px 10px 0 rgba(38, 55, 47, 0.2); }
  50% { box-shadow: 0 0 0 5px #d9a441, 0 0 0 9px #26372f, 8px 10px 0 rgba(38, 55, 47, 0.2), 0 0 24px rgba(217, 164, 65, 0.4); }
}

.opc-console strong {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 24px;
  font-weight: 600;
  font-style: italic;
  line-height: 1;
  letter-spacing: -0.01em;
}
.opc-console small {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7px;
  letter-spacing: 0.18em;
  font-weight: 700;
  margin-top: 1px;
}
.console-light {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 8px;
  height: 8px;
  background: #8dd8a3;
  box-shadow: 0 0 6px #8dd8a3;
  border-radius: 50%;
  animation: status-blink 1.2s steps(2, jump-none) infinite;
}
.console-screen { display: flex; gap: 3px; margin-top: 2px; }
.console-screen i { width: 11px; height: 5px; background: #d9a441; }

.console-orbit {
  position: absolute;
  inset: -10px;
  border: 1px dashed rgba(255, 249, 240, 0.5);
  border-radius: 50%;
  animation: orbit 12s linear infinite;
}

@keyframes orbit { to { transform: rotate(360deg); } }

.office-floormarker {
  position: absolute;
  right: 14px;
  bottom: 10px;
  z-index: 12;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: #fff9f0;
  border: 2px solid #26372f;
  box-shadow: 2px 2px 0 rgba(38, 55, 47, 0.18);
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  letter-spacing: 0.14em;
  color: #1f2a24;
}
.office-floormarker span { font-weight: 700; }
.office-floormarker i { width: 1px; height: 9px; background: #26372f; }
.office-floormarker small { color: #6e766f; font-weight: 500; }

@keyframes status-blink { 50% { opacity: 0.35; } }
@keyframes task-flow { 0% { transform: translateX(-7px); opacity: 0; } 35%, 70% { opacity: 1; } 100% { transform: translateX(7px); opacity: 0; } }

@media (max-width: 1280px) {
  .pixel-office { grid-template-columns: repeat(2, minmax(330px, 1fr)); min-width: 720px; }
  .task-bubble { max-width: 160px; }
}
</style>
