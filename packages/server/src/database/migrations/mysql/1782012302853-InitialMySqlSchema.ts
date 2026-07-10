import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * MySQL 基线迁移。
 *
 * 旧 PostgreSQL 迁移位于上级目录，仅用于保留历史；MySQL 数据源只加载本目录。
 * 使用 TypeORM 的实体元数据建表，保证 UUID、simple-enum、simple-json 及关联的
 * 实际列类型与应用代码保持一致。
 */
export class InitialMySqlSchema1782012302853 implements MigrationInterface {
  name = "InitialMySqlSchema1782012302853";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.connection.synchronize(false);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      "conversation_messages",
      "tickets",
      "transactions",
      "knowledge_chunks",
      "agent_memories",
      "agent_tasks",
      "meetings",
      "schedules",
      "tasks",
      "accounts",
      "invoices",
      "knowledge",
      "compliance_records",
      "contracts",
      "conversations",
      "agents",
      "users",
    ];

    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS \`${table}\``);
    }
  }
}
