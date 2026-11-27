import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse } from '@stream-music/shared';
import { apiClient } from '../../lib/api-client';
import { getList, mutate } from '../../lib/http';

export type MediaKind = 'image' | 'audio' | 'video' | 'other';
export type MediaScope = 'all' | 'mine';

export interface MediaEntry {
  _id: string;
  url: string;
  path: string;
  filename: string;
  mime: string | null;
  size: number;
  kind: MediaKind;
  createdAt: string;
}

export interface UploadResult {
  url: string;
  id: string;
  kind: MediaKind;
  filename: string;
  size: number;
  deduped: boolean;
}

/** Sube un medio genérico (imagen/audio/video) a la biblioteca, con dedup en el backend. */
export function useUploadMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await apiClient.post<ApiResponse<UploadResult>>('admin/media', form);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media-library'] }),
  });
}

export interface GenerateImageInput {
  prompt: string;
  width?: number;
  height?: number;
  model?: string;
  seed?: number;
}

/** Genera una imagen con IA (Pollinations) en el backend; queda guardada en la biblioteca. */
export function useGenerateImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: GenerateImageInput) => {
      const { data } = await apiClient.post<ApiResponse<UploadResult>>('admin/uploads/generate', input);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media-library'] }),
  });
}

/** Lista la biblioteca: scope 'all' (admin, admin/files) o 'mine' (medios propios). */
export function useMediaLibrary(opts: { scope: MediaScope; kind?: MediaKind; q?: string; page: number; enabled?: boolean }) {
  const { scope, kind, q, page, enabled = true } = opts;
  const url = scope === 'mine' ? 'admin/media/mine' : 'admin/files';
  return useQuery({
    queryKey: ['media-library', scope, kind ?? 'all', q ?? '', page],
    queryFn: () =>
      getList<MediaEntry>(url, {
        page,
        perPage: 24,
        ...(kind ? { kind } : {}),
        ...(q && q.trim() ? { q: q.trim() } : {}),
      }),
    enabled,
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mutate('delete', `admin/files/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media-library'] }),
  });
}
