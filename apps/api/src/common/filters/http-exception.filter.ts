// src/common/filters/http-exception.filter.ts — adapted from zylosync:
// same envelope (success/statusCode/timestamp/path/method), minus Sentry,
// with Prisma error classification for our generated client path.
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '../../../prisma/generated/client';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      this.respondHttpException(exception, request, response);
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.respondKnownPrisma(exception, request, response);
      return;
    }
    if (exception instanceof Prisma.PrismaClientValidationError) {
      this.respond(
        400,
        request,
        response,
        { error: 'Validation failed', message: 'Invalid data passed to the database query.' },
        exception,
      );
      return;
    }
    if (exception instanceof Prisma.PrismaClientUnknownRequestError) {
      this.respond(
        503,
        request,
        response,
        {
          error: 'Database unavailable',
          message:
            'A database request failed before completion. Retry, and check DATABASE_URL if it persists.',
        },
        exception,
      );
      return;
    }

    // Service threw plain Error "X not found" instead of NotFoundException.
    const msg = (exception as Error)?.message ?? '';
    const notFoundMatch = msg.match(/^([A-Z][\w\s]+?) not found$/);
    if (notFoundMatch) {
      this.respond(404, request, response, { error: 'Not Found', message: msg }, exception);
      return;
    }

    // Empty-body TypeErrors — client sent no/malformed body.
    if (
      /is not iterable|Cannot read properties of undefined \(reading '(map|filter|forEach|reduce|find|some|every|length)'/.test(
        msg,
      )
    ) {
      this.respond(
        400,
        request,
        response,
        {
          error: 'Bad Request',
          message:
            'Request body is missing or malformed. Send a JSON object matching the endpoint schema (see /api/docs).',
        },
        exception,
      );
      return;
    }

    const err = exception as Error;
    this.logger.error(
      `Unhandled exception: ${request.method} ${request.url} - ${err?.name ?? 'Error'}: ${msg}`,
      err?.stack,
    );
    this.respond(
      500,
      request,
      response,
      { error: 'Internal Server Error', message: 'An unexpected error occurred.' },
      exception,
    );
  }

  private respondHttpException(
    exception: HttpException,
    request: Request,
    response: Response,
  ) {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    const error =
      typeof exceptionResponse === 'string'
        ? { message: exceptionResponse }
        : exceptionResponse;
    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...error,
    };
    response.status(status).json(errorResponse);
  }

  private respondKnownPrisma(
    exception: Prisma.PrismaClientKnownRequestError,
    request: Request,
    response: Response,
  ) {
    switch (exception.code) {
      case 'P2002': {
        // Unique constraint — surface the target fields when Prisma exposes them.
        const target = exception.meta?.target;
        const targetStr = Array.isArray(target) ? target.join(', ') : String(target ?? 'field');
        this.respond(
          409,
          request,
          response,
          {
            error: 'Conflict',
            message: `A record with this ${targetStr} already exists.`,
          },
          exception,
        );
        return;
      }
      case 'P2025':
        this.respond(
          404,
          request,
          response,
          { error: 'Not Found', message: 'Record not found.' },
          exception,
        );
        return;
      case 'P2003':
        this.respond(
          409,
          request,
          response,
          {
            error: 'Conflict',
            message: 'Operation would violate a reference constraint (related records exist).',
          },
          exception,
        );
        return;
      default:
        this.respond(
          400,
          request,
          response,
          { error: 'Database error', message: `Database operation failed (${exception.code}).` },
          exception,
        );
        return;
    }
  }

  private respond(
    status: number,
    request: Request,
    response: Response,
    body: Record<string, unknown>,
    exception?: unknown,
  ) {
    if (status >= 500 && exception) {
      this.logger.error(
        `${request.method} ${request.url} - ${status}: ${JSON.stringify(body)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }
    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...body,
    });
  }
}
