import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getOne, mutate } from '../../lib/http';

export interface ProvidersSettings {
  spotify: { id: string; hasSecret: boolean };
  lastfm: { hasKey: boolean };
}

export interface ProvidersSettingsInput {
  spotify?: { id?: string; secret?: string };
  lastfm?: { apiKey?: string };
}

export function useProvidersSettings() {
  return useQuery({
    queryKey: ['admin-providers-settings'],
    queryFn: () => getOne<ProvidersSettings>('admin/settings/providers'),
  });
}

export function useSaveProvidersSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProvidersSettingsInput) => mutate('put', 'admin/settings/providers', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-providers-settings'] }),
  });
}
