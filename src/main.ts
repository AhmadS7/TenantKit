import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TenantMiddleware } from './tenancy/tenant.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply tenant middleware globally
  app.use(new TenantMiddleware(app.get('DataSource')).use.bind(new TenantMiddleware(app.get('DataSource'))));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
