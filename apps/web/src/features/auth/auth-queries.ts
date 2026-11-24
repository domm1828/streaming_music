import { useMutation, useQuery } from '@tanstack/react-query';
import type { ApiResponse, AuthResult, BootstrapData } from '@stream-music/shared';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from './auth-store';

interface RegisterPayload {
  name: string;
  username: string;
  email: string;
  password: string;
}
interface LoginPayload {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export type LoginResult = AuthResult | { twoFactorRequired: true };
export function isTwoFactorRequired(r: LoginResult): r is { twoFactorRequired: true } {
  return (r as { twoFactorRequired?: boolean }).twoFactorRequired === true;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const { data } = await apiClient.post<ApiResponse<T>>(url, body);
  return data.data;
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: (payload: RegisterPayload) => post<AuthResult>('auth/register', payload),
    onSuccess: (result) => setAuth(result),
  });
}

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: (payload: LoginPayload) => post<LoginResult>('auth/login', payload),
    onSuccess: (result) => {
      if (!isTwoFactorRequired(result)) setAuth(result);
    },
  });
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  return useMutation({
    mutationFn: async () => {
      if (refreshToken) {
        await apiClient.post('auth/logout', { refreshToken }).catch(() => undefined);
      }
    },
    onSettled: () => clear(),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => post<{ message: string }>('auth/password/forgot', { email }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (payload: { email: string; code: string; password: string }) =>
      post<{ message: string }>('auth/password/reset', payload),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (payload: { email: string; code: string }) =>
      post<{ message: string }>('auth/verify-email', payload),
  });
}

/** Carga el estado inicial y sincroniza el usuario en el store. */
export function useBootstrap() {
  const setUser = useAuthStore((s) => s.setUser);
  return useQuery({
    queryKey: ['bootstrap'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<BootstrapData>>('bootstrap');
      setUser(data.data.user);
      return data.data;
    },
  });
}
