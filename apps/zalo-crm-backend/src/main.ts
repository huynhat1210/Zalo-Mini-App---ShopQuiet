import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import * as express from 'express';
import { loadRuntimeEnv } from './prisma/prisma.service';

async function bootstrap() {
  loadRuntimeEnv();
  const app = await NestFactory.create(AppModule);

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ limit: '25mb', extended: true }));

  app.useGlobalInterceptors(new TransformInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.setGlobalPrefix('api/v1');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('ShopQuiet Campaign API')
    .setDescription('API quản lý chiến dịch, tự động hóa và tệp khách hàng của ShopQuiet')
    .setVersion('1.0.0')
    .addServer('/', 'API v1')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Nhập JWT Token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Campaigns', 'Quản lý chiến dịch và phê duyệt')
    .addTag('Automation', 'Quản lý kịch bản tự động hóa')
    .addTag('Marketing Lists', 'Quản lý tệp khách hàng')
    .addTag('App', 'Kiểm tra trạng thái dịch vụ')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    jsonDocumentUrl: 'api/docs-json',
    customSiteTitle: 'ShopQuiet Campaign API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  app.enableCors({
    origin: true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-zalo-user-id',
      'ngrok-skip-browser-warning',
      'bypass-tunnel-reminder',
    ],
  });

  const port = process.env.CRM_PORT || 3002;
  await app.listen(port);
  console.log(`CRM Campaign Backend Service is running on port: ${port}`);
}

void bootstrap();
