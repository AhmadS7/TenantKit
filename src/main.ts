import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const configService = app.get(ConfigService);

  // Enable Helmet for secure HTTP headers (with loose content policy for Swagger dev UI)
  app.use(
    helmet({
      contentSecurityPolicy:
        configService.get<string>('NODE_ENV') === 'production'
          ? undefined
          : false,
    }),
  );

  // CORS allowlist. The first-party localhost / *.tenantkit.app subdomains are
  // always permitted; any additional origins (e.g. tenant custom domains) must
  // be listed explicitly in the CORS_ORIGINS env var (comma-separated).
  const firstPartyOrigin =
    /^https?:\/\/(localhost|.*\.localhost|.*\.tenantkit\.app)(:\d+)?$/;
  const allowedOrigins = (configService.get<string>('CORS_ORIGINS') || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Requests without an Origin header (curl, server-to-server, same-origin).
      if (!origin) {
        callback(null, true);
        return;
      }
      if (firstPartyOrigin.test(origin) || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  });

  // Enable request logging globally
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Enable global sanitized exceptions
  app.useGlobalFilters(new HttpExceptionFilter());

  // Enable strict DTO request validations
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Enable API Versioning (/v1/, /v2/, etc.)
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Enable Swagger/OpenAPI docs
  const config = new DocumentBuilder()
    .setTitle('TenantKit API')
    .setDescription('Multi-tenant SaaS API endpoints')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
