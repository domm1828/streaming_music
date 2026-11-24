import { useQuery } from '@tanstack/react-query';
import type { Paginated } from '../catalog/types';
import { getList, getOne } from '../../lib/http';
import type {
  Landing,
  RadioResult,
  ResolvedChannel,
  SearchableType,
  SearchOverview,
  SuggestResponse,
} from './types';

/** Búsqueda general agrupada por tipo. */
export function useSearchOverview(q: string) {
  return useQuery({
    queryKey: ['search', 'overview', q],
    queryFn: () => getOne<SearchOverview>('search', { q }),
    enabled: q.trim().length > 0,
  });
}

/** Búsqueda paginada de un tipo. */
export function useSearchType<T>(q: string, type: SearchableType, page = 1) {
  return useQuery({
    queryKey: ['search', type, q, page],
    queryFn: () => getList<T>('search', { q, type, page, perPage: 24 }),
    enabled: q.trim().length > 0,
  });
}

/** Sugerencias instantáneas. */
export function useSuggest(q: string) {
  return useQuery({
    queryKey: ['suggest', q],
    queryFn: () => getOne<SuggestResponse>('search/suggest', { q }),
    enabled: q.trim().length > 1,
    staleTime: 30_000,
  });
}

/** Channels públicos (home/discover) con contenido resuelto. */
export function useChannels(type = 'home') {
  return useQuery({
    queryKey: ['channels', type],
    queryFn: () => getOne<ResolvedChannel[]>('channels', { type }),
  });
}

/** Radio a partir de una semilla. */
export function useRadio(seedType: string, seedId: string) {
  return useQuery({
    queryKey: ['radio', seedType, seedId],
    queryFn: () => getOne<RadioResult>('radio', { seedType, seedId }),
    enabled: Boolean(seedType && seedId),
  });
}

/** Contenido de la landing de marketing. */
export function useLanding() {
  return useQuery({ queryKey: ['landing'], queryFn: () => getOne<Landing>('landing') });
}

/** Pistas similares por embedding (vacío si la IA no está configurada). */
export function useSimilarTracks(trackId: string) {
  return useQuery({
    queryKey: ['similar', trackId],
    queryFn: () => getOne<{ data: import('../catalog/types').Track[] }>(`tracks/${trackId}/similar`),
    enabled: Boolean(trackId),
  });
}

/** Paginación auxiliar reexportada por conveniencia de tipos. */
export type { Paginated };
