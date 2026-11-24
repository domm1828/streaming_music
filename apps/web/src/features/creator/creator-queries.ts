import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse } from '@stream-music/shared';
import { apiClient } from '../../lib/api-client';
import { getList, mutate } from '../../lib/http';
import type { Paginated, Track } from '../catalog/types';

export interface CreateTrackInput {
  name: string;
  artists?: string[];
  album?: string;
  genres?: string[];
  image?: string;
}

export function useCreateTrack() {
  return useMutation({
    mutationFn: (input: CreateTrackInput) => mutate<Track>('post', 'tracks', input),
  });
}

/** Sube el archivo de audio a una pista ya creada. */
export function useUploadTrackAudio() {
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await apiClient.post<ApiResponse<Track>>(`tracks/${id}/audio`, form);
      return data.data;
    },
  });
}

export function useMyTracks(page: number) {
  return useQuery<Paginated<Track>>({
    queryKey: ['my-tracks', page],
    queryFn: () => getList<Track>('tracks/mine', { page, perPage: 20 }),
  });
}

export function useUpdateMyTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; name?: string; genres?: string[]; image?: string }) =>
      mutate<Track>('patch', `tracks/${id}`, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-tracks'] }),
  });
}

export function useDeleteMyTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mutate('delete', `tracks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-tracks'] }),
  });
}

export interface CreateAlbumInput {
  name: string;
  image?: string;
  releaseDate?: string;
  artists?: string[];
  genres?: string[];
}

export function useCreateAlbum() {
  return useMutation({
    mutationFn: (input: CreateAlbumInput) => mutate<{ _id: string; name: string }>('post', 'albums', input),
  });
}

/** Sube una imagen (carátula) y devuelve su URL. */
export function useUploadImage() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await apiClient.post<ApiResponse<{ url: string }>>('admin/uploads/image', form);
      return data.data.url;
    },
  });
}
