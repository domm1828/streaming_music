import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useDeleteLyrics, useTrackLyrics, useUpsertLyrics } from './catalog-admin-queries';

const field =
  'w-full rounded-lg border border-divider bg-chip px-3 py-2 text-sm outline-none focus:border-brand-secondary';

/** Modal para agregar o modificar la letra de una pista. */
export function LyricsEditDialog({
  trackId,
  trackName,
  onClose,
}: {
  trackId: string;
  trackName: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useTrackLyrics(trackId, true);
  const upsert = useUpsertLyrics();
  const del = useDeleteLyrics();

  const [text, setText] = useState('');
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (seeded || data === undefined) return;
    setText(data?.text ?? '');
    setSeeded(true);
  }, [data, seeded]);

  const hasLyric = Boolean(data);
  const busy = upsert.isPending || del.isPending;

  const onSave = () => upsert.mutate({ id: trackId, text }, { onSuccess: onClose });
  const onDelete = () => del.mutate(trackId, { onSuccess: onClose });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="mt-10 w-full max-w-lg space-y-4 rounded-panel border border-divider bg-elevated p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{hasLyric ? 'Modificar letra' : 'Agregar letra'}</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-muted hover:bg-main/10 hover:text-main"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <p className="truncate text-sm text-muted">{trackName}</p>

        {isLoading && !seeded ? (
          <p className="text-muted">Cargando…</p>
        ) : (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder="Letra de la pista…"
              className={`${field} font-mono`}
            />
            <p className="text-xs text-muted">
              Para letra sincronizada (resaltado línea por línea), usá formato LRC con marcas de tiempo:{' '}
              <code className="rounded bg-chip px-1">[00:12.50] texto</code>.
            </p>

            <div className="flex items-center justify-between gap-2 pt-1">
              {hasLyric ? (
                <button
                  onClick={onDelete}
                  disabled={busy}
                  className="rounded-full border border-divider px-4 py-2 text-sm text-muted hover:border-red-500 hover:text-red-500 disabled:opacity-60"
                >
                  {del.isPending ? 'Quitando…' : 'Quitar letra'}
                </button>
              ) : (
                <span />
              )}

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="rounded-full border border-divider px-4 py-2 text-sm text-muted hover:text-main"
                >
                  Cancelar
                </button>
                <button
                  onClick={onSave}
                  disabled={busy || !text.trim()}
                  className="rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light disabled:opacity-60"
                >
                  {upsert.isPending ? 'Guardando…' : hasLyric ? 'Modificar letra' : 'Guardar letra'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
