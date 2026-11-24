import { useState } from 'react';
import { useAdminAnalytics, type NamedCount, type TopEntity } from '../../features/admin/admin-platform-queries';

const RANGES = [7, 14, 30, 90] as const;

function Tile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-panel bg-chip p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value.toLocaleString()}</p>
      {hint && <p className="text-xs text-brand-secondary">{hint}</p>}
    </div>
  );
}

/** Lista rankeada con barra proporcional (tops y desgloses). */
function RankedList({
  title,
  rows,
  color = 'bg-brand-secondary',
}: {
  title: string;
  rows: { key: string; label: string; sub?: string; plays: number }[];
  color?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.plays));
  return (
    <section className="rounded-panel bg-chip p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.key} className="text-sm">
            <div className="flex justify-between gap-2">
              <span className="truncate">
                {r.label}
                {r.sub && <span className="ml-1 text-xs text-muted">{r.sub}</span>}
              </span>
              <span className="tabular-nums text-muted">{r.plays}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-main/10">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${(r.plays / max) * 100}%` }} />
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-muted">Sin datos.</li>}
      </ul>
    </section>
  );
}

const toEntityRows = (rows: TopEntity[]) => rows.map((r) => ({ key: r.id, label: r.name, plays: r.plays }));
const toNamedRows = (rows: NamedCount[]) =>
  rows.map((r) => ({ key: r.label, label: r.label, plays: r.plays }));

export function AdminAnalyticsPage() {
  const [days, setDays] = useState<number>(14);
  const { data, isLoading } = useAdminAnalytics(days);

  const maxDay = Math.max(1, ...(data?.playsByDay.map((d) => d.plays) ?? [1]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Analytics</h2>
        <div className="flex gap-1 rounded-full bg-chip p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setDays(r)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                days === r ? 'bg-brand-primary text-white' : 'text-muted hover:text-main'
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {isLoading || !data ? (
        <p className="text-muted">Cargando…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Tile
              label="Usuarios"
              value={data.totals.users}
              hint={data.newUsers > 0 ? `+${data.newUsers} en ${data.days}d` : undefined}
            />
            <Tile label="Artistas" value={data.totals.artists} />
            <Tile label="Álbumes" value={data.totals.albums} />
            <Tile label="Pistas" value={data.totals.tracks} />
            <Tile label="Reproducciones" value={data.totals.plays} />
          </div>

          <section className="rounded-panel bg-chip p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
              Reproducciones (últimos {data.days} días)
            </h3>
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
            <RankedList title="Pistas más escuchadas" rows={toEntityRows(data.topTracks)} />
            <RankedList title="Artistas más escuchados" rows={toEntityRows(data.topArtists)} color="bg-brand-primary" />
            <RankedList title="Álbumes más escuchados" rows={toEntityRows(data.topAlbums)} color="bg-brand-primary" />
            <RankedList
              title="Oyentes más activos"
              rows={data.topUsers.map((u) => ({ key: u.id, label: u.name, sub: `@${u.username}`, plays: u.plays }))}
              color="bg-brand-secondary"
            />
            <RankedList title="Reproducciones por país" rows={data.topCountries.map((c) => ({ key: c.country, label: c.country, plays: c.plays }))} color="bg-brand-accent" />
            <RankedList title="Dispositivos" rows={toNamedRows(data.devices)} color="bg-brand-accent" />
            <RankedList title="Plataformas" rows={toNamedRows(data.platforms)} color="bg-brand-accent" />
          </div>
        </>
      )}
    </div>
  );
}
