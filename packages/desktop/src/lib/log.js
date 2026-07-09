'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');

const LOG_PREFIX = '[desktop]';
const ALLOWED_CATEGORIES = new Set(['boot', 'ipc', 'updater', 'backend', 'menu', 'shortcut', 'window', 'ui', 'security']);
const ENV_LOG_LEVEL = (process.env.OPC_DESKTOP_LOG_LEVEL || 'info').toLowerCase();
const LOG_LEVEL_RANK = { debug: 10, info: 20, warn: 30, error: 40 };

let currentLogLevel = LOG_LEVEL_RANK[ENV_LOG_LEVEL] || LOG_LEVEL_RANK.info;

/**
 * 设置当前日志级别。runtime 暴露给 preload 使用，方便 settings 中手动调。
 * @param {'debug'|'info'|'warn'|'error'} level
 */
function setLogLevel(level) {
  const next = LOG_LEVEL_RANK[String(level || '').toLowerCase()];
  if (next) currentLogLevel = next;
}

function getLogLevel() {
  for (const [name, rank] of Object.entries(LOG_LEVEL_RANK)) {
    if (rank === currentLogLevel) return name;
  }
  return 'info';
}

function ensureLogDir() {
  try {
    const dir = path.join(app.getPath('logs'));
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  } catch (_err) {
    return null;
  }
}

function formatMessage(category, level, args) {
  const ts = new Date().toISOString();
  const safeCategory = ALLOWED_CATEGORIES.has(category) ? category : 'misc';
  const safeLevel = String(level).toUpperCase();
  const payload = args
    .map((a) => {
      if (a instanceof Error) return a.stack || a.message;
      if (typeof a === 'object') {
        try {
          return JSON.stringify(a);
        } catch (_err) {
          return String(a);
        }
      }
      return String(a);
    })
    .join(' ');
  return `${ts} [${LOG_PREFIX}][${safeCategory}][${safeLevel}] ${payload}`;
}

function maybeWriteFile(formatted) {
  const dir = ensureLogDir();
  if (!dir) return;
  const date = new Date().toISOString().slice(0, 10);
  const file = path.join(dir, `desktop-${date}.log`);
  try {
    fs.appendFileSync(file, formatted + '\n', 'utf-8');
  } catch (_err) {
    // 文件 IO 失败时不再重试，避免额外阻塞主循环
  }
}

function logInternal(category, level, args) {
  const rank = LOG_LEVEL_RANK[level] || LOG_LEVEL_RANK.info;
  if (rank < currentLogLevel) return;
  const formatted = formatMessage(category, level, args);
  // 控制台：根据 level 选择流
  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
  stream.write(formatted + '\n');
  maybeWriteFile(formatted);
}

/**
 * 通用分类日志入口。
 * @param {'boot'|'ipc'|'updater'|'backend'|'menu'|'shortcut'|'window'|'ui'|'security'|'misc'} category
 * @param  {...any} args
 */
function logEvent(category, ...args) {
  logInternal(category, 'info', args);
}

module.exports = {
  LOG_PREFIX,
  setLogLevel,
  getLogLevel,
  logEvent,
  debug: (category, ...args) => logInternal(category, 'debug', args),
  info: (category, ...args) => logInternal(category, 'info', args),
  warn: (category, ...args) => logInternal(category, 'warn', args),
  error: (category, ...args) => logInternal(category, 'error', args),
};
