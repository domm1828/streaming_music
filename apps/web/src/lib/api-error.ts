import { AxiosError } from 'axios';
import type { FieldValues, UseFormSetError, Path } from 'react-hook-form';
import type { ApiErrorResponse } from '@stream-music/shared';

/** Extrae el mensaje legible de un error de la API. */
export function getApiErrorMessage(error: unknown, fallback = 'Ocurrió un error'): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    if (data?.message) return data.message;
  }
  return fallback;
}

/** Aplica los errores de validación (422) del backend a un formulario de react-hook-form. */
export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): boolean {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    if (data?.errors) {
      for (const [field, messages] of Object.entries(data.errors)) {
        setError(field as Path<T>, { type: 'server', message: messages[0] });
      }
      return true;
    }
  }
  return false;
}
