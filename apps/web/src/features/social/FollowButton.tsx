import { useNavigate } from 'react-router';
import { useAuth } from '../auth/use-auth';
import { useFollowState, useToggleFollow } from './social-queries';
import type { FollowableType } from '../library/types';

export function FollowButton({
  type,
  id,
  initialFollowing,
}: {
  type: FollowableType;
  id: string;
  initialFollowing?: boolean;
}) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { data } = useFollowState(type, id);
  const toggle = useToggleFollow();
  const following = data?.following ?? initialFollowing ?? false;

  const onClick = () => {
    if (!isAuthenticated) return navigate('/login');
    toggle.mutate({ type, id, following });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={toggle.isPending}
      aria-pressed={following}
      className={`rounded-full px-5 py-2 text-sm font-semibold transition disabled:opacity-60 ${
        following
          ? 'border border-brand-secondary/40 bg-transparent hover:border-brand-secondary'
          : 'bg-brand-primary text-white hover:bg-brand-primary-light'
      }`}
    >
      {following ? 'Siguiendo' : 'Seguir'}
    </button>
  );
}
