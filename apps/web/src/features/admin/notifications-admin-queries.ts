import { useMutation } from '@tanstack/react-query';
import { mutate } from '../../lib/http';

export type AudienceKind = 'all' | 'verified' | 'role' | 'users';

export interface BroadcastInput {
  title: string;
  body?: string;
  link?: string;
  email?: boolean;
  audience: AudienceKind;
  roleId?: string;
  userIds?: string[];
}

export function usePreviewBroadcast() {
  return useMutation({
    mutationFn: (input: BroadcastInput) => mutate<{ count: number }>('post', 'admin/notifications/preview', input),
  });
}

export function useSendBroadcast() {
  return useMutation({
    mutationFn: (input: BroadcastInput) => mutate<{ sent: number }>('post', 'admin/notifications/broadcast', input),
  });
}
