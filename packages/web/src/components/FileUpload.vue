<template>
  <div class="file-upload">
    <el-upload
      :action="uploadUrl"
      :headers="uploadHeaders"
      :multiple="multiple"
      :accept="accept"
      :limit="limit"
      :file-list="fileList"
      :on-success="handleSuccess"
      :on-error="handleError"
      :on-remove="handleRemove"
      :on-exceed="handleExceed"
      :before-upload="beforeUpload"
      :drag="drag"
    >
      <div v-if="drag" class="upload-dragger-content">
        <el-icon :size="40" color="#c0c4cc"><UploadFilled /></el-icon>
        <p class="upload-text">将文件拖到此处，或<em>点击上传</em></p>
        <p class="upload-tip" v-if="tip">{{ tip }}</p>
      </div>
      <el-button v-else type="primary" icon="Upload">选择文件</el-button>
      <template #tip>
        <div v-if="tip && !drag" class="el-upload__tip">{{ tip }}</div>
      </template>
    </el-upload>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadFile, UploadRawFile } from 'element-plus'
import { getToken } from '@/utils'

const props = withDefaults(defineProps<{
  action?: string
  multiple?: boolean
  accept?: string
  limit?: number
  maxSize?: number // MB
  tip?: string
  drag?: boolean
}>(), {
  action: '/api/upload',
  multiple: false,
  accept: '',
  limit: 5,
  maxSize: 10,
  tip: '支持 jpg、png、pdf 格式，单文件不超过 10MB',
  drag: true,
})

const emit = defineEmits<{
  success: [response: unknown, file: UploadFile]
  error: [error: Error]
  remove: [file: UploadFile]
}>()

const fileList = ref<UploadFile[]>([])

const uploadUrl = computed(() => {
  if (/^https?:\/\//.test(props.action)) return props.action
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
  const normalizedAction = props.action.replace(/^\/api/, '')
  return `${baseUrl.replace(/\/$/, '')}${normalizedAction}`
})

const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${getToken() || ''}`,
}))

function beforeUpload(file: UploadRawFile) {
  const sizeMB = file.size / 1024 / 1024
  if (sizeMB > props.maxSize) {
    ElMessage.error(`文件大小不能超过 ${props.maxSize}MB`)
    return false
  }
  return true
}

function handleSuccess(response: unknown, file: UploadFile) {
  ElMessage.success('文件上传成功')
  emit('success', response, file)
}

function handleError(error: Error) {
  ElMessage.error('文件上传失败')
  emit('error', error)
}

function handleRemove(file: UploadFile) {
  emit('remove', file)
}

function handleExceed() {
  ElMessage.warning(`最多上传 ${props.limit} 个文件`)
}
</script>

<style lang="scss" scoped>
.upload-dragger-content {
  text-align: center;
  padding: 20px 0;
}

.upload-text {
  font-size: 14px;
  color: $text-regular;
  margin-top: 8px;

  em {
    color: $primary-color;
    font-style: normal;
  }
}

.upload-tip {
  font-size: 12px;
  color: $text-placeholder;
  margin-top: 4px;
}
</style>
