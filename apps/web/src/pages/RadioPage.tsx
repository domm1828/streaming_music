import { Link, useSearchParams } from 'react-router';
import { Button } from '../components/ui';
import { TrackList } from '../features/catalog/TrackList';
import { useGenres } from '../features/catalog/catalog-queries';
import { useRadio } from '../features/discovery/discovery-queries';
import { usePlayerStore, type RadioSeed } from '../features/player/player-store';

function GenreStations() {
  const { data } = useGenres();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Radio</h1>
        <p className="mt-1 opacity-70">
          Elegí una estación y sonará sin parar: se van agregando pistas relacionadas a medida que
          escuchás. También podés iniciar una radio desde cualquier artista o canción.
        </p>
      </div>
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide opacity-70">Estaciones por género</h2>
        {data && data.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {data.map((g) => (
              <Link
                key={g._id}
                to={`/radio?seedType=genre&seedId=${g._id}&label=${encodeURIComponent(g.displayName)}`}
                className="rounded-xl border border-brand-secondary/15 bg-gradient-to-br from-brand-primary to-brand-secondary p-4 font-semibold text-white hover:from-brand-primary-light"
              >
                📻 {g.displayName}
              </Link>
            ))}
          </div>
        ) : (
          <p className="opacity-60">Todavía no hay géneros. Cargá catálogo para armar estaciones.</p>
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

  if (isLoading) return <p className="opacity-60">Armando tu radio…</p>;
  if (isError || !data) return <p className="text-red-500">No se pudo generar la radio.</p>;

  const seed: RadioSeed = { type: seedType as RadioSeed['type'], id: seedId, label };
  const isActive = activeSeed?.type === seed.type && activeSeed?.id === seed.id;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide opacity-60">Radio infinita</p>
          <h1 className="text-3xl font-bold">{label ?? 'Tu estación'}</h1>
          <p className="mt-1 text-sm opacity-60">
            {isActive ? 'Sonando — se agregan más pistas automáticamente.' : 'Reproducí para empezar.'}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="w-44">
            <Button type="button" onClick={() => playRadio(data.tracks, seed)} disabled={!data.tracks.length}>
              {isActive ? '▶ Reiniciar' : '▶ Reproducir radio'}
            </Button>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-lg border border-brand-secondary/30 px-4 py-2 text-sm font-medium hover:border-brand-secondary/60 disabled:opacity-60"
          >
            {isFetching ? 'Actualizando…' : 'Otra selección'}
          </button>
        </div>
      </header>

      {data.tracks.length > 0 ? (
        <TrackList tracks={data.tracks} />
      ) : (
        <p className="opacity-60">No encontramos pistas relacionadas todavía. Cargá más catálogo.</p>
      )}
    </div>
  );
}
