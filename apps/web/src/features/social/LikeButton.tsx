import { useNavigate } from 'react-router';
import { useAuth } from '../auth/use-auth';
import { useLikeState, useToggleLike } from './social-queries';
import type { LikeableType } from '../library/types';

export function LikeButton({ type, id, label }: { type: LikeableType; id: string; label?: boolean }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { data } = useLikeState(type, id);
  const toggle = useToggleLike();
  const liked = data?.liked ?? false;

  const onClick = () => {
    if (!isAuthenticated) return navigate('/login');
    toggle.mutate({ type, id, liked });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={toggle.isPending}
      aria-pressed={liked}
      aria-label={liked ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:opacity-60 ${
        liked
          ? 'border-brand-accent/50 bg-brand-accent/15 text-brand-accent'
          : 'border-brand-secondary/30 hover:border-brand-secondary/60'
      }`}
    >
      <span aria-hidden>{liked ? '♥' : '♡'}</span>
      {label && <span>{liked ? 'En favoritos' : 'Me gusta'}</span>}
    </button>
  );
}
