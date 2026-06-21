import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1782012302853 implements MigrationInterface {
    name = 'InitialSchema1782012302853'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('ADMIN', 'USER')`);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'BANNED')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying(50) NOT NULL, "password" character varying(255) NOT NULL, "email" character varying(100) NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'USER', "avatar" character varying(500), "status" "public"."users_status_enum" NOT NULL DEFAULT 'ACTIVE', "refresh_token_hash" character varying(255), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."contracts_type_enum" AS ENUM('SALES', 'PURCHASE', 'SERVICE', 'NDA', 'EMPLOYMENT', 'OTHER')`);
        await queryRunner.query(`CREATE TYPE "public"."contracts_status_enum" AS ENUM('DRAFT', 'REVIEWING', 'APPROVED', 'REJECTED', 'SIGNED', 'EXPIRED')`);
        await queryRunner.query(`CREATE TABLE "contracts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(200) NOT NULL, "type" "public"."contracts_type_enum" NOT NULL, "content" text NOT NULL, "status" "public"."contracts_status_enum" NOT NULL DEFAULT 'DRAFT', "reviewResult" json, "amount" numeric(12,2), "partyA" character varying(100), "partyB" character varying(100), "signDate" date, "expiryDate" date, "owner_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2c7b8f3a7b1acdd49497d83d0fb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0ab3c677ea6922b8e46547087a" ON "contracts" ("owner_id", "status", "updated_at") `);
        await queryRunner.query(`CREATE TABLE "compliance_records" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(200) NOT NULL, "category" character varying(50) NOT NULL, "description" text NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'PENDING', "dueDate" date, "responsiblePerson" character varying(100), "result" json, "owner_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_14e115ea1d75a3d7f312f6e2cd3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f71b64b50fcc04fd0e35a8a307" ON "compliance_records" ("owner_id", "status", "created_at") `);
        await queryRunner.query(`CREATE TABLE "knowledge" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(200) NOT NULL, "content" text NOT NULL, "category" character varying(50) NOT NULL, "tags" json, "summary" text, "status" character varying(20) NOT NULL DEFAULT 'PUBLISHED', "authorId" uuid, "viewCount" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4159ba98b65a20a8d1f257bc514" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "invoices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "invoiceNo" character varying(50), "amount" numeric(12,2) NOT NULL, "type" character varying(50) NOT NULL, "category" character varying(50) NOT NULL, "date" date NOT NULL, "vendor" character varying(200), "customerName" character varying(200), "taxRate" numeric(5,2) NOT NULL DEFAULT '0', "taxAmount" numeric(12,2) NOT NULL DEFAULT '0', "dueDate" date, "description" text, "imageUrl" character varying(500), "attachments" json, "status" character varying(20) NOT NULL DEFAULT 'PENDING', "owner_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_1a94a2eb122d90baad7ca28f654" UNIQUE ("invoiceNo"), CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0888dba81e5203b565ca9ce9b8" ON "invoices" ("owner_id", "status", "created_at") `);
        await queryRunner.query(`CREATE TYPE "public"."transactions_type_enum" AS ENUM('INCOME', 'EXPENSE')`);
        await queryRunner.query(`CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."transactions_type_enum" NOT NULL, "amount" numeric(12,2) NOT NULL, "category" character varying(50) NOT NULL, "date" date NOT NULL, "description" text, "account" character varying(100), "counterparty" character varying(200), "attachments" json, "invoice_id" uuid, "owner_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c94039fc609153eefdf8296c65" ON "transactions" ("owner_id", "type", "created_at") `);
        await queryRunner.query(`CREATE TABLE "accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "type" character varying(50) NOT NULL, "balance" numeric(12,2) NOT NULL DEFAULT '0', "status" character varying(20) NOT NULL DEFAULT 'ACTIVE', "owner_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5a7a02c20412299d198e097a8fe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8cd23cb27ff5ba4ba162a27e51" ON "accounts" ("owner_id", "status") `);
        await queryRunner.query(`CREATE TYPE "public"."conversations_channel_enum" AS ENUM('WEB', 'EMAIL', 'PHONE', 'WECHAT')`);
        await queryRunner.query(`CREATE TYPE "public"."conversations_status_enum" AS ENUM('ACTIVE', 'CLOSED', 'PENDING')`);
        await queryRunner.query(`CREATE TABLE "conversations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "channel" "public"."conversations_channel_enum" NOT NULL, "customerName" character varying(100) NOT NULL, "status" "public"."conversations_status_enum" NOT NULL DEFAULT 'ACTIVE', "summary" text, "owner_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ee34f4f7ced4ec8681f26bf04ef" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_615ee370538818d62fe7f500a1" ON "conversations" ("owner_id", "status", "updated_at") `);
        await queryRunner.query(`CREATE TYPE "public"."tickets_priority_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT')`);
        await queryRunner.query(`CREATE TYPE "public"."tickets_status_enum" AS ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')`);
        await queryRunner.query(`CREATE TABLE "tickets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(200) NOT NULL, "content" text NOT NULL, "priority" "public"."tickets_priority_enum" NOT NULL DEFAULT 'MEDIUM', "status" "public"."tickets_status_enum" NOT NULL DEFAULT 'OPEN', "assignedTo" character varying(100), "resolution" text, "resolvedAt" TIMESTAMP, "conversation_id" uuid, "owner_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_343bc942ae261cf7a1377f48fd0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_51547a26f3c96c882e4814060a" ON "tickets" ("owner_id", "status", "created_at") `);
        await queryRunner.query(`CREATE TABLE "conversation_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "conversation_id" uuid NOT NULL, "role" character varying(20) NOT NULL, "content" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_113248f25c4c0a7c179b3f5a609" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a3f817182b4f6dac0f4901baa2" ON "conversation_messages" ("conversation_id", "created_at") `);
        await queryRunner.query(`CREATE TYPE "public"."tasks_priority_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH')`);
        await queryRunner.query(`CREATE TYPE "public"."tasks_status_enum" AS ENUM('TODO', 'IN_PROGRESS', 'DONE')`);
        await queryRunner.query(`CREATE TABLE "tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(200) NOT NULL, "description" text, "priority" "public"."tasks_priority_enum" NOT NULL DEFAULT 'MEDIUM', "status" "public"."tasks_status_enum" NOT NULL DEFAULT 'TODO', "due_date" date, "assigneeId" uuid, "creatorId" uuid, "parent_task_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."agents_type_enum" AS ENUM('FINANCE', 'CUSTOMER_SERVICE', 'LEGAL', 'ADMIN')`);
        await queryRunner.query(`CREATE TYPE "public"."agents_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE')`);
        await queryRunner.query(`CREATE TABLE "agents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "type" "public"."agents_type_enum" NOT NULL, "status" "public"."agents_status_enum" NOT NULL DEFAULT 'ACTIVE', "config" json, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9c653f28ae19c5884d5baf6a1d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "schedules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(200) NOT NULL, "description" text, "startTime" TIMESTAMP NOT NULL, "endTime" TIMESTAMP, "type" character varying(50) NOT NULL DEFAULT 'PERSONAL', "location" character varying(100), "userId" uuid, "isAllDay" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7e33fc2ea755a5765e3564e66dd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "meetings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(200) NOT NULL, "agenda" text, "startTime" TIMESTAMP NOT NULL, "endTime" TIMESTAMP, "location" character varying(100), "meetingLink" character varying(50), "participants" json, "minutes" text, "status" character varying(20) NOT NULL DEFAULT 'SCHEDULED', "organizerId" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_aa73be861afa77eb4ed31f3ed57" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_3a12e9b258f9cd052e43cacf75b" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_9d19b18bc1a9734b2bfde504bf2" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "conversation_messages" ADD CONSTRAINT "FK_8e166abf2dd2ee28670e53e6803" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "conversation_messages" DROP CONSTRAINT "FK_8e166abf2dd2ee28670e53e6803"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_9d19b18bc1a9734b2bfde504bf2"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_3a12e9b258f9cd052e43cacf75b"`);
        await queryRunner.query(`DROP TABLE "meetings"`);
        await queryRunner.query(`DROP TABLE "schedules"`);
        await queryRunner.query(`DROP TABLE "agents"`);
        await queryRunner.query(`DROP TYPE "public"."agents_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."agents_type_enum"`);
        await queryRunner.query(`DROP TABLE "tasks"`);
        await queryRunner.query(`DROP TYPE "public"."tasks_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."tasks_priority_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a3f817182b4f6dac0f4901baa2"`);
        await queryRunner.query(`DROP TABLE "conversation_messages"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_51547a26f3c96c882e4814060a"`);
        await queryRunner.query(`DROP TABLE "tickets"`);
        await queryRunner.query(`DROP TYPE "public"."tickets_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."tickets_priority_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_615ee370538818d62fe7f500a1"`);
        await queryRunner.query(`DROP TABLE "conversations"`);
        await queryRunner.query(`DROP TYPE "public"."conversations_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."conversations_channel_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8cd23cb27ff5ba4ba162a27e51"`);
        await queryRunner.query(`DROP TABLE "accounts"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c94039fc609153eefdf8296c65"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0888dba81e5203b565ca9ce9b8"`);
        await queryRunner.query(`DROP TABLE "invoices"`);
        await queryRunner.query(`DROP TABLE "knowledge"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f71b64b50fcc04fd0e35a8a307"`);
        await queryRunner.query(`DROP TABLE "compliance_records"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0ab3c677ea6922b8e46547087a"`);
        await queryRunner.query(`DROP TABLE "contracts"`);
        await queryRunner.query(`DROP TYPE "public"."contracts_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."contracts_type_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    }

}
