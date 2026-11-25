import { useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { useTrackLyrics } from '../admin/catalog-admin-queries';
import { activeLineIndex, parseLyrics } from './lrc';
import { currentTrack, usePlayerStore } from './player-store';

export function LyricsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const track = usePlayerStore(currentTrack);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const { seekTo } = usePlayerStore.getState();
  const { data, isLoading } = useTrackLyrics(track?._id ?? '', open && Boolean(track));

  const parsed = useMemo(() => (data ? parseLyrics(data.text) : null), [data]);
  const active = parsed?.synced ? activeLineIndex(parsed.lines, currentTime) : -1;

  const activeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [active]);

  if (!open) return null;

  return (
    <aside className="hidden w-80 shrink-0 flex-col rounded-panel bg-elevated p-3 lg:flex">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold">Letra</h2>
        <button type="button" onClick={onClose} className="rounded-md p-1 text-muted hover:bg-main/10 hover:text-main" aria-label="Cerrar letra">
          <X size={16} />
        </button>
      </div>

      {!track ? (
        <p className="px-1 py-4 text-sm text-muted">No hay nada sonando.</p>
      ) : isLoading ? (
        <p className="px-1 py-4 text-sm text-muted">Cargando…</p>
      ) : !parsed || parsed.lines.length === 0 ? (
        <p className="px-1 py-4 text-sm text-muted">Esta pista no tiene letra.</p>
      ) : parsed.synced ? (
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-1">
          {parsed.lines.map((line, i) => (
            <li key={i}>
              <button
                ref={i === active ? activeRef : undefined}
                onClick={() => line.time !== null && seekTo(line.time)}
                className={`block w-full text-left text-sm leading-snug transition ${
                  i === active ? 'font-semibold text-brand-primary' : 'text-muted hover:text-main'
                }`}
              >
                {line.text || '♪'}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-1">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-main/90">
            {parsed.lines.map((l) => l.text).join('\n')}
          </pre>
        </div>
      )}
    </aside>
  );
}
