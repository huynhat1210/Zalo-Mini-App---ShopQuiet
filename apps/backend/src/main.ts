import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PinoLogger } from './common/logger/logger.service';

import * as fs from 'fs';
import * as path from 'path';
import * as express from 'express';
import type { NextFunction, Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'], // Enable basic default logger to diagnose bootstrap crashes
  });

  // Get Pino logger instance
  const logger = await app.resolve(PinoLogger);
  logger.log('Starting application...');

  // Enable global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

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

  // Enable rate limiting
  app.enableShutdownHooks();

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('ShopQuiet API')
    .setDescription('Zalo Mini App E-Commerce API Documentation')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('products', 'Product management')
    .addTag('cart', 'Shopping cart')
    .addTag('orders', 'Order management')
    .addTag('users', 'User management')
    .addTag('notifications', 'Notifications')
    .addTag('favorites', 'Favorites')
    .addTag('comments', 'Product comments')
    .addTag('vouchers', 'Voucher management')
    .addTag('banners', 'Banner management')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.use((req: Request, res: Response, next: NextFunction) => {
    try {
      logger.log(`${req.method} ${req.url}`, 'HTTP');
    } catch (error) {
      logger.warn('Request logging failed', 'HTTP');
    }
    next();
  });

  app.enableCors({
    origin: true,
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

  app.use(
    express.static('d:\\Zalo Mini App e-commerce\\apps\\zalo-mini-app\\dist'),
  );
  app.use(
    express.static(
      'd:\\Zalo Mini App e-commerce\\apps\\zalo-mini-app\\dist\\assets',
    ),
  );

  app.setGlobalPrefix('api');
  const port = process.env.PORT ?? 3000;
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);

  logger.log(`Application is running on: http://${host === '0.0.0.0' ? '0.0.0.0' : host}:${port}`);
  logger.log(`API documentation available at: http://${host === '0.0.0.0' ? '0.0.0.0' : host}:${port}/api/docs`);
}

void bootstrap();
