<template>
  <div class="stats-card" :style="{ '--stat-color': color }">
    <span class="card-bar"></span>
    <div class="stats-card-header">
      <span class="stats-label">{{ label }}</span>
      <div class="stats-icon">
        <el-icon :size="18"><component :is="icon" /></el-icon>
      </div>
    </div>
    <div class="stats-value">{{ value }}</div>
    <div class="stats-trend" v-if="trend !== undefined">
      <span class="trend-chip" :class="trend >= 0 ? 'is-up' : 'is-down'">
        <el-icon :size="11">
          <Top v-if="trend >= 0" />
          <Bottom v-else />
        </el-icon>
        {{ trend >= 0 ? '+' : '' }}{{ trend }}%
      </span>
      <span class="trend-label">较上月</span>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  value: string | number
  trend?: number
  icon?: string
  color?: string
}>(), {
  trend: undefined,
  icon: 'DataLine',
  color: '#4B8FCB',
})
</script>

<style lang="scss" scoped>
.stats-card {
  position: relative;
  overflow: hidden;
  background: $cream;
  border: 2px solid $forest;
  padding: 14px 16px 12px;
  box-shadow: 4px 4px 0 rgba(31, 42, 36, 0.12);
  transition: transform 160ms $transition-timing, box-shadow 160ms ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 6px 8px 0 rgba(31, 42, 36, 0.16);
  }

  &:hover .card-bar {
    transform: scaleX(1);
  }
}

.card-bar {
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--stat-color);
  transform-origin: left;
  transform: scaleX(0.2);
  transition: transform 280ms $transition-timing;
}

.stats-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.stats-label {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: $brass-deep;
}

.stats-icon {
  width: 32px;
  height: 32px;
  color: $forest;
  background: color-mix(in srgb, var(--stat-color) 12%, $cream-warm);
  border: 1.5px solid $forest;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stats-value {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 500;
  font-style: italic;
  font-variation-settings: 'opsz' 96;
  line-height: 1;
  color: $forest;
  margin-bottom: 8px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.stats-trend {
  display: flex;
  align-items: center;
  gap: 8px;
}

.trend-chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px 6px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  border: 1px solid currentColor;

  &.is-up { color: $success-color; background: color-mix(in srgb, $success-color 8%, $cream); }
  &.is-down { color: $danger-color; background: color-mix(in srgb, $danger-color 8%, $cream); }
}

.trend-label {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  color: $text-secondary;
  letter-spacing: 0.08em;
}
</style>
