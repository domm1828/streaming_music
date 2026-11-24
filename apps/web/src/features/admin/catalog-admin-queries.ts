import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getList, getOne, mutate } from '../../lib/http';
import type { Album, Artist, Genre, Paginated } from '../catalog/types';

export interface AdminChannel {
  _id: string;
  slug: string;
  name: string;
  type: string;
  position: number;
  public: boolean;
  internal: boolean;
  config: { sourceType: string; layout: string };
}

// --- Artistas ---
export function useAdminArtists(search: string, page: number) {
  return useQuery<Paginated<Artist & { slug?: string; verified?: boolean }>>({
    queryKey: ['admin-artists', search, page],
    queryFn: () => getList('artists', { search, page, perPage: 20 }),
  });
}
export function useCreateArtist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => mutate<Artist>('post', 'artists', { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-artists'] }),
  });
}
export function useDeleteArtist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mutate('delete', `artists/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-artists'] }),
  });
}

// --- Géneros ---
export function useAdminGenres() {
  return useQuery({ queryKey: ['admin-genres'], queryFn: () => getOne<Genre[]>('genres') });
}
export function useCreateGenre() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => mutate<Genre>('post', 'genres', { name, displayName: name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-genres'] }),
  });
}
export function useDeleteGenre() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mutate('delete', `genres/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-genres'] }),
  });
}

// --- Channels ---
export function useAdminChannels() {
  return useQuery({ queryKey: ['admin-channels'], queryFn: () => getOne<AdminChannel[]>('channels/admin') });
}
export function useRefreshChannels() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => mutate('post', 'channels/refresh'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-channels'] }),
  });
}
export function useDeleteChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mutate('delete', `channels/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-channels'] }),
  });
}

export type { Album };
