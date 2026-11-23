import { Link } from 'react-router';
import { usePlayerStore } from '../player/player-store';
import type { Track } from '../catalog/types';
import type { ResolvedChannel } from './types';

/** Tarjeta para un ítem de catálogo dentro de un channel. */
function ItemCard({ to, title, gradient }: { to: string; title: string; gradient: string }) {
  return (
    <Link
      to={to}
      className="w-40 shrink-0 rounded-xl border border-brand-secondary/15 bg-brand-primary/5 p-3 hover:border-brand-secondary/40"
    >
      <div className={`mb-2 aspect-square rounded-lg bg-gradient-to-br ${gradient}`} />
      <p className="truncate text-sm font-medium">{title}</p>
    </Link>
  );
}

function linkFor(itemType: string, item: Record<string, unknown>): { to: string; title: string } {
  const id = String(item._id);
  const name = String(item.name ?? '');
  const t = (item._itemType as string) ?? itemType;
  switch (t) {
    case 'album':
      return { to: `/album/${id}`, title: name };
    case 'artist':
      return { to: `/artist/${id}`, title: name };
    case 'playlist':
      return { to: `/playlist/${id}`, title: name };
    default:
      return { to: `/track/${id}`, title: name };
  }
}

export function ChannelRow({ channel }: { channel: ResolvedChannel }) {
  const { playQueue } = usePlayerStore.getState();
  if (!channel.items.length) return null;

  const isTrackRow = channel.itemType === 'track';
  const gradient =
    channel.itemType === 'artist'
      ? 'from-brand-primary to-brand-secondary'
      : 'from-brand-secondary to-brand-accent';

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{channel.name}</h2>
        {isTrackRow && (
          <button
            type="button"
            onClick={() => playQueue(channel.items as unknown as Track[], 0)}
            className="text-sm text-brand-secondary hover:underline"
          >
            ▶ Reproducir todo
          </button>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {channel.items.map((item, i) => {
          const { to, title } = linkFor(channel.itemType, item);
          return <ItemCard key={`${to}-${i}`} to={to} title={title} gradient={gradient} />;
        })}
      </div>
    </section>
  );
}
