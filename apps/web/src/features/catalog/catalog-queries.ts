import { useQuery } from '@tanstack/react-query';
import type { ApiResponse } from '@stream-music/shared';
import { apiClient } from '../../lib/api-client';
import type { Album, Artist, Genre, GenreOverview, Paginated, Track } from './types';

async function getOne<T>(url: string): Promise<T> {
  const { data } = await apiClient.get<ApiResponse<T>>(url);
  return data.data;
}
async function getList<T>(url: string, params?: Record<string, unknown>): Promise<Paginated<T>> {
  const { data } = await apiClient.get<Paginated<T>>(url, { params });
  return data;
}

export function useGenres() {
  return useQuery({ queryKey: ['genres'], queryFn: () => getOne<Genre[]>('genres') });
}

export function useGenreOverview(id: string) {
  return useQuery({
    queryKey: ['genre', id, 'overview'],
    queryFn: () => getOne<GenreOverview>(`genres/${id}/overview`),
  });
}

export function useArtists(search?: string) {
  return useQuery({
    queryKey: ['artists', search ?? ''],
    queryFn: () => getList<Artist>('artists', { search, perPage: 24 }),
  });
}

export function useArtist(id: string) {
  return useQuery({ queryKey: ['artist', id], queryFn: () => getOne<Artist>(`artists/${id}`) });
}

export function useArtistTracks(id: string) {
  return useQuery({
    queryKey: ['artist', id, 'tracks'],
    queryFn: () => getList<Track>(`artists/${id}/tracks`),
  });
}

export function useArtistAlbums(id: string) {
  return useQuery({
    queryKey: ['artist', id, 'albums'],
    queryFn: () => getList<Album>(`artists/${id}/albums`),
  });
}

export function useAlbum(id: string) {
  return useQuery({ queryKey: ['album', id], queryFn: () => getOne<Album>(`albums/${id}`) });
}

export function useTrack(id: string) {
  return useQuery({ queryKey: ['track', id], queryFn: () => getOne<Track>(`tracks/${id}`) });
}
