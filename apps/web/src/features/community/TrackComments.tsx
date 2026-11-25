import { useState } from 'react';
import { Clock, Trash2 } from 'lucide-react';
import { useAuth } from '../auth/use-auth';
import { currentTrack, usePlayerStore } from '../player/player-store';
import { useComments, useCreateComment, useDeleteComment, type CommentItem } from './community-queries';

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function TrackComments({ trackId, onSeek }: { trackId: string; onSeek: (seconds: number) => void }) {
  const { user, isAuthenticated } = useAuth();
  const comments = useComments('track', trackId);
  const create = useCreateComment();
  const del = useDeleteComment('track', trackId);

  const playing = usePlayerStore(currentTrack);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const isThisTrack = playing?._id === trackId;

  const [content, setContent] = useState('');
  const [anchor, setAnchor] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    create.mutate(
      {
        type: 'track',
        id: trackId,
        content: content.trim(),
        timestamp: anchor && isThisTrack ? Math.floor(currentTime) : undefined,
      },
      {
        onSuccess: () => {
          setContent('');
          setAnchor(false);
        },
      },
    );
  };

  const items = comments.data?.data ?? [];

  return (
    <section className="max-w-2xl space-y-4">
      <h2 className="text-lg font-semibold">Comentarios</h2>

      {isAuthenticated ? (
        <form onSubmit={submit} className="space-y-2 rounded-panel bg-chip p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Dejá un comentario…"
            rows={2}
            maxLength={2000}
            className="w-full rounded-lg border border-divider bg-surface px-3 py-2 text-sm outline-none focus:border-brand-secondary"
          />
          <div className="flex items-center justify-between gap-3">
            {isThisTrack ? (
              <label className="flex items-center gap-2 text-xs text-muted">
                <input type="checkbox" checked={anchor} onChange={(e) => setAnchor(e.target.checked)} />
                Anclar al momento actual ({fmtTime(currentTime)})
              </label>
            ) : (
              <span className="text-xs text-muted">Reproducí esta pista para anclar el comentario a un momento.</span>
            )}
            <button
              type="submit"
              disabled={create.isPending || !content.trim()}
              className="rounded-full bg-brand-primary px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-primary-light disabled:opacity-60"
            >
              Comentar
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-muted">Iniciá sesión para comentar.</p>
      )}

      {comments.isLoading ? (
        <p className="text-sm text-muted">Cargando comentarios…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted">Todavía no hay comentarios. ¡Sé el primero!</p>
      ) : (
        <ul className="space-y-3">
          {items.map((c: CommentItem) => (
            <li key={c._id} className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-elevated text-xs font-semibold">
                {c.user.image ? (
                  <img src={c.user.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  (c.user.name || '?').charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{c.user.name}</span>
                  {c.timestamp != null && (
                    <button
                      onClick={() => onSeek(c.timestamp as number)}
                      className="inline-flex items-center gap-1 rounded-full bg-brand-primary/15 px-2 py-0.5 text-xs font-medium text-brand-secondary hover:bg-brand-primary/25"
                      title="Ir a este momento"
                    >
                      <Clock size={11} /> {fmtTime(c.timestamp)}
                    </button>
                  )}
                  <span className="text-xs text-muted">{new Date(c.createdAt).toLocaleDateString()}</span>
                  {user?.id === c.user._id && (
                    <button
                      onClick={() => del.mutate(c._id)}
                      className="ml-auto text-muted hover:text-red-500"
                      aria-label="Eliminar comentario"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm text-main">{c.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
