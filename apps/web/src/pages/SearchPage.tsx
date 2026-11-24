import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { TrackList } from '../features/catalog/TrackList';
import { useDebounce } from '../lib/use-debounce';
import {
  useSearchOverview,
  useSearchType,
  useSuggest,
} from '../features/discovery/discovery-queries';
import type { SearchableType } from '../features/discovery/types';
import type { Album, ArtistRef, Track } from '../features/catalog/types';
import type { PlaylistSummary } from '../features/library/types';

type Tab = 'all' | SearchableType;
const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'Todo' },
  { key: 'track', label: 'Canciones' },
  { key: 'artist', label: 'Artistas' },
  { key: 'album', label: 'Álbumes' },
  { key: 'playlist', label: 'Playlists' },
];

function CardGrid({ items, kind }: { items: { _id: string; name: string }[]; kind: string }) {
  if (!items.length) return <p className="opacity-60">Sin resultados.</p>;
  const gradient = kind === 'artist' ? 'from-brand-primary to-brand-secondary' : 'from-brand-secondary to-brand-accent';
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
      {items.map((it) => (
        <Link
          key={it._id}
          to={`/${kind}/${it._id}`}
          className="rounded-xl border border-brand-secondary/15 bg-brand-primary/5 p-3 hover:border-brand-secondary/40"
        >
          <div className={`mb-2 aspect-square rounded-lg bg-gradient-to-br ${gradient}`} />
          <p className="truncate text-sm font-medium">{it.name}</p>
        </Link>
      ))}
    </div>
  );
}

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(params.get('q') ?? '');
  const [tab, setTab] = useState<Tab>('all');
  const [focused, setFocused] = useState(false);
  const q = useDebounce(input.trim(), 250);

  const suggest = useSuggest(input.trim());
  const overview = useSearchOverview(q);
  const typed = useSearchType<Track | ArtistRef | Album | PlaylistSummary>(q, tab === 'all' ? 'track' : tab, 1);

  const onSubmit = (value: string) => {
    setInput(value);
    setParams(value ? { q: value } : {});
    setFocused(false);
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit(input.trim())}
          placeholder="Buscar artistas, canciones, álbumes…"
          className="w-full rounded-xl border border-brand-secondary/30 bg-transparent px-4 py-3 text-lg outline-none focus:border-brand-secondary"
          autoFocus
        />
        {focused && suggest.data && suggest.data.suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-brand-secondary/20 bg-[color:var(--surface)] shadow-lg">
            {suggest.data.suggestions.map((s) => (
              <li key={`${s.type}-${s.id}`}>
                <button
                  type="button"
                  onMouseDown={() => navigate(`/${s.type}/${s.id}`)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-brand-primary/10"
                >
                  <span className="rounded bg-brand-secondary/15 px-1.5 py-0.5 text-xs uppercase opacity-70">
                    {s.type}
                  </span>
                  <span className="truncate">{s.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {q.length === 0 ? (
        <p className="opacity-60">Escribí algo para buscar.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 border-b border-brand-secondary/20 pb-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  tab === t.key ? 'bg-brand-primary text-white' : 'hover:bg-brand-primary/10'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'all' ? (
            <div className="space-y-8">
              {overview.data && (
                <>
                  {(overview.data.results.track?.length ?? 0) > 0 && (
                    <section>
                      <h2 className="mb-2 text-lg font-semibold">Canciones</h2>
                      <TrackList tracks={overview.data.results.track ?? []} />
                    </section>
                  )}
                  {(overview.data.results.artist?.length ?? 0) > 0 && (
                    <section>
                      <h2 className="mb-2 text-lg font-semibold">Artistas</h2>
                      <CardGrid items={overview.data.results.artist ?? []} kind="artist" />
                    </section>
                  )}
                  {(overview.data.results.album?.length ?? 0) > 0 && (
                    <section>
                      <h2 className="mb-2 text-lg font-semibold">Álbumes</h2>
                      <CardGrid items={overview.data.results.album ?? []} kind="album" />
                    </section>
                  )}
                  {(overview.data.results.playlist?.length ?? 0) > 0 && (
                    <section>
                      <h2 className="mb-2 text-lg font-semibold">Playlists</h2>
                      <CardGrid items={overview.data.results.playlist ?? []} kind="playlist" />
                    </section>
                  )}
                  {Object.values(overview.data.results).every((a) => (a?.length ?? 0) === 0) && (
                    <p className="opacity-60">No encontramos nada para “{q}”.</p>
                  )}
                </>
              )}
            </div>
          ) : tab === 'track' ? (
            <TrackList tracks={(typed.data?.data ?? []) as Track[]} />
          ) : (
            <CardGrid items={(typed.data?.data ?? []) as { _id: string; name: string }[]} kind={tab} />
          )}
        </>
      )}
    </div>
  );
}
