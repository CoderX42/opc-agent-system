'use strict';

const { Menu } = require('electron');
const log = require('./log');

/**
 * 把渲染层下发的菜单模板转换为 Electron MenuItemConstructorOptions。
 * - 自动把 id / label 转化为可读 title 以便 fallback 显示；
 * - 顶层 type: 'separator' 用 Electron 原生分隔符；
 * - click 时调用 invokeCommand(id) → IPC 到渲染层。
 */
function buildMenuTemplate(template, invokeCommand, parentLabel) {
  if (!Array.isArray(template)) return [];
  return template
    .filter((item) => item && item.visible !== false)
    .map((item) => normalizeItem(item, invokeCommand, parentLabel));
}

function normalizeItem(item, invokeCommand, parentLabel) {
  const out = {};
  if (item.type === 'separator') {
    return { type: 'separator' };
  }
  if (item.role) out.role = item.role;
  if (item.label) out.label = item.label;
  if (item.accelerator) out.accelerator = item.accelerator;
  if (typeof item.enabled === 'boolean') out.enabled = item.enabled;
  if (item.checked !== undefined) out.checked = item.checked;
  if (item.type && item.type !== 'separator') out.type = item.type;

  if (Array.isArray(item.submenu)) {
    const submenuLabel = item.label || parentLabel || 'submenu';
    out.submenu = buildMenuTemplate(item.submenu, invokeCommand, submenuLabel);
  }

  if (item.id) {
    const id = item.id;
    const accelerator = item.accelerator || '';
    const label = item.label || '';
    out.click = () => {
      try {
        invokeCommand({ id, accelerator, label });
      } catch (err) {
        log.error('menu', 'click handler error:', err && err.stack ? err.stack : err);
      }
    };
  } else if (out.role === undefined && !Array.isArray(out.submenu)) {
    // 既没有 role 也没有 id 也没有 submenu；保留为占位，避免 Menu 抛错
    out.enabled = false;
  }
  return out;
}

/**
 * 构建 Electron Menu 并通过 webContents 派发点击事件。
 * @param {object} webContents BrowserWindow 的 webContents
 * @param {Array} template 渲染层下发的菜单模板
 */
function installApplicationMenu(webContents, template) {
  if (!webContents || webContents.isDestroyed()) return null;
  const menuTemplate = buildMenuTemplate(template || [], (info) => {
    webContents.send('menu:invoke', info);
  });
  try {
    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
    return menu;
  } catch (err) {
    log.error('menu', 'buildFromTemplate failed:', err && err.message ? err.message : err);
    return null;
  }
}

function clearApplicationMenu() {
  try {
    Menu.setApplicationMenu(null);
  } catch (err) {
    log.warn('menu', 'clear menu failed:', err && err.message ? err.message : err);
  }
}

module.exports = {
  buildMenuTemplate,
  installApplicationMenu,
  clearApplicationMenu,
};
