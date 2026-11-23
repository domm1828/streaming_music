import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getList, getOne, mutate } from '../../lib/http';
import type { HistoryItem, Insights, ListeningStatus, ProfileLink, PublicProfile, PublicUser } from '../library/types';

export interface ProfileInput {
  name?: string;
  bio?: string;
  image?: string;
  coverImage?: string;
  country?: string;
  links?: ProfileLink[];
}

export function usePublicProfile(username: string) {
  return useQuery({
    queryKey: ['profile', username],
    queryFn: () => getOne<PublicProfile>(`profiles/${username}`),
    enabled: Boolean(username),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProfileInput) => mutate<PublicUser>('patch', 'me/profile', input),
    onSuccess: (user) => qc.invalidateQueries({ queryKey: ['profile', user.username] }),
  });
}

export function useListening() {
  return useQuery({
    queryKey: ['listening'],
    queryFn: () => getOne<ListeningStatus>('me/listening'),
  });
}

export function useInsights(days = 30) {
  return useQuery({
    queryKey: ['insights', days],
    queryFn: () => getOne<Insights>('me/insights', { days }),
  });
}

export function useHistory() {
  return useQuery({
    queryKey: ['history'],
    queryFn: () => getList<HistoryItem>('tracks/plays/me', { perPage: 50 }),
  });
}
