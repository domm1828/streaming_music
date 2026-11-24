import { usePlayerStore } from '../player/player-store';
import { MediaCard } from '../../components/MediaCard';
import { SectionHeader } from '../../components/media';
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

export function ChannelRow({ channel }: { channel: ResolvedChannel }) {
  const { playQueue } = usePlayerStore.getState();
  if (!channel.items.length) return null;

  const isTrackRow = channel.itemType === 'track';
  const asTracks = channel.items as unknown as Track[];

  return (
    <section>
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
      <div className="-mx-1 flex gap-1 overflow-x-auto pb-2">
        {channel.items.map((item, i) => {
          const { to, kind } = linkFor(channel.itemType, item);
          const gradient =
            kind === 'artist' ? 'from-brand-primary to-brand-secondary' : 'from-brand-secondary to-brand-accent';
          return (
            <div key={`${to}-${i}`} className="w-40 shrink-0">
              <MediaCard
                to={to}
                title={String(item.name ?? '')}
                image={(item.image as string | null) ?? null}
                shape={kind === 'artist' ? 'round' : 'square'}
                gradient={gradient}
                onPlay={isTrackRow ? () => playQueue(asTracks, i) : undefined}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
