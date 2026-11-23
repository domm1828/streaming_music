import { useState } from 'react';
import { Link } from 'react-router';
import { useDebounce } from '../../lib/use-debounce';
import { Column, DataTable } from '../../features/admin/DataTable';
import {
  useAdminArtists,
  useAdminChannels,
  useAdminGenres,
  useCreateArtist,
  useCreateGenre,
  useDeleteArtist,
  useDeleteChannel,
  useDeleteGenre,
  useRefreshChannels,
  type AdminChannel,
} from '../../features/admin/catalog-admin-queries';
import type { Artist, Genre } from '../../features/catalog/types';

type Tab = 'artists' | 'genres' | 'channels';

function NewItem({ onAdd, placeholder }: { onAdd: (name: string) => void; placeholder: string }) {
  const [name, setName] = useState('');
  return (
    <div className="flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-lg border border-brand-secondary/30 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-secondary"
      />
      <button
        type="button"
        onClick={() => { if (name.trim()) { onAdd(name.trim()); setName(''); } }}
        className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white"
      >
        Crear
      </button>
    </div>
  );
}

function DelButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={() => confirm('¿Eliminar?') && onClick()}
      className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-500/10"
    >
      Eliminar
    </button>
  );
}

function ArtistsTab() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(search, 300);
  const { data, isLoading } = useAdminArtists(q, page);
  const create = useCreateArtist();
  const del = useDeleteArtist();
  type Row = Artist & { slug?: string; verified?: boolean };
  const columns: Column<Row>[] = [
    { key: 'name', header: 'Nombre', render: (a) => <Link to={`/artist/${a._id}`} className="font-medium hover:underline">{a.name}</Link> },
    { key: 'slug', header: 'Slug' },
    { key: 'verified', header: 'Verificado', render: (a) => (a.verified ? '✓' : '—') },
  ];
  return (
    <div className="space-y-3">
      <NewItem onAdd={(n) => create.mutate(n)} placeholder="Nombre del artista" />
      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(a) => a._id}
        loading={isLoading}
        search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, placeholder: 'Buscar artistas…' }}
        pagination={{ page, lastPage: data?.pagination.lastPage ?? 1, onPage: setPage }}
        actions={(a) => <DelButton onClick={() => del.mutate(a._id)} />}
      />
    </div>
  );
}

function GenresTab() {
  const { data, isLoading } = useAdminGenres();
  const create = useCreateGenre();
  const del = useDeleteGenre();
  const columns: Column<Genre>[] = [
    { key: 'displayName', header: 'Nombre' },
    { key: 'name', header: 'Slug' },
  ];
  return (
    <div className="space-y-3">
      <NewItem onAdd={(n) => create.mutate(n)} placeholder="Nombre del género" />
      <DataTable columns={columns} rows={data ?? []} rowKey={(g) => g._id} loading={isLoading} actions={(g) => <DelButton onClick={() => del.mutate(g._id)} />} />
    </div>
  );
}

function ChannelsTab() {
  const { data, isLoading } = useAdminChannels();
  const refresh = useRefreshChannels();
  const del = useDeleteChannel();
  const columns: Column<AdminChannel>[] = [
    { key: 'name', header: 'Nombre', render: (c) => <span className="font-medium">{c.name}</span> },
    { key: 'type', header: 'Página' },
    { key: 'sourceType', header: 'Fuente', render: (c) => c.config.sourceType },
    { key: 'position', header: 'Orden' },
    { key: 'public', header: 'Público', render: (c) => (c.public ? '✓' : '—') },
  ];
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => refresh.mutate()}
        disabled={refresh.isPending}
        className="rounded-lg border border-brand-secondary/30 px-4 py-2 text-sm font-medium hover:border-brand-secondary/60 disabled:opacity-60"
      >
        {refresh.isPending ? 'Refrescando…' : 'Refrescar contenido'}
      </button>
      <DataTable columns={columns} rows={data ?? []} rowKey={(c) => c._id} loading={isLoading} actions={(c) => <DelButton onClick={() => del.mutate(c._id)} />} />
    </div>
  );
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'artists', label: 'Artistas' },
  { key: 'genres', label: 'Géneros' },
  { key: 'channels', label: 'Channels' },
];

export function AdminCatalogPage() {
  const [tab, setTab] = useState<Tab>('artists');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === t.key ? 'bg-brand-secondary text-white' : 'hover:bg-brand-primary/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'artists' && <ArtistsTab />}
      {tab === 'genres' && <GenresTab />}
      {tab === 'channels' && <ChannelsTab />}
    </div>
  );
}
