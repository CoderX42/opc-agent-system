# OPC Agent Desktop

Electron shell for the OPC Agent System desktop app (macOS / Windows / Linux).

## Capabilities at a glance

| Group | IPC | Renderer API (`window.opcDesktop`) |
| --- | --- | --- |
| App info | `app:get-info`, `app:get-paths`, `app:get-version`, `app:get-platform` | `getAppInfo`, `getPaths`, `getVersion`, `getPlatform` |
| Dialogs | `dialog:open-file`, `dialog:open-multi-file`, `dialog:save-file`, `dialog:show-message` | `openFileDialog`, `openMultiFileDialog`, `saveFileDialog`, `showMessageBox` |
| Shell | `shell:open-external`, `shell:show-item-in-folder`, `shell:open-path` | `openExternal`, `showItemInFolder`, `openPath` |
| Window | `window:minimize/maximize/unmaximize/close/get-state/...` | `minimizeWindow`, `maximizeWindow`, `closeWindow`, `getWindowState` |
| Notifications | `notify:show` (`notify:click` / `notify:close` events) | `showNotification` |
| Clipboard | `clipboard:read-text/write-text/read-image/write-image` | `readClipboardText`, `writeClipboardText`, `readClipboardImage`, `writeClipboardImage` |
| Theme | `theme:get`, `theme:set-mode`, `theme:changed` | `getTheme`, `setThemeMode`, `onThemeChanged` |
| Auto-launch | `auto-launch:get`, `auto-launch:set` | `getAutoLaunch`, `setAutoLaunch` |
| Shortcut | `shortcut:register/unregister/list`, `shortcut:invoke` | `registerShortcut`, `unregisterShortcut`, `listShortcuts`, `onShortcutCommand` |
| Recent files | `recent:add/list/clear` | `addRecentFile`, `getRecentFiles`, `clearRecentFiles` |
| Progress / Badge | `progress:set`, `badge:set` | `setTaskbarProgress`, `setBadgeCount` |
| Menu | `menu:set`, `menu:invoke`, `menu:rebuild` | `setApplicationMenu`, `onMenuCommand`, `onMenuRebuild` |
| Backend | `backend:get-url/get-status/restart`, `backend:crashed` | `getBackendUrl`, `getBackendStatus`, `restartBackend`, `onBackendCrashed` |
| Update | `update:check/install/channel-set/channel-get`, `update:*` events | `checkForUpdate`, `installUpdate`, `setUpdateChannel`, `getUpdateChannel`, `onUpdateAvailable`, `onUpdateDownloaded`, ... |
| Quit negotiation | `app:before-quit`, `app:confirm-quit`, `app:cancel-quit` | `onBeforeQuit`, `confirmQuit`, `cancelQuit` |
| Deep link | `app:deep-link`, `app:initial-deep-link-get` | `getInitialDeepLink`, `onDeepLink` |

## Runtime model

The desktop bundle embeds both the web build (`packages/web/dist/`) and the NestJS server build (`packages/server/dist/`) under `process.resourcesPath/{web,server}/`.

1. **Process model.** Main process (`src/main.cjs`) starts a child Node process via `ELECTRON_RUN_AS_NODE=1` running the compiled NestJS server on a random free localhost port.
2. **Database.** When `OPC_DESKTOP=true` the server switches its TypeORM datasource to `better-sqlite3`, writing to `app.getPath('userData')/opc-agent.db`. PostgreSQL remains the default for the web-only deployment.
3. **User data layout** (under `app.getPath('userData')`):
   - `opc-agent.db` – SQLite database
   - `window-state.json` – last window bounds / maximized state
   - `recent-files.json` – recent file list cache
   - `update-channel.json` – persisted update channel (latest/beta/alpha)
   - `logs/desktop-YYYY-MM-DD.log` – rotating structured logs
4. **Security.** `contextIsolation: true`, `nodeIntegration: false`, sandboxed navigation via `lib/security.js`. `setWindowOpenHandler` and `will-navigate` enforce an internal host whitelist (default: `localhost`, `127.0.0.1`).
5. **Deep link.** Registers `opc-agent://` scheme across macOS (`open-url`), Windows / Linux (`second-instance` argv) and supports a one-time `getInitialDeepLink()` query for the cold-start case.
6. **Auto update.** `electron-updater` against the `publish[0].url`. Channel preference (latest/beta/alpha) is persisted in user data and restored on next launch.
7. **IPC envelope.** Every `ipcMain.handle` either returns a serializable payload or throws an `Error`. The web-side `api/request.ts` translates errors tagged with `code === 'DESKTOP_BACKEND_DOWN'` into retryable toast messages.

## Development

Build the server first, then start Electron:

```bash
pnpm --filter @opc-agent/server build
pnpm --filter @opc-agent/web build
pnpm --filter @opc-agent/desktop dev
```

Or use the Vite dev server for hot reload of the renderer:

```bash
pnpm --filter @opc-agent/web dev
OPC_DESKTOP_WEB_URL=http://localhost:5173 pnpm --filter @opc-agent/desktop dev
```

The `dev:web` script in `package.json` bakes in the env var.

## Packaging

```bash
pnpm --filter @opc-agent/desktop dist
# platform-specific
pnpm --filter @opc-agent/desktop dist:mac
pnpm --filter @opc-agent/desktop dist:win
pnpm --filter @opc-agent/desktop dist:linux
```

Outputs land in `release/` (`../../release` relative to this package).

| Platform | Targets | Notes |
| --- | --- | --- |
| macOS | `dmg`, `zip` (x64 + arm64) | Hardened runtime, minimal `build/entitlements.mac.plist`. Code-signing & notarization hooks through `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`. |
| Windows | `nsis`, `zip` (x64) | NSIS installer allows per-user install, change install directory. |
| Linux | `AppImage`, `deb` (x64) | Icon: `build/icon.png` (replace before publishing). |

### Code signing & notarization

The build configuration expects the following environment variables in CI:

| Variable | Purpose |
| --- | --- |
| `CSC_LINK` / `CSC_KEY_PASSWORD` | Apple Developer ID signing certificate |
| `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID` | Notarization |
| `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` | Windows code signing (Authenticode) |

When the variables are absent the build still completes but skips signing. CI must provide them.

### Native modules

`better-sqlite3` is declared in `asarUnpack` so the native binding remains on disk under `app.asar.unpacked/node_modules/better-sqlite3/`.

## Architecture

```
src/
  main.cjs          # Main process: IPC, lifecycle, deep link, tray, auto-update
  preload.cjs       # contextBridge exposure (window.opcDesktop)
  lib/
    log.js          # Structured logs (stdout + userData/logs/desktop-*.log)
    menu.js         # Application menu builder driven by the renderer
    backend.js      # NestJS child-process lifecycle (auto-restart, status)
    security.js     # setWindowOpenHandler + will-navigate + will-redirect guards
    shortcuts.js    # globalShortcut manager with conflict resolution
    recent.js       # Recent documents (cross-platform: app.addRecentDocument + JSON cache)
build/
  entitlements.mac.plist
  entitlements.mac.inherit.plist

## IPC channel reference

For the canonical mapping between Electron main-process channels and the renderer-side
`window.opcDesktop.*` methods, see [`src/main.cjs`](./src/main.cjs) and
[`src/preload.cjs`](./src/preload.cjs). The renderer-side TypeScript surface is declared
in [`packages/web/src/env.d.ts`](../web/src/env.d.ts).

## Desktop settings tab

The `settings/index.vue` page in the web app exposes a "桌面端" tab (`DesktopSettings.vue`)
that wires the renderer API into nine operational cards:

| # | Card | Renderer methods used |
| --- | --- | --- |
| 1 | 应用信息 | `getAppInfo`, `getPaths`, `getBackendStatus` |
| 2 | 开机自启 | `getAutoLaunch`, `setAutoLaunch` |
| 3 | 通知 | `showNotification`, `requestNotificationPermission` |
| 4 | 剪贴板 | `readClipboardText/Image`, `writeClipboardText/Image` |
| 5 | 最近文件 | `getRecentFiles`, `addRecentFile`, `clearRecentFiles`, `openPath` |
| 6 | 主题 | `getTheme`, `setThemeMode`, `onThemeChanged` |
| 7 | 全局快捷键 | `registerShortcut`, `unregisterShortcut`, `listShortcuts`, `onShortcutCommand` |
| 8 | 自动更新 | `getUpdateChannel`, `setUpdateChannel`, `getUpdatePrerelease`, `setUpdatePrerelease`, `checkForUpdate`, `installUpdate` |
| 9 | 应用菜单 | `setApplicationMenu`, `onMenuCommand`, `onMenuRebuild` |

The tab itself is only mounted when `window.opcDesktop` is present, so the web build
remains clean of desktop-only controls.
