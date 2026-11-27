import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useDebounce } from '../../lib/use-debounce';
import { Column, DataTable } from '../../features/admin/DataTable';
import { ArtistEditDialog } from '../../features/admin/ArtistEditDialog';
import { AlbumEditDialog } from '../../features/admin/AlbumEditDialog';
import { AlbumCreateDialog } from '../../features/admin/AlbumCreateDialog';
import { TrackEditDialog } from '../../features/admin/TrackEditDialog';
import { BulkTrackEditDialog } from '../../features/admin/BulkTrackEditDialog';
import { LyricsEditDialog } from '../../features/admin/LyricsEditDialog';
import { ChannelEditorDialog } from '../../features/admin/ChannelEditorDialog';
import { MediaPickerDialog } from '../../features/media/MediaPickerDialog';
import { Tabs } from '../../components/Tabs';
import {
  useAdminAlbums,
  useAdminArtists,
  useAdminChannels,
  useAdminGenres,
  useAdminTracks,
  useCreateArtist,
  useCreateGenre,
  useDeleteAlbum,
  useDeleteArtist,
  useDeleteChannel,
  useDeleteGenre,
  useDeleteTrack,
  useRefreshChannels,
  useUpdateAlbum,
  useUpdateArtist,
  useUpdateTrack,
  useUpdateGenre,
  type AdminChannel,
  type GenreStats,
} from '../../features/admin/catalog-admin-queries';
import type { Album, Artist, Track } from '../../features/catalog/types';

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString();
}

const TABS = [
  { key: 'artists', label: 'Artistas' },
  { key: 'albums', label: 'Álbumes' },
  { key: 'tracks', label: 'Pistas' },
  { key: 'genres', label: 'Géneros' },
  { key: 'channels', label: 'Channels' },
] as const;
type Tab = (typeof TABS)[number]['key'];

function NewItem({ onAdd, placeholder }: { onAdd: (name: string) => void; placeholder: string }) {
  const [name, setName] = useState('');
  return (
    <div className="flex max-w-md gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-lg border border-divider bg-chip px-3 py-2 text-sm outline-none focus:border-brand-secondary"
      />
      <button
        type="button"
        onClick={() => {
          if (name.trim()) {
            onAdd(name.trim());
            setName('');
          }
        }}
        className="rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light"
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
      className="rounded-full border border-divider px-3 py-1 text-xs text-muted hover:border-red-500 hover:text-red-500"
    >
      Eliminar
    </button>
  );
}

function EditableText({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  useEffect(() => setVal(value), [value]);
  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="text-left font-medium hover:underline">
        {value}
      </button>
    );
  }
  const commit = () => {
    setEditing(false);
    if (val.trim() && val !== value) onSave(val.trim());
  };
  return (
    <input
      autoFocus
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && commit()}
      className="w-full rounded border border-divider bg-chip px-2 py-1 text-sm outline-none focus:border-brand-secondary"
    />
  );
}

function ImageCell({ image, onSelect, promptSeed }: { image?: string | null; onSelect: (url: string) => void; promptSeed?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-2">
      {image ? (
        <img src={image} alt="" className="h-9 w-9 rounded object-cover" />
      ) : (
        <div className="h-9 w-9 rounded bg-chip" />
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-brand-secondary hover:underline"
      >
        Cambiar
      </button>
      {open && (
        <MediaPickerDialog
          kind="image"
          scope="all"
          title="Seleccionar imagen"
          promptSeed={promptSeed}
          onSelect={({ url }) => onSelect(url)}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function ArtistsTab() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(search, 300);
  const { data, isLoading } = useAdminArtists(q, page);
  const create = useCreateArtist();
  const del = useDeleteArtist();
  const update = useUpdateArtist();
  const [editId, setEditId] = useState<string | null>(null);

  type Row = Artist & { slug?: string; verified?: boolean };
  const columns: Column<Row>[] = [
    { key: 'image', header: 'Imagen', render: (a) => <ImageCell image={a.image} onSelect={(url) => update.mutate({ id: a._id, image: url })} promptSeed={`Foto de perfil del artista musical «${a.name}», retrato artístico, sin texto`} /> },
    { key: 'name', header: 'Nombre', render: (a) => <EditableText value={a.name} onSave={(name) => update.mutate({ id: a._id, name })} /> },
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
        actions={(a) => (
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditId(a._id)}
              className="rounded-full border border-divider px-3 py-1 text-xs hover:border-brand-secondary"
            >
              Editar
            </button>
            <Link to={`/artist/${a._id}`} className="rounded-full border border-divider px-3 py-1 text-xs hover:border-brand-secondary">
              Ver
            </Link>
            <DelButton onClick={() => del.mutate(a._id)} />
          </div>
        )}
      />
      {editId && <ArtistEditDialog artistId={editId} onClose={() => setEditId(null)} />}
    </div>
  );
}

function AlbumsTab() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(search, 300);
  const { data, isLoading } = useAdminAlbums(q, page);
  const update = useUpdateAlbum();
  const del = useDeleteAlbum();
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const columns: Column<Album>[] = [
    { key: 'image', header: 'Portada', render: (a) => <ImageCell image={a.image} onSelect={(url) => update.mutate({ id: a._id, image: url })} promptSeed={`Portada del álbum musical «${a.name}», arte de tapa, sin texto`} /> },
    { key: 'name', header: 'Nombre', render: (a) => <EditableText value={a.name} onSave={(name) => update.mutate({ id: a._id, name })} /> },
    { key: 'artists', header: 'Artistas', render: (a) => a.artists?.map((ar) => ar.name).join(', ') },
  ];
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={() => setCreating(true)}
          className="rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light"
        >
          Nuevo álbum
        </button>
      </div>
      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(a) => a._id}
        loading={isLoading}
        search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, placeholder: 'Buscar álbumes…' }}
        pagination={{ page, lastPage: data?.pagination.lastPage ?? 1, onPage: setPage }}
        actions={(a) => (
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditId(a._id)}
              className="rounded-full border border-divider px-3 py-1 text-xs hover:border-brand-secondary"
            >
              Editar
            </button>
            <Link to={`/album/${a._id}`} className="rounded-full border border-divider px-3 py-1 text-xs hover:border-brand-secondary">
              Ver
            </Link>
            <DelButton onClick={() => del.mutate(a._id)} />
          </div>
        )}
      />
      {editId && <AlbumEditDialog albumId={editId} onClose={() => setEditId(null)} />}
      {creating && <AlbumCreateDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

function TracksTab() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(search, 300);
  const { data, isLoading } = useAdminTracks(q, page);
  const update = useUpdateTrack();
  const del = useDeleteTrack();
  const [lyricsFor, setLyricsFor] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const columns: Column<Track>[] = [
    { key: 'number', header: '#', className: 'w-10' },
    { key: 'name', header: 'Nombre', render: (t) => <EditableText value={t.name} onSave={(name) => update.mutate({ id: t._id, name })} /> },
    { key: 'artists', header: 'Artistas', render: (t) => t.artists?.map((a) => a.artist.name).join(', ') },
    { key: 'album', header: 'Álbum', render: (t) => t.album?.name ?? '—' },
  ];
  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-brand-secondary/40 bg-brand-primary/5 px-4 py-2 text-sm">
          <span className="font-medium">{selected.size} seleccionada(s)</span>
          <button
            onClick={() => setBulkOpen(true)}
            className="rounded-full bg-brand-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-primary-light"
          >
            Editar en lote
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-muted hover:text-main">
            Limpiar selección
          </button>
        </div>
      )}
      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(t) => t._id}
        loading={isLoading}
        selection={{ selected, onChange: setSelected }}
        search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, placeholder: 'Buscar pistas…' }}
        pagination={{ page, lastPage: data?.pagination.lastPage ?? 1, onPage: setPage }}
        actions={(t) => (
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditId(t._id)}
              className="rounded-full border border-divider px-3 py-1 text-xs hover:border-brand-secondary"
            >
              Editar
            </button>
            <button
              onClick={() => setLyricsFor(t._id)}
              className="rounded-full border border-divider px-3 py-1 text-xs hover:border-brand-secondary"
            >
              Letra
            </button>
            <DelButton onClick={() => del.mutate(t._id)} />
          </div>
        )}
      />
      {editId && <TrackEditDialog trackId={editId} onClose={() => setEditId(null)} />}
      {bulkOpen && (
        <BulkTrackEditDialog
          trackIds={[...selected]}
          onClose={() => setBulkOpen(false)}
          onDone={() => { setBulkOpen(false); setSelected(new Set()); }}
        />
      )}
      {lyricsFor && (
        <LyricsEditDialog
          trackId={lyricsFor}
          trackName={data?.data.find((t) => t._id === lyricsFor)?.name ?? ''}
          onClose={() => setLyricsFor(null)}
        />
      )}
    </div>
  );
}

function GenresTab() {
  const { data, isLoading } = useAdminGenres();
  const create = useCreateGenre();
  const update = useUpdateGenre();
  const del = useDeleteGenre();
  const [search, setSearch] = useState('');

  const rows = (data ?? []).filter((g) =>
    search.trim() ? g.displayName.toLowerCase().includes(search.trim().toLowerCase()) : true,
  );

  const columns: Column<GenreStats>[] = [
    { key: 'image', header: 'Imagen', render: (g) => <ImageCell image={g.image} onSelect={(url) => update.mutate({ id: g._id, image: url })} promptSeed={`Imagen para el género musical «${g.displayName}», arte digital llamativo, sin texto`} /> },
    { key: 'displayName', header: 'Nombre', render: (g) => <EditableText value={g.displayName} onSave={(displayName) => update.mutate({ id: g._id, displayName })} /> },
    { key: 'name', header: 'Slug', render: (g) => <span className="text-muted">{g.name}</span> },
    { key: 'artistsCount', header: 'Artistas', render: (g) => <span className="tabular-nums">{g.artistsCount}</span> },
    { key: 'updatedAt', header: 'Actualizado', render: (g) => <span className="text-muted">{fmtDate(g.updatedAt)}</span> },
  ];
  return (
    <div className="space-y-3">
      <NewItem onAdd={(n) => create.mutate(n)} placeholder="Nombre del género" />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(g) => g._id}
        loading={isLoading}
        search={{ value: search, onChange: setSearch, placeholder: 'Buscar géneros…' }}
        actions={(g) => <DelButton onClick={() => del.mutate(g._id)} />}
      />
    </div>
  );
}

function ChannelsTab() {
  const { data, isLoading } = useAdminChannels();
  const refresh = useRefreshChannels();
  const del = useDeleteChannel();
  const [editing, setEditing] = useState<AdminChannel | null | undefined>(undefined);
  const columns: Column<AdminChannel>[] = [
    { key: 'name', header: 'Nombre', render: (c) => <span className="font-medium">{c.name}</span> },
    { key: 'type', header: 'Página' },
    { key: 'sourceType', header: 'Fuente', render: (c) => c.config.sourceType },
    { key: 'layout', header: 'Layout', render: (c) => c.config.layout },
    { key: 'position', header: 'Orden' },
    { key: 'public', header: 'Público', render: (c) => (c.public ? '✓' : '—') },
  ];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light"
        >
          Nuevo channel
        </button>
        <button
          type="button"
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending}
          className="rounded-full border border-divider px-4 py-2 text-sm font-medium text-muted hover:border-brand-secondary hover:text-main disabled:opacity-60"
        >
          {refresh.isPending ? 'Refrescando…' : 'Refrescar contenido'}
        </button>
      </div>
      <DataTable
        columns={columns}
        rows={data ?? []}
        rowKey={(c) => c._id}
        loading={isLoading}
        actions={(c) => (
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(c)} className="rounded-full border border-divider px-3 py-1 text-xs hover:border-brand-secondary">
              Editar
            </button>
            <DelButton onClick={() => del.mutate(c._id)} />
          </div>
        )}
      />
      {editing !== undefined && <ChannelEditorDialog channel={editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}

export function AdminCatalogPage() {
  const [tab, setTab] = useState<Tab>('artists');
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Catálogo</h2>
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'artists' && <ArtistsTab />}
      {tab === 'albums' && <AlbumsTab />}
      {tab === 'tracks' && <TracksTab />}
      {tab === 'genres' && <GenresTab />}
      {tab === 'channels' && <ChannelsTab />}
    </div>
  );
}
