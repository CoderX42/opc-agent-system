<template>
  <section class="office-floorplan" aria-label="数字员工办公室地图">
    <div class="floor-grid" aria-hidden="true"></div>
    <div class="floor-corridor corridor-x" aria-hidden="true"></div>
    <div class="floor-corridor corridor-y" aria-hidden="true"></div>

    <button
      v-for="(agent, idx) in agents"
      :key="agent.id"
      type="button"
      class="office-room"
      :class="[`room-${agent.type}`, `status-${agent.status}`, { selected: selectedAgentId === agent.id }]"
      :style="{ '--accent': agent.accent, '--idx': idx }"
      :aria-label="`查看 ${agent.name}`"
      @click="$emit('select', agent.id)"
    >
      <span class="room-backdrop" aria-hidden="true"></span>
      <span class="room-zone-label">{{ String(idx + 1).padStart(2, '0') }}</span>

      <span class="room-header">
        <span>
          <em>{{ agent.department }}</em>
          <strong>{{ agent.shortName }}</strong>
        </span>
        <span class="room-state" :data-status="agent.status">
          <i></i>{{ statusLabel(agent.status) }}
        </span>
      </span>

      <span class="room-canvas" aria-hidden="true">
        <span class="room-window"><i></i><i></i><i></i></span>
        <span class="room-board">
          <i v-for="line in 3" :key="line"></i>
        </span>
        <span class="room-desk">
          <span class="desk-screen"><i></i><i></i></span>
          <span class="desk-top"></span>
          <span class="desk-chair"></span>
        </span>
        <span class="room-decor" :class="`decor-${agent.type}`">
          <i v-for="item in 5" :key="item"></i>
        </span>
        <span class="agent-seat" :class="{ 'is-resting': isResting(agent.status) }">
          <AgentAvatar :type="agent.type" :status="avatarStatus(agent.status)" :size="isResting(agent.status) ? 72 : 88" />
        </span>
      </span>

      <span class="room-footer">
        <span class="task-copy">
          <em>当前任务</em>
          <strong>{{ agent.currentTask }}</strong>
        </span>
        <span class="progress-ring" :style="{ '--progress': `${agent.progress}%` }">
          <b>{{ agent.progress }}</b>
        </span>
      </span>
    </button>
  </section>
</template>

<script setup lang="ts">
import AgentAvatar from './AgentAvatar.vue'
import type { OfficeAgent, OfficeAgentStatus } from '@/types/office'

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
    waiting: '待确认',
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

function isResting(status: OfficeAgentStatus) {
  return status === 'idle' || status === 'paused' || status === 'completed'
}
</script>

<style lang="scss" scoped>
.office-floorplan {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(340px, 1fr));
  gap: 28px;
  min-width: 760px;
  min-height: 660px;
  padding: 28px;
  border: 2px solid var(--forest, #1f2a24);
  background:
    linear-gradient(90deg, rgba(31, 42, 36, 0.04) 1px, transparent 1px) 0 0 / 42px 42px,
    linear-gradient(rgba(31, 42, 36, 0.035) 1px, transparent 1px) 0 0 / 42px 42px,
    rgba(255, 246, 226, 0.82);
  box-shadow: 4px 5px 0 rgba(31, 42, 36, 0.12);
  overflow: hidden;
}

.floor-grid,
.floor-corridor {
  position: absolute;
  pointer-events: none;
}

.floor-grid {
  inset: 0;
  background-image:
    linear-gradient(90deg, transparent calc(50% - 26px), rgba(183, 153, 110, 0.26) calc(50% - 26px), rgba(183, 153, 110, 0.26) calc(50% + 26px), transparent calc(50% + 26px)),
    linear-gradient(transparent calc(50% - 26px), rgba(183, 153, 110, 0.22) calc(50% - 26px), rgba(183, 153, 110, 0.22) calc(50% + 26px), transparent calc(50% + 26px));
}

.floor-corridor {
  z-index: 0;
  background:
    repeating-linear-gradient(90deg, rgba(31, 42, 36, 0.12) 0 1px, transparent 1px 14px),
    rgba(183, 153, 110, 0.1);
  border: 1px solid rgba(31, 42, 36, 0.1);
}

.corridor-x {
  top: 50%;
  left: 32px;
  right: 32px;
  height: 56px;
  transform: translateY(-50%);
}

.corridor-y {
  top: 32px;
  bottom: 32px;
  left: 50%;
  width: 56px;
  transform: translateX(-50%);
}

.office-room {
  --accent: #4b8fcb;
  position: relative;
  z-index: 1;
  min-height: 300px;
  padding: 18px;
  border: 2px solid rgba(31, 42, 36, 0.72);
  background: rgba(250, 243, 226, 0.82);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.38),
    4px 5px 0 rgba(31, 42, 36, 0.12);
  color: #2d241b;
  cursor: pointer;
  overflow: hidden;
  text-align: left;
  transition: transform 220ms ease, box-shadow 220ms ease, background 220ms ease;
}

.office-room:hover,
.office-room.selected {
  background: rgba(255, 246, 226, 0.94);
  transform: translate(-2px, -3px);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--accent) 44%, rgba(255, 255, 255, 0.38)),
    7px 8px 0 rgba(31, 42, 36, 0.16);
}

.office-room:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--accent) 72%, #fff);
  outline-offset: 4px;
}

.room-backdrop {
  position: absolute;
  inset: 12px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--accent) 11%, #f5ebd3) 0 43%, transparent 43%),
    linear-gradient(135deg, rgba(255, 246, 226, 0.92), rgba(245, 235, 211, 0.8));
  border: 1px solid rgba(31, 42, 36, 0.12);
}

.room-backdrop::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 56%;
  background:
    linear-gradient(90deg, rgba(31, 42, 36, 0.055) 1px, transparent 1px) 0 0 / 28px 28px,
    linear-gradient(rgba(31, 42, 36, 0.045) 1px, transparent 1px) 0 0 / 28px 28px,
    rgba(239, 230, 210, 0.84);
}

.room-zone-label {
  position: absolute;
  top: 22px;
  right: 22px;
  z-index: 5;
  color: rgba(45, 36, 27, 0.22);
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 34px;
  font-weight: 900;
  letter-spacing: -0.08em;
}

.room-header,
.room-canvas,
.room-footer {
  position: relative;
  z-index: 4;
}

.room-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.room-header span:first-child {
  display: grid;
  gap: 4px;
}

.room-header em,
.task-copy em {
  color: rgba(45, 36, 27, 0.54);
  font-size: 12px;
  font-style: normal;
  font-weight: 700;
}

.room-header strong {
  color: var(--forest, #1f2a24);
  font-family: var(--font-display, Georgia, serif);
  font-size: 20px;
  font-style: italic;
  font-weight: 600;
  line-height: 1.1;
}

.room-state {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: max-content;
  padding: 8px 10px;
  border: 1.5px solid rgba(31, 42, 36, 0.16);
  background: rgba(250, 243, 226, 0.78);
  color: rgba(45, 36, 27, 0.68);
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 12px;
  font-weight: 800;
}

.room-state i {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--accent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 16%, transparent);
}

.room-state[data-status='error'] i { background: #d95951; box-shadow: 0 0 0 4px rgba(217, 89, 81, 0.16); }
.room-state[data-status='waiting'] i { background: #f0a33a; box-shadow: 0 0 0 4px rgba(240, 163, 58, 0.16); }
.room-state[data-status='idle'] i,
.room-state[data-status='paused'] i { background: #938575; box-shadow: 0 0 0 4px rgba(147, 133, 117, 0.16); }

.room-canvas {
  display: block;
  height: 172px;
  margin-top: 12px;
}

.room-window {
  position: absolute;
  top: 8px;
  right: 16px;
  display: grid;
  grid-template-columns: repeat(3, 13px);
  gap: 5px;
  padding: 7px;
  background: rgba(250, 243, 226, 0.72);
  border: 1px solid rgba(31, 42, 36, 0.12);
}

.room-window i {
  height: 30px;
  background: linear-gradient(180deg, #bbdcff, #fff0cc);
}

.room-board {
  position: absolute;
  top: 24px;
  left: 16px;
  display: grid;
  gap: 6px;
  width: 92px;
  padding: 12px;
  background: rgba(250, 243, 226, 0.68);
  border: 1px solid rgba(31, 42, 36, 0.12);
}

.room-board i {
  height: 6px;
  background: color-mix(in srgb, var(--accent) 38%, rgba(66, 49, 32, 0.18));
}

.room-board i:nth-child(2) { width: 76%; }
.room-board i:nth-child(3) { width: 58%; }

.room-desk {
  position: absolute;
  right: 26px;
  bottom: 14px;
  width: 132px;
  height: 94px;
}

.desk-screen {
  position: absolute;
  top: 0;
  left: 34px;
  width: 64px;
  height: 42px;
  border: 5px solid #352a22;
  background: #26384e;
}

.desk-screen i {
  display: block;
  width: 34px;
  height: 4px;
  margin: 10px auto 0;
  background: color-mix(in srgb, var(--accent) 75%, #fff);
  box-shadow: 0 10px 0 rgba(255, 255, 255, 0.42);
}

.desk-top {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 24px;
  height: 28px;
  background: linear-gradient(180deg, #fff8ea, #d3b286);
  box-shadow: 0 12px 0 rgba(73, 51, 31, 0.1);
}

.desk-chair {
  position: absolute;
  left: 44px;
  bottom: 0;
  width: 44px;
  height: 28px;
  background: color-mix(in srgb, var(--accent) 26%, #574132);
}

.room-decor {
  position: absolute;
  left: 18px;
  bottom: 18px;
  display: grid;
  grid-template-columns: repeat(3, 16px);
  gap: 7px;
}

.room-decor i {
  width: 16px;
  height: 16px;
  background: color-mix(in srgb, var(--accent) 52%, #fff1d8);
  box-shadow: 0 6px 0 rgba(72, 50, 31, 0.11);
}

.decor-finance i { border-radius: 4px; }
.decor-service i:nth-child(odd) { border-radius: 50%; }
.decor-legal i { transform: skewX(-8deg); }
.decor-admin i:nth-child(3n) { height: 24px; }

.agent-seat {
  position: absolute;
  left: 50%;
  bottom: 12px;
  z-index: 6;
  transform: translateX(-50%);
}

.agent-seat.is-resting {
  left: 33%;
  bottom: 18px;
  transform: translateX(-50%) rotate(-5deg);
  opacity: 0.84;
}

.room-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  min-height: 58px;
  padding: 10px 12px 0;
}

.task-copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.task-copy strong {
  overflow: hidden;
  max-width: 210px;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress-ring {
  --progress: 0%;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 54px;
  height: 54px;
  background:
    radial-gradient(circle, #faf3e2 0 55%, transparent 56%),
    conic-gradient(var(--accent) var(--progress), rgba(72, 53, 34, 0.12) 0);
  border: 1.5px solid rgba(31, 42, 36, 0.16);
}

.progress-ring b {
  color: #2d241b;
  font-size: 14px;
}

.status-running .room-state i {
  animation: status-pulse 1.8s ease-in-out infinite;
}

.status-error {
  animation: error-room-glow 1.6s ease-in-out infinite;
}

@keyframes status-pulse {
  0%, 100% { transform: scale(1); opacity: 0.86; }
  50% { transform: scale(1.25); opacity: 1; }
}

@keyframes error-room-glow {
  0%, 100% { box-shadow: inset 0 0 0 1px rgba(217, 89, 81, 0.18), 0 18px 34px rgba(64, 46, 27, 0.1); }
  50% { box-shadow: inset 0 0 0 1px rgba(217, 89, 81, 0.42), 0 18px 38px rgba(217, 89, 81, 0.16); }
}

@media (max-width: 1180px) {
  .office-floorplan {
    grid-template-columns: 1fr;
    min-width: 420px;
  }

  .corridor-y,
  .corridor-x {
    display: none;
  }
}
</style>
