import { useParams } from 'react-router';
import { useAlbum, useTrack } from '../features/catalog/catalog-queries';

function Cover({ image, gradient }: { image?: string | null; gradient: string }) {
  return image ? (
    <img src={image} alt="" className="h-32 w-32 shrink-0 rounded-lg object-cover" />
  ) : (
    <div className={`h-32 w-32 shrink-0 rounded-lg bg-gradient-to-br ${gradient}`} />
  );
}

export function EmbedTrackPage() {
  const { id = '' } = useParams();
  const { data } = useTrack(id);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="flex h-[152px] items-center gap-3 overflow-hidden bg-elevated p-3 text-main">
      <Cover image={data?.image ?? data?.album?.image ?? null} gradient="from-brand-primary to-brand-accent" />
      <div className="flex min-w-0 flex-1 flex-col">
        <a href={`${origin}/track/${id}`} target="_blank" rel="noreferrer" className="truncate font-semibold hover:underline">
          {data?.name ?? 'Cargando…'}
        </a>
        <p className="truncate text-sm text-muted">{data?.artists?.map((a) => a.artist.name).join(', ')}</p>
        {data?.srcType === 'audio' && data.src ? (
          <audio controls src={data.src} className="mt-2 w-full" />
        ) : (
          <a
            href={`${origin}/track/${id}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block w-fit rounded-full bg-brand-primary px-4 py-1.5 text-sm font-semibold text-white"
          >
            Escuchar en Stream Music
          </a>
        )}
      </div>
    </div>
  );
}

export function EmbedAlbumPage() {
  const { id = '' } = useParams();
  const { data } = useAlbum(id);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="flex h-[152px] items-center gap-3 overflow-hidden bg-elevated p-3 text-main">
      <Cover image={data?.image} gradient="from-brand-secondary to-brand-accent" />
      <div className="flex min-w-0 flex-1 flex-col">
        <a href={`${origin}/album/${id}`} target="_blank" rel="noreferrer" className="truncate font-semibold hover:underline">
          {data?.name ?? 'Cargando…'}
        </a>
        <p className="truncate text-sm text-muted">
          {data?.artists.map((a) => a.name).join(', ')} · {data?.tracks?.length ?? 0} pistas
        </p>
        <a
          href={`${origin}/album/${id}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block w-fit rounded-full bg-brand-primary px-4 py-1.5 text-sm font-semibold text-white"
        >
          Abrir álbum
        </a>
      </div>
    </div>
  );
}
