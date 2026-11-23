import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { AuthResult, ApiResponse } from '@stream-music/shared';
import { authStore } from '../features/auth/auth-store';

/** Cliente HTTP base. Apunta a /api/v1 (proxyeado a la API en desarrollo). */
export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: { Accept: 'application/json' },
});

// Adjunta el access token a cada petición.
apiClient.interceptors.request.use((config) => {
  const token = authStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Endpoints de auth que NO deben disparar el refresh automático.
const NO_REFRESH = ['auth/login', 'auth/register', 'auth/refresh'];

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = authStore.getState();
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post<ApiResponse<AuthResult>>('/api/v1/auth/refresh', {
      refreshToken,
    });
    const result = data.data;
    authStore.getState().setAuth(result);
    return result.accessToken;
  } catch {
    authStore.getState().clear();
    return null;
  }
}

// Renueva el access token ante un 401 y reintenta la petición una vez.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const url = original?.url ?? '';
    const isAuthEndpoint = NO_REFRESH.some((p) => url.includes(p));

    if (error.response?.status === 401 && original && !original._retried && !isAuthEndpoint) {
      original._retried = true;
      refreshing ??= refreshAccessToken().finally(() => {
        refreshing = null;
      });
      const newToken = await refreshing;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      }
    }
    return Promise.reject(error);
  },
);
