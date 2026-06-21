<template>
  <svg
    class="agent-avatar"
    :class="[`is-${type}`, `is-${status}`]"
    viewBox="0 0 96 128"
    :width="size"
    :height="Math.round(size * 1.34)"
    role="img"
    :aria-label="`${nameMap[type]} 像素风 Agent`"
  >
    <g class="pixel-shadow">
      <rect x="22" y="116" width="52" height="6" />
      <rect x="14" y="122" width="68" height="4" />
    </g>

    <g v-if="status === 'thinking'" class="thought-bubble">
      <rect x="62" y="2" width="22" height="14" />
      <rect x="68" y="16" width="8" height="6" />
      <rect x="68" y="7" width="4" height="4" />
      <rect x="76" y="7" width="4" height="4" />
    </g>
    <g v-if="status === 'waiting'" class="wait-badge">
      <rect x="64" y="4" width="18" height="18" />
      <rect x="71" y="8" width="4" height="8" />
      <rect x="71" y="18" width="4" height="3" />
    </g>
    <g v-if="status === 'error'" class="error-badge">
      <rect x="62" y="4" width="22" height="18" />
      <rect x="70" y="8" width="6" height="6" />
      <rect x="70" y="16" width="6" height="3" />
    </g>

    <g class="legs">
      <rect x="28" y="90" width="14" height="26" />
      <rect x="54" y="90" width="14" height="26" />
      <rect x="24" y="112" width="22" height="8" />
      <rect x="50" y="112" width="22" height="8" />
    </g>

    <g class="body">
      <rect x="20" y="56" width="56" height="40" />
      <rect x="14" y="64" width="12" height="24" />
      <rect x="70" y="64" width="12" height="24" />
      <rect x="32" y="56" width="32" height="12" class="collar" />
      <rect x="44" y="66" width="8" height="18" class="tie" />
      <rect x="58" y="74" width="8" height="6" class="badge" />
    </g>

    <g class="neck">
      <rect x="40" y="48" width="16" height="12" />
    </g>

    <g class="head">
      <rect x="26" y="20" width="44" height="34" />
      <rect x="22" y="28" width="6" height="18" />
      <rect x="68" y="28" width="6" height="18" />
      <rect x="34" y="36" width="6" height="6" class="eye" />
      <rect x="56" y="36" width="6" height="6" class="eye" />
      <rect x="42" y="46" width="12" height="4" class="mouth" />
    </g>

    <g class="hair">
      <template v-if="type === 'finance'">
        <rect x="26" y="16" width="44" height="10" />
        <rect x="22" y="24" width="14" height="10" />
        <rect x="38" y="22" width="10" height="8" />
        <rect x="54" y="22" width="16" height="8" />
      </template>
      <template v-else-if="type === 'service'">
        <rect x="22" y="16" width="52" height="10" />
        <rect x="18" y="24" width="12" height="34" />
        <rect x="66" y="24" width="12" height="34" />
        <rect x="30" y="22" width="36" height="8" />
        <rect x="14" y="36" width="8" height="12" class="headset" />
        <rect x="74" y="36" width="8" height="12" class="headset" />
        <rect x="20" y="50" width="12" height="4" class="headset" />
      </template>
      <template v-else-if="type === 'legal'">
        <rect x="28" y="16" width="40" height="10" />
        <rect x="22" y="24" width="12" height="10" />
        <rect x="62" y="24" width="10" height="10" />
        <rect x="40" y="10" width="16" height="10" />
        <rect x="32" y="36" width="10" height="4" class="glasses" />
        <rect x="54" y="36" width="10" height="4" class="glasses" />
        <rect x="42" y="38" width="12" height="2" class="glasses" />
      </template>
      <template v-else>
        <rect x="26" y="16" width="44" height="12" />
        <rect x="22" y="24" width="12" height="14" />
        <rect x="62" y="24" width="12" height="14" />
        <rect x="34" y="12" width="10" height="8" />
        <rect x="52" y="12" width="10" height="8" />
        <rect x="62" y="30" width="10" height="4" class="hairpin" />
      </template>
    </g>
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
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
</script>

<style lang="scss" scoped>
.agent-avatar {
  --skin: #f2c79f;
  --hair: #5b3424;
  --uniform: #397bff;
  --dark: #171411;
  --sole: #2d2926;
  display: block;
  overflow: visible;
  image-rendering: pixelated;
  shape-rendering: crispEdges;
  filter: drop-shadow(0 8px 0 rgba(58, 38, 22, 0.12));
  pointer-events: none;
  transform-origin: center bottom;
}

.agent-avatar.is-finance {
  --hair: #b87a24;
  --uniform: #397bff;
}

.agent-avatar.is-service {
  --hair: #15100f;
  --uniform: #2f9e72;
}

.agent-avatar.is-legal {
  --hair: #5a341f;
  --uniform: #e68a3f;
}

.agent-avatar.is-admin {
  --hair: #3a2018;
  --uniform: #d95951;
}

.agent-avatar.is-working {
  animation: pixel-work 0.78s steps(2, end) infinite;
}

.agent-avatar.is-thinking {
  animation: pixel-think 1.6s steps(3, end) infinite;
}

.agent-avatar.is-waiting {
  animation: pixel-wait 1.1s steps(2, end) infinite;
}

.agent-avatar.is-error {
  filter:
    drop-shadow(0 8px 0 rgba(58, 38, 22, 0.12))
    drop-shadow(0 0 10px rgba(217, 89, 81, 0.72));
}

.agent-avatar.is-offline {
  filter: grayscale(0.9) opacity(0.62);
}

.pixel-shadow rect { fill: rgba(58, 38, 22, 0.22); }
.legs rect { fill: var(--sole); }
.body rect { fill: var(--uniform); stroke: var(--dark); stroke-width: 2; }
.body .collar { fill: rgba(255, 255, 255, 0.92); }
.body .tie { fill: rgba(20, 24, 28, 0.82); }
.body .badge { fill: rgba(255, 255, 255, 0.72); stroke-width: 0; }
.neck rect,
.head rect { fill: var(--skin); stroke: var(--dark); stroke-width: 2; }
.head .eye { fill: #15110f; stroke-width: 0; }
.head .mouth { fill: rgba(96, 48, 36, 0.7); stroke-width: 0; }
.hair rect { fill: var(--hair); stroke: var(--dark); stroke-width: 2; }
.hair .headset { fill: #111820; stroke: #111820; }
.hair .glasses { fill: #1a1a1e; stroke-width: 0; }
.hair .hairpin { fill: #f4d35e; stroke-width: 0; }

.thought-bubble rect {
  fill: #fff8e8;
  stroke: var(--dark);
  stroke-width: 2;
}

.thought-bubble rect:nth-child(3),
.thought-bubble rect:nth-child(4) {
  fill: var(--uniform);
  stroke-width: 0;
}

.wait-badge rect,
.error-badge rect {
  fill: #f7c66a;
  stroke: var(--dark);
  stroke-width: 2;
}

.wait-badge rect:not(:first-child),
.error-badge rect:not(:first-child) {
  fill: #21120a;
  stroke-width: 0;
}

.error-badge rect:first-child {
  fill: #d95951;
}

@keyframes pixel-work {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

@keyframes pixel-think {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-1px); }
}

@keyframes pixel-wait {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(2px); }
}
</style>
