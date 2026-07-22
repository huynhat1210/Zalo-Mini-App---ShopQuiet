import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    const rawReq = request as any;
    const requestId = rawReq['request_id'] || '';
    const traceId = rawReq['trace_id'] || '';

    // Extract errors using validation format standard: { message, field, code }
    let errors: Array<{ message: string; field: string; code: string }> = [];

    if (exception instanceof HttpException) {
      const res: any = exception.getResponse();
      if (res && typeof res === 'object') {
        const rawMessage = res.message;
        if (Array.isArray(rawMessage)) {
          errors = rawMessage.map((msg: string) => {
            // Determine field name (first word from message)
            const firstWord = msg.split(' ')[0] || '';
            const field = firstWord.replace(/[^a-zA-Z0-9_]/g, '');

            // Generate standard error code
            let code = 'VALIDATION_ERROR';
            if (msg.includes('email')) {
              code = 'INVALID_EMAIL';
            } else if (
              msg.includes('should not be empty') ||
              msg.includes('empty')
            ) {
              code = 'REQUIRED_FIELD';
            } else {
              code = `INVALID_${field.toUpperCase()}`;
            }

            return {
              message: msg,
              field: field || 'general',
              code,
            };
          });
        } else if (typeof rawMessage === 'string') {
          errors = [
            {
              message: rawMessage,
              field: 'general',
              code: 'BAD_REQUEST',
            },
          ];
        }
      }
    }

    if (errors.length === 0) {
      errors = [
        {
          message: message,
          field: 'general',
          code:
            exception instanceof HttpException
              ? `HTTP_${status}`
              : 'INTERNAL_SERVER_ERROR',
        },
      ];
    }

    const errorResponse = {
      message:
        status === HttpStatus.BAD_REQUEST ? 'Validation failed' : message,
      errors: errors,
      meta: {
        request_id: requestId,
        trace_id: traceId,
      },
    };

    this.logger.error(
      `${request.method} ${request.url} - Status: ${status} - Message: ${message}`,
      exception instanceof Error ? exception.stack : '',
    );

    response.status(status).json(errorResponse);
  }
}
