import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const { message: msg, error } = res as Record<string, unknown>;
        if (msg) {
          message = Array.isArray(msg) ? msg.join(', ') : String(msg);
        }
        if (error) {
          code = String(error);
        }
      }
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        path: request.url,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
