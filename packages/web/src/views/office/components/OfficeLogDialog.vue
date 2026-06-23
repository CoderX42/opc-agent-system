<template>
  <el-dialog :model-value="modelValue" width="720px" class="office-dialog" destroy-on-close @update:model-value="$emit('update:modelValue', $event)">
    <template #header>
      <div class="dialog-heading">
        <span class="kicker">RUN LOGS · FULL STREAM</span>
        <h2>
          <em>{{ agent?.name }}</em> 完整运行日志
        </h2>
        <small>{{ agent?.logs.length || 0 }} 条记录 · 按时间倒序</small>
      </div>
    </template>

    <div v-if="agent?.logs.length" class="full-log-list">
      <div v-for="log in agent.logs" :key="log.id" class="full-log-row" :class="`log-${log.type}`">
        <time>{{ log.time }}</time>
        <el-tag size="small" effect="plain">{{ OFFICE_LOG_TYPE_LABEL[log.type] }}</el-tag>
        <p>{{ log.content }}</p>
      </div>
    </div>
    <el-empty v-else description="暂无运行日志" />
  </el-dialog>
</template>

<script setup lang="ts">
import { OFFICE_LOG_TYPE_LABEL } from '../constants/statusMeta'
import type { OfficeAgent } from '@/types/office'

defineProps<{
  modelValue: boolean
  agent: OfficeAgent | undefined
}>()

defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>
