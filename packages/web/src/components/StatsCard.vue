<template>
  <div class="stats-card" :style="{ '--stat-color': color }">
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
  color: '#409eff',
})
</script>

<style lang="scss" scoped>
.stats-card {
  position: relative;
  overflow: hidden;
  background: $bg-white;
  border: 1px solid $border-light;
  border-radius: 18px;
  padding: 18px 19px;
  box-shadow: $shadow-sm;
  transition: box-shadow $transition-duration, transform $transition-duration;

  &::after {
    position: absolute;
    right: -18px;
    bottom: -24px;
    width: 72px;
    height: 72px;
    content: '';
    background: color-mix(in srgb, var(--stat-color) 8%, transparent);
    border-radius: 50%;
  }

  &:hover {
    box-shadow: $shadow-md;
    transform: translateY(-2px);
  }
}

.stats-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.stats-label {
  font-size: 11px;
  font-weight: 650;
  color: $text-secondary;
}

.stats-icon {
  width: 34px;
  height: 34px;
  color: var(--stat-color);
  background: color-mix(in srgb, var(--stat-color) 9%, white);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stats-value {
  font-size: 25px;
  font-weight: 750;
  color: $text-primary;
  margin-bottom: 10px;
  letter-spacing: -0.045em;
}

.stats-trend {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 9px;
}

.trend-chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px 6px;
  border-radius: 999px;
  font-weight: 700;

  &.is-up { color: #267a56; background: #e9f4ed; }
  &.is-down { color: #c24f49; background: #fae9e8; }
}

.trend-label {
  color: $text-placeholder;
}
</style>
