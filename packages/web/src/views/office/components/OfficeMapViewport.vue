<template>
  <div
    ref="viewportRef"
    class="map-viewport"
    :class="{
      'is-dragging': dragging,
      'is-overlay-open': overlayOpen,
      'is-compact': compact,
    }"
    @wheel.prevent="onWheel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointerleave="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <div class="map-vignette" aria-hidden="true" />
    <div class="map-grain" aria-hidden="true" />

    <div
      ref="stageRef"
      class="map-stage"
      :class="{ 'is-zooming': zooming }"
      :style="stageStyle"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    focusAgentId?: string
    overlayOpen?: boolean
    panEnabled?: boolean
    compact?: boolean
  }>(),
  {
    focusAgentId: '',
    overlayOpen: false,
    panEnabled: true,
    compact: false,
  },
)

const viewportRef = ref<HTMLElement | null>(null)
const stageRef = ref<HTMLElement | null>(null)

const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const dragging = ref(false)
const zooming = ref(false)

let dragStartX = 0
let dragStartY = 0
let dragOriginX = 0
let dragOriginY = 0
let activePointerId: number | null = null
let zoomTimer: ReturnType<typeof setTimeout> | undefined

const MIN_SCALE = 0.85
const MAX_SCALE = 1.4

const stageStyle = computed(() => ({
  transform: `translate3d(${translateX.value}px, ${translateY.value}px, 0) scale(${scale.value})`,
}))

function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value))
}

function onWheel(event: WheelEvent) {
  if (!props.panEnabled) return
  const delta = event.deltaY > 0 ? -0.06 : 0.06
  scale.value = clampScale(scale.value + delta)
}

function onPointerDown(event: PointerEvent) {
  if (!props.panEnabled || event.button !== 0) return
  const target = event.target as HTMLElement
  if (target.closest('.office-room')) return

  dragging.value = true
  activePointerId = event.pointerId
  dragStartX = event.clientX
  dragStartY = event.clientY
  dragOriginX = translateX.value
  dragOriginY = translateY.value
  viewportRef.value?.setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!dragging.value || activePointerId !== event.pointerId) return
  translateX.value = dragOriginX + (event.clientX - dragStartX)
  translateY.value = dragOriginY + (event.clientY - dragStartY)
}

function onPointerUp(event: PointerEvent) {
  if (activePointerId !== event.pointerId) return
  dragging.value = false
  activePointerId = null
  viewportRef.value?.releasePointerCapture(event.pointerId)
}

async function focusRoom(agentId: string) {
  await nextTick()
  const viewport = viewportRef.value
  const room = stageRef.value?.querySelector<HTMLElement>(`[data-agent-id="${agentId}"]`)
  if (!viewport || !room) return

  const viewportRect = viewport.getBoundingClientRect()
  const roomRect = room.getBoundingClientRect()
  const roomCenterX = roomRect.left + roomRect.width / 2
  const roomCenterY = roomRect.top + roomRect.height / 2
  const viewportCenterX = viewportRect.left + viewportRect.width / 2
  const viewportCenterY = viewportRect.top + viewportRect.height / 2

  zooming.value = true
  if (zoomTimer) clearTimeout(zoomTimer)
  zoomTimer = setTimeout(() => {
    zooming.value = false
  }, 360)

  scale.value = props.compact ? 1 : props.overlayOpen ? 1.06 : 1.03
  translateX.value += viewportCenterX - roomCenterX
  translateY.value += viewportCenterY - roomCenterY
}

function resetView() {
  zooming.value = true
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
  if (zoomTimer) clearTimeout(zoomTimer)
  zoomTimer = setTimeout(() => {
    zooming.value = false
  }, 360)
}

watch(
  () => props.focusAgentId,
  (agentId) => {
    if (agentId) void focusRoom(agentId)
    else resetView()
  },
)

watch(
  () => props.overlayOpen,
  (open) => {
    if (open && props.focusAgentId) void focusRoom(props.focusAgentId)
    if (!open) resetView()
  },
)

onBeforeUnmount(() => {
  if (zoomTimer) clearTimeout(zoomTimer)
})

defineExpose({ focusRoom, resetView })
</script>

<style lang="scss" scoped>
.map-viewport {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: auto;
  cursor: default;
  touch-action: pan-x pan-y;
  border-radius: 12px;
  background: rgb(var(--elev) / 0.3);
}

.map-viewport.is-compact {
  border: 0;
  box-shadow: none;
  background: transparent;
  overflow-x: auto;
  overflow-y: hidden;
}

.map-viewport.is-compact.is-overlay-open::after {
  display: none;
}

.map-viewport.is-compact .map-stage {
  padding: 12px;
  align-items: stretch;
}

.map-viewport.is-dragging {
  cursor: grabbing;
}

.map-viewport.is-overlay-open::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(13, 71, 161, 0.25);
  z-index: 3;
  pointer-events: none;
  transition: opacity 280ms ease;
}

.map-vignette {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 42%, rgb(var(--accent) / 0.15) 100%);
}

.map-grain {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  opacity: 0.35;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
  mix-blend-mode: multiply;
}

.map-stage {
  position: relative;
  z-index: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  transform-origin: center center;
  transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

.map-stage.is-zooming {
  transition-duration: 360ms;
}
</style>