import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const correlationHeader = request.headers['x-correlation-id'];
    const correlationId =
      (Array.isArray(correlationHeader)
        ? correlationHeader[0]
        : correlationHeader) || randomUUID();
    request.headers['x-correlation-id'] = correlationId;

    const { method, url } = request;
    const now = Date.now();

    // Redact sensitive fields in request body
    const body = this.redact(request.body);

    this.logger.log(
      `[${correlationId}] Incoming request: ${method} ${url} | Body: ${JSON.stringify(body)}`,
    );

    return next.handle().pipe(
      tap((data) => {
        const delay = Date.now() - now;
        const statusCode = response.statusCode;
        const redactedResponse = this.redact(data);

        this.logger.log(
          `[${correlationId}] Outgoing response: ${method} ${url} | Status: ${statusCode} | Duration: ${delay}ms | Response: ${JSON.stringify(redactedResponse)}`,
        );
      }),
    );
  }

  private redact(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.redact(item));
    }
    if (!value || typeof value !== 'object') {
      return value;
    }

    const sensitiveFields = [
      'password',
      'passwordHash',
      'token',
      'accessToken',
      'refreshToken',
      'refreshTokenHash',
      'stripeKey',
      'clientSecret',
      'secret',
    ];

    const source = value as Record<string, unknown>;
    const copy: Record<string, unknown> = {};

    for (const key of Object.keys(source)) {
      const current = source[key];
      if (current && typeof current === 'object') {
        copy[key] = this.redact(current);
      } else if (
        sensitiveFields.includes(key.toLowerCase()) ||
        sensitiveFields.some((s) => key.toLowerCase().includes(s.toLowerCase()))
      ) {
        copy[key] = '[REDACTED]';
      } else {
        copy[key] = current;
      }
    }

    return copy;
  }
}
