<template>
  <!-- Real PNG sprite from opc-agent-assets/generated (SDV pixel reference) -->
  <div
    class="agent-sprite"
    :class="[`is-${type}`, `is-${status}`]"
    :style="spriteStyle"
    role="img"
    :aria-label="`${nameMap[type]} 像素 Agent`"
  >
    <!-- optional status overlays (pixel effects) -->
    <span v-if="status === 'thinking'" class="status-fx think"></span>
    <span v-else-if="status === 'waiting'" class="status-fx wait"></span>
    <span v-else-if="status === 'error'" class="status-fx error"></span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  type: 'finance' | 'service' | 'legal' | 'admin'
  status?: 'idle' | 'thinking' | 'working' | 'waiting' | 'error' | 'offline'
  size?: number
}>(), {
  status: 'working',
  size: 86,
})

const nameMap = {
  finance: '财务',
  service: '客服',
  legal: '法务',
  admin: '行政',
} as const

const fileMap: Record<string, string> = {
  finance: 'agent-finance',
  service: 'agent-customer-service',
  legal: 'agent-legal',
  admin: 'agent-administrative',
}

const statusToFrame: Record<string, number> = {
  idle: 0,
  working: 2,
  thinking: 1,
  waiting: 4,
  error: 6,
  offline: 7,
}

const spriteUrl = computed(() => {
  const fname = fileMap[props.type] || 'agent-finance'
  return `/pixel/characters/${fname}.png`
})

const frameIndex = computed(() => {
  return statusToFrame[props.status || 'working'] ?? 0
})

const spriteStyle = computed(() => {
  const s = props.size || 86
  const frameW = s // each frame displayed at this width
  const totalW = frameW * 8
  const bgPosX = -(frameIndex.value * frameW)
  return {
    width: `${s}px`,
    height: `${s}px`,
    backgroundImage: `url(${spriteUrl.value})`,
    backgroundSize: `${totalW}px ${s}px`,
    backgroundPosition: `${bgPosX}px 0`,
    backgroundRepeat: 'no-repeat',
  }
})
</script>

<style lang="scss" scoped>
.agent-sprite {
  image-rendering: pixelated;
  background-repeat: no-repeat;
  background-color: transparent;
  display: inline-block;
  pointer-events: none;
  transform-origin: center bottom;
  transition: filter 220ms ease, transform 220ms ease;
  position: relative;
  /* crisp SDV pixel look - enhanced for new room presentation */
  filter: drop-shadow(0 4px 2px rgba(0,0,0,0.25)) drop-shadow(0 8px 4px rgba(62, 95, 62, 0.15));
  image-rendering: crisp-edges;
}

.agent-sprite.is-idle {
  animation: pixel-idle 3.5s ease-in-out infinite;
}
.agent-sprite.is-working {
  /* Working agents get a subtle bob; real frame cycling can use JS if needed */
  animation: pixel-work 0.9s steps(3, end) infinite;
}
.agent-sprite.is-thinking {
  animation: pixel-think 1.4s steps(2, end) infinite;
}
.agent-sprite.is-waiting {
  animation: pixel-wait 1.2s steps(2, end) infinite;
}

.agent-sprite.is-error {
  filter: drop-shadow(0 0 8px rgba(200, 90, 74, 0.7)) drop-shadow(0 4px 2px rgba(0,0,0,0.3));
  animation: agent-error-shake 0.6s ease-in-out infinite;
}
.agent-sprite.is-offline {
  filter: grayscale(0.8) opacity(0.6) brightness(0.85);
}
.agent-sprite.is-running {
  filter: drop-shadow(0 4px 2px rgba(0,0,0,0.25)) drop-shadow(0 8px 4px rgba(91, 143, 168, 0.2));
}

/* More aggressive type-specific animations */
.agent-sprite.is-finance.is-running {
  animation: finance-calm-work 1.1s steps(4) infinite;
}
.agent-sprite.is-service.is-running {
  animation: service-friendly-nod 1.4s ease-in-out infinite;
}
.agent-sprite.is-legal.is-running {
  animation: legal-serious-lean 2.1s steps(3) infinite;
}
.agent-sprite.is-admin.is-running {
  animation: admin-busy-pace 0.85s steps(2, end) infinite;
}

@keyframes finance-calm-work {
  0%, 100% { transform: translateY(0) rotate(0); }
  50% { transform: translateY(-1px) rotate(0.5deg); }
}
@keyframes service-friendly-nod {
  0%, 100% { transform: translateY(0); }
  40% { transform: translateY(-2px); }
}
@keyframes legal-serious-lean {
  0% { transform: translateY(0) rotate(0); }
  50% { transform: translateY(-1px) rotate(-2deg); }
  100% { transform: translateY(0) rotate(0); }
}
@keyframes admin-busy-pace {
  0% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-1px) scale(1.02); }
}

/* status overlays using pixel style - enhanced for type + 3D */
.status-fx {
  position: absolute;
  top: -6px;
  right: -4px;
  width: 18px;
  height: 18px;
  pointer-events: none;
  image-rendering: pixelated;
  z-index: 10;
  filter: drop-shadow(1px 1px 0 rgba(0,0,0,0.4));
}
.status-fx.think {
  background: #f0e3ca;
  border: 1px solid #2a422a;
}
.status-fx.wait {
  background: #d38b4f;
  border: 1px solid rgb(var(--line) / 0.6);
  animation: service-wait-bob 1.2s ease-in-out infinite;
}
.status-fx.error {
  background: #c85a4a;
  color: #f8f0df;
  font-size: 12px;
  line-height: 16px;
  text-align: center;
  font-family: var(--font-mono);
  font-weight: 900;
  animation: error-alert 0.8s steps(2) infinite;
}

.agent-sprite.is-finance .status-fx.wait { animation: finance-wait 1.8s ease-in-out infinite; }
.agent-sprite.is-legal .status-fx.think { animation: legal-think 2.4s ease-in-out infinite; }

@keyframes service-wait-bob {
  0%,100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}
@keyframes error-alert {
  0%,100% { opacity: 1; }
  50% { opacity: 0.4; }
}
@keyframes finance-wait {
  0%,100% { transform: scale(1); }
  50% { transform: scale(0.92); }
}
@keyframes legal-think {
  0%,100% { transform: rotate(0); }
  50% { transform: rotate(-8deg); }
}

@keyframes pixel-work {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}


@keyframes pixel-idle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-1px); }
}
@keyframes pixel-think {
  0%, 100% { transform: translateY(0) rotate(0); }
  50% { transform: translateY(-1px) rotate(1deg); }
}
@keyframes pixel-wait {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(1px); }
}

@keyframes agent-error-shake {
  0%, 100% { transform: translateX(0); }
  20%, 80% { transform: translateX(-1px); }
  40%, 60% { transform: translateX(1px); }
}
</style>