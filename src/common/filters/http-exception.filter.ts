import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { randomUUID } from 'crypto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    // Handle NestJS HttpExceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resContent = exception.getResponse();
      message =
        typeof resContent === 'object' &&
        resContent !== null &&
        'message' in resContent
          ? (resContent as { message: string | string[] }).message
          : exception.message;
    }
    // Handle TypeORM Query exceptions (like unique constraints violations)
    else if (exception instanceof QueryFailedError) {
      status = HttpStatus.BAD_REQUEST;
      const driverError = exception.driverError as { code?: string };
      if (driverError && driverError.code === '23505') {
        // Unique key constraint violation code in PG is 23505
        status = HttpStatus.CONFLICT;
        message = 'Resource already exists';
      } else {
        message = 'Database query failed';
      }
    }

    const errorMessage =
      exception instanceof Error ? exception.message : String(exception);
    const errorStack = exception instanceof Error ? exception.stack : undefined;

    const isProduction = process.env.NODE_ENV === 'production';
    const correlationHeader = request.headers['x-correlation-id'];
    const correlationId =
      (Array.isArray(correlationHeader)
        ? correlationHeader[0]
        : correlationHeader) || randomUUID();

    // Log the full detailed error internally
    this.logger.error(
      `[${correlationId}] Error on ${request.method} ${request.url}: ${errorMessage}`,
      errorStack,
    );

    response.status(status).json({
      statusCode: status,
      message: Array.isArray(message) ? message[0] : message,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId,
      ...(isProduction ? {} : { stack: errorStack }),
    });
  }
}
