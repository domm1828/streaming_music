import { useQuery } from '@tanstack/react-query';
import { getOne } from '../../lib/http';

/**
 * Peaks del waveform de una pista (0..1). Devuelve `null` si la pista no tiene
 * waveform generado (p. ej. importada por URL/YouTube); el componente sintetiza
 * una onda determinística en ese caso (degradación).
 */
export function useTrackWaveform(id: string) {
  return useQuery({
    queryKey: ['track-waveform', id],
    enabled: Boolean(id),
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<number[] | null> => {
      const { waveformPath } = await getOne<{ waveformPath: string | null }>(`tracks/${id}/wave`);
      if (!waveformPath) return null;
      try {
        const res = await fetch(waveformPath);
        if (!res.ok) return null;
        const json = (await res.json()) as { peaks?: unknown };
        return Array.isArray(json.peaks) ? (json.peaks as number[]) : null;
      } catch {
        return null;
      }
    },
  });
}
