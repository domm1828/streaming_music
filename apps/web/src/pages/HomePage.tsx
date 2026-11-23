import { Link } from 'react-router';
import { useArtists } from '../features/catalog/catalog-queries';

export function HomePage() {
  const { data } = useArtists();

  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-gradient-to-br from-brand-primary to-brand-secondary px-8 py-14 text-white">
        <h1 className="text-4xl font-bold">Tu música, sin límites.</h1>
        <p className="mt-3 max-w-lg text-white/80">
          Descubrí artistas, armá tu biblioteca y escuchá lo que quieras en Stream Music.
        </p>
        <Link
          to="/browse"
          className="mt-6 inline-block rounded-lg bg-brand-accent px-5 py-2.5 font-semibold text-brand-primary-dark"
        >
          Explorar
        </Link>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Artistas</h2>
          <Link to="/browse" className="text-sm text-brand-secondary hover:underline">
            Ver todo
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {data?.data.slice(0, 10).map((artist) => (
            <Link
              key={artist._id}
              to={`/artist/${artist._id}`}
              className="rounded-xl border border-brand-secondary/15 bg-brand-primary/5 p-3 hover:border-brand-secondary/40"
            >
              <div className="mb-2 aspect-square rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary" />
              <p className="truncate text-sm font-medium">{artist.name}</p>
            </Link>
          ))}
        </div>
        {data && data.data.length === 0 && (
          <p className="opacity-60">Todavía no hay artistas. Cargá contenido desde la API.</p>
        )}
      </section>
    </div>
  );
}
