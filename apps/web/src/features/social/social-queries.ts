import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getList, getOne, mutate } from '../../lib/http';
import { useAuth } from '../auth/use-auth';
import type { FollowableType, FollowItem, LikeableType, LikeItem, RepostItem, RepostableType, UserRef } from '../library/types';

// ---- Likes ----
export function useMyLikes(type: LikeableType) {
  return useQuery({
    queryKey: ['likes', type],
    queryFn: () => getList<LikeItem>('me/likes', { type, perPage: 100 }),
  });
}

export function useLikeState(type: LikeableType, id: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['like-state', type, id],
    queryFn: () => getOne<{ liked: boolean }>(`me/likes/check/${type}/${id}`),
    enabled: isAuthenticated && Boolean(id),
  });
}

export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id, liked }: { type: LikeableType; id: string; liked: boolean }) =>
      liked ? mutate('delete', `me/likes/${type}/${id}`) : mutate('post', 'me/likes', { type, id }),
    onSuccess: (_data, { type, id }) => {
      qc.invalidateQueries({ queryKey: ['like-state', type, id] });
      qc.invalidateQueries({ queryKey: ['likes', type] });
    },
  });
}

// ---- Follows ----
export function useFollowing(type: FollowableType) {
  return useQuery({
    queryKey: ['following', type],
    queryFn: () => getList<FollowItem>('me/following', { type, perPage: 100 }),
  });
}

export function useFollowState(type: FollowableType, id: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['follow-state', type, id],
    queryFn: () => getOne<{ following: boolean }>(`me/following/check/${type}/${id}`),
    enabled: isAuthenticated && Boolean(id),
  });
}

export function useToggleFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id, following }: { type: FollowableType; id: string; following: boolean }) =>
      following ? mutate('delete', `me/following/${type}/${id}`) : mutate('post', 'me/following', { type, id }),
    onSuccess: (_data, { type, id }) => {
      qc.invalidateQueries({ queryKey: ['follow-state', type, id] });
      qc.invalidateQueries({ queryKey: ['following', type] });
    },
  });
}

export function useFollowers(type: FollowableType, id: string) {
  return useQuery({
    queryKey: ['followers', type, id],
    queryFn: () => getList<UserRef>(`followers/${type}/${id}`, { perPage: 100 }),
    enabled: Boolean(id),
  });
}

// ---- Reposts ----
export function useMyReposts() {
  return useQuery({
    queryKey: ['reposts', 'me'],
    queryFn: () => getList<RepostItem>('me/reposts', { perPage: 100 }),
  });
}

export function useToggleRepost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id, reposted }: { type: RepostableType; id: string; reposted: boolean }) =>
      reposted ? mutate('delete', `me/reposts/${type}/${id}`) : mutate('post', 'me/reposts', { type, id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reposts', 'me'] }),
  });
}
