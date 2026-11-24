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
export interface ArtistRef {
  _id: string;
  name: string;
  slug?: string;
  image?: string | null;
}
export interface AdminArtist {
  _id: string;
  name: string;
  slug: string;
  image: string | null;
  bio: string | null;
  verified: boolean;
  genres: Genre[];
  similar: ArtistRef[];
}
export function useAdminArtists(search: string, page: number) {
  return useQuery<Paginated<Artist & { slug?: string; verified?: boolean }>>({
    queryKey: ['admin-artists', search, page],
    queryFn: () => getList('artists', { search, page, perPage: 20 }),
  });
}
export function useAdminArtist(id: string | null) {
  return useQuery({
    queryKey: ['admin-artist', id],
    queryFn: () => getOne<AdminArtist>(`artists/${id}/edit`),
    enabled: Boolean(id),
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
    mutationFn: ({
      id,
      ...dto
    }: {
      id: string;
      name?: string;
      bio?: string;
      image?: string;
      verified?: boolean;
      genres?: string[];
      similar?: string[];
    }) => mutate<Artist>('patch', `artists/${id}`, dto),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['admin-artists'] });
      qc.invalidateQueries({ queryKey: ['admin-artist', v.id] });
    },
  });
}

// --- Álbumes ---
export interface AdminAlbumTrack {
  _id: string;
  name: string;
  number: number;
  artists?: { artist: ArtistRef }[];
}
export interface AdminAlbum {
  _id: string;
  name: string;
  image: string | null;
  description: string | null;
  releaseDate: string | null;
  artists: ArtistRef[];
  genres: Genre[];
  tracks: AdminAlbumTrack[];
}
export function useAdminAlbums(search: string, page: number) {
  return useQuery<Paginated<Album>>({
    queryKey: ['admin-albums', search, page],
    queryFn: () => getList('albums', { search, page, perPage: 20 }),
  });
}
export function useAdminAlbum(id: string | null) {
  return useQuery({
    queryKey: ['admin-album', id],
    queryFn: () => getOne<AdminAlbum>(`albums/${id}/edit`),
    enabled: Boolean(id),
  });
}
export function useUpdateAlbum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...dto
    }: {
      id: string;
      name?: string;
      image?: string;
      description?: string;
      releaseDate?: string;
      artists?: string[];
      genres?: string[];
    }) => mutate<Album>('patch', `albums/${id}`, dto),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['admin-albums'] });
      qc.invalidateQueries({ queryKey: ['admin-album', v.id] });
    },
  });
}
export function useReorderAlbumTracks(albumId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (trackIds: string[]) => mutate<AdminAlbum>('put', `albums/${albumId}/tracks/order`, { trackIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-album', albumId] }),
  });
}
export function useRemoveAlbumTrack(albumId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (trackId: string) => mutate<AdminAlbum>('delete', `albums/${albumId}/tracks/${trackId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-album', albumId] }),
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
