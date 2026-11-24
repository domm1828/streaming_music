import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse } from '@stream-music/shared';
import { apiClient } from '../../lib/api-client';
import { getList, getOne, mutate } from '../../lib/http';
import type { Album, Artist, Genre, Paginated, Track } from '../catalog/types';

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
export function useUpdateArtist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; name?: string; bio?: string; image?: string; verified?: boolean }) =>
      mutate<Artist>('patch', `artists/${id}`, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-artists'] }),
  });
}

// --- Álbumes ---
export function useAdminAlbums(search: string, page: number) {
  return useQuery<Paginated<Album>>({
    queryKey: ['admin-albums', search, page],
    queryFn: () => getList('albums', { search, page, perPage: 20 }),
  });
}
export function useUpdateAlbum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; name?: string; image?: string; description?: string; releaseDate?: string }) =>
      mutate<Album>('patch', `albums/${id}`, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-albums'] }),
  });
}
export function useDeleteAlbum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mutate('delete', `albums/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-albums'] }),
  });
}

// --- Pistas ---
export function useAdminTracks(search: string, page: number) {
  return useQuery<Paginated<Track>>({
    queryKey: ['admin-tracks', search, page],
    queryFn: () => getList('tracks', { search, page, perPage: 20 }),
  });
}
export function useUpdateTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; name?: string; number?: number }) =>
      mutate<Track>('patch', `tracks/${id}`, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tracks'] }),
  });
}
export function useDeleteTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mutate('delete', `tracks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tracks'] }),
  });
}

// --- Letras (por pista) ---
export interface TrackLyric {
  text: string;
  isSynced: boolean;
}
export function useTrackLyrics(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['track-lyrics', id],
    queryFn: () => getOne<TrackLyric | null>(`tracks/${id}/lyrics`),
    enabled,
  });
}
export function useUpsertLyrics() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, text, isSynced }: { id: string; text: string; isSynced?: boolean }) =>
      mutate('put', `tracks/${id}/lyrics`, { text, isSynced }),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['track-lyrics', v.id] }),
  });
}
export function useDeleteLyrics() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mutate('delete', `tracks/${id}/lyrics`),
    onSuccess: (_d, id) => qc.invalidateQueries({ queryKey: ['track-lyrics', id] }),
  });
}

// --- Subida de imagen ---
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

// --- Géneros ---
export interface GenreStats {
  _id: string;
  name: string;
  displayName: string;
  image: string | null;
  popularity: number;
  artistsCount: number;
  createdAt: string;
  updatedAt: string;
}
export function useAdminGenres() {
  return useQuery({ queryKey: ['admin-genres'], queryFn: () => getOne<GenreStats[]>('genres/with-stats') });
}
export function useCreateGenre() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (displayName: string) => mutate<Genre>('post', 'genres', { name: displayName, displayName }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-genres'] }),
  });
}
export function useUpdateGenre() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; displayName?: string; image?: string }) =>
      mutate<Genre>('patch', `genres/${id}`, dto),
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
