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
  background: #fff;
  border: 1px solid $border-color;
  padding: 16px 18px 14px;
  border-radius: $border-radius-lg;
  box-shadow: $shadow-md;
  transition: transform 160ms $transition-timing, box-shadow 160ms ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: $shadow-lg;
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
  height: 3px;
  background: var(--stat-color);
  transform-origin: left;
  transform: scaleX(0.2);
  transition: transform 280ms $transition-timing;
}

.stats-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.stats-label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: $text-secondary;
}

.stats-icon {
  width: 32px;
  height: 32px;
  color: #fff;
  background: var(--stat-color);
  border-radius: $border-radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stats-value {
  font-family: var(--font-body);
  font-size: 26px;
  font-weight: 700;
  line-height: 1;
  color: $text-primary;
  margin-bottom: 6px;
  font-variant-numeric: tabular-nums;
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
  padding: 2px 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  border-radius: 999px;
  border: 1px solid currentColor;

  &.is-up { color: $success-color; background: rgba(0,168,132,0.08); }
  &.is-down { color: $danger-color; background: rgba(220,38,38,0.08); }
}

.trend-label {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  color: $text-secondary;
  letter-spacing: 0.06em;
}
</style>
