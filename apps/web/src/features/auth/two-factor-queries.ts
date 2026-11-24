import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getOne, mutate } from '../../lib/http';

export interface TwoFactorSetup {
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string;
}

export function useTwoFactorStatus() {
  return useQuery({ queryKey: ['2fa', 'status'], queryFn: () => getOne<{ enabled: boolean }>('me/2fa/status') });
}

export function useTwoFactorSetup() {
  return useMutation({ mutationFn: () => mutate<TwoFactorSetup>('post', 'me/2fa/setup') });
}

export function useTwoFactorEnable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => mutate<{ recoveryCodes: string[] }>('post', 'me/2fa/enable', { code }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['2fa', 'status'] }),
  });
}

export function useTwoFactorDisable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => mutate<{ message: string }>('post', 'me/2fa/disable', { code }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['2fa', 'status'] }),
  });
}
