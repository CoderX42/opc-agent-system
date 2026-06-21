import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 配置
  app.enableCors({
    origin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  configureApp(app);

  // Swagger API 文档配置
  const config = new DocumentBuilder()
    .setTitle('OPC Agent System API')
    .setDescription('OPC Agent System 后端 API 文档，包含认证、用户管理、Agent调度、财务记账、智能客服、法务合规、行政办公和知识库管理等模块。')
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

  const port = process.env.PORT || process.env.APP_PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
