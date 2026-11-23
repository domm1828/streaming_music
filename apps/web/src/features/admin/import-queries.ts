import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getOne, mutate } from '../../lib/http';

export interface ImportStatus {
  providerConfigured: boolean;
  lyricsSources: string[];
}

export interface ProviderArtist {
  externalId: string;
  name: string;
  image: string | null;
  genres: string[];
  followers: number;
  popularity: number;
}

export type ImportJobStatus = 'pending' | 'running' | 'done' | 'failed';
export interface ImportJob {
  _id: string;
  type: string;
  externalId: string | null;
  status: ImportJobStatus;
  processed: number;
  attempts: number;
  result: { artists: number; albums: number; tracks: number; playlists: number; genres: number } | null;
  error: string | null;
  createdAt: string;
}

export function useImportStatus() {
  return useQuery({ queryKey: ['import', 'status'], queryFn: () => getOne<ImportStatus>('admin/import/status') });
}

export function useProviderSearch(q: string) {
  return useQuery({
    queryKey: ['import', 'search', q],
    queryFn: () => getOne<ProviderArtist[]>('admin/import/search', { q }),
    enabled: q.trim().length > 1,
  });
}

export function useImportJobs() {
  return useQuery({
    queryKey: ['import', 'jobs'],
    queryFn: () => getOne<ImportJob[]>('admin/import/jobs'),
    // Refresca mientras haya jobs en curso.
    refetchInterval: (query) => {
      const jobs = query.state.data as ImportJob[] | undefined;
      return jobs?.some((j) => j.status === 'pending' || j.status === 'running') ? 1500 : false;
    },
  });
}

function useImportMutation(path: string, body?: () => unknown) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (arg?: unknown) => mutate<ImportJob>('post', path, arg ?? body?.()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['import', 'jobs'] }),
  });
}

export function useImportArtist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (externalId: string) => mutate<ImportJob>('post', 'admin/import/artist', { externalId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['import', 'jobs'] }),
  });
}

export const useImportNewReleases = () => useImportMutation('admin/import/new-releases');
export const useImportFeaturedPlaylists = () => useImportMutation('admin/import/featured-playlists');
export const useImportTopGenres = () => useImportMutation('admin/import/top-genres');
