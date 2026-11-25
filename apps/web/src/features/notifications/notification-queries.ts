import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getList, getOne, mutate } from '../../lib/http';
import { useAuth } from '../auth/use-auth';
import type { Paginated } from '../catalog/types';

export interface AppNotification {
  _id: string;
  type: string;
  title: string;
  body: string | null;
  data: unknown;
  readAt: string | null;
  createdAt: string;
}

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  return useQuery<Paginated<AppNotification>>({
    queryKey: ['notifications'],
    queryFn: () => getList<AppNotification>('me/notifications', { perPage: 30 }),
    enabled: isAuthenticated,
  });
}

export function useUnreadCount() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => getOne<{ count: number }>('me/notifications/unread-count'),
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mutate('post', `me/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => mutate('post', 'me/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export type NotificationCategory = 'social' | 'backstage' | 'announcements';

export interface NotificationPreferences {
  emailNotifications: boolean;
  categories: Record<NotificationCategory, boolean>;
}

export type NotificationPreferencesInput = {
  emailNotifications?: boolean;
  categories?: Partial<Record<NotificationCategory, boolean>>;
};

export function useNotificationPreferences() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: () => getOne<NotificationPreferences>('me/notifications/preferences'),
    enabled: isAuthenticated,
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prefs: NotificationPreferencesInput) =>
      mutate<NotificationPreferences>('put', 'me/notifications/preferences', prefs),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', 'preferences'] }),
  });
}
