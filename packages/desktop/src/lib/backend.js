'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const log = require('./log');

const BACKEND_DEFAULTS = Object.freeze({
  /** 等待后端就绪的轮询间隔（毫秒） */
  pollInterval: 400,
  /** 等待后端就绪的超时（毫秒） */
  startupTimeoutMs: 30000,
});

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function waitForServer(url, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? BACKEND_DEFAULTS.startupTimeoutMs;
  const interval = opts.pollInterval ?? BACKEND_DEFAULTS.pollInterval;
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const response = await fetch(url);
        if (response.ok || response.status < 500) {
          resolve();
          return;
        }
      } catch (error) {
        if (Date.now() - startedAt >= timeoutMs) {
          reject(error);
          return;
        }
      }
      setTimeout(poll, interval);
    };
    void poll();
  });
}

/**
 * 在应用包根路径下定位 server bundle。
 *   - 未打包：从仓库根 packages/server/dist/main.js
 *   - 已打包：从 process.resourcesPath/server/main.js
 */
function resolveServerEntry(appRef, resourceRoot) {
  if (appRef.isPackaged) {
    return path.join(resourceRoot, 'server', 'main.js');
  }
  return path.join(resourceRoot, 'server', 'dist', 'main.js');
}

function resolveServerDir(appRef, resourceRoot) {
  if (appRef.isPackaged) return path.join(resourceRoot, 'server');
  return path.join(resourceRoot, 'server');
}

function readEnvDefaults(envPath) {
  const defaults = {};
  if (!fs.existsSync(envPath)) return defaults;
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    defaults[key] = value;
  }
  return defaults;
}

/**
 * 创建并启动后端子进程。
 * @param {object} ctx
 * @param {Electron.App} ctx.app
 * @param {string} ctx.resourceRoot 资源根路径
 * @param {(info: { type: 'started'|'exit'|'error'; apiBaseUrl?: string; code?: number; signal?: string; err?: Error }) => void} ctx.onEvent
 */
function createBackend(ctx) {
  const { app: appRef, resourceRoot, onEvent } = ctx;
  let proc = null;
  let apiBaseUrl = '';
  let port = 0;
  let restartCount = 0;
  let lastError = null;
  let disposed = false;

  function dispose() {
    disposed = true;
    if (proc && !proc.killed) {
      try {
        proc.kill('SIGTERM');
      } catch (err) {
        log.warn('backend', 'kill process failed:', err && err.message ? err.message : err);
      }
    }
  }

  async function start() {
    const entry = resolveServerEntry(appRef, resourceRoot);
    if (!fs.existsSync(entry)) {
      throw new Error(`Server bundle not found: ${entry}. Run pnpm build:server first.`);
    }

    const serverDir = resolveServerDir(appRef, resourceRoot);
    const envDefaults = readEnvDefaults(path.join(serverDir, '.env'));
    port = await getFreePort();
    apiBaseUrl = `http://127.0.0.1:${port}/api`;
    const userDataDir = appRef.getPath('userData');

    const nodeExecutable = appRef.isPackaged
      ? process.execPath
      : process.env.OPC_NODE_BINARY || process.env.NODE_BINARY || 'node';

    const childEnv = {
      ...process.env,
      ...envDefaults,
      ...(appRef.isPackaged ? { ELECTRON_RUN_AS_NODE: '1' } : {}),
      NODE_ENV: appRef.isPackaged ? 'production' : process.env.NODE_ENV || 'development',
      OPC_DESKTOP: 'true',
      OPC_USER_DATA_DIR: userDataDir,
      APP_PORT: String(port),
      PORT: String(port),
      CORS_ORIGIN: '*',
    };

    const stdio = appRef.isPackaged ? 'ignore' : 'inherit';
    log.info('backend', `spawning ${nodeExecutable} ${entry} on port ${port}`);

    proc = spawn(nodeExecutable, [entry], {
      cwd: serverDir,
      env: childEnv,
      stdio,
    });

    proc.on('error', (err) => {
      lastError = err;
      log.error('backend', 'spawn error:', err && err.message ? err.message : err);
      onEvent?.({ type: 'error', err });
    });

    proc.once('exit', (code, signal) => {
      const info = { type: 'exit', code, signal };
      onEvent?.(info);
      log.warn('backend', `process exited (code=${code ?? 'null'}, signal=${signal ?? 'null'})`);
    });

    await waitForServer(`${apiBaseUrl}/health`);
    onEvent?.({ type: 'started', apiBaseUrl });
    return apiBaseUrl;
  }

  function getStatus() {
    return {
      running: !!proc && !proc.killed,
      apiBaseUrl,
      pid: proc?.pid ?? null,
      restartCount,
      lastError: lastError ? lastError.message : null,
    };
  }

  function getApiBaseUrl() {
    return apiBaseUrl;
  }

  async function restart() {
    if (disposed) throw new Error('Backend manager disposed');
    dispose();
    proc = null;
    apiBaseUrl = '';
    restartCount++;
    return start();
  }

  return {
    start,
    dispose,
    restart,
    getStatus,
    getApiBaseUrl,
    isDisposed: () => disposed,
  };
}

module.exports = {
  createBackend,
  getFreePort,
  waitForServer,
  resolveServerEntry,
  resolveServerDir,
  BACKEND_DEFAULTS,
};
