import { useSearchParams } from 'react-router';
import { Button } from '../components/ui';
import { TrackList } from '../features/catalog/TrackList';
import { useRadio } from '../features/discovery/discovery-queries';
import { usePlayerStore } from '../features/player/player-store';

export function RadioPage() {
  const [params] = useSearchParams();
  const seedType = params.get('seedType') ?? '';
  const seedId = params.get('seedId') ?? '';
  const { data, isLoading, isError, refetch, isFetching } = useRadio(seedType, seedId);
  const { playQueue } = usePlayerStore.getState();

  if (!seedType || !seedId) {
    return (
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">Radio</h1>
        <p className="opacity-70">
          Iniciá una radio desde la página de un artista o una canción para escuchar música
          relacionada.
        </p>
      </div>
    );
  }

  if (isLoading) return <p className="opacity-60">Armando tu radio…</p>;
  if (isError || !data) return <p className="text-red-500">No se pudo generar la radio.</p>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide opacity-60">Radio</p>
          <h1 className="text-3xl font-bold">{data.count} pistas para vos</h1>
        </div>
        <div className="flex gap-3">
          <div className="w-40">
            <Button type="button" onClick={() => playQueue(data.tracks, 0)} disabled={!data.tracks.length}>
              ▶ Reproducir
            </Button>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-lg border border-brand-secondary/30 px-4 py-2 text-sm font-medium hover:border-brand-secondary/60 disabled:opacity-60"
          >
            {isFetching ? 'Generando…' : 'Generar más'}
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
