'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Electron Builder 会保留 pnpm 的工作区软链接，导致资源目录里的 NestJS
 * 无法找到实际依赖。封包前将服务端生产运行时解引用为独立目录。
 */
exports.default = async function prepareServerRuntime(context) {
  const desktopDir = path.resolve(__dirname, '..');
  const serverDir = path.resolve(desktopDir, '..', 'server');
  const runtimeDir = path.join(desktopDir, '.server-runtime');
  const required = [
    path.join(serverDir, 'dist'),
    path.join(serverDir, 'node_modules'),
    path.join(serverDir, '.env'),
  ];

  const missing = required.filter((file) => !fs.existsSync(file));
  if (missing.length) {
    throw new Error(`Desktop server runtime is incomplete: ${missing.join(', ')}`);
  }

  fs.rmSync(runtimeDir, { recursive: true, force: true });
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.cpSync(path.join(serverDir, 'dist'), runtimeDir, { recursive: true });
  fs.cpSync(path.join(serverDir, 'node_modules'), path.join(runtimeDir, 'node_modules'), {
    recursive: true,
    dereference: true,
  });
  fs.copyFileSync(path.join(serverDir, '.env'), path.join(runtimeDir, '.env'));
};
