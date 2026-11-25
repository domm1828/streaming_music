import { useState } from 'react';
import { Paperclip } from 'lucide-react';
import { DataTable, type Column } from '../../features/admin/DataTable';
import { Tabs } from '../../components/Tabs';
import {
  useAdminBackstage,
  useBackstageAttachments,
  useReviewBackstage,
  type AdminBackstage,
} from '../../features/admin/admin-platform-queries';

const STATUS = [
  { key: 'pending', label: 'Pendientes' },
  { key: 'approved', label: 'Aprobadas' },
  { key: 'rejected', label: 'Rechazadas' },
] as const;

type Status = (typeof STATUS)[number]['key'];

/** Lista los adjuntos (evidencia) de una solicitud con URLs firmadas, bajo demanda. */
function Attachments({ request }: { request: AdminBackstage }) {
  const count = request.attachments?.length ?? 0;
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useBackstageAttachments(request._id, open);
  if (count === 0) return <span className="text-xs text-muted">Sin evidencia</span>;

  return (
    <div className="space-y-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-xs text-muted hover:text-brand-secondary"
      >
        <Paperclip size={12} /> {count} adjunto{count === 1 ? '' : 's'}
      </button>
      {open && (
        <ul className="space-y-1">
          {isLoading && <li className="text-xs text-muted">Cargando…</li>}
          {data?.map((a, i) => (
            <li key={i}>
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-brand-secondary underline hover:text-brand-accent"
              >
                {a.filename}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Acciones de revisión de una solicitud pendiente, con nota opcional. */
function ReviewActions({ request }: { request: AdminBackstage }) {
  const review = useReviewBackstage();
  const [note, setNote] = useState('');

  return (
    <div className="flex flex-col items-end gap-2">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={1}
        placeholder="Nota de revisión (opcional)"
        className="w-48 rounded-lg border border-divider bg-chip px-2 py-1 text-xs outline-none focus:border-brand-secondary"
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={() => review.mutate({ id: request._id, action: 'approve', note: note || undefined })}
          disabled={review.isPending}
          className="rounded-full bg-brand-primary px-3 py-1 text-xs font-semibold text-white hover:bg-brand-primary-light disabled:opacity-60"
        >
          Aprobar
        </button>
        <button
          onClick={() => review.mutate({ id: request._id, action: 'reject', note: note || undefined })}
          disabled={review.isPending}
          className="rounded-full border border-divider px-3 py-1 text-xs font-medium text-muted hover:border-red-500 hover:text-red-500 disabled:opacity-60"
        >
          Rechazar
        </button>
      </div>
    </div>
  );
}

export function AdminBackstagePage() {
  const [status, setStatus] = useState<Status>('pending');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminBackstage(status, page);

  const columns: Column<AdminBackstage>[] = [
    { key: 'type', header: 'Tipo', render: (r) => (r.type === 'claim' ? 'Reclamo' : 'Nuevo') },
    { key: 'artistName', header: 'Artista' },
    { key: 'user', header: 'Usuario', render: (r) => (r.user ? `@${r.user.username}` : '—') },
    { key: 'message', header: 'Mensaje', render: (r) => <span className="line-clamp-2">{r.message || '—'}</span> },
    { key: 'attachments', header: 'Evidencia', render: (r) => <Attachments request={r} /> },
    { key: 'createdAt', header: 'Fecha', render: (r) => new Date(r.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Backstage</h2>
      <Tabs
        tabs={STATUS}
        value={status}
        onChange={(s) => {
          setStatus(s);
          setPage(1);
        }}
      />
      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(r) => r._id}
        loading={isLoading}
        pagination={data ? { page, lastPage: data.pagination.lastPage, onPage: setPage } : undefined}
        emptyText="No hay solicitudes."
        actions={(r) =>
          r.status === 'pending' ? (
            <ReviewActions request={r} />
          ) : (
            <span className="text-xs text-muted">{r.reviewNote || r.status}</span>
          )
        }
      />
    </div>
  );
}
