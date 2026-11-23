/**
 * Contrato de respuestas de la API de Stream Music.
 * Tanto el backend como el frontend dependen de estas formas.
 */

export type ApiStatus = 'success' | 'error';

/** Envoltura estándar de toda respuesta exitosa de la API. */
export interface ApiResponse<T> {
  status: 'success';
  data: T;
}

/** Metadatos de paginación (length-aware). */
export interface PaginationMeta {
  currentPage: number;
  perPage: number;
  total: number;
  lastPage: number;
  nextPage: number | null;
  prevPage: number | null;
}

/** Respuesta paginada: lista de datos + metadatos de página. */
export interface PaginatedResponse<T> {
  status: 'success';
  data: T[];
  pagination: PaginationMeta;
}

/** Errores de validación por campo: { campo: [mensajes...] }. */
export type ValidationErrors = Record<string, string[]>;

/** Envoltura estándar de toda respuesta de error de la API. */
export interface ApiErrorResponse {
  status: 'error';
  statusCode: number;
  message: string;
  errors?: ValidationErrors;
}
