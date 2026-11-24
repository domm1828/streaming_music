import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse } from '@stream-music/shared';
import { apiClient } from '../../lib/api-client';
import { getList } from '../../lib/http';
import type { Paginated } from '../catalog/types';

export interface BackstageRequestInput {
  type: 'new' | 'claim';
  artistName: string;
  artistId?: string;
  message?: string;
  attachments?: File[];
}

export interface MyBackstageRequest {
  _id: string;
  type: 'new' | 'claim';
  artistName: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewNote: string | null;
  createdAt: string;
}

export function useSubmitBackstage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BackstageRequestInput) => {
      const form = new FormData();
      form.append('type', input.type);
      form.append('artistName', input.artistName);
      if (input.artistId) form.append('artistId', input.artistId);
      if (input.message) form.append('message', input.message);
      (input.attachments ?? []).forEach((f) => form.append('attachments', f));
      const { data } = await apiClient.post<ApiResponse<MyBackstageRequest>>('backstage', form);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-backstage'] }),
  });
}

export function useMyBackstage() {
  return useQuery<Paginated<MyBackstageRequest>>({
    queryKey: ['my-backstage'],
    queryFn: () => getList<MyBackstageRequest>('me/backstage', { perPage: 20 }),
  });
}
