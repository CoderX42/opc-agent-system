<template>
  <header class="office-topbar" role="banner">
    <div class="topbar-left">
      <span class="live-pill"><i aria-hidden="true" /> LIVE</span>
      <time class="topbar-clock">{{ clock }}</time>
    </div>
    <p class="topbar-title">OPC · AGENT OFFICE</p>
    <div class="topbar-actions">
      <button type="button" class="topbar-btn" title="快捷键 (?)" @click="$emit('help')">?</button>
      <button
        v-if="showListToggle"
        type="button"
        class="topbar-btn"
        :class="{ active: listMode }"
        title="列表视图"
        @click="$emit('toggle-list')"
      >
        ≡
      </button>
      <button type="button" class="topbar-btn" title="新窗口打开" @click="openNewWindow">⛶</button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

defineProps<{
  listMode?: boolean
  showListToggle?: boolean
}>()

defineEmits<{
  help: []
  'toggle-list': []
}>()

const clock = ref(formatClock())

let timer: ReturnType<typeof setInterval> | undefined

function formatClock() {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function openNewWindow() {
  window.open(`${window.location.origin}/office`, '_blank', 'noopener,noreferrer')
}

onMounted(() => {
  timer = setInterval(() => {
    clock.value = formatClock()
  }, 30_000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<style lang="scss" scoped>
.office-topbar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  height: 48px;
  padding: 0 14px;
  border-bottom: 1px solid rgb(var(--line) / 0.6);
  background: rgb(var(--surface) / 0.96);
  backdrop-filter: blur(10px);
  color: rgb(var(--muted));
  flex-shrink: 0;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.live-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid rgba(141, 216, 163, 0.5);
  background: rgba(141, 216, 163, 0.12);
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.live-pill i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #8dd8a3;
  box-shadow: 0 0 8px #8dd8a3;
  animation: live-blink 1.2s steps(2, end) infinite;
}

.topbar-clock {
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: rgba(244, 235, 218, 0.72);
}

.topbar-title {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-align: center;
  color: rgb(var(--muted));
}

.topbar-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.topbar-btn {
  width: 32px;
  height: 32px;
  border: 1px solid rgb(var(--line) / 0.5);
  background: rgb(var(--surface));
  color: rgb(var(--muted));
  font-size: 14px;
  line-height: 1;
  border-radius: 8px;
  cursor: pointer;
  transition: all 160ms ease;
}

.topbar-btn:hover {
  background: rgb(var(--elev));
  border-color: rgb(var(--accent));
  transform: translateY(-1px);
}

.topbar-btn.active {
  background: rgb(var(--accent));
  border-color: rgb(var(--accent));
  color: #fff;
}

@keyframes live-blink {
  50% { opacity: 0.35; }
}
</style>