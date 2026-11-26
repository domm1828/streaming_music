import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { usePlayerStore } from '../player/player-store';
import { MediaCard, MediaGrid } from '../../components/MediaCard';
import { SectionHeader } from '../../components/media';
import { TrackList } from '../catalog/TrackList';
import type { Track } from '../catalog/types';
import type { ResolvedChannel } from './types';

function linkFor(itemType: string, item: Record<string, unknown>): { to: string; kind: string } {
  const id = String(item._id);
  const t = (item._itemType as string) ?? itemType;
  switch (t) {
    case 'album':
      return { to: `/album/${id}`, kind: 'album' };
    case 'artist':
      return { to: `/artist/${id}`, kind: 'artist' };
    case 'playlist':
      return { to: `/playlist/${id}`, kind: 'playlist' };
    default:
      return { to: `/track/${id}`, kind: 'track' };
  }
}

function gradientFor(kind: string): string {
  return kind === 'artist' ? 'from-brand-primary to-brand-secondary' : 'from-brand-secondary to-brand-accent';
}

/** Tarjeta de media para los layouts de rejilla y carrusel. */
function itemCard(
  channel: ResolvedChannel,
  item: Record<string, unknown>,
  i: number,
  onPlay?: (i: number) => void,
): ReactNode {
  const { to, kind } = linkFor(channel.itemType, item);
  return (
    <MediaCard
      key={`${to}-${i}`}
      to={to}
      title={String(item.name ?? '')}
      image={(item.image as string | null) ?? null}
      shape={kind === 'artist' ? 'round' : 'square'}
      gradient={gradientFor(kind)}
      onPlay={onPlay ? () => onPlay(i) : undefined}
    />
  );
}

export function ChannelRow({ channel }: { channel: ResolvedChannel }) {
  const { playQueue } = usePlayerStore.getState();
  if (!channel.items.length) return null;

  const isTrackRow = channel.itemType === 'track';
  const asTracks = channel.items as unknown as Track[];
  const playAll = isTrackRow ? (i: number) => playQueue(asTracks, i) : undefined;

  // `trackTable` solo tiene sentido para pistas; en otros tipos degrada a rejilla.
  const layout = channel.layout === 'trackTable' && !isTrackRow ? 'grid' : channel.layout;

  const header = (
    <SectionHeader
      title={channel.name}
      action={
        isTrackRow ? (
          <button
            type="button"
            onClick={() => playQueue(asTracks, 0)}
            className="text-sm font-medium text-brand-secondary hover:text-brand-secondary-light"
          >
            Reproducir todo
          </button>
        ) : undefined
      }
    />
  );

  // Pistas en formato tabla (trackTable con columna de álbum; list compacto).
  if (isTrackRow && (layout === 'trackTable' || layout === 'list')) {
    return (
      <section>
        {header}
        <TrackList tracks={asTracks} showAlbum={layout === 'trackTable'} />
      </section>
    );
  }

  // Rejilla responsive de tarjetas.
  if (layout === 'grid') {
    return (
      <section>
        {header}
        <MediaGrid>{channel.items.map((item, i) => itemCard(channel, item, i, playAll))}</MediaGrid>
      </section>
    );
  }

  // Lista vertical para contenido que no son pistas (álbumes/artistas/playlists).
  if (layout === 'list') {
    return (
      <section>
        {header}
        <ul className="divide-y divide-divider overflow-hidden rounded-panel border border-divider">
          {channel.items.map((item, i) => {
            const { to, kind } = linkFor(channel.itemType, item);
            const image = (item.image as string | null) ?? null;
            const radius = kind === 'artist' ? 'rounded-full' : 'rounded';
            return (
              <li key={`${to}-${i}`}>
                <Link to={to} className="flex items-center gap-3 px-3 py-2 hover:bg-main/5">
                  {image ? (
                    <img src={image} alt="" loading="lazy" className={`h-11 w-11 shrink-0 object-cover ${radius}`} />
                  ) : (
                    <div className={`h-11 w-11 shrink-0 bg-gradient-to-br ${gradientFor(kind)} ${radius}`} />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{String(item.name ?? '')}</span>
                  <span className="shrink-0 text-xs uppercase tracking-wide text-muted">{kind}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  // Carrusel horizontal (default).
  return (
    <section>
      {header}
      <div className="-mx-1 flex gap-1 overflow-x-auto pb-2">
        {channel.items.map((item, i) => (
          <div key={`${channel.itemType}-${i}`} className="w-40 shrink-0">
            {itemCard(channel, item, i, playAll)}
          </div>
        ))}
      </div>
    </section>
  );
}
