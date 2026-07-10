import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CacheModule } from "@nestjs/cache-manager";
import { redisStore } from "cache-manager-redis-store";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ConfigModule as AppConfigModule } from "./config/config.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UserModule } from "./modules/user/user.module";
import { AgentModule } from "./modules/agent/agent.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { CustomerServiceModule } from "./modules/customer-service/customer-service.module";
import { LegalModule } from "./modules/legal/legal.module";
import { AdminModule } from "./modules/admin/admin.module";
import { KnowledgeModule } from "./modules/knowledge/knowledge.module";
import { AiModule } from "./ai/ai.module";
import { MonitoringModule } from "./modules/monitoring/monitoring.module";
import { UploadModule } from "./modules/upload/upload.module";
import { OfficeModule } from "./modules/office/office.module";
import { AgentRuntimeModule } from "./core/agent-runtime/agent-runtime.module";
import { VoiceModule } from "./core/voice/voice.module";
import { MailModule } from "./common/services/mail.module";

@Module({
  imports: [
    // 全局配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),

    // TypeORM 数据库：统一使用 MySQL（Web 与桌面端共享同一数据源）。
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "mysql",
        host: configService.get("DATABASE_HOST", "localhost"),
        port: configService.get<number>("DATABASE_PORT", 3306),
        username: configService.get("DATABASE_USER", "agent-system"),
        password: configService.get("DATABASE_PASSWORD"),
        database: configService.get("DATABASE_NAME", "agent-system"),
        charset: "utf8mb4",
        entities: [__dirname + "/**/*.entity{.ts,.js}"],
        synchronize:
          configService.get<string>("DATABASE_SYNCHRONIZE", "false") === "true",
        logging:
          configService.get("NODE_ENV", configService.get("APP_ENV")) ===
          "development",
      }),
    }),

    // Redis 缓存
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        // cache-manager-redis-store 的回调兼容签名与 Nest 的泛型签名不同，
        // 运行时使用的仍是 v3 的 Promise Redis store。
        store: (await redisStore({
          socket: {
            host: configService.get("REDIS_HOST", "localhost"),
            port: configService.get<number>("REDIS_PORT", 6379),
          },
          password: configService.get("REDIS_PASSWORD"),
          database: configService.get<number>("REDIS_DB", 0),
          ttl: 600,
        })) as never,
      }),
    }),

    // 应用配置模块
    AppConfigModule,

    // 全局邮件服务（用于密码重置等流程）
    MailModule,

    // 业务模块
    AuthModule,
    UserModule,
    AgentModule,
    FinanceModule,
    CustomerServiceModule,
    LegalModule,
    AdminModule,
    KnowledgeModule,
    AiModule,
    MonitoringModule,
    UploadModule,
    OfficeModule,
    AgentRuntimeModule,
    VoiceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
