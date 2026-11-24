import { apiClient } from '../../lib/api-client';

/** Registra una reproducción (fire-and-forget). */
export function logPlay(trackId: string): void {
  void apiClient.post('player/tracks', { trackId }).catch(() => undefined);
}
