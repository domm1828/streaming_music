import { useEffect, useRef } from 'react';
import { getOne } from '../../lib/http';
import { usePlayerStore } from '../player/player-store';
import type { RadioResult } from './types';

/** Umbral: cuando quedan N pistas o menos por delante, se traen más. */
const LOOKAHEAD = 2;

/**
 * Radio infinita: mientras haya una semilla de radio activa, al acercarse al
 * final de la cola se traen pistas relacionadas y se agregan automáticamente.
 */
export function useRadioAutoExtend() {
  const index = usePlayerStore((s) => s.index);
  const queueLength = usePlayerStore((s) => s.queue.length);
  const radioSeed = usePlayerStore((s) => s.radioSeed);
  const fetching = useRef(false);

  useEffect(() => {
    if (!radioSeed || index < 0) return;
    const remaining = queueLength - 1 - index;
    if (remaining > LOOKAHEAD || fetching.current) return;

    fetching.current = true;
    getOne<RadioResult>('radio', { seedType: radioSeed.type, seedId: radioSeed.id, limit: 20 })
      .then((res) => usePlayerStore.getState().appendRadioTracks(res.tracks))
      .catch(() => undefined)
      .finally(() => {
        fetching.current = false;
      });
  }, [index, queueLength, radioSeed]);
}
