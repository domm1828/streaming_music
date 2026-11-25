import { Link } from 'react-router';
import { Play } from 'lucide-react';

interface MediaCardProps {
  to: string;
  title: string;
  subtitle?: string;
  image?: string | null;
  shape?: 'square' | 'round';
  gradient?: string;
  onPlay?: () => void;
}

/** Tarjeta de media (artista/álbum/playlist/pista) con play al hover. */
export function MediaCard({
  to,
  title,
  subtitle,
  image,
  shape = 'square',
  gradient = 'from-brand-primary to-brand-secondary',
  onPlay,
}: MediaCardProps) {
  const radius = shape === 'round' ? 'rounded-full' : 'rounded-lg';
  return (
    <Link to={to} className="group relative block rounded-xl p-3 transition hover:bg-main/5">
      <div className={`relative mb-3 aspect-square overflow-hidden ${radius} bg-chip shadow`}>
        {image ? (
          <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className={`h-full w-full bg-gradient-to-br ${gradient}`} />
        )}
        {onPlay && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPlay();
            }}
            className="absolute bottom-2 right-2 flex h-11 w-11 translate-y-2 items-center justify-center rounded-full bg-brand-primary text-white opacity-0 shadow-lg transition hover:bg-brand-primary-light group-hover:translate-y-0 group-hover:opacity-100"
            aria-label={`Reproducir ${title}`}
          >
            <Play size={18} className="ml-0.5" />
          </button>
        )}
      </div>
      <p className={`truncate text-sm font-semibold ${shape === 'round' ? 'text-center' : ''}`}>{title}</p>
      {subtitle && (
        <p className={`truncate text-xs text-muted ${shape === 'round' ? 'text-center' : ''}`}>{subtitle}</p>
      )}
    </Link>
  );
}

/** Rejilla responsive estándar para tarjetas de media. */
export function MediaGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">{children}</div>
  );
}
