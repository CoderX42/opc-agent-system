'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');
const log = require('./log');

const RECENT_FILE_NAME = 'recent-files.json';
const MAX_RECENT_FILES = 15;

/**
 * 最近文件缓存：
 * - macOS / Windows 上同步 app.addRecentDocument 给系统；
 * - 额外把文件列表写入 userData/recent-files.json，给渲染层展示；
 * - Linux 退化：仅做 JSON 缓存。
 */
function createRecentFilesManager() {
  const configPath = () => path.join(app.getPath('userData'), RECENT_FILE_NAME);

  function readAll() {
    try {
      const file = configPath();
      if (!fs.existsSync(file)) return [];
      const raw = fs.readFileSync(file, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((entry) => entry && typeof entry.path === 'string');
    } catch (err) {
      log.warn('recent', 'read recent files failed:', err && err.message ? err.message : err);
      return [];
    }
  }

  function writeAll(list) {
    try {
      fs.mkdirSync(path.dirname(configPath()), { recursive: true });
      fs.writeFileSync(configPath(), JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      log.warn('recent', 'write recent files failed:', err && err.message ? err.message : err);
    }
  }

  function add(filePath) {
    if (!filePath || typeof filePath !== 'string') return;
    const normalised = path.resolve(filePath);
    if (!fs.existsSync(normalised)) return;

    let size = 0;
    try {
      size = fs.statSync(normalised).size;
    } catch (_err) {
      // ignore
    }

    // 通知操作系统（不影响数据持久化）
    try {
      app.addRecentDocument(normalised);
    } catch (_err) {
      // Linux 上可能不支持；忽略
    }

    const next = [
      { path: normalised, openedAt: Date.now(), size },
      ...readAll().filter((item) => item.path !== normalised),
    ].slice(0, MAX_RECENT_FILES);

    writeAll(next);
  }

  function list() {
    return readAll();
  }

  function clear() {
    try {
      app.clearRecentDocuments();
    } catch (_err) {
      // Linux 上可能不支持；忽略
    }
    writeAll([]);
  }

  return { add, list, clear };
}

module.exports = {
  createRecentFilesManager,
  MAX_RECENT_FILES,
};
