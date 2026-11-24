import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiErrorResponse, ValidationErrors } from '@stream-music/shared';
import { captureException } from '../../observability/sentry';

/**
 * Filtro global de excepciones. Normaliza todos los errores al contrato
 * { status: 'error', statusCode, message, errors? }.
 * Los errores de validación (422) incluyen `errors` por campo.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';
    let errors: ValidationErrors | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        message = this.extractMessage(body);
        errors = this.extractValidationErrors(body);
        if (errors) {
          statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(exception.message, exception.stack);
    }

    const payload: ApiErrorResponse = {
      status: 'error',
      statusCode,
      message,
      ...(errors ? { errors } : {}),
    };

    if (statusCode >= 500) {
      this.logger.error(`${request.method} ${request.url} -> ${statusCode}: ${message}`);
      captureException(exception); // Reporta a Sentry si está configurado.
    }

    response.status(statusCode).json(payload);
  }

  private extractMessage(body: Record<string, unknown>): string {
    const raw = body.message ?? body.error;
    if (Array.isArray(raw)) return 'Error de validación';
    if (typeof raw === 'string') return raw;
    return 'Error';
  }

  /**
   * class-validator (vía ValidationPipe) devuelve message como string[]
   * con la forma "campo mensaje". Lo transformamos a { campo: [mensajes] }.
   */
  private extractValidationErrors(body: Record<string, unknown>): ValidationErrors | undefined {
    const raw = body.message;
    if (!Array.isArray(raw)) return undefined;
    const errors: ValidationErrors = {};
    for (const entry of raw as string[]) {
      const field = entry.split(' ')[0] || '_';
      (errors[field] ??= []).push(entry);
    }
    return errors;
  }
}
