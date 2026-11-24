import { useState } from 'react';
import { useDebounce } from '../lib/use-debounce';
import {
  useImportArtist,
  useImportFeaturedPlaylists,
  useImportJobs,
  useImportNewReleases,
  useImportStatus,
  useImportTopGenres,
  useImportYoutube,
  useProviderSearch,
  type ImportJob,
  type ImportJobStatus,
} from '../features/admin/import-queries';

const STATUS_STYLES: Record<ImportJobStatus, string> = {
  pending: 'bg-brand-secondary/15 text-brand-secondary',
  running: 'bg-brand-accent/20 text-brand-accent',
  done: 'bg-brand-primary/15 text-brand-primary',
  failed: 'bg-red-500/15 text-red-500',
};

function JobRow({ job }: { job: ImportJob }) {
  return (
    <li className="flex items-center gap-3 py-2 text-sm">
      <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[job.status]}`}>
        {job.status}
      </span>
      <span className="font-medium">{job.type}</span>
      {job.externalId && <span className="truncate opacity-60">{job.externalId}</span>}
      <span className="ml-auto tabular-nums opacity-60">
        {job.result
          ? `${job.result.artists}a · ${job.result.albums}ál · ${job.result.tracks}p`
          : job.error
            ? <span className="text-red-500">{job.error}</span>
            : `intento ${job.attempts}`}
      </span>
    </li>
  );
}

export function AdminImportPage() {
  const status = useImportStatus();
  const [externalId, setExternalId] = useState('');
  const [search, setSearch] = useState('');
  const q = useDebounce(search.trim(), 300);
  const results = useProviderSearch(q);
  const jobs = useImportJobs();

  const importArtist = useImportArtist();
  const newReleases = useImportNewReleases();
  const featured = useImportFeaturedPlaylists();
  const topGenres = useImportTopGenres();
  const youtube = useImportYoutube();
  const [youtubeUrl, setYoutubeUrl] = useState('');

  const configured = status.data?.providerConfigured;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Importar metadatos</h1>
        <p className="mt-1 text-sm opacity-70">
          Proveedor:{' '}
          {configured ? (
            <span className="text-brand-primary">conectado</span>
          ) : (
            <span className="text-red-500">no configurado — agregá las credenciales en el servidor</span>
          )}
          {status.data && ` · letras: ${status.data.lyricsSources.join(', ')}`}
        </p>
      </div>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-brand-secondary/20 bg-brand-primary/5 p-5">
          <h2 className="font-semibold">Importar artista por ID</h2>
          <div className="flex gap-2">
            <input
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              placeholder="ID del artista en el proveedor"
              className="min-w-0 flex-1 rounded-lg border border-brand-secondary/30 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-secondary"
            />
            <button
              type="button"
              onClick={() => externalId.trim() && importArtist.mutate(externalId.trim())}
              disabled={importArtist.isPending || !externalId.trim()}
              className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Importar
            </button>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-brand-secondary/20 bg-brand-primary/5 p-5">
          <h2 className="font-semibold">Importar listas</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => newReleases.mutate(undefined)} disabled={newReleases.isPending} className="rounded-lg border border-brand-secondary/30 px-3 py-2 text-sm hover:border-brand-secondary/60 disabled:opacity-60">
              Novedades
            </button>
            <button type="button" onClick={() => featured.mutate(undefined)} disabled={featured.isPending} className="rounded-lg border border-brand-secondary/30 px-3 py-2 text-sm hover:border-brand-secondary/60 disabled:opacity-60">
              Playlists destacadas
            </button>
            <button type="button" onClick={() => topGenres.mutate(undefined)} disabled={topGenres.isPending} className="rounded-lg border border-brand-secondary/30 px-3 py-2 text-sm hover:border-brand-secondary/60 disabled:opacity-60">
              Géneros top
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-brand-secondary/20 bg-brand-primary/5 p-5">
        <h2 className="font-semibold">Importar audio desde YouTube</h2>
        <p className="text-sm opacity-70">
          Pegá la URL de un video de YouTube: se descarga el audio y se agrega como pista al catálogo
          (reproducible y descargable). Respetá los derechos del contenido.
        </p>
        <div className="flex gap-2">
          <input
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            className="min-w-0 flex-1 rounded-lg border border-brand-secondary/30 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-secondary"
          />
          <button
            type="button"
            onClick={() => youtubeUrl.trim() && youtube.mutate(youtubeUrl.trim(), { onSuccess: () => setYoutubeUrl('') })}
            disabled={youtube.isPending || !youtubeUrl.trim()}
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Importar
          </button>
        </div>
        {youtube.isError && <p className="text-sm text-red-500">No se pudo importar. Revisá la URL.</p>}
      </section>

      {configured && (
        <section>
          <h2 className="mb-3 font-semibold">Buscar artistas en el proveedor</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre del artista…"
            className="w-full rounded-lg border border-brand-secondary/30 bg-transparent px-3 py-2 outline-none focus:border-brand-secondary"
          />
          {results.data && results.data.length > 0 && (
            <ul className="mt-3 divide-y divide-brand-secondary/10">
              {results.data.map((a) => (
                <li key={a.externalId} className="flex items-center gap-3 py-2">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.name}</p>
                    <p className="truncate text-xs opacity-60">{a.genres.slice(0, 3).join(', ')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => importArtist.mutate(a.externalId)}
                    className="rounded-lg bg-brand-primary px-3 py-1.5 text-sm font-medium text-white"
                  >
                    Importar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-3 font-semibold">Trabajos de importación</h2>
        {jobs.data && jobs.data.length > 0 ? (
          <ul className="divide-y divide-brand-secondary/10 rounded-2xl border border-brand-secondary/20 bg-brand-primary/5 px-4">
            {jobs.data.map((job) => (
              <JobRow key={job._id} job={job} />
            ))}
          </ul>
        ) : (
          <p className="opacity-60">Todavía no hay importaciones.</p>
        )}
      </section>
    </div>
  );
}
