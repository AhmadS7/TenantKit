import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Transactional email sender. When SMTP_HOST is configured it sends via
 * nodemailer; otherwise it runs in "dev mail mode" and logs the message instead
 * of sending (mirrors the Stripe Mock Sandbox / Redis fallback conventions).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null = null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.from = this.config.get<string>(
      'SMTP_FROM',
      'TenantKit <no-reply@tenantkit.app>',
    );

    const host = this.config.get<string>('SMTP_HOST');
    if (host) {
      const port = this.config.get<number>('SMTP_PORT', 587);
      const user = this.config.get<string>('SMTP_USER');
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user
          ? { user, pass: this.config.get<string>('SMTP_PASS') }
          : undefined,
      });
      this.logger.log(`SMTP transport configured for host ${host}.`);
    } else {
      this.logger.warn(
        'SMTP_HOST not set — running in dev mail mode (emails are logged, not sent).',
      );
    }
  }

  async send(options: SendMailOptions): Promise<void> {
    if (!this.transporter) {
      this.logger.log(
        `[Dev Mail] To: ${options.to} | Subject: ${options.subject}\n${options.text}`,
      );
      return;
    }
    await this.transporter.sendMail({ from: this.from, ...options });
    this.logger.log(`Email sent to ${options.to} ("${options.subject}").`);
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    const subject = 'Reset your TenantKit password';
    const text =
      'We received a request to reset your password.\n\n' +
      `Reset it using this link (valid for 1 hour):\n${resetUrl}\n\n` +
      'If you did not request this, you can safely ignore this email.';
    const html =
      `<p>We received a request to reset your password.</p>` +
      `<p><a href="${resetUrl}">Reset your password</a> (valid for 1 hour).</p>` +
      `<p>If you did not request this, you can safely ignore this email.</p>`;
    await this.send({ to, subject, text, html });
  }
}
