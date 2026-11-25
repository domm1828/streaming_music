import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getOne, mutate } from '../../lib/http';

export interface ProviderState {
  enable: boolean;
  id: string;
  hasSecret: boolean;
}

export interface AuthSettings {
  registrationEnabled: boolean;
  requireEmailConfirmation: boolean;
  requireAccount: boolean;
  google: ProviderState;
  facebook: ProviderState;
  twitter: ProviderState;
}

export interface ProviderInput {
  enable: boolean;
  id: string;
  secret?: string;
}

export interface AuthSettingsInput {
  registrationEnabled: boolean;
  requireEmailConfirmation: boolean;
  requireAccount: boolean;
  google: ProviderInput;
  facebook: ProviderInput;
  twitter: ProviderInput;
}

export function useAuthSettings() {
  return useQuery({
    queryKey: ['admin-auth-settings'],
    queryFn: () => getOne<AuthSettings>('admin/settings/auth'),
  });
}

export function useSaveAuthSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AuthSettingsInput) => mutate('put', 'admin/settings/auth', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-auth-settings'] });
      // Refresca los botones de login social (dependen de auth/social/providers).
      qc.invalidateQueries({ queryKey: ['social-providers'] });
      qc.invalidateQueries({ queryKey: ['bootstrap'] });
    },
  });
}
