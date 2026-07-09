'use strict';

const { globalShortcut } = require('electron');
const log = require('./log');

/**
 * 全局快捷键管理器：
 * - 每个 shortcut 用一个稳定的 commandId 作为 key；
 * - 重复注册时自动 unregister 旧绑定，再绑定新的；
 * - 触发时通过 onInvoke 回调，由 main 模块派发到 webContents。
 */
function createShortcutManager(onInvoke) {
  const bindings = new Map(); // commandId -> accelerator
  const acceleratorToIds = new Map(); // accelerator -> Set<commandId>

  function unregisterByCommandId(commandId) {
    const accel = bindings.get(commandId);
    if (!accel) return;
    if (accel && globalShortcut.isRegistered(accel)) {
      try {
        globalShortcut.unregister(accel);
      } catch (err) {
        log.warn('shortcut', `unregister failed for ${accel}:`, err && err.message ? err.message : err);
      }
    }
    bindings.delete(commandId);
    const idSet = acceleratorToIds.get(accel);
    if (idSet) {
      idSet.delete(commandId);
      if (idSet.size === 0) acceleratorToIds.delete(accel);
    }
  }

  function unregisterAll() {
    try {
      globalShortcut.unregisterAll();
    } catch (err) {
      log.warn('shortcut', 'unregisterAll failed:', err && err.message ? err.message : err);
    }
    bindings.clear();
    acceleratorToIds.clear();
  }

  function register(descriptor) {
    if (!descriptor || !descriptor.accelerator || !descriptor.commandId) {
      return { ok: false, error: 'invalid descriptor (need accelerator + commandId)' };
    }
    const { accelerator, commandId } = descriptor;

    // 同一 commandId 重复注册：先清掉
    unregisterByCommandId(commandId);

    // 同一 accelerator 已经绑了别的命令，先取消
    const existingIds = acceleratorToIds.get(accelerator);
    if (existingIds && existingIds.size > 0) {
      try {
        globalShortcut.unregister(accelerator);
      } catch (err) {
        log.warn('shortcut', `pre-unregister conflict ${accelerator}:`, err && err.message ? err.message : err);
      }
      for (const id of [...existingIds]) bindings.delete(id);
      existingIds.clear();
      acceleratorToIds.delete(accelerator);
    }

    try {
      const ok = globalShortcut.register(accelerator, () => {
        try {
          onInvoke?.({ commandId, accelerator });
        } catch (err) {
          log.error('shortcut', 'invoke handler error:', err && err.stack ? err.stack : err);
        }
      });
      if (!ok) {
        return { ok: false, error: `Register failed for ${accelerator} (likely taken by another app)` };
      }
      bindings.set(commandId, accelerator);
      if (!acceleratorToIds.has(accelerator)) {
        acceleratorToIds.set(accelerator, new Set());
      }
      acceleratorToIds.get(accelerator).add(commandId);
      return { ok: true };
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      return { ok: false, error: message };
    }
  }

  function unregister(commandId) {
    unregisterByCommandId(commandId);
  }

  function list() {
    return [...bindings.entries()].map(([commandId, accelerator]) => ({ commandId, accelerator }));
  }

  return {
    register,
    unregister,
    list,
    unregisterAll,
  };
}

module.exports = {
  createShortcutManager,
};
