import { useAdminAnalytics } from '../../features/admin/admin-platform-queries';

function Tile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-panel bg-chip p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value.toLocaleString()}</p>
      {hint && <p className="text-xs text-brand-secondary">{hint}</p>}
    </div>
  );
}

export function AdminAnalyticsPage() {
  const { data, isLoading } = useAdminAnalytics();
  if (isLoading || !data) return <p className="text-muted">Cargando…</p>;

  const maxDay = Math.max(1, ...data.playsByDay.map((d) => d.plays));
  const maxTrack = Math.max(1, ...data.topTracks.map((t) => t.plays));
  const maxCountry = Math.max(1, ...data.topCountries.map((c) => c.plays));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Analytics</h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Tile label="Usuarios" value={data.totals.users} hint={data.newUsers > 0 ? `+${data.newUsers} en 14d` : undefined} />
        <Tile label="Artistas" value={data.totals.artists} />
        <Tile label="Álbumes" value={data.totals.albums} />
        <Tile label="Pistas" value={data.totals.tracks} />
        <Tile label="Reproducciones" value={data.totals.plays} />
      </div>

      <section className="rounded-panel bg-chip p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Reproducciones (últimos 14 días)</h3>
        {data.playsByDay.length === 0 ? (
          <p className="text-sm text-muted">Sin reproducciones en el período.</p>
        ) : (
          <div className="flex h-32 items-end gap-1">
            {data.playsByDay.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${d.day}: ${d.plays}`}>
                <div className="w-full rounded-t bg-brand-primary" style={{ height: `${(d.plays / maxDay) * 100}%` }} />
                <span className="text-[10px] text-muted">{d.day.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-panel bg-chip p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Pistas más escuchadas</h3>
          <ul className="space-y-2">
            {data.topTracks.map((t) => (
              <li key={t.id} className="text-sm">
                <div className="flex justify-between">
                  <span className="truncate pr-2">{t.name}</span>
                  <span className="tabular-nums text-muted">{t.plays}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-main/10">
                  <div className="h-full rounded-full bg-brand-secondary" style={{ width: `${(t.plays / maxTrack) * 100}%` }} />
                </div>
              </li>
            ))}
            {data.topTracks.length === 0 && <li className="text-sm text-muted">Sin datos.</li>}
          </ul>
        </section>

        <section className="rounded-panel bg-chip p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Reproducciones por país</h3>
          <ul className="space-y-2">
            {data.topCountries.map((c) => (
              <li key={c.country} className="text-sm">
                <div className="flex justify-between">
                  <span>{c.country}</span>
                  <span className="tabular-nums text-muted">{c.plays}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-main/10">
                  <div className="h-full rounded-full bg-brand-accent" style={{ width: `${(c.plays / maxCountry) * 100}%` }} />
                </div>
              </li>
            ))}
            {data.topCountries.length === 0 && <li className="text-sm text-muted">Sin datos.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
