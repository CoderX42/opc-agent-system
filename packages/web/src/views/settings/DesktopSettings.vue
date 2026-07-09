<template>
  <div v-if="isDesktop" class="desktop-settings">
    <!-- Card 1: 版本 / 路径 / 后端状态 -->
    <el-card shadow="never" class="settings-card">
      <template #header>
        <div class="section-heading">
          <div>
            <span class="kicker">Runtime</span>
            <h3>应用信息</h3>
          </div>
          <el-tag :type="desktop.backend.running ? 'success' : 'warning'" effect="plain">
            {{ desktop.backendStatusLabel }}
          </el-tag>
        </div>
      </template>
      <div class="kv-grid">
        <div class="kv-row" v-for="row in appInfoRows" :key="row.label">
          <span class="kv-label">{{ row.label }}</span>
          <strong class="kv-value">{{ row.value }}</strong>
        </div>
      </div>
      <div class="form-actions">
        <span>后端数据保存在 {{ desktop.paths?.userData || '本地 userData 目录' }}</span>
        <el-button :loading="restarting" @click="handleRestartBackend">手动重启后端</el-button>
      </div>
    </el-card>

    <!-- Card 2: 开机自启 -->
    <el-card shadow="never" class="settings-card">
      <template #header>
        <div class="section-heading">
          <div>
            <span class="kicker">Auto Launch</span>
            <h3>开机自启</h3>
          </div>
        </div>
      </template>
      <div class="switch-row">
        <div>
          <strong>登录后自动启动 OPC Agent</strong>
          <span>仅在打包后的桌面客户端中生效；开发模式只读。</span>
        </div>
        <el-switch v-model="autoLaunchEnabled" :loading="autoLaunchLoading" @change="handleAutoLaunchChange" />
      </div>
      <div class="switch-row">
        <div>
          <strong>启动时隐藏主窗口</strong>
          <span>仅在后台运行，由系统托盘拉起窗口。</span>
        </div>
        <el-switch v-model="autoLaunchHidden" :loading="autoLaunchLoading" @change="handleAutoLaunchChange" />
      </div>
    </el-card>

    <!-- Card 3: 通知偏好 -->
    <el-card shadow="never" class="settings-card">
      <template #header>
        <div class="section-heading">
          <div>
            <span class="kicker">Notifications</span>
            <h3>系统通知</h3>
          </div>
          <el-button size="small" plain @click="handleTestNotification">发送测试通知</el-button>
        </div>
      </template>
      <div class="switch-row">
        <div>
          <strong>允许显示系统通知</strong>
          <span>关闭后仅依赖应用内消息中心。</span>
        </div>
        <el-switch v-model="notifPrefs.enabled" />
      </div>
      <div class="switch-row">
        <div>
          <strong>静默模式</strong>
          <span>不发出提示音，适合会议或专注时段。</span>
        </div>
        <el-switch v-model="notifPrefs.silent" />
      </div>
      <div class="form-actions">
        <span>通知偏好仅作用于本机系统通知，不影响站内信。</span>
        <el-button type="primary" @click="saveNotifPrefs">保存通知偏好</el-button>
      </div>
    </el-card>

    <!-- Card 4: 剪贴板工具 -->
    <el-card shadow="never" class="settings-card">
      <template #header>
        <div class="section-heading">
          <div>
            <span class="kicker">Clipboard</span>
            <h3>剪贴板</h3>
          </div>
        </div>
      </template>
      <el-input v-model="clipText" type="textarea" :rows="4" placeholder="在此输入后点击下方「写入剪贴板」" />
      <div class="form-actions">
        <span>支持纯文本读写，方便快速粘贴 Agent 摘要。</span>
        <div>
          <el-button @click="readClipboard">读取剪贴板</el-button>
          <el-button type="primary" @click="writeClipboard">写入剪贴板</el-button>
        </div>
      </div>
    </el-card>

    <!-- Card 5: 最近文件 -->
    <el-card shadow="never" class="settings-card">
      <template #header>
        <div class="section-heading">
          <div>
            <span class="kicker">Recent Files</span>
            <h3>最近文件</h3>
          </div>
          <el-button size="small" plain :disabled="!desktop.recentFiles.length" @click="handleClearRecent">清空</el-button>
        </div>
      </template>
      <div v-if="!desktop.recentFiles.length" class="empty-state">
        暂无最近文件。保存或导入文档后会在这里出现。
      </div>
      <ul v-else class="recent-list">
        <li v-for="item in desktop.recentFiles" :key="item.path">
          <div>
            <strong>{{ basename(item.path) }}</strong>
            <span>{{ item.path }}</span>
            <small>{{ formatOpenedAt(item.openedAt) }}</small>
          </div>
          <el-button size="small" plain @click="handleOpenRecent(item.path)">打开</el-button>
        </li>
      </ul>
    </el-card>

    <!-- Card 6: 主题 -->
    <el-card shadow="never" class="settings-card">
      <template #header>
        <div class="section-heading">
          <div>
            <span class="kicker">Theme</span>
            <h3>外观主题</h3>
          </div>
          <el-tag effect="plain">{{ themeLabel }}</el-tag>
        </div>
      </template>
      <el-radio-group v-model="themeMode" @change="(v) => handleThemeChange(v as 'system' | 'light' | 'dark')">
        <el-radio-button label="system">跟随系统</el-radio-button>
        <el-radio-button label="light">浅色</el-radio-button>
        <el-radio-button label="dark">深色</el-radio-button>
      </el-radio-group>
      <div class="theme-status">
        <span>当前 nativeTheme 应使用深色 = </span>
        <strong>{{ desktop.theme.shouldUseDarkColors ? '是' : '否' }}</strong>
        <span class="dim">（来源：{{ desktop.theme.source }}）</span>
      </div>
    </el-card>

    <!-- Card 7: 全局快捷键 -->
    <el-card shadow="never" class="settings-card">
      <template #header>
        <div class="section-heading">
          <div>
            <span class="kicker">Shortcuts</span>
            <h3>全局快捷键</h3>
          </div>
          <el-button size="small" plain @click="refreshShortcuts">刷新</el-button>
        </div>
      </template>
      <div v-if="!desktop.shortcuts.length" class="empty-state">尚未注册全局快捷键。</div>
      <ul v-else class="shortcut-list">
        <li v-for="item in desktop.shortcuts" :key="item.commandId">
          <strong>{{ item.commandId }}</strong>
          <code>{{ item.accelerator }}</code>
          <el-button size="small" link @click="unregisterShortcut(item.commandId)">解绑</el-button>
        </li>
      </ul>
      <div class="shortcut-form">
        <el-input v-model="newShortcut.accelerator" placeholder="例如 CommandOrControl+Shift+K" style="width: 260px;" />
        <el-input v-model="newShortcut.commandId" placeholder="commandId（例 toggle-copilot）" />
        <el-button type="primary" :loading="registering" @click="registerShortcut">注册</el-button>
      </div>
    </el-card>

    <!-- Card 8: 自动更新 -->
    <el-card shadow="never" class="settings-card">
      <template #header>
        <div class="section-heading">
          <div>
            <span class="kicker">Auto Update</span>
            <h3>自动更新</h3>
          </div>
          <el-tag :type="updateTagType" effect="plain">{{ updateTagLabel }}</el-tag>
        </div>
      </template>
      <div class="form-grid">
        <el-form-item label="更新通道">
          <el-select v-model="channel" style="width: 100%;" @change="handleChannelChange">
            <el-option label="latest（稳定版）" value="latest" />
            <el-option label="beta（预发行）" value="beta" />
            <el-option label="alpha（内部）" value="alpha" />
          </el-select>
        </el-form-item>
        <el-form-item label="预发行版">
          <el-switch v-model="allowPrerelease" @change="handlePrereleaseChange" />
        </el-form-item>
        <el-form-item label="下载进度">
          <el-progress v-if="desktop.updateProgress" :percentage="Math.round(desktop.updateProgress.percent || 0)" />
          <span v-else class="dim">—</span>
        </el-form-item>
      </div>
      <div class="form-actions">
        <span>{{ updateHint }}</span>
        <div>
          <el-button :loading="checking" @click="handleCheckUpdate">立即检查</el-button>
          <el-button type="primary" :loading="installing" :disabled="!desktop.updateDownloaded" @click="handleInstallUpdate">立即安装</el-button>
        </div>
      </div>
    </el-card>

    <!-- Card 9: 应用菜单 -->
    <el-card shadow="never" class="settings-card">
      <template #header>
        <div class="section-heading">
          <div>
            <span class="kicker">Application Menu</span>
            <h3>应用菜单</h3>
          </div>
        </div>
      </template>
      <el-alert
        title="应用菜单由 web 端下发模板、主进程构建。"
        type="info"
        :closable="false"
        description="通过 setApplicationMenu({...}) 调用 IPC。当前实现支持 role / label / accelerator / submenu。"
        show-icon
      />
      <div class="form-actions">
        <span>高级用户可以通过编辑菜单模板 JSON 来隐藏或重排一级菜单。</span>
        <el-button plain @click="resetMenu">恢复默认菜单</el-button>
      </div>
    </el-card>
  </div>
  <el-empty v-else description="当前运行在浏览器环境下，桌面端功能不可用。" />
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useDesktopStore } from '@/stores/desktop'

const desktop = useDesktopStore()
const isDesktop = computed(() => desktop.isDesktop)

// ── Card 1: App info ──────────────────────────────────────────────────────
const restarting = ref(false)
async function handleRestartBackend() {
  if (!window.opcDesktop) return
  restarting.value = true
  try {
    const res = await window.opcDesktop.restartBackend()
    if (res.success) {
      ElMessage.success(`后端已重启：${res.apiBaseUrl}`)
    } else {
      ElMessage.error(res.message || '重启失败')
    }
  } finally {
    restarting.value = false
  }
}

const appInfoRows = computed(() => [
  { label: '应用名称', value: desktop.appInfo?.name || '—' },
  { label: '版本号', value: desktop.appInfo?.version || '—' },
  { label: 'Electron', value: desktop.appInfo?.electronVersion || '—' },
  { label: 'Node', value: desktop.appInfo?.nodeVersion || '—' },
  { label: '平台', value: desktop.appInfo?.platform || '—' },
  { label: '架构', value: desktop.appInfo?.arch || '—' },
  { label: '打包', value: desktop.appInfo?.packaged ? '是' : '否（开发）' },
  { label: '后端 PID', value: desktop.backend.pid ? String(desktop.backend.pid) : '—' },
  { label: 'API', value: desktop.backend.apiBaseUrl || '—' },
])

// ── Card 2: Auto launch ───────────────────────────────────────────────────
const autoLaunchLoading = ref(false)
const autoLaunchEnabled = computed({
  get: () => desktop.autoLaunch.enabled,
  set: (v: boolean) => { desktop.autoLaunch.enabled = v },
})
const autoLaunchHidden = computed({
  get: () => desktop.autoLaunch.openAsHidden,
  set: (v: boolean) => { desktop.autoLaunch.openAsHidden = v },
})
async function handleAutoLaunchChange() {
  if (!window.opcDesktop) return
  autoLaunchLoading.value = true
  try {
    const res = await window.opcDesktop.setAutoLaunch(autoLaunchEnabled.value, {
      openAsHidden: autoLaunchHidden.value,
    })
    desktop.setAutoLaunchState({ enabled: res.enabled, openAsHidden: res.openAsHidden, openAtLogin: res.enabled })
    ElMessage.success('开机自启设置已保存')
  } finally {
    autoLaunchLoading.value = false
  }
}

// ── Card 3: Notifications ─────────────────────────────────────────────────
const notifPrefs = reactive({ enabled: true, silent: false })
async function saveNotifPrefs() {
  ElMessage.success('通知偏好已保存')
  try { localStorage.setItem('opc.notif.prefs', JSON.stringify(notifPrefs)) } catch { /* noop */ }
}
async function handleTestNotification() {
  if (!window.opcDesktop) return
  if (!notifPrefs.enabled) {
    ElMessage.warning('通知未启用')
    return
  }
  await window.opcDesktop.showNotification({
    title: 'OPC Agent 测试通知',
    body: '这是一条测试通知。',
    silent: notifPrefs.silent,
  })
}

// ── Card 4: Clipboard ─────────────────────────────────────────────────────
const clipText = ref('')
async function readClipboard() {
  if (!window.opcDesktop) return
  try {
    clipText.value = await window.opcDesktop.readClipboardText()
    ElMessage.success('已读取剪贴板')
  } catch (err: any) {
    ElMessage.error(err?.message || '读取失败')
  }
}
async function writeClipboard() {
  if (!window.opcDesktop) return
  await window.opcDesktop.writeClipboardText(clipText.value)
  ElMessage.success('已写入剪贴板')
}

// ── Card 5: Recent files ──────────────────────────────────────────────────
function basename(p: string) {
  return p.split(/[/\\]/).pop() || p
}
function formatOpenedAt(t: number) {
  if (!t) return ''
  const d = new Date(t)
  return d.toLocaleString()
}
async function handleOpenRecent(path: string) {
  if (!window.opcDesktop) return
  try {
    await window.opcDesktop.openPath(path)
    await window.opcDesktop.addRecentFile(path)
  } catch (err: any) {
    ElMessage.error(err?.message || '打开失败')
  }
}
async function handleClearRecent() {
  if (!window.opcDesktop) return
  await window.opcDesktop.clearRecentFiles()
  desktop.setRecentFiles([])
  ElMessage.success('最近文件已清空')
}

// ── Card 6: Theme ─────────────────────────────────────────────────────────
const themeMode = ref<'system' | 'light' | 'dark'>('system')
const themeLabel = computed(() => {
  if (themeMode.value === 'light') return '浅色'
  if (themeMode.value === 'dark') return '深色'
  return '跟随系统'
})
async function handleThemeChange(mode: 'system' | 'light' | 'dark') {
  if (!window.opcDesktop) return
  await window.opcDesktop.setThemeMode(mode)
}

// ── Card 7: Shortcuts ─────────────────────────────────────────────────────
const newShortcut = reactive({ accelerator: '', commandId: '' })
const registering = ref(false)
async function refreshShortcuts() {
  if (!window.opcDesktop) return
  const list = await window.opcDesktop.listShortcuts()
  desktop.setShortcuts(list as any)
}
async function registerShortcut() {
  if (!window.opcDesktop) return
  if (!newShortcut.accelerator || !newShortcut.commandId) {
    ElMessage.warning('请填写 accelerator 和 commandId')
    return
  }
  registering.value = true
  try {
    const res = await window.opcDesktop.registerShortcut({
      accelerator: newShortcut.accelerator,
      commandId: newShortcut.commandId,
    })
    if (res.ok) {
      ElMessage.success('已注册')
      newShortcut.accelerator = ''
      newShortcut.commandId = ''
      await refreshShortcuts()
    } else {
      ElMessage.error(res.error || '注册失败')
    }
  } finally {
    registering.value = false
  }
}
async function unregisterShortcut(commandId: string) {
  if (!window.opcDesktop) return
  await window.opcDesktop.unregisterShortcut(commandId)
  await refreshShortcuts()
}

// ── Card 8: Auto update ───────────────────────────────────────────────────
const channel = ref<'latest' | 'beta' | 'alpha'>(desktop.updateChannel)
const allowPrerelease = ref<boolean>(desktop.updatePrerelease)
const checking = ref(false)
const installing = ref(false)
const updateTagType = computed<'success' | 'info' | 'warning' | 'danger'>(() => {
  if (desktop.updateError) return 'danger'
  if (desktop.updateDownloaded) return 'success'
  if (desktop.updateAvailable) return 'warning'
  return 'info'
})
const updateTagLabel = computed(() => {
  if (desktop.updateError) return '异常'
  if (desktop.updateDownloaded) return `已就绪 v${desktop.updateDownloaded.version}`
  if (desktop.updateAvailable) return `发现 v${desktop.updateAvailable.version}`
  return '当前为最新'
})
const updateHint = computed(() => {
  if (!desktop.appInfo?.packaged) return '开发模式下不会自动检查更新；打包后才会上报。'
  if (desktop.updateError) return `最近错误：${desktop.updateError}`
  if (desktop.updateDownloaded) return `新版本 ${desktop.updateDownloaded.version} 已下载，重启应用以安装。`
  if (desktop.updateAvailable) return `检测到 ${desktop.updateAvailable.version} 可用。`
  return '点击「立即检查」手动触发一次更新检测。'
})
async function handleChannelChange(c: 'latest' | 'beta' | 'alpha') {
  if (!window.opcDesktop) return
  await window.opcDesktop.setUpdateChannel(c)
  channel.value = c
  desktop.setUpdateChannel(c)
  ElMessage.success('更新通道已切换')
}
async function handlePrereleaseChange(value: boolean | string | number) {
  if (!window.opcDesktop) return
  const enabled = !!value
  const next = await window.opcDesktop.setUpdatePrerelease(enabled)
  allowPrerelease.value = next
  desktop.setUpdatePrerelease(next)
  ElMessage.success(enabled ? '已开启预发行版检查' : '已关闭预发行版检查')
}
async function handleCheckUpdate() {
  if (!window.opcDesktop) return
  checking.value = true
  try {
    const res = await window.opcDesktop.checkForUpdate()
    if (!res.success && res.message) {
      ElMessage.warning(res.message)
    } else {
      ElMessage.success('检查完成')
    }
  } finally {
    checking.value = false
  }
}
async function handleInstallUpdate() {
  if (!window.opcDesktop) return
  installing.value = true
  try {
    await window.opcDesktop.installUpdate()
  } finally {
    installing.value = false
  }
}

// ── Card 9: Application menu (placeholder) ───────────────────────────────
function resetMenu() {
  // 简单示例：触发主进程重建菜单
  if (!window.opcDesktop) return
  void window.opcDesktop.setApplicationMenu([])
  ElMessage.info('已重置菜单；下次启动会自动恢复默认模板')
}

// ── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(async () => {
  if (!window.opcDesktop) return
  try {
    const [info, paths, autoLaunchState, recent, theme, channelValue, shortcuts, prerelease] = await Promise.all([
      window.opcDesktop.getAppInfo(),
      window.opcDesktop.getPaths(),
      window.opcDesktop.getAutoLaunch(),
      window.opcDesktop.getRecentFiles(),
      window.opcDesktop.getTheme(),
      window.opcDesktop.getUpdateChannel(),
      window.opcDesktop.listShortcuts(),
      window.opcDesktop.getUpdatePrerelease(),
    ])
    desktop.setAppInfo(info as any)
    desktop.setPaths(paths as any)
    desktop.setAutoLaunchState(autoLaunchState as any)
    desktop.setRecentFiles(recent as any)
    desktop.setTheme(theme as any)
    desktop.setUpdateChannel(channelValue)
    desktop.setUpdatePrerelease(!!prerelease)
    desktop.setShortcuts(shortcuts as any)
    channel.value = channelValue
    allowPrerelease.value = !!prerelease
    themeMode.value = (theme as any).source === 'manual' ? (desktop.theme.shouldUseDarkColors ? 'dark' : 'light') : 'system'
  } catch (err: any) {
    ElMessage.warning(err?.message || '桌面端元数据加载失败')
  }
  try {
    const saved = localStorage.getItem('opc.notif.prefs')
    if (saved) Object.assign(notifPrefs, JSON.parse(saved))
  } catch { /* noop */ }
})
</script>

<style scoped lang="scss">
.desktop-settings {
  display: grid;
  gap: 18px;
}

.kv-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.kv-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  background: rgb(var(--surface) / 0.7);
  border: 1px solid rgb(var(--line) / 0.55);
  border-radius: 0.75rem;
}
.kv-label {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  color: rgb(var(--muted));
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.kv-value {
  font-family: var(--font-mono);
  font-size: 13px;
  color: rgb(var(--text));
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 12px 14px;
  background: rgb(var(--surface) / 0.65);
  border: 1px solid rgb(var(--line) / 0.55);
  border-radius: 0.75rem;

  strong { display: block; color: rgb(var(--text)); font-size: 14px; }
  span { display: block; font-size: 12px; color: rgb(var(--muted)); line-height: 1.6; }
}

.empty-state {
  padding: 18px;
  font-size: 12px;
  color: rgb(var(--muted));
  text-align: center;
  background: rgb(var(--surface) / 0.4);
  border: 1px dashed rgb(var(--line) / 0.55);
  border-radius: 0.75rem;
}

.recent-list,
.shortcut-list {
  display: grid;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;

  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
    background: rgb(var(--surface) / 0.7);
    border: 1px solid rgb(var(--line) / 0.55);
    border-radius: 0.75rem;

    > div { display: grid; gap: 2px; min-width: 0; }
    strong { font-size: 13px; color: rgb(var(--text)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    span { font-family: var(--font-mono); font-size: 11px; color: rgb(var(--muted)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    small { font-family: var(--font-mono); font-size: 10px; color: rgb(var(--muted)); }
  }
}

.shortcut-list li code {
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 2px 6px;
  background: rgb(var(--accent) / 0.12);
  color: rgb(var(--accent-strong));
  border-radius: 4px;
}

.shortcut-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.theme-status {
  margin-top: 12px;
  padding: 10px 14px;
  font-size: 12px;
  color: rgb(var(--text));
  background: rgb(var(--surface) / 0.55);
  border: 1px solid rgb(var(--line) / 0.55);
  border-radius: 0.625rem;

  .dim { color: rgb(var(--muted)); margin-left: 6px; }
}

.form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 14px;

  span { font-size: 12px; color: rgb(var(--muted)); max-width: 60%; line-height: 1.6; }
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 8px;
}
</style>