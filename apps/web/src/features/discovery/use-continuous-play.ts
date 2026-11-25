import { useEffect, useRef } from 'react';
import { getOne } from '../../lib/http';
import { usePublicSettings } from '../auth/auth-queries';
import { usePlayerStore } from '../player/player-store';
import type { RadioResult } from './types';

/** Umbral: cuando quedan N pistas o menos por delante, se traen más. */
const LOOKAHEAD = 2;

/**
 * Reproducción continua para colas normales (álbum/playlist/pista): al acercarse
 * al final de la cola —y sin una semilla de radio activa (esa la maneja
 * `useRadioAutoExtend`)— encola automáticamente pistas relacionadas con la última
 * de la cola. Se puede desactivar desde Ajustes → Reproductor.
 */
export function useContinuousPlay() {
  const index = usePlayerStore((s) => s.index);
  const queueLength = usePlayerStore((s) => s.queue.length);
  const radioSeed = usePlayerStore((s) => s.radioSeed);
  const enabled = usePublicSettings()?.player?.continuousPlay !== false;
  const fetching = useRef(false);
  const lastSeedId = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || radioSeed || index < 0 || queueLength === 0 || fetching.current) return;
    const remaining = queueLength - 1 - index;
    if (remaining > LOOKAHEAD) return;

    const queue = usePlayerStore.getState().queue;
    const seed = queue[queue.length - 1];
    // Evita reintentar la misma semilla en loop si no trae pistas nuevas.
    if (!seed?._id || lastSeedId.current === seed._id) return;
    lastSeedId.current = seed._id;

    fetching.current = true;
    getOne<RadioResult>('radio', { seedType: 'track', seedId: seed._id, limit: 20 })
      .then((res) => usePlayerStore.getState().appendRadioTracks(res.tracks))
      .catch(() => undefined)
      .finally(() => {
        fetching.current = false;
      });
  }, [enabled, index, queueLength, radioSeed]);
}
