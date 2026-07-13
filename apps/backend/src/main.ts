import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import * as fs from 'fs';
import * as path from 'path';
import * as express from 'express';
import type { NextFunction, Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use((req: Request, res: Response, next: NextFunction) => {
    try {
      const logMsg = `[${new Date().toISOString()}] ${req.method} ${req.url}\n`;
      fs.appendFileSync(path.join(__dirname, '../../request_log.txt'), logMsg);
    } catch (error) {
      console.warn('Request logging failed:', error);
    }
    next();
  });

  app.enableCors({
    origin: true,
    credentials: true,
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
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
