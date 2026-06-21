<template>
  <div class="agent-card" :style="{ borderColor: color }">
    <div class="agent-card-icon" :style="{ backgroundColor: color + '15', color: color }">
      <el-icon :size="24"><component :is="icon" /></el-icon>
    </div>
    <div class="agent-card-body">
      <h3 class="agent-card-name">{{ name }}</h3>
      <p class="agent-card-desc">{{ description }}</p>
      <div class="agent-card-footer">
        <el-tag :type="statusType" size="small">{{ statusText }}</el-tag>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  name: string
  description: string
  icon: string
  color?: string
  status?: 'active' | 'inactive' | 'error'
}>(), {
  color: '#155e52',
  status: 'active',
})

const statusType = computed(() => ({ active: 'success', inactive: 'info', error: 'danger' } as const)[props.status])
const statusText = computed(() => ({ active: '运行中', inactive: '已停止', error: '异常' } as const)[props.status])
</script>

<style lang="scss" scoped>
.agent-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  border: 1px solid $border-lighter;
  border-radius: $border-radius-md;
  cursor: pointer;
  transition: all $transition-duration;

  &:hover {
    box-shadow: $shadow-md;
    transform: translateY(-2px);
  }
}

.agent-card-icon {
  width: 48px;
  height: 48px;
  border-radius: $border-radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.agent-card-body {
  flex: 1;
  min-width: 0;
}

.agent-card-name {
  font-size: 15px;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 4px;
}

.agent-card-desc {
  font-size: 12px;
  color: $text-secondary;
  margin-bottom: 8px;
  @include text-ellipsis(2);
}

.agent-card-footer {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
