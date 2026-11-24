import type { ApiResponse } from '@stream-music/shared';
import { apiClient } from './api-client';
import type { Paginated } from '../features/catalog/types';

/** GET de un recurso envuelto en { status, data }. */
export async function getOne<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await apiClient.get<ApiResponse<T>>(url, { params });
  return data.data;
}

/** GET de una lista paginada { data, pagination }. */
export async function getList<T>(url: string, params?: Record<string, unknown>): Promise<Paginated<T>> {
  const { data } = await apiClient.get<Paginated<T>>(url, { params });
  return data;
}

/** POST/PATCH/PUT que devuelve { status, data }. */
export async function mutate<T>(
  method: 'post' | 'patch' | 'put' | 'delete',
  url: string,
  body?: unknown,
): Promise<T> {
  const { data } = await apiClient.request<ApiResponse<T>>({ method, url, data: body });
  return data.data;
}
