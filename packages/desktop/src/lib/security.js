'use strict';

const { shell } = require('electron');
const log = require('./log');

const DEFAULT_ALLOWED_PROTOCOLS = new Set(['opc-agent:', 'http:', 'https:', 'file:']);

const DEFAULT_ALLOWED_HOSTS = ['localhost', '127.0.0.1'];

/**
 * 把传入的字符串或数组统一为字符串数组。
 */
function asList(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.map(String).filter(Boolean);
  return String(input).split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * 解析 host 白名单，支持 wildcard，例如 *.opc-agent.local
 */
function getAllowedHosts(extras) {
  const merged = new Set(DEFAULT_ALLOWED_HOSTS);
  for (const h of asList(extras)) merged.add(h);
  return [...merged];
}

function isHostAllowed(host, allowedHosts) {
  if (!host) return false;
  if (allowedHosts.includes(host)) return true;
  return allowedHosts.some((pattern) => {
    if (pattern.startsWith('*.')) {
      const suffix = pattern.slice(1); // ".example.com"
      return host.endsWith(suffix) || host === pattern.slice(2);
    }
    return false;
  });
}

function tryParseUrl(url) {
  try {
    return new URL(url);
  } catch (_err) {
    return null;
  }
}

/**
 * 判断 url 是否命中应用内白名单（用于 will-navigate / setWindowOpenHandler）。
 */
function isInternalNavigation(url, opts = {}) {
  const parsed = tryParseUrl(url);
  if (!parsed) return false;
  const allowedProtocols = new Set([...DEFAULT_ALLOWED_PROTOCOLS, ...asList(opts.allowProtocols)]);
  if (!allowedProtocols.has(parsed.protocol)) return false;

  const allowedHosts = getAllowedHosts(opts.allowHosts);
  // file: 协议没有 host，仅协议通过即可
  if (parsed.protocol === 'file:') return true;

  return isHostAllowed(parsed.hostname, allowedHosts);
}

/**
 * 注册一组导航 / 外部打开的安全防护。
 *
 * 行为约定：
 * 1. 内部命中白名单 → 允许；
 * 2. 命中 opc-agent: 深链 → 派发到 webContents；
 * 3. 命中外链 → 自动 openExternal；
 * 4. 其它禁止。
 */
function registerNavigationGuards(window, opts = {}) {
  if (!window || window.isDestroyed()) return;

  window.webContents.setWindowOpenHandler(({ url }) => {
    log.info('security', 'window-open:', url);
    if (!url || typeof url !== 'string') return { action: 'deny' };

    if (url.startsWith('opc-agent:')) {
      window.webContents.send('app:deep-link', url);
      return { action: 'deny' };
    }

    const parsed = tryParseUrl(url);
    if (parsed && (parsed.protocol === 'http:' || parsed.protocol === 'https:')) {
      // 命中外部白名单（可由 opts.allowHosts 扩展）
      if (!isInternalNavigation(url, { allowHosts: opts.allowHosts })) {
        void shell.openExternal(url);
      }
      return { action: 'deny' };
    }

    if (isInternalNavigation(url, { allowHosts: opts.allowHosts })) {
      return { action: 'allow' };
    }

    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    if (isInternalNavigation(url, { allowHosts: opts.allowHosts })) return;
    event.preventDefault();
    if (/^https?:/i.test(url)) {
      void shell.openExternal(url);
    } else {
      log.warn('security', 'blocked navigation:', url);
    }
  });

  window.webContents.on('will-redirect', (event, url) => {
    if (isInternalNavigation(url, { allowHosts: opts.allowHosts })) return;
    event.preventDefault();
    log.warn('security', 'blocked redirect:', url);
  });
}

module.exports = {
  asList,
  getAllowedHosts,
  isHostAllowed,
  isInternalNavigation,
  registerNavigationGuards,
};
