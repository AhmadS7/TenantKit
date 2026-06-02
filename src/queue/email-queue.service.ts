import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EMAIL_QUEUE, EmailJob } from './constants';

export interface PasswordResetJobData {
  to: string;
  resetUrl: string;
}

/** Thin wrapper around the BullMQ email queue used by the rest of the app. */
@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);

  constructor(
    @InjectQueue(EMAIL_QUEUE)
    private readonly queue: Queue,
  ) {}

  async enqueuePasswordReset(data: PasswordResetJobData): Promise<void> {
    try {
      await this.queue.add(EmailJob.PasswordReset, data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: 100,
      });
    } catch (err) {
      // Never fail the originating request when the queue/Redis is unavailable:
      // the DB reset token is the source of truth and the user can retry. Log
      // loudly so a delivery outage is visible rather than silently swallowed.
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to enqueue password-reset email for ${data.to}: ${message}`,
      );
    }
  }
}
