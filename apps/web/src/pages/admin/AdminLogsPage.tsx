import { useState } from 'react';
import { DataTable, type Column } from '../../features/admin/DataTable';
import { Tabs } from '../../components/Tabs';
import { useAdminLogs, type LogEntry } from '../../features/admin/admin-platform-queries';

const LEVELS = [
  { key: '', label: 'Todos' },
  { key: 'error', label: 'Errores' },
  { key: 'email', label: 'Emails' },
] as const;

type Level = (typeof LEVELS)[number]['key'];

export function AdminLogsPage() {
  const [level, setLevel] = useState<Level>('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminLogs(level, page);

  const columns: Column<LogEntry>[] = [
    {
      key: 'level',
      header: 'Nivel',
      render: (l) => (
        <span className={`rounded-full px-2 py-0.5 text-xs ${l.level === 'error' ? 'bg-red-500/15 text-red-500' : 'bg-brand-secondary/15 text-brand-secondary'}`}>
          {l.level}
        </span>
      ),
    },
    { key: 'message', header: 'Mensaje', render: (l) => <span className="line-clamp-2">{l.message}</span> },
    { key: 'context', header: 'Contexto', render: (l) => l.context ?? '—' },
    { key: 'createdAt', header: 'Fecha', render: (l) => new Date(l.createdAt).toLocaleString() },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Logs</h2>
      <Tabs
        tabs={LEVELS}
        value={level}
        onChange={(l) => {
          setLevel(l);
          setPage(1);
        }}
      />
      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(l) => l._id}
        loading={isLoading}
        pagination={data ? { page, lastPage: data.pagination.lastPage, onPage: setPage } : undefined}
        emptyText="No hay registros."
      />
    </div>
  );
}
