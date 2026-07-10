import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { createConnection, type ConnectionOptions } from "mysql2/promise";
import request = require("supertest");

const database = process.env.E2E_DATABASE_NAME || "opc_agent_e2e";
process.env.NODE_ENV = "test";
process.env.DATABASE_HOST ||= "localhost";
process.env.DATABASE_PORT ||= "3306";
process.env.DATABASE_USER ||= "agent-system";
process.env.DATABASE_PASSWORD ||= "change-me";
process.env.DATABASE_NAME = database;
process.env.DATABASE_SYNCHRONIZE = "false";
process.env.JWT_SECRET = "e2e-access-secret-at-least-32-characters";
process.env.JWT_REFRESH_SECRET = "e2e-refresh-secret-at-least-32-characters";

describe("Core finance flow (e2e)", () => {
  let app: INestApplication;

  const databaseAdmin = () => {
    if (!/^[A-Za-z0-9_]+$/.test(database)) {
      throw new Error("E2E_DATABASE_NAME 只能包含字母、数字和下划线");
    }

    const options: ConnectionOptions = {
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT),
      user: process.env.E2E_DATABASE_ADMIN_USER || process.env.DATABASE_USER,
      password:
        process.env.E2E_DATABASE_ADMIN_PASSWORD ||
        process.env.DATABASE_PASSWORD,
      database: "mysql",
    };
    return createConnection(options);
  };

  beforeAll(async () => {
    const admin = await databaseAdmin();
    await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await admin.query(
      `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await admin.end();

    const { default: dataSource } = await import("../src/database/data-source");
    await dataSource.initialize();
    await dataSource.runMigrations();
    await dataSource.destroy();

    const { AppModule } = await import("../src/app.module");
    const { configureApp } = await import("../src/configure-app");
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    const admin = await databaseAdmin();
    await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await admin.end();
  });

  it("registers, approves an invoice, records income and isolates users", async () => {
    const first = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({
        username: "finance-owner",
        email: "owner@example.com",
        password: "Passw0rd!",
      })
      .expect(201);
    expect(first.body).toMatchObject({ success: true });
    const firstToken = first.body.data.token as string;

    const invoice = await request(app.getHttpServer())
      .post("/api/finance/invoices")
      .set("Authorization", `Bearer ${firstToken}`)
      .send({
        type: "income",
        amount: 1250,
        invoiceDate: "2026-06-21",
        customerName: "示例客户",
      })
      .expect(201);
    expect(invoice.body.data.status).toBe("PENDING");

    await request(app.getHttpServer())
      .post(`/api/finance/invoices/${invoice.body.data.id}/approve`)
      .set("Authorization", `Bearer ${firstToken}`)
      .send({ approved: true })
      .expect(201)
      .expect(({ body }) => expect(body.data.status).toBe("APPROVED"));

    await request(app.getHttpServer())
      .post("/api/finance/transactions")
      .set("Authorization", `Bearer ${firstToken}`)
      .send({
        type: "INCOME",
        amount: 1250,
        category: "服务收入",
        date: "2026-06-21",
        invoiceId: invoice.body.data.id,
      })
      .expect(201);

    await request(app.getHttpServer())
      .get("/api/finance/overview")
      .set("Authorization", `Bearer ${firstToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.totalIncome).toBe(1250);
        expect(body.data.netProfit).toBe(1250);
        expect(body.data.transactionCount).toBe(1);
      });

    const second = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({
        username: "other-owner",
        email: "other@example.com",
        password: "Passw0rd!",
      })
      .expect(201);

    await request(app.getHttpServer())
      .get("/api/finance/overview")
      .set("Authorization", `Bearer ${second.body.data.token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.totalIncome).toBe(0);
        expect(body.data.transactionCount).toBe(0);
      });
  });
});
