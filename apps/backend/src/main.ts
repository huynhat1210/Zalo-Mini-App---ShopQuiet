import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  SuccessResponseDto,
  ErrorResponseDto,
} from './common/dto/api-response.dto';
import { PinoLogger } from './common/logger/logger.service';

import * as fs from 'fs';
import * as path from 'path';
import * as express from 'express';
import type { NextFunction, Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'], // Enable basic default logger to diagnose bootstrap crashes
  });

  // Increase JSON & URL-encoded body limit for image & data payloads
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ limit: '25mb', extended: true }));

  // Get Pino logger instance
  const logger = await app.resolve(PinoLogger);
  logger.log('Starting application...');

  // Enable global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Enable global response transformation interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.setGlobalPrefix('api/v1', {
    exclude: [
      '/',
      'pay2s/(.*)',
      'api/pay2s/(.*)',
      'pay/(.*)',
      'uploads/(.*)',
      'public/(.*)',
    ],
  });

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('ShopQuiet E-Commerce API Server')
    .setDescription('Hệ thống API Server dành cho Zalo Mini App E-Commerce và Trang Quản trị ShopQuiet CMS')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', name: 'Authorization', description: 'Nhập JWT Token', in: 'header' },
      'JWT-auth',
    )
    .addTag('Auth', 'Xác thực & Phân quyền tài khoản')
    .addTag('Products & Categories', 'Quản lý Sản phẩm & Danh mục')
    .addTag('Orders', 'Quản lý Đơn hàng & Trạng thái giao hàng')
    .addTag('Pay2S Payment', 'Cổng thanh toán tự động Pay2S & Webhook IPN')
    .addTag('Cart', 'Giỏ hàng người dùng')
    .addTag('Users & Addresses', 'Tài khoản Khách hàng & Sổ địa chỉ')
    .addTag('Comments & Reviews', 'Bình luận & Đánh giá sản phẩm')
    .addTag('CMS Admin', 'API Quản trị trang CMS')
    .addTag('Gamification & Rewards', 'Tích điểm, Đổi quà & Điểm danh hàng ngày')
    .addTag('AI Recommendations', 'Gợi ý sản phẩm thông minh AI')
    .addTag('Vouchers & Discounts', 'Mã giảm giá & Khuyến mãi')
    .addTag('Banners & Media', 'Banner quảng cáo & Thư viện hình ảnh')
    .addTag('Notifications', 'Thông báo hệ thống & Đẩy Zalo ZNS')
    .addTag('Chat Support', 'Hệ thống Live Chat CSKH')
    .addTag('Analytics & Reports', 'Báo cáo & Thống kê doanh thu')
    .addTag('Health Check', 'Kiểm tra trạng thái máy chủ')
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [SuccessResponseDto, ErrorResponseDto],
  });
  SwaggerModule.setup('api/docs', app, document);

  app.use((req: Request, res: Response, next: NextFunction) => {
    try {
      logger.log(`${req.method} ${req.url}`, 'HTTP');
    } catch (error) {
      logger.warn('Request logging failed', 'HTTP');
    }
    next();
  });

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : true; // Default fallback to allow all origins in development

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-zalo-user-id',
      'ngrok-skip-browser-warning',
      'bypass-tunnel-reminder',
      'Access-Control-Request-Headers',
      'Access-Control-Request-Method',
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Zalo domain verification - wildcard handler for any zalo_verifier*.html file
  app.use((req: Request, res: Response, next: NextFunction) => {
    const p: string = req.path;
    if (
      (p.startsWith('/zalo_verifier') ||
        p.startsWith('/zalo-platform-site-verification')) &&
      p.endsWith('.html')
    ) {
      const code = p.slice(1, -5); // strip leading / and .html
      res.setHeader('Content-Type', 'text/html');
      res.send(
        `<html><head><meta name="zalo-platform-site-verification" content="${code}" /></head><body>${code}</body></html>`,
      );
      return;
    }
    next();
  });

  // Serve backend uploads directory statically
  const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
  if (!fs.existsSync(path.join(__dirname, '..', 'public'))) {
    fs.mkdirSync(path.join(__dirname, '..', 'public'), { recursive: true });
  }
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Serve static files dynamically based on environment
  const miniAppDistPath = process.env.MINI_APP_DIST_PATH || path.join(__dirname, '..', '..', 'zalo-mini-app', 'dist');
  if (fs.existsSync(miniAppDistPath)) {
    app.use(express.static(miniAppDistPath));
    const assetsPath = path.join(miniAppDistPath, 'assets');
    if (fs.existsSync(assetsPath)) {
      app.use(express.static(assetsPath));
    }
  }

  const port = process.env.PORT ?? 3000;
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);

  logger.log(
    `Application is running on: http://${host === '0.0.0.0' ? '0.0.0.0' : host}:${port}`,
  );
  logger.log(
    `API documentation available at: http://${host === '0.0.0.0' ? '0.0.0.0' : host}:${port}/api/docs`,
  );
}

void bootstrap();
