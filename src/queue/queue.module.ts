import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EMAIL_QUEUE } from './constants';
import { EmailQueueService } from './email-queue.service';
import { EmailProcessor } from './email.processor';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          // Required by BullMQ for blocking worker commands.
          maxRetriesPerRequest: null,
          // Fail enqueue fast when Redis is down (caught in EmailQueueService)
          // instead of buffering jobs in memory.
          enableOfflineQueue: false,
          // Defer connecting until first use, matching RedisModule / the
          // throttler store so a missing Redis never eagerly spams reconnects.
          lazyConnect: true,
        },
      }),
    }),
    BullModule.registerQueue({ name: EMAIL_QUEUE }),
    MailModule,
  ],
  // The worker (EmailProcessor) opens a live blocking Redis connection at boot.
  // Skip it under test — like the throttler's skipIf — so the e2e suite never
  // spins up a background worker retrying against Redis. Enqueue still works
  // (and fails safe) via EmailQueueService.
  providers:
    process.env.NODE_ENV === 'test'
      ? [EmailQueueService]
      : [EmailQueueService, EmailProcessor],
  exports: [EmailQueueService],
})
export class QueueModule {}
