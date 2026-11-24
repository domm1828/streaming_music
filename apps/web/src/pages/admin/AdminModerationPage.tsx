import { useState } from 'react';
import { DataTable, type Column } from '../../features/admin/DataTable';
import { Tabs } from '../../components/Tabs';
import { useAdminReports, useResolveReport, type AdminReport } from '../../features/admin/admin-platform-queries';

const STATUS = [
  { key: 'open', label: 'Abiertos' },
  { key: 'resolved', label: 'Resueltos' },
  { key: 'dismissed', label: 'Descartados' },
] as const;

type Status = (typeof STATUS)[number]['key'];

export function AdminModerationPage() {
  const [status, setStatus] = useState<Status>('open');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminReports(status, page);
  const resolve = useResolveReport();

  const columns: Column<AdminReport>[] = [
    { key: 'reportableType', header: 'Tipo' },
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
            <div className="flex justify-end gap-2">
              <button
                onClick={() => resolve.mutate({ id: r._id, status: 'resolved' })}
                className="rounded-full border border-divider px-3 py-1 text-xs font-medium hover:border-brand-secondary hover:text-main"
              >
                Resolver
              </button>
              <button
                onClick={() => resolve.mutate({ id: r._id, status: 'dismissed' })}
                className="rounded-full border border-divider px-3 py-1 text-xs font-medium text-muted hover:border-main"
              >
                Descartar
              </button>
            </div>
          ) : (
            <span className="text-xs text-muted">{r.resolution || r.status}</span>
          )
        }
      />
    </div>
  );
}
