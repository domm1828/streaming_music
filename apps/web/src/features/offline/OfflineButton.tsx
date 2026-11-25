import { useEffect, useState } from 'react';
import { CheckCircle2, Download, Loader2 } from 'lucide-react';
import { pillClass } from '../../components/media';
import type { PlayerTrack } from '../player/player-store';
import { useOfflineStore } from './offline-store';

/** Botón para guardar/quitar una pista del almacenamiento offline del navegador. */
export function OfflineButton({ track }: { track: PlayerTrack }) {
  const ready = useOfflineStore((s) => s.ready);
  const saved = useOfflineStore((s) => Boolean(s.ids[track._id]));
  const busy = useOfflineStore((s) => Boolean(s.busy[track._id]));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) void useOfflineStore.getState().refresh();
  }, [ready]);

  if (track.srcType !== 'audio' || !track.src) return null;

  const onClick = async () => {
    setError(null);
    try {
      const store = useOfflineStore.getState();
      if (saved) await store.remove(track._id);
      else await store.download(track);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className={pillClass(saved ? 'border-brand-secondary text-main' : '')}
        aria-label={saved ? 'Quitar de offline' : 'Guardar offline'}
      >
        {busy ? (
          <Loader2 size={16} className="animate-spin" />
        ) : saved ? (
          <CheckCircle2 size={16} />
        ) : (
          <Download size={16} />
        )}
        {busy ? 'Guardando…' : saved ? 'Disponible offline' : 'Guardar offline'}
      </button>
      {error && <span className="mt-1 text-xs text-red-500">{error}</span>}
    </span>
  );
}
