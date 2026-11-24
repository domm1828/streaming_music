import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Search } from 'lucide-react';
import { TrackList } from '../features/catalog/TrackList';
import { MediaCard, MediaGrid } from '../components/MediaCard';
import { Tabs } from '../components/Tabs';
import { SectionHeader } from '../components/media';
import { useDebounce } from '../lib/use-debounce';
import { useSearchOverview, useSearchType, useSuggest } from '../features/discovery/discovery-queries';
import type { SearchableType } from '../features/discovery/types';
import type { Album, ArtistRef, Track } from '../features/catalog/types';
import type { PlaylistSummary } from '../features/library/types';

type Tab = 'all' | SearchableType;
const TABS = [
  { key: 'all', label: 'Todo' },
  { key: 'track', label: 'Canciones' },
  { key: 'artist', label: 'Artistas' },
  { key: 'album', label: 'Álbumes' },
  { key: 'playlist', label: 'Playlists' },
] as const;

type CardItem = { _id: string; name: string; image?: string | null };

function CardGrid({ items, kind }: { items: CardItem[]; kind: string }) {
  if (!items.length) return <p className="text-muted">Sin resultados.</p>;
  return (
    <MediaGrid>
      {items.map((it) => (
        <MediaCard
          key={it._id}
          to={`/${kind}/${it._id}`}
          title={it.name}
          image={it.image ?? null}
          shape={kind === 'artist' ? 'round' : 'square'}
          gradient={kind === 'artist' ? 'from-brand-primary to-brand-secondary' : 'from-brand-secondary to-brand-accent'}
        />
      ))}
    </MediaGrid>
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
    <div className="space-y-6 pt-2">
      <div className="relative max-w-2xl">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit(input.trim())}
          placeholder="Buscar artistas, canciones, álbumes…"
          className="w-full rounded-full border border-divider bg-chip py-3 pl-11 pr-4 text-lg outline-none focus:border-brand-secondary"
          autoFocus
        />
        {focused && suggest.data && suggest.data.suggestions.length > 0 && (
          <ul className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-divider bg-elevated shadow-xl">
            {suggest.data.suggestions.map((s) => (
              <li key={`${s.type}-${s.id}`}>
                <button
                  type="button"
                  onMouseDown={() => navigate(`/${s.type}/${s.id}`)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-main/10"
                >
                  {s.image ? (
                    <img src={s.image} alt="" className={`h-9 w-9 object-cover ${s.type === 'artist' ? 'rounded-full' : 'rounded'}`} />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded bg-chip text-xs uppercase text-muted">
                      {s.type[0]}
                    </span>
                  )}
                  <span className="truncate">{s.name}</span>
                  <span className="ml-auto text-xs uppercase text-muted">{s.type}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {q.length === 0 ? (
        <p className="text-muted">Escribí algo para buscar.</p>
      ) : (
        <>
          <Tabs tabs={TABS} value={tab} onChange={setTab} />

          {tab === 'all' ? (
            <div className="space-y-8">
              {overview.data && (
                <>
                  {(overview.data.results.track?.length ?? 0) > 0 && (
                    <section>
                      <SectionHeader title="Canciones" />
                      <TrackList tracks={overview.data.results.track ?? []} showAlbum />
                    </section>
                  )}
                  {(overview.data.results.artist?.length ?? 0) > 0 && (
                    <section>
                      <SectionHeader title="Artistas" />
                      <CardGrid items={overview.data.results.artist ?? []} kind="artist" />
                    </section>
                  )}
                  {(overview.data.results.album?.length ?? 0) > 0 && (
                    <section>
                      <SectionHeader title="Álbumes" />
                      <CardGrid items={overview.data.results.album ?? []} kind="album" />
                    </section>
                  )}
                  {(overview.data.results.playlist?.length ?? 0) > 0 && (
                    <section>
                      <SectionHeader title="Playlists" />
                      <CardGrid items={overview.data.results.playlist ?? []} kind="playlist" />
                    </section>
                  )}
                  {Object.values(overview.data.results).every((a) => (a?.length ?? 0) === 0) && (
                    <p className="text-muted">No encontramos nada para “{q}”.</p>
                  )}
                </>
              )}
            </div>
          ) : tab === 'track' ? (
            <TrackList tracks={(typed.data?.data ?? []) as Track[]} showAlbum />
          ) : (
            <CardGrid items={(typed.data?.data ?? []) as CardItem[]} kind={tab} />
          )}
        </>
      )}
    </div>
  );
}
