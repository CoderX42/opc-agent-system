import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgentRuntimeSchema1783521300000 implements MigrationInterface {
  name = 'AgentRuntimeSchema1783521300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    const vectorExtension = await queryRunner.query(
      `SELECT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') AS "available"`,
    );
    const hasVectorExtension = Boolean(vectorExtension?.[0]?.available);
    if (hasVectorExtension) {
      await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "vector"`);
    }
    const embeddingColumnType = hasVectorExtension ? 'vector(1536)' : 'double precision[]';

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "agent_tasks_status_enum" AS ENUM ('WAITING', 'PLANNING', 'RUNNING', 'TOOL_CALLING', 'COMPLETED', 'FAILED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "agent_runtime_agent_type_enum" AS ENUM ('FINANCE', 'CUSTOMER_SERVICE', 'LEGAL', 'ADMIN');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "agent_memories_memory_type_enum" AS ENUM ('USER_PREFERENCE', 'ENTERPRISE_INFO', 'HISTORICAL_DECISION', 'CUSTOMER_RELATIONSHIP', 'CONVERSATION_SUMMARY');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "knowledge_chunks_vector_status_enum" AS ENUM ('PENDING', 'READY', 'FAILED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "agent_tasks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "agent_id" uuid,
        "user_id" uuid NOT NULL,
        "task_type" varchar(80) NOT NULL,
        "status" "agent_tasks_status_enum" NOT NULL DEFAULT 'WAITING',
        "agent_type" "agent_runtime_agent_type_enum",
        "input" jsonb NOT NULL,
        "plan" jsonb,
        "result" jsonb,
        "error" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_agent_tasks_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_agent_tasks_user_status" ON "agent_tasks" ("user_id", "status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_agent_tasks_agent_created" ON "agent_tasks" ("agent_id", "created_at")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "agent_memories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "agent_id" uuid,
        "memory_type" "agent_memories_memory_type_enum" NOT NULL,
        "scope" varchar(80) NOT NULL DEFAULT 'default',
        "key" varchar(160) NOT NULL,
        "content" text NOT NULL,
        "metadata" jsonb,
        "importance" integer NOT NULL DEFAULT 1,
        "last_accessed_at" TIMESTAMPTZ,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_agent_memories_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_agent_memories_identity" UNIQUE ("user_id", "agent_id", "memory_type", "scope", "key")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_agent_memories_user_type" ON "agent_memories" ("user_id", "memory_type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_agent_memories_agent_scope" ON "agent_memories" ("agent_id", "scope")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "knowledge_chunks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "knowledge_id" uuid NOT NULL,
        "chunk_index" integer NOT NULL,
        "content" text NOT NULL,
        "token_count" integer NOT NULL DEFAULT 0,
        "embedding" ${embeddingColumnType},
        "vector_status" "knowledge_chunks_vector_status_enum" NOT NULL DEFAULT 'PENDING',
        "metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_knowledge_chunks_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_knowledge_chunks_knowledge_index" UNIQUE ("knowledge_id", "chunk_index")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_knowledge_chunks_vector_status" ON "knowledge_chunks" ("vector_status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_knowledge_chunks_knowledge" ON "knowledge_chunks" ("knowledge_id")`);
    if (hasVectorExtension) {
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_knowledge_chunks_embedding" ON "knowledge_chunks" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100)`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_knowledge_chunks_embedding"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_knowledge_chunks_knowledge"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_knowledge_chunks_vector_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "knowledge_chunks"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agent_memories_agent_scope"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agent_memories_user_type"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agent_memories"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agent_tasks_agent_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agent_tasks_user_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agent_tasks"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "knowledge_chunks_vector_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "agent_memories_memory_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "agent_runtime_agent_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "agent_tasks_status_enum"`);
  }
}
