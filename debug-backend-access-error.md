# Debug: 后端访问报错

**Session ID**: `backend-access-error`
**Status**: [OPEN]
**Created**: 2026-06-21

## 现象 (Symptoms)
- `GET http://localhost:3000/api/finance/overview` → **404 Not Found**
- `GET http://localhost:3000/api/finance/transactions?page=1&limit=5` → **500 Internal Server Error**, message=`column invoice.invoiceNumber does not exist`

## 证据 (Runtime Evidence)
- PostgreSQL `invoices` 表实际列：`"invoiceNo" character varying(50)`（与实体 `Invoice.invoiceNo` 一致）。
- Entity `src/modules/finance/entities/invoice.entity.ts` 仅声明 `invoiceNo`，全工程 grep `invoiceNumber` 无结果。
- 启动 `pnpm start`（无 watch）后路由表日志确认 `/api/finance/overview` 已注册。
- 修复后查询日志：`SELECT ... "invoice"."invoiceNo" AS "invoice_invoiceNo" FROM "transactions" ... LEFT JOIN "invoices" "invoice" ON ...` —— 字段名 `invoiceNo`，符合 DB 与实体。
- 重启后两个端点均 200 OK。

## 根因 (Root Cause)
**构建缓存陈旧 / nest watcher 未生效**：之前用 `nest start --watch` 启动的进程加载了旧的 controller 路由表与 TypeORM 实体元数据。重启前的 TypeORM 元数据对应一个旧版实体（`invoiceNumber`），路由表也未包含新加的 `@Get('overview')`。执行 `rm -rf dist && nest build` 强制全量重建后再启动，路由表与实体元数据均同步为最新版本。

## 修复 (Fix)
1. 停掉旧进程 (`kill -9 <pid>`)。
2. 删除 `packages/server/dist` 并执行 `pnpm --filter opc-agent-server build`（或 `pnpm start`）全量编译。
3. 重启 `pnpm --filter opc-agent-server dev`（开发态）使后续编辑可热更新。

## 状态 (Status)
[AWAITING_USER_VERIFICATION]

## 清理 (Cleanup)
待用户确认问题已解决后删除：`/tmp/server.log`、`debug-backend-access-error.md`、调试期间注册的临时用户 `dbgtester`（`DELETE FROM users WHERE username='dbgtester';`）。
