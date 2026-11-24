import { Link, useSearchParams } from 'react-router';
import { Radio as RadioIcon, RefreshCw } from 'lucide-react';
import { TrackList } from '../features/catalog/TrackList';
import { MediaHeader, PlayButton, pillClass } from '../components/media';
import { useGenres } from '../features/catalog/catalog-queries';
import { useRadio } from '../features/discovery/discovery-queries';
import { usePlayerStore, type RadioSeed } from '../features/player/player-store';

function GenreStations() {
  const { data } = useGenres();
  return (
    <div className="space-y-6 pt-2">
      <div>
        <h1 className="text-3xl font-bold">Radio</h1>
        <p className="mt-1 max-w-2xl text-muted">
          Elegí una estación y sonará sin parar: se van agregando pistas relacionadas a medida que escuchás.
          También podés iniciar una radio desde cualquier artista o canción.
        </p>
      </div>
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Estaciones por género</h2>
        {data && data.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {data.map((g) => (
              <Link
                key={g._id}
                to={`/radio?seedType=genre&seedId=${g._id}&label=${encodeURIComponent(g.displayName)}`}
                className="flex items-center gap-2 rounded-panel bg-gradient-to-br from-brand-primary to-brand-secondary p-4 font-semibold text-white shadow transition hover:scale-[1.02]"
              >
                <RadioIcon size={18} /> {g.displayName}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted">Todavía no hay géneros. Cargá catálogo para armar estaciones.</p>
        )}
      </section>
    </div>
  );
}

export function RadioPage() {
  const [params] = useSearchParams();
  const seedType = params.get('seedType') ?? '';
  const seedId = params.get('seedId') ?? '';
  const label = params.get('label') ?? undefined;
  const { data, isLoading, isError, refetch, isFetching } = useRadio(seedType, seedId);
  const { playRadio } = usePlayerStore.getState();
  const activeSeed = usePlayerStore((s) => s.radioSeed);

  if (!seedType || !seedId) return <GenreStations />;

  if (isLoading) return <p className="text-muted">Armando tu radio…</p>;
  if (isError || !data) return <p className="text-red-500">No se pudo generar la radio.</p>;

  const seed: RadioSeed = { type: seedType as RadioSeed['type'], id: seedId, label };
  const isActive = activeSeed?.type === seed.type && activeSeed?.id === seed.id;

  return (
    <div className="space-y-8 pt-2">
      <MediaHeader
        image={null}
        gradient="from-brand-primary to-brand-accent"
        kicker="Radio infinita"
        title={label ?? 'Tu estación'}
        meta={isActive ? 'Sonando — se agregan más pistas automáticamente.' : 'Reproducí para empezar.'}
        actions={
          <>
            <PlayButton
              onClick={() => playRadio(data.tracks, seed)}
              disabled={!data.tracks.length}
              label={isActive ? 'Reiniciar' : 'Reproducir radio'}
            />
            <button type="button" onClick={() => refetch()} disabled={isFetching} className={pillClass()}>
              <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} /> Otra selección
            </button>
          </>
        }
      />

      {data.tracks.length > 0 ? (
        <TrackList tracks={data.tracks} showAlbum />
      ) : (
        <p className="text-muted">No encontramos pistas relacionadas todavía. Cargá más catálogo.</p>
      )}
    </div>
  );
}
