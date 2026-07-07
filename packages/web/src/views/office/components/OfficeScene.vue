<template>
  <section class="office-floorplan" aria-label="数字员工办公室地图">

    <button
      v-for="(agent, idx) in agents"
      :key="agent.id"
      type="button"
      class="office-room"
      :data-agent-id="agent.id"
      :class="[
        `room-${agent.type}`,
        `status-${agent.status}`,
        {
          selected: selectedAgentId === agent.id,
          highlighted: highlightStatus === agent.status,
          dimmed: dimmedAgentIds.includes(agent.id),
        },
      ]"
      :style="{ '--accent': agent.accent, '--idx': idx }"
      :aria-label="`查看 ${agent.name}`"
      @click="$emit('select', agent.id)"
      @pointerenter="onRoomEnter(agent, $event)"
      @pointerleave="$emit('hover', null)"
      @focusin="onRoomEnter(agent, $event)"
      @focusout="$emit('hover', null)"
    >
      <span class="room-backdrop" aria-hidden="true" :style="roomTileStyle(agent.type)"></span>
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
        <!-- Window with outside view (SDV feel) -->
        <span class="room-window"><i></i><i></i><i></i></span>

        <!-- Wall board / notes -->
        <span class="room-board">
          <i v-for="line in 3" :key="line"></i>
        </span>

        <!-- Type-specific furniture using real sprites, arranged like SDV room -->
        <span class="furniture furniture-desk" :style="furnitureStyle('desk', agent.type)"></span>
        <span class="furniture furniture-chair" :style="furnitureStyle('chair', agent.type)"></span>
        <span class="furniture furniture-shelf" :style="furnitureStyle('shelf', agent.type)"></span>
        <span class="furniture furniture-decor" :style="furnitureStyle('decor', agent.type)"></span>

        <!-- Agent seated naturally -->
        <span class="agent-seat" :class="{ 'is-resting': isResting(agent.status) }">
          <AgentAvatar :type="agent.type" :status="avatarStatus(agent.status)" :size="isResting(agent.status) ? 56 : 64" />
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

withDefaults(
  defineProps<{
    agents: OfficeAgent[]
    selectedAgentId: string
    highlightStatus?: OfficeAgentStatus | null
    dimmedAgentIds?: string[]
  }>(),
  {
    highlightStatus: null,
    dimmedAgentIds: () => [],
  },
)

const emit = defineEmits<{
  select: [agentId: string]
  hover: [payload: { agent: OfficeAgent; x: number; y: number } | null]
}>()

function onRoomEnter(agent: OfficeAgent, event: Event) {
  const target = event.currentTarget as HTMLElement | null
  if (!target) return
  const rect = target.getBoundingClientRect()
  emit('hover', {
    agent,
    x: rect.left + rect.width / 2,
    y: rect.top,
  })
}

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

function furnitureStyle(kind: string, agentType?: string) {
  // Real positions from the furniture sprite sheet (256x96, ~32px tiles)
  // Redesigned layout: cozy SDV-style workstation per agent type
  const positions: Record<string, Record<string, string>> = {
    desk: { finance: '0px 0px', service: '0px 0px', legal: '-32px 0px', admin: '0px 0px' },
    chair: { finance: '-64px 0px', service: '-64px 0px', legal: '-96px 0px', admin: '-64px 0px' },
    shelf: { finance: '-96px -32px', service: '-64px -32px', legal: '-128px -32px', admin: '-96px -32px' },
    decor: { finance: '0px -32px', service: '-32px -32px', legal: '0px -32px', admin: '-32px -32px' },
  }
  const type = agentType || 'finance'
  let pos = (positions[kind] && positions[kind][type]) || '0px 0px'

  return {
    backgroundImage: `url('/pixel/furniture/office-furniture-pack.png')`,
    backgroundSize: '256px 96px',
    backgroundPosition: pos,
    backgroundRepeat: 'no-repeat',
  }
}

function roomTileStyle(type: string) {
  const offsets: Record<string, string> = {
    finance: '0px 0px',
    service: '-64px 0px',
    legal: '0px -32px',
    admin: '-96px 0px',
  }
  return {
    backgroundPosition: offsets[type] || '0px 0px',
  }
}
</script>

<style lang="scss" scoped>
.office-floorplan {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, minmax(200px, 1fr));
  gap: 16px;
  width: 100%;
  min-width: 0;
  min-height: 300px;
  padding: 16px;
  background: rgb(var(--elev) / 0.4);
  border-radius: 12px;
  border: 1px solid rgb(var(--line) / 0.5);
  overflow: hidden;
}

/* Removed chaotic floor-grid and corridors for clarity (Scheme A) */

.office-room {
  --accent: #1677ff;
  position: relative;
  z-index: 1;
  min-height: 260px;
  padding: 10px;
  border: 1px solid rgb(var(--line) / 0.6);
  background: rgb(var(--surface));
  border-radius: 8px;
  box-shadow: $shadow-sm;
  color: rgb(var(--text));
  cursor: pointer;
  overflow: hidden;
  text-align: left;
  transition: all 200ms ease;
}

.office-room:hover {
  border-color: rgb(var(--accent));
  box-shadow: $shadow-md;
}

.office-room.selected,
.office-room.highlighted {
  border-color: rgb(var(--accent));
  background: rgb(var(--elev));
  box-shadow: $shadow-md;
  z-index: 2;
}

.office-room.dimmed {
  opacity: 0.42;
  filter: grayscale(0.25);
  transform: scale(0.98);
}

.office-room.dimmed:hover {
  opacity: 0.72;
}

.office-room:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--accent) 72%, #fff);
  outline-offset: 4px;
}

.room-backdrop {
  position: absolute;
  inset: 6px;
  background: rgb(var(--elev) / 0.6);
  border: 1px solid rgb(var(--line) / 0.4);
  border-radius: 4px;
}

/* Type-specific room feel - subtle tints */
.room-finance .room-backdrop { background: rgb(240 244 248 / 0.6); }
.room-service .room-backdrop { background: rgb(240 248 244 / 0.6); }
.room-legal .room-backdrop { background: rgb(248 244 240 / 0.6); }
.room-admin .room-backdrop { background: rgb(248 240 244 / 0.6); }

.room-backdrop::after {
  content: '';
  position: absolute;
  left: 3px;
  right: 3px;
  top: 3px;
  bottom: 3px;
  background: 
    /* Top-left light source */
    linear-gradient(135deg, rgba(255,255,255,0.35) 0%, transparent 40%),
    /* Subtle side light */
    linear-gradient(90deg, rgba(255,255,255,0.12) 0%, transparent 50%);
  pointer-events: none;
}

/* Rim lighting on room */
.office-room::before {
  content: '';
  position: absolute;
  inset: -2px;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 2px;
  pointer-events: none;
  z-index: 10;
  box-shadow: 
    inset 0 0 12px rgba(255,255,255,0.2),
    0 0 0 1px rgba(0,0,0,0.2);
}

.room-zone-label {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 5;
  color: rgba(45, 36, 27, 0.22);
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 24px;
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
  gap: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(91, 63, 31, 0.15);
}

.room-header span:first-child {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.room-header em {
  color: #8b5a2b;
  font-size: 7px;
  font-style: normal;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}

.room-header strong {
  color: #1f2a24;
  font-family: var(--font-display, Georgia, serif);
  font-size: 14px;
  font-style: italic;
  font-weight: 600;
  line-height: 1;
  text-shadow: 0 1px 0 rgba(255,255,255,0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.room-state {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  min-width: max-content;
  padding: 2px 4px;
  border: 1px solid #5b3f1f;
  background: rgba(244, 235, 218, 0.85);
  color: #2a422a;
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 8px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  box-shadow: 0 1px 1px rgba(0,0,0,0.1);
}

.room-state i {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--accent);
  box-shadow: 0 0 0 1px #f4ebda, 0 0 3px var(--accent);
}

.room-state[data-status='error'] i { background: #d95951; box-shadow: 0 0 0 1px #f4ebda, 0 0 4px #d95951; }
.room-state[data-status='waiting'] i { background: #f0a33a; box-shadow: 0 0 0 1px #f4ebda, 0 0 4px #f0a33a; }
.room-state[data-status='idle'] i,
.room-state[data-status='paused'] i { background: #938575; box-shadow: 0 0 0 1px #f4ebda, 0 0 3px #938575; }
.room-state[data-status='running'] i { animation: status-pulse 1.6s ease-in-out infinite; }

.room-canvas {
  display: block;
  height: 155px;
  margin-top: 6px;
  position: relative;
  box-shadow: 
    inset 0 0 20px rgba(0,0,0,0.15),
    0 8px 16px -4px rgba(0,0,0,0.3);
}

/* Type & status specific lighting / animations on the canvas */
.status-running .room-canvas::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, 
    transparent 30%, 
    rgba(91,143,168,0.12) 50%, 
    transparent 70%);
  animation: desk-light-sweep 2.8s linear infinite;
  pointer-events: none;
  z-index: 1;
}
.room-finance .room-canvas::after { background: linear-gradient(90deg, transparent 30%, rgba(62,95,62,0.1) 50%, transparent 70%); }
.room-service .room-canvas::after { background: linear-gradient(90deg, transparent 30%, rgba(211,139,79,0.1) 50%, transparent 70%); }

@keyframes desk-light-sweep {
  0% { transform: translateX(-30%); }
  100% { transform: translateX(130%); }
}

/* Redesigned room presentation: cozy SDV pixel workstation */
.room-window {
  position: absolute;
  top: 2px;
  right: 4px;
  display: grid;
  grid-template-columns: repeat(3, 9px);
  gap: 2px;
  padding: 2px;
  background: #d4e8f0;
  border: 2px solid #5b3f1f;
  z-index: 2;
}

.room-window i {
  height: 16px;
  background: linear-gradient(180deg, #a8c9e0, #f0e3ca);
}

.room-board {
  position: absolute;
  top: 8px;
  left: 4px;
  display: grid;
  gap: 2px;
  width: 55px;
  padding: 4px;
  background: #e8d9c2;
  border: 2px solid #5b3f1f;
  z-index: 2;
}

.room-board i {
  height: 3px;
  background: color-mix(in srgb, var(--accent) 40%, #8b5a2b);
}

/* Furniture sprites - arranged naturally like SDV room desks */
.furniture {
  position: absolute;
  image-rendering: pixelated;
  pointer-events: none;
  z-index: 4;
  opacity: 0.95;
  /* No strong hover lift on furniture */
  filter: drop-shadow(2px 4px 3px rgba(0,0,0,0.35));
}

/* Type-specific positions for distinct feel */
.furniture-desk { right: 8px; bottom: 4px; width: 52px; height: 32px; }
.furniture-chair { right: 42px; bottom: 0; width: 26px; height: 26px; }
.furniture-shelf { left: 4px; top: 20px; width: 32px; height: 20px; }
.furniture-decor { left: 60px; top: 8px; width: 18px; height: 18px; }

/* Per-type tweaks via room class */
.room-finance .furniture-desk { right: 6px; }
.room-service .furniture-chair { right: 38px; }
.room-legal .furniture-shelf { left: 6px; }
.room-admin .furniture-decor { left: 55px; }

/* More aggressive type-specific animations / props */
.room-finance .furniture-desk { animation: finance-ledger 4s ease-in-out infinite; }
.room-service .furniture-chair { animation: service-ring 2.2s ease-in-out infinite; }
.room-legal .furniture-shelf { animation: legal-pages 5.5s ease-in-out infinite; }
.room-admin .furniture-decor { animation: admin-busy 1.8s steps(3, end) infinite; }

@keyframes finance-ledger {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-1px) rotate(1deg); }
}
@keyframes service-ring {
  0%, 100% { transform: translateY(0); }
  25%, 75% { transform: translateY(-2px) scale(1.05); }
  50% { transform: translateY(-3px); }
}
@keyframes legal-pages {
  0%, 100% { transform: translateX(0); }
  40% { transform: translateX(1px); }
  60% { transform: translateX(-1px); }
}
@keyframes admin-busy {
  0% { transform: translateY(0) rotate(0deg); }
  33% { transform: translateY(-1px) rotate(-4deg); }
  66% { transform: translateY(1px) rotate(4deg); }
  100% { transform: translateY(0) rotate(0deg); }
}

.agent-seat {
  position: absolute;
  left: 52%;
  bottom: 6px;
  z-index: 5;
  transform: translateX(-50%);
  /* No hover scale on agent */
}

.agent-seat.is-resting {
  left: 42%;
  bottom: 8px;
  transform: translateX(-50%) rotate(-3deg);
  opacity: 0.9;
}

.room-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  min-height: 42px;
  padding: 5px 8px 2px;
  position: relative;
  z-index: 6;
  background: linear-gradient(to top, rgba(245, 235, 211, 0.75), transparent);
  border-top: 1px dashed rgba(91, 63, 31, 0.3);
}

.task-copy {
  display: grid;
  gap: 1px;
  min-width: 0;
  background: rgba(250, 243, 226, 0.6);
  padding: 1px 4px;
  border-radius: 2px;
  border: 1px solid rgba(91, 63, 31, 0.2);
}

.task-copy em {
  color: #8b5a2b;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}

.task-copy strong {
  overflow: hidden;
  max-width: 115px;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1f2a24;
  font-weight: 600;
  line-height: 1.1;
}

.progress-ring {
  --progress: 0%;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 36px;
  height: 36px;
  background: #faf3e2;
  border: 2px solid #5b3f1f;
  box-shadow: 
    inset 0 0 0 1px #d9c8a8, 
    0 1px 1px rgba(0,0,0,0.15),
    /* Bevel effect */
    inset 2px 2px 0 rgba(255,255,255,0.6),
    inset -2px -2px 0 rgba(0,0,0,0.2);
}

.progress-ring b {
  color: #1f2a24;
  font-size: 9px;
  font-weight: 700;
}

.status-running .room-state i {
  animation: status-pulse 1.6s ease-in-out infinite;
}

.status-error .office-room {
  animation: error-room-glow 2s ease-in-out infinite;
}

.status-waiting .room-state {
  border-style: dashed;
}

@keyframes status-pulse {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.2); opacity: 1; }
}

@keyframes error-room-glow {
  0%, 100% { box-shadow: 0 0 0 2px rgba(217, 89, 81, 0.15); }
  50% { box-shadow: 0 0 0 4px rgba(217, 89, 81, 0.35); }
}

@media (max-width: 900px) {
  .office-floorplan {
    grid-template-columns: repeat(2, minmax(180px, 1fr));
    min-width: 0;
    min-height: 420px;
  }
  .room-canvas { height: 130px; }
  .furniture-desk { width: 42px; height: 26px; }
  .furniture-chair { width: 22px; height: 22px; }
}
@media (max-width: 640px) {
  .office-floorplan {
    grid-template-columns: 1fr;
    min-height: auto;
    padding: 8px;
    gap: 8px;
  }
  .office-room { min-height: 220px; padding: 6px; }
  .room-canvas { height: 100px; }
  .furniture-desk { width: 36px; height: 22px; }
  .furniture-chair { width: 18px; height: 18px; }
}
</style>
