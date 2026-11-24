import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getOne, mutate } from '../../lib/http';

export interface Role {
  _id: string;
  name: string;
  description: string;
  permissions: string[];
  default: boolean;
  userCount: number;
  system: boolean;
}
export interface PermissionItem {
  group: string;
  value: string;
  label: string;
}
export interface RoleInput {
  name: string;
  description?: string;
  permissions?: string[];
  default?: boolean;
}

export function useRoles() {
  return useQuery({ queryKey: ['admin-roles'], queryFn: () => getOne<Role[]>('roles') });
}
export function usePermissionCatalog() {
  return useQuery({
    queryKey: ['permission-catalog'],
    queryFn: () => getOne<PermissionItem[]>('roles/permissions'),
    staleTime: 5 * 60_000,
  });
}
export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RoleInput) => mutate<Role>('post', 'roles', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-roles'] }),
  });
}
export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: RoleInput & { id: string }) => mutate<Role>('patch', `roles/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-roles'] }),
  });
}
export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mutate<{ message: string }>('delete', `roles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-roles'] }),
  });
}
