import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getList, getOne, mutate } from '../../lib/http';
import type { Paginated } from '../catalog/types';

// --- Settings ---
export interface Setting {
  _id: string;
  key: string;
  value: unknown;
  isPublic: boolean;
  group: string;
}

export function useAdminSettings() {
  return useQuery({ queryKey: ['admin-settings'], queryFn: () => getOne<Setting[]>('admin/settings') });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: { key: string; value: unknown }[]) =>
      mutate<{ updated: number }>('put', 'admin/settings', { settings }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      qc.invalidateQueries({ queryKey: ['bootstrap'] });
    },
  });
}

// --- Analytics ---
export interface TopEntity {
  id: string;
  name: string;
  plays: number;
}

export interface TopUser extends TopEntity {
  username: string;
}

export interface NamedCount {
  label: string;
  plays: number;
}

export interface AnalyticsOverview {
  days: number;
  totals: { users: number; artists: number; albums: number; tracks: number; plays: number };
  newUsers: number;
  playsByDay: { day: string; plays: number }[];
  topTracks: TopEntity[];
  topArtists: TopEntity[];
  topAlbums: TopEntity[];
  topUsers: TopUser[];
  topCountries: { country: string; plays: number }[];
  devices: NamedCount[];
  platforms: NamedCount[];
}

export function useAdminAnalytics(days: number) {
  return useQuery({
    queryKey: ['admin-analytics', days],
    queryFn: () => getOne<AnalyticsOverview>('admin/analytics', { days }),
  });
}

export interface MenuItem {
  label: string;
  path: string;
  auth?: boolean;
}

// --- Logs ---
export interface LogEntry {
  _id: string;
  level: 'error' | 'email';
  message: string;
  context: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export function useAdminLogs(level: string, page: number) {
  return useQuery<Paginated<LogEntry>>({
    queryKey: ['admin-logs', level, page],
    queryFn: () => getList<LogEntry>('admin/logs', { level: level || undefined, page, perPage: 30 }),
  });
}

// --- File manager ---
export interface FileEntry {
  _id: string;
  url: string;
  path: string;
  filename: string;
  mime: string | null;
  size: number;
  createdAt: string;
}

export function useAdminFiles(page: number) {
  return useQuery<Paginated<FileEntry>>({
    queryKey: ['admin-files', page],
    queryFn: () => getList<FileEntry>('admin/files', { page, perPage: 24 }),
  });
}

export function useDeleteFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mutate('delete', `admin/files/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-files'] }),
  });
}

// --- Reportes / moderación ---
export interface ReportPreview {
  exists: boolean;
  label: string;
  sublabel?: string;
  link?: string;
  hidden?: boolean;
}

export interface AdminReport {
  _id: string;
  reporter: { name: string; username: string } | null;
  reportableType: string;
  reportable: string;
  reason: string;
  status: 'open' | 'resolved' | 'dismissed';
  resolution: string | null;
  preview?: ReportPreview;
  createdAt: string;
}

export function useAdminReports(status: string, page: number) {
  return useQuery<Paginated<AdminReport>>({
    queryKey: ['admin-reports', status, page],
    queryFn: () => getList<AdminReport>('admin/reports', { status: status || undefined, page, perPage: 20 }),
  });
}

export function useResolveReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      resolution,
      action,
    }: {
      id: string;
      status: 'resolved' | 'dismissed';
      resolution?: string;
      action?: 'hide' | 'none';
    }) => mutate('post', `admin/reports/${id}/resolve`, { status, resolution, action }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reports'] }),
  });
}

export function useHideComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mutate('post', `comments/${id}/hide`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reports'] }),
  });
}

// --- Backstage ---
export interface BackstageAttachmentRef {
  filename: string;
  path: string;
  mime: string | null;
}

export interface AdminBackstage {
  _id: string;
  type: 'claim' | 'new';
  artistName: string;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewNote: string | null;
  attachments?: BackstageAttachmentRef[];
  createdAt: string;
  user?: { name: string; username: string } | null;
}

export interface SignedAttachment {
  filename: string;
  mime: string | null;
  url: string;
}

export function useAdminBackstage(status: string, page: number) {
  return useQuery<Paginated<AdminBackstage>>({
    queryKey: ['admin-backstage', status, page],
    queryFn: () => getList<AdminBackstage>('admin/backstage', { status: status || undefined, page, perPage: 20 }),
  });
}

/** URLs firmadas de los adjuntos de una solicitud; se carga bajo demanda. */
export function useBackstageAttachments(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['admin-backstage-attachments', id],
    queryFn: () => getOne<SignedAttachment[]>(`admin/backstage/${id}/attachments`),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useReviewBackstage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, note }: { id: string; action: 'approve' | 'reject'; note?: string }) =>
      mutate('post', `admin/backstage/${id}/${action}`, { note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-backstage'] }),
  });
}

// --- Páginas (CMS) ---
export interface AdminPage {
  _id: string;
  title: string;
  slug: string;
  body: string;
  published: boolean;
  updatedAt?: string;
}

export function useAdminPages() {
  return useQuery({ queryKey: ['admin-pages'], queryFn: () => getOne<AdminPage[]>('admin/pages') });
}

export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { title: string; slug?: string; body?: string; published?: boolean }) =>
      mutate<AdminPage>('post', 'admin/pages', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-pages'] }),
  });
}

export function useUpdatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; title?: string; body?: string; published?: boolean }) =>
      mutate<AdminPage>('patch', `admin/pages/${id}`, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-pages'] }),
  });
}

export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mutate('delete', `admin/pages/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-pages'] }),
  });
}
