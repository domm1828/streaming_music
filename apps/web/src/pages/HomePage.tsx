import { useHealth } from '../features/health/use-health';

export function HomePage() {
  const { data, isLoading, isError } = useHealth();

  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center gap-8 px-4 py-16">
      <header className="text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          <span className="text-brand-primary">Stream</span>{' '}
          <span className="text-brand-accent">Music</span>
        </h1>
        <p className="mt-3 text-lg opacity-70">Tu plataforma de streaming musical.</p>
      </header>

      <div className="flex gap-3">
        <span className="h-10 w-10 rounded-full bg-brand-primary" title="primary #2d5a34" />
        <span className="h-10 w-10 rounded-full bg-brand-secondary" title="secondary #4e8c56" />
        <span className="h-10 w-10 rounded-full bg-brand-accent" title="accent #f5b31e" />
      </div>

      <section className="w-full rounded-2xl border border-brand-secondary/30 bg-brand-primary/5 p-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-60">
          Estado de la API
        </h2>
        {isLoading && <p>Consultando…</p>}
        {isError && <p className="text-red-500">No se pudo conectar con la API.</p>}
        {data && (
          <ul className="space-y-1 font-mono text-sm">
            <li>servicio: {data.service}</li>
            <li>estado: {data.status}</li>
            <li>base de datos: {data.database}</li>
            <li>uptime: {data.uptime}s</li>
          </ul>
        )}
      </section>
    </main>
  );
}
