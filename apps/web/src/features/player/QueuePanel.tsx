import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { currentTrack, usePlayerStore } from './player-store';

export function QueuePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queue = usePlayerStore((s) => s.queue);
  const index = usePlayerStore((s) => s.index);
  const playing = usePlayerStore(currentTrack);
  const { jumpTo, removeFromQueue, reorderQueue } = usePlayerStore.getState();

  if (!open) return null;

  return (
    <aside className="hidden w-72 shrink-0 flex-col rounded-panel bg-elevated p-3 lg:flex">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold">Cola</h2>
        <button type="button" onClick={onClose} className="rounded-md p-1 text-muted hover:bg-main/10 hover:text-main" aria-label="Cerrar cola">
          <X size={16} />
        </button>
      </div>

      {queue.length === 0 ? (
        <p className="px-1 py-4 text-sm text-muted">La cola está vacía.</p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
          {queue.map((track, i) => {
            const isCurrent = i === index;
            return (
              <li
                key={`${track._id}-${i}`}
                className={`group flex items-center gap-2 rounded-md px-2 py-1.5 ${isCurrent ? 'bg-main/10' : 'hover:bg-main/5'}`}
              >
                <button onClick={() => jumpTo(i)} className="min-w-0 flex-1 text-left">
                  <p className={`truncate text-sm ${isCurrent ? 'font-semibold text-brand-primary' : ''}`}>{track.name}</p>
                  <p className="truncate text-xs text-muted">
                    {track.artists?.map((a) => a.artist.name).join(', ')}
                  </p>
                </button>
                <div className="flex items-center opacity-0 transition group-hover:opacity-100">
                  <button onClick={() => reorderQueue(i, i - 1)} disabled={i === 0} className="rounded p-0.5 text-muted hover:text-main disabled:opacity-30" aria-label="Subir">
                    <ChevronUp size={14} />
                  </button>
                  <button onClick={() => reorderQueue(i, i + 1)} disabled={i === queue.length - 1} className="rounded p-0.5 text-muted hover:text-main disabled:opacity-30" aria-label="Bajar">
                    <ChevronDown size={14} />
                  </button>
                  <button onClick={() => removeFromQueue(i)} className="rounded p-0.5 text-muted hover:text-red-500" aria-label="Quitar">
                    <X size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {playing && <p className="mt-2 px-1 text-xs text-muted">Sonando: {playing.name}</p>}
    </aside>
  );
}
