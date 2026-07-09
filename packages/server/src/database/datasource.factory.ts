import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * 解析 Electron desktop 模式下的 SQLite 数据库存储路径。
 *
 * 行为约定：
 * 1. 若未传入 `userDataDir`，抛出明显错误以便尽早定位问题；
 * 2. 默认文件名 `opc-agent.db`，可通过 OPC_DESKTOP_DB_FILE 覆盖；
 * 3. 自动创建所在目录（Electron 的 app.getPath('userData') 已存在，但允许传入自定义目录）；
 * 4. 返回绝对路径以避免 TypeORM 在 cwd 变化时找不到文件。
 */
export function resolveDesktopDatabasePath(
  userDataDir: string | undefined,
): string {
  if (!userDataDir || userDataDir.trim() === '') {
    throw new Error(
      '[server] OPC_DESKTOP=true 但未提供 OPC_USER_DATA_DIR，无法确定 SQLite 数据库路径',
    );
  }
  const filename = process.env.OPC_DESKTOP_DB_FILE || 'opc-agent.db';
  const fullPath = path.resolve(userDataDir, filename);

  try {
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[server] 无法创建 SQLite 目录 ${path.dirname(fullPath)}: ${message}`);
  }

  return fullPath;
}

/**
 * 应用启动时一次性写入用户数据目录的 .env 占位文件，
 * 用于告知前端/运维该数据目录位置以及如何清理。
 */
export function ensureDesktopDataStarter(userDataDir: string): void {
  try {
    const marker = path.join(userDataDir, 'OPC_AGENT_README.txt');
    if (fs.existsSync(marker)) return;
    const lines = [
      'OPC Agent Desktop user data directory',
      `Generated: ${new Date().toISOString()}`,
      '',
      '该目录存放 OPC Agent 桌面端的所有本地数据，包括：',
      '- opc-agent.db (SQLite 数据库)',
      '- logs/ (运行日志)',
      '- window-state.json (窗口位置持久化)',
      '- recent-files.json (最近文件清单)',
      '',
      '如需重置应用数据，可直接关闭应用后删除该目录。',
      '',
    ];
    fs.mkdirSync(userDataDir, { recursive: true });
    fs.writeFileSync(marker, lines.join('\n'), 'utf-8');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[server] 无法写入桌面端数据目录说明文件: ${message}`);
  }
}
