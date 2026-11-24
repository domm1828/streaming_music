import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ApiResponse } from '@stream-music/shared';

/**
 * Envuelve toda respuesta exitosa en el contrato { status: 'success', data }.
 * Si el controlador ya devuelve un objeto con `pagination`, se preserva tal cual
 * (se asume que ya cumple el contrato PaginatedResponse).
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | T> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T> | T> {
    return next.handle().pipe(
      map((data) => {
        if (data !== null && typeof data === 'object' && 'pagination' in data) {
          return data as T;
        }
        return { status: 'success', data } as ApiResponse<T>;
      }),
    );
  }
}
