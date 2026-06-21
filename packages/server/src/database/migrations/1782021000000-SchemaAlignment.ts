import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Schema 对齐迁移：
 * 修复 1782012302853-InitialSchema 未在 DB 上执行时缺失的列与索引，
 * 并将两笔迁移都登记到 migrations 表，使后续 `pnpm db:migrate` 不重复执行。
 */
export class SchemaAlignment1782021000000 implements MigrationInterface {
    name = 'SchemaAlignment1782021000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1) 创建 migrations 表（如果还没有），记录两笔历史迁移。
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "migrations" (
                "id" SERIAL PRIMARY KEY,
                "timestamp" bigint NOT NULL,
                "name" varchar NOT NULL
            )
        `);
        await queryRunner.query(`
            INSERT INTO "migrations" ("timestamp", "name")
            VALUES (1782012302853, 'InitialSchema1782012302853')
            ON CONFLICT DO NOTHING
        `);

        // 2) tickets 补列
        await queryRunner.query(`ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "resolution" text`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "owner_id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_51547a26f3c96c882e4814060a" ON "tickets" ("owner_id", "status", "created_at")`);

        // 3) contracts 补列
        await queryRunner.query(`ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "amount" numeric(12,2)`);
        await queryRunner.query(`ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "owner_id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_0ab3c677ea6922b8e46547087a" ON "contracts" ("owner_id", "status", "updated_at")`);

        // 4) conversations 补列
        await queryRunner.query(`ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "owner_id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_615ee370538818d62fe7f500a1" ON "conversations" ("owner_id", "status", "updated_at")`);

        // 5) compliance_records 补列
        await queryRunner.query(`ALTER TABLE "compliance_records" ADD COLUMN IF NOT EXISTS "owner_id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_f71b64b50fcc04fd0e35a8a307" ON "compliance_records" ("owner_id", "status", "created_at")`);

        // 6) invoices 已存在索引；确保一致
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_0888dba81e5203b565ca9ce9b8" ON "invoices" ("owner_id", "status", "created_at")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_c94039fc609153eefdf8296c65" ON "transactions" ("owner_id", "type", "created_at")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_8cd23cb27ff5ba4ba162a27e51" ON "accounts" ("owner_id", "status")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_8cd23cb27ff5ba4ba162a27e51"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_c94039fc609153eefdf8296c65"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_0888dba81e5203b565ca9ce9b8"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_f71b64b50fcc04fd0e35a8a307"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_615ee370538818d62fe7f500a1"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_0ab3c677ea6922b8e46547087a"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_51547a26f3c96c882e4814060a"`);
        await queryRunner.query(`ALTER TABLE "compliance_records" DROP COLUMN IF EXISTS "owner_id"`);
        await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN IF EXISTS "owner_id"`);
        await queryRunner.query(`ALTER TABLE "contracts" DROP COLUMN IF EXISTS "owner_id"`);
        await queryRunner.query(`ALTER TABLE "contracts" DROP COLUMN IF EXISTS "amount"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN IF EXISTS "owner_id"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN IF EXISTS "resolvedAt"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN IF EXISTS "resolution"`);
        await queryRunner.query(`DELETE FROM "migrations" WHERE "name" = 'SchemaAlignment1782021000000'`);
        await queryRunner.query(`DELETE FROM "migrations" WHERE "name" = 'InitialSchema1782012302853'`);
        await queryRunner.query(`DROP TABLE IF EXISTS "migrations"`);
    }
}
