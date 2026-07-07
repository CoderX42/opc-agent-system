<template>
  <div class="hud-frame" aria-label="办公区 HUD 框架">
    <aside class="hud-rail hud-rail--left">
      <button type="button" class="hud-chip" @click="$emit('filter-status', 'running')">
        <span class="hud-icon">▲</span>
        <span class="hud-label">运行中</span>
        <strong class="hud-value">{{ stats.running }}</strong>
      </button>

      <button type="button" class="hud-chip" @click="$emit('filter-status', 'waiting')">
        <span class="hud-icon">◆</span>
        <span class="hud-label">待确认</span>
        <strong class="hud-value">{{ stats.waiting }}</strong>
      </button>

      <div class="hud-chip hud-static">
        <span class="hud-icon">⏱</span>
        <span class="hud-label">节省工时</span>
        <strong class="hud-value hud-value--sm">{{ stats.savedHours }}</strong>
      </div>
    </aside>

    <div class="hud-frame__map" :class="{ 'is-dimmed': dimmed }">
      <slot />
    </div>

    <aside class="hud-rail hud-rail--right">
      <button
        type="button"
        class="hud-chip"
        :class="{ 'is-alert': stats.errors > 0 }"
        @click="$emit('focus-issue')"
      >
        <span class="hud-icon">⚠</span>
        <span class="hud-label">异常</span>
        <strong class="hud-value">{{ stats.errors }}</strong>
      </button>

      <div class="hud-chip hud-static">
        <span class="hud-icon">¥</span>
        <span class="hud-label">本月节省</span>
        <strong class="hud-value hud-value--sm">{{ stats.savedCost }}</strong>
      </div>

      <div class="hud-chip hud-static hud-chip--note">
        <span class="hud-label">今日完成</span>
        <strong class="hud-value">{{ stats.completedToday }}</strong>
        <span class="hud-note">自动化任务</span>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import type { OfficeStats } from '@/types/office'

defineProps<{
  stats: OfficeStats
  dimmed?: boolean
}>()

defineEmits<{
  'filter-status': [status: 'running' | 'waiting']
  'focus-issue': []
}>()
</script>

<style lang="scss" scoped>
.hud-frame {
  display: grid;
  grid-template-columns: minmax(108px, 132px) minmax(0, 1fr) minmax(108px, 132px);
  gap: 12px;
  align-items: stretch;
  width: min(1180px, 100%);
  margin: 0 auto;
  padding: 14px 16px 10px;
}

.hud-rail {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
  min-height: 100%;
}

.hud-rail--left {
  align-items: stretch;
}

.hud-rail--right {
  align-items: stretch;
}

.hud-frame__map {
  position: relative;
  min-height: 360px;
  max-height: min(52vh, 460px);
  border: 1px solid rgb(var(--line) / 0.5);
  background: #e8d9c2;
  box-shadow:
    5px 7px 0 #5b3f1f,
    inset 0 0 24px rgba(31, 42, 36, 0.06);
  overflow: hidden;
  transition: filter 280ms ease;
}

.hud-frame__map.is-dimmed {
  filter: brightness(0.88);
}

.hud-frame__map :deep(.map-viewport) {
  height: 100%;
  border: 0;
  box-shadow: none;
  background: transparent;
}

.hud-chip {
  display: grid;
  gap: 3px;
  width: 100%;
  padding: 10px 10px 9px;
  border: 2px solid rgba(91, 63, 31, 0.45);
  background: var(--hud-bg, rgba(31, 42, 36, 0.82));
  color: #f4ebda;
  text-align: left;
  cursor: pointer;
  box-shadow: 3px 4px 0 rgba(91, 63, 31, 0.35);
  transition: transform 160ms ease, border-color 160ms ease;
}

.hud-chip:hover {
  transform: translateY(-2px);
  border-color: #b7996e;
}

.hud-static {
  cursor: default;
}

.hud-static:hover {
  transform: none;
}

.hud-chip.is-alert {
  animation: hud-alert 1.2s ease-in-out infinite;
  border-color: rgba(200, 90, 74, 0.85);
}

.hud-chip--note {
  margin-top: auto;
}

.hud-icon {
  font-size: 10px;
  opacity: 0.8;
}

.hud-label {
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(244, 235, 218, 0.62);
}

.hud-value {
  font-family: var(--font-display, 'Fraunces', serif);
  font-size: 24px;
  font-style: italic;
  font-weight: 600;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.hud-value--sm {
  font-size: 15px;
}

.hud-note {
  font-family: var(--font-mono, monospace);
  font-size: 8px;
  letter-spacing: 0.06em;
  color: rgba(244, 235, 218, 0.5);
}

@keyframes hud-alert {
  0%, 100% { box-shadow: 3px 4px 0 rgba(91, 63, 31, 0.35), 0 0 0 0 rgba(200, 90, 74, 0); }
  50% { box-shadow: 3px 4px 0 rgba(91, 63, 31, 0.35), 0 0 14px rgba(200, 90, 74, 0.55); }
}

@media (max-width: 900px) {
  .hud-frame {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
    gap: 10px;
    padding: 12px;
  }

  .hud-rail {
    flex-direction: row;
    flex-wrap: wrap;
    min-height: 0;
  }

  .hud-rail--left,
  .hud-rail--right {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .hud-chip--note {
    margin-top: 0;
  }

  .hud-frame__map {
    order: 2;
    min-height: 320px;
    max-height: none;
  }

  .hud-rail--left { order: 1; }
  .hud-rail--right { order: 3; }

  .hud-chip {
    flex: 1 1 140px;
  }
}
</style>