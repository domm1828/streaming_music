import { useState } from 'react';
import { DataTable, type Column } from '../../features/admin/DataTable';
import { Tabs } from '../../components/Tabs';
import { useAdminBackstage, useReviewBackstage, type AdminBackstage } from '../../features/admin/admin-platform-queries';

const STATUS = [
  { key: 'pending', label: 'Pendientes' },
  { key: 'approved', label: 'Aprobadas' },
  { key: 'rejected', label: 'Rechazadas' },
] as const;

type Status = (typeof STATUS)[number]['key'];

export function AdminBackstagePage() {
  const [status, setStatus] = useState<Status>('pending');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminBackstage(status, page);
  const review = useReviewBackstage();

  const columns: Column<AdminBackstage>[] = [
    { key: 'type', header: 'Tipo', render: (r) => (r.type === 'claim' ? 'Reclamo' : 'Nuevo') },
    { key: 'artistName', header: 'Artista' },
    { key: 'user', header: 'Usuario', render: (r) => (r.user ? `@${r.user.username}` : '—') },
    { key: 'message', header: 'Mensaje', render: (r) => <span className="line-clamp-2">{r.message || '—'}</span> },
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
            <div className="flex justify-end gap-2">
              <button
                onClick={() => review.mutate({ id: r._id, action: 'approve' })}
                className="rounded-full bg-brand-primary px-3 py-1 text-xs font-semibold text-white hover:bg-brand-primary-light"
              >
                Aprobar
              </button>
              <button
                onClick={() => review.mutate({ id: r._id, action: 'reject' })}
                className="rounded-full border border-divider px-3 py-1 text-xs font-medium text-muted hover:border-red-500 hover:text-red-500"
              >
                Rechazar
              </button>
            </div>
          ) : (
            <span className="text-xs text-muted">{r.reviewNote || r.status}</span>
          )
        }
      />
    </div>
  );
}
