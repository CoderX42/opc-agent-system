import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule as AppConfigModule } from './config/config.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { AgentModule } from './modules/agent/agent.module';
import { FinanceModule } from './modules/finance/finance.module';
import { CustomerServiceModule } from './modules/customer-service/customer-service.module';
import { LegalModule } from './modules/legal/legal.module';
import { AdminModule } from './modules/admin/admin.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { AiModule } from './ai/ai.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { UploadModule } from './modules/upload/upload.module';

@Module({
  imports: [
    // 全局配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // TypeORM 数据库
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST', 'localhost'),
        port: configService.get<number>('DATABASE_PORT', 5432),
        username: configService.get('DATABASE_USER', 'postgres'),
        password: configService.get('DATABASE_PASSWORD', 'postgres'),
        database: configService.get('DATABASE_NAME', 'opc_agent_system'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize:
          configService.get<string>('DATABASE_SYNCHRONIZE', 'false') === 'true',
        logging:
          configService.get('NODE_ENV', configService.get('APP_ENV')) ===
          'development',
      }),
    }),

    // Redis 缓存
    CacheModule.register({
      ttl: 600,
      max: 100,
      isGlobal: true,
    }),

    // 应用配置模块
    AppConfigModule,

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
