import { Link } from 'react-router';
import { useChannels } from '../features/discovery/discovery-queries';
import { ChannelRow } from '../features/discovery/ChannelRow';

export function HomePage() {
  const { data, isLoading } = useChannels('home');

  return (
    <div className="space-y-10 pt-2">
      <section className="relative overflow-hidden rounded-panel bg-gradient-to-br from-brand-primary to-brand-secondary px-8 py-14 text-white">
        <h1 className="text-4xl font-bold">Tu música, sin límites.</h1>
        <p className="mt-3 max-w-lg text-white/85">
          Descubrí artistas, armá tu biblioteca y escuchá lo que quieras en Stream Music.
        </p>
        <Link
          to="/search"
          className="mt-6 inline-block rounded-full bg-brand-accent px-6 py-3 font-semibold text-brand-primary-dark transition hover:bg-brand-accent-light"
        >
          Buscar música
        </Link>
      </section>

      {isLoading && <p className="text-muted">Cargando…</p>}

      {data?.map((channel) => <ChannelRow key={channel._id} channel={channel} />)}

      {data && data.every((c) => c.items.length === 0) && (
        <p className="text-muted">Todavía no hay contenido. Cargá catálogo desde el panel de administración y aparecerá acá.</p>
      )}
    </div>
  );
}
