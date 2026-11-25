import { useState } from 'react';
import { Link } from 'react-router';
import { ExternalLink, EyeOff } from 'lucide-react';
import { DataTable, type Column } from '../../features/admin/DataTable';
import { Tabs } from '../../components/Tabs';
import {
  useAdminReports,
  useHideComment,
  useResolveReport,
  type AdminReport,
} from '../../features/admin/admin-platform-queries';

const STATUS = [
  { key: 'open', label: 'Abiertos' },
  { key: 'resolved', label: 'Resueltos' },
  { key: 'dismissed', label: 'Descartados' },
] as const;

type Status = (typeof STATUS)[number]['key'];

/** Vista previa del contenido reportado + takedown rápido (ocultar comentario). */
function PreviewCell({ report }: { report: AdminReport }) {
  const hide = useHideComment();
  const p = report.preview;
  if (!p) return <span className="text-xs text-muted">—</span>;
  if (!p.exists) return <span className="text-xs italic text-muted">{p.label}</span>;

  const isComment = report.reportableType === 'comment';
  return (
    <div className="space-y-1">
      <div className="flex items-start gap-1">
        <span className="line-clamp-2 text-sm text-main">{p.label}</span>
        {p.link && (
          <Link
            to={p.link}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 shrink-0 text-muted hover:text-brand-secondary"
            title="Ver en la app"
          >
            <ExternalLink size={14} />
          </Link>
        )}
      </div>
      <div className="flex items-center gap-2">
        {p.sublabel && <span className="text-xs text-muted">{p.sublabel}</span>}
        {isComment && p.hidden && (
          <span className="rounded-full bg-chip px-2 py-0.5 text-[10px] font-medium text-muted">oculto</span>
        )}
        {isComment && !p.hidden && (
          <button
            onClick={() => hide.mutate(report.reportable)}
            disabled={hide.isPending}
            className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-brand-accent disabled:opacity-60"
            title="Ocultar este comentario sin resolver el reporte"
          >
            <EyeOff size={12} /> Ocultar
          </button>
        )}
      </div>
    </div>
  );
}

/** Acciones de resolución de un reporte abierto, con nota opcional. */
function ReportActions({ report }: { report: AdminReport }) {
  const resolve = useResolveReport();
  const [note, setNote] = useState('');
  const canHide = report.reportableType === 'comment' && report.preview?.exists && !report.preview?.hidden;

  return (
    <div className="flex flex-col items-end gap-2">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={1}
        placeholder="Nota de resolución (opcional)"
        className="w-48 rounded-lg border border-divider bg-chip px-2 py-1 text-xs outline-none focus:border-brand-secondary"
      />
      <div className="flex flex-wrap justify-end gap-2">
        {canHide && (
          <button
            onClick={() => resolve.mutate({ id: report._id, status: 'resolved', resolution: note || undefined, action: 'hide' })}
            disabled={resolve.isPending}
            className="rounded-full bg-brand-primary px-3 py-1 text-xs font-semibold text-white hover:bg-brand-primary-light disabled:opacity-60"
          >
            Ocultar y resolver
          </button>
        )}
        <button
          onClick={() => resolve.mutate({ id: report._id, status: 'resolved', resolution: note || undefined })}
          disabled={resolve.isPending}
          className="rounded-full border border-divider px-3 py-1 text-xs font-medium hover:border-brand-secondary hover:text-main"
        >
          Resolver
        </button>
        <button
          onClick={() => resolve.mutate({ id: report._id, status: 'dismissed', resolution: note || undefined })}
          disabled={resolve.isPending}
          className="rounded-full border border-divider px-3 py-1 text-xs font-medium text-muted hover:border-main"
        >
          Descartar
        </button>
      </div>
    </div>
  );
}

export function AdminModerationPage() {
  const [status, setStatus] = useState<Status>('open');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminReports(status, page);

  const columns: Column<AdminReport>[] = [
    { key: 'reportableType', header: 'Tipo' },
    { key: 'preview', header: 'Contenido', render: (r) => <PreviewCell report={r} /> },
    { key: 'reason', header: 'Motivo', render: (r) => <span className="line-clamp-2">{r.reason}</span> },
    { key: 'reporter', header: 'Reportó', render: (r) => (r.reporter ? `@${r.reporter.username}` : '—') },
    { key: 'createdAt', header: 'Fecha', render: (r) => new Date(r.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Moderación</h2>
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
        emptyText="No hay reportes."
        actions={(r) =>
          r.status === 'open' ? (
            <ReportActions report={r} />
          ) : (
            <span className="text-xs text-muted">{r.resolution || r.status}</span>
          )
        }
      />
    </div>
  );
}
