import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Enable Helmet for secure HTTP headers (with loose content policy for Swagger dev UI)
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  }));

  // Enable dynamic CORS matching subdomains and credentials
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || /https?:\/\/(localhost|.*\.localhost|.*\.cortex\.app)(:\d+)?$/.test(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow custom client domains as well
      }
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
    .setTitle('Cortex API')
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
bootstrap();
