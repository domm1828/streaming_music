import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getOne, mutate } from '../../lib/http';

export interface EmailSettings {
  transport: 'smtp' | 'log';
  host: string;
  port: number;
  secure: boolean;
  user: string;
  fromName: string;
  fromAddress: string;
  hasPassword: boolean;
}

export type EmailSettingsInput = Omit<EmailSettings, 'hasPassword'> & { password?: string };

export function useEmailSettings() {
  return useQuery({
    queryKey: ['admin-email-settings'],
    queryFn: () => getOne<EmailSettings>('admin/settings/email'),
  });
}

export function useSaveEmailSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: EmailSettingsInput) => mutate('put', 'admin/settings/email', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-email-settings'] }),
  });
}

export function useSendTestEmail() {
  return useMutation({
    mutationFn: (to?: string) => mutate<{ ok: boolean; error?: string; to: string }>('post', 'admin/settings/email/test', { to }),
  });
}
