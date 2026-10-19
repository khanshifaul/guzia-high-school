// src/main.ts — adapted from zylosync's bootstrap: same middleware order
// (body limits → security headers → cookie parser → prefix → pipes →
// filters → CORS → Swagger), minus Sentry/Redis/CSRF/tenancy.
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// @ts-ignore - cookie-parser ships no types for its CJS entry
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Body limit bump for future uploads (assignments/sources are text+files).
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  // Security headers (API is reachable directly during the demo).
  app.use((req: Request, res: Response, next: () => void) => {
    void req;
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(cookieParser());
  app.enableShutdownHooks();

  // All routes live under /api (health excluded so compose/curl can hit /health).
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter(), new ValidationExceptionFilter());

  // Web app runs on :3000 and proxies /api server-side; credentials flow
  // through the httpOnly cookie, so CORS must allow it explicitly.
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3004',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Guzia Bilateral High School API')
    .setDescription(
      'School management API: auth (cookie JWT), students, teachers, classes, attendance, exams/grading, fees, admissions, notices, AI (at-risk + teacher toolkit).',
    )
    .setVersion('0.1.0')
    .addCookieAuth('ghs_token')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') ?? 4000;
  await app.listen(port);

  console.log(`🚀 API running on: http://localhost:${port}`);
  console.log(`🚀 Swagger on: http://localhost:${port}/api/docs`);
}

bootstrap();
