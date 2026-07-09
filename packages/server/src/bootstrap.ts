import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';
import { ensureDesktopDataStarter } from './database/datasource.factory';

/**
 * 桌面端启动前的环境准备：
 * - 调用 ensureDesktopDataStarter 生成 OPC_AGENT_README.txt 帮助用户了解数据目录用途；
 * - 此处不抛错，所有失败均降级为日志，避免阻塞 Nest 启动。
 */
function prepareDesktopRuntime() {
  if (process.env.OPC_DESKTOP !== 'true') return;

  process.env.JWT_SECRET ??= 'opc-agent-desktop-local-jwt-secret';
  process.env.JWT_REFRESH_SECRET ??= 'opc-agent-desktop-local-refresh-secret';
  process.env.JWT_EXPIRES_IN ??= '7d';
  process.env.JWT_REFRESH_EXPIRES_IN ??= '30d';

  const userData = process.env.OPC_USER_DATA_DIR;
  if (!userData) return;
  try {
    ensureDesktopDataStarter(userData);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.warn(`[server] prepareDesktopRuntime failed: ${message}`);
  }
}

export async function createServerApp(): Promise<INestApplication> {
  prepareDesktopRuntime();
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin:
      process.env.OPC_DESKTOP === 'true'
        ? true
        : (process.env.CORS_ORIGIN || 'http://localhost:5173')
            .split(',')
            .map((origin) => origin.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  configureApp(app);

  const config = new DocumentBuilder()
    .setTitle('OPC Agent System API')
    .setDescription(
      'OPC Agent System 后端 API 文档，包含认证、用户管理、Agent调度、财务记账、智能客服、法务合规、行政办公和知识库管理等模块。',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: '输入 JWT Token',
      },
      'JWT',
    )
    .addTag('Auth', '认证模块 - 登录、注册')
    .addTag('User', '用户管理模块')
    .addTag('Agent', 'Agent 调度引擎')
    .addTag('Finance', '财务记账 Agent')
    .addTag('Customer Service', '智能客服 Agent')
    .addTag('Legal', '法务合规 Agent')
    .addTag('Admin', '行政办公 Agent')
    .addTag('Knowledge', '知识库管理')
    .addTag('Upload', '安全文件上传与下载')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
    },
  });

  return app;
}

export async function startServer(port = Number(process.env.PORT || process.env.APP_PORT || 3000)): Promise<INestApplication> {
  const app = await createServerApp();
  await app.listen(port, '127.0.0.1');
  console.log(`Application is running on: http://127.0.0.1:${port}`);
  console.log(`Swagger docs: http://127.0.0.1:${port}/api/docs`);
  return app;
}
