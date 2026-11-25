import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getList, getOne, mutate } from '../../lib/http';
import type { FollowItem, PlaylistDetail, PlaylistSummary } from '../library/types';

export interface PlaylistInput {
  name: string;
  description?: string;
  image?: string;
  public?: boolean;
  collaborative?: boolean;
}

export function useMyPlaylists() {
  return useQuery({
    queryKey: ['my-playlists'],
    queryFn: () => getList<PlaylistSummary>('me/playlists', { perPage: 100 }),
  });
}

export function useFollowedPlaylists() {
  return useQuery({
    queryKey: ['following', 'playlist'],
    queryFn: () => getList<FollowItem>('me/following', { type: 'playlist', perPage: 100 }),
  });
}

export function usePlaylist(id: string) {
  return useQuery({
    queryKey: ['playlist', id],
    queryFn: () => getOne<PlaylistDetail>(`playlists/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreatePlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PlaylistInput) => mutate<PlaylistSummary>('post', 'playlists', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-playlists'] }),
  });
}

export function useUpdatePlaylist(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<PlaylistInput>) => mutate<PlaylistSummary>('patch', `playlists/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playlist', id] });
      qc.invalidateQueries({ queryKey: ['my-playlists'] });
    },
  });
}

export function useDeletePlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mutate<{ message: string }>('delete', `playlists/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-playlists'] }),
  });
}

export function useAddTracks(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (trackIds: string[]) => mutate<PlaylistDetail>('post', `playlists/${id}/tracks`, { trackIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['playlist', id] }),
  });
}

/** Agrega una pista a cualquier playlist (para menús contextuales). */
export function useAddTrackToPlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ playlistId, trackId }: { playlistId: string; trackId: string }) =>
      mutate<PlaylistDetail>('post', `playlists/${playlistId}/tracks`, { trackIds: [trackId] }),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['playlist', v.playlistId] }),
  });
}

export function useRemoveTrack(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (trackId: string) => mutate<PlaylistDetail>('delete', `playlists/${id}/tracks/${trackId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['playlist', id] }),
  });
}

export function useReorderTracks(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (trackIds: string[]) =>
      mutate<PlaylistDetail>('put', `playlists/${id}/tracks/order`, { trackIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['playlist', id] }),
  });
}
