<template>
  <el-dialog :model-value="modelValue" width="540px" class="office-dialog" destroy-on-close @update:model-value="handleVisibleChange">
    <template #header>
      <div class="dialog-heading">
        <span class="kicker">APPEND COMMAND</span>
        <h2>
          向 <em>{{ agent?.name }}</em> 追加指令
        </h2>
        <small>指令会立即写入前端日志，并提交到 Agent Control Room 后端</small>
      </div>
    </template>

    <div class="command-form">
      <el-input
        v-model="commandText"
        type="textarea"
        :rows="5"
        maxlength="300"
        show-word-limit
        placeholder="例如：优先核对大额支出，并输出异常清单"
        @keyup.ctrl.enter="handleSubmit"
      />
      <div class="command-presets">
        <span class="presets-label">快捷指令</span>
        <button v-for="preset in commandPresets" :key="preset" type="button" @click="commandText = preset">
          {{ preset }}
        </button>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleVisibleChange(false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        提交指令 ↵
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { OfficeAgent } from '@/types/office'

const props = defineProps<{
  modelValue: boolean
  agent: OfficeAgent | undefined
  submitting: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [command: string]
}>()

const commandText = ref('')
const commandPresets = ['生成当前任务摘要', '标记风险并等待人工确认', '优先处理高优先级事项']

watch(() => props.modelValue, (visible) => {
  if (!visible) commandText.value = ''
})

function handleVisibleChange(value: boolean) {
  emit('update:modelValue', value)
}

function handleSubmit() {
  emit('submit', commandText.value)
}
</script>
