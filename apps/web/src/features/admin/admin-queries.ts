import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthResult } from '@stream-music/shared';
import { getList, getOne, mutate } from '../../lib/http';
import type { Paginated } from '../catalog/types';

export interface AdminUser {
  _id: string;
  name: string;
  username: string;
  email: string;
  type: string;
  bannedAt: string | null;
  roles: { _id: string; name: string }[];
  createdAt?: string;
}

export interface Role {
  _id: string;
  name: string;
  description?: string;
  permissions: string[];
}

export function useAdminUsers(search: string, page: number) {
  return useQuery<Paginated<AdminUser>>({
    queryKey: ['admin-users', search, page],
    queryFn: () => getList<AdminUser>('users', { search, page, perPage: 20 }),
  });
}

export function useRoles() {
  return useQuery({ queryKey: ['roles'], queryFn: () => getOne<Role[]>('users/roles/all') });
}

export function useSetUserRoles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, roleIds }: { id: string; roleIds: string[] }) =>
      mutate<AdminUser>('patch', `users/${id}/roles`, { roleIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useSetBan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, banned }: { id: string; banned: boolean }) =>
      mutate<AdminUser>('post', `users/${id}/${banned ? 'ban' : 'unban'}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useImpersonate() {
  return useMutation({
    mutationFn: (userId: string) => mutate<AuthResult>('post', `auth/impersonate/${userId}`),
  });
}

// --- Exportaciones CSV ---
export interface ExportJob {
  _id: string;
  type: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  rows: number;
  filePath: string | null;
  error: string | null;
  createdAt: string;
}

export function useExports() {
  return useQuery({
    queryKey: ['exports'],
    queryFn: () => getOne<ExportJob[]>('admin/exports'),
    refetchInterval: (query) => {
      const jobs = query.state.data as ExportJob[] | undefined;
      return jobs?.some((j) => j.status === 'pending' || j.status === 'running') ? 1500 : false;
    },
  });
}

export function useCreateExport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (type: string) => mutate<ExportJob>('post', 'admin/exports', { type }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exports'] }),
  });
}
