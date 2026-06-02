import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EMAIL_QUEUE, EmailJob } from './constants';
import { MailService } from '../mail/mail.service';
import type { PasswordResetJobData } from './email-queue.service';

/** Consumes the email queue and delivers messages via MailService. */
@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mail: MailService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name as EmailJob) {
      case EmailJob.PasswordReset: {
        const { to, resetUrl } = job.data as PasswordResetJobData;
        await this.mail.sendPasswordReset(to, resetUrl);
        break;
      }
      default:
        this.logger.warn(`Unhandled email job type: ${job.name}`);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error): void {
    this.logger.error(
      `Email job ${job.id ?? '?'} (${job.name}) failed: ${err.message}`,
    );
  }

  // Swallow transient connection errors (e.g. Redis unavailable in local dev) so
  // they surface as warnings rather than crashing the process.
  @OnWorkerEvent('error')
  onError(err: Error): void {
    this.logger.warn(`Email worker error: ${err.message}`);
  }
}
