import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  search?: { value: string; onChange: (v: string) => void; placeholder?: string };
  pagination?: { page: number; lastPage: number; onPage: (p: number) => void };
  onExport?: () => void;
  actions?: (row: T) => ReactNode;
  emptyText?: string;
}

/** Tabla de administración reutilizable: columnas, búsqueda, paginación y export. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  search,
  pagination,
  onExport,
  actions,
  emptyText = 'Sin resultados.',
}: DataTableProps<T>) {
  return (
    <div className="space-y-3">
      {(search || onExport) && (
        <div className="flex items-center gap-2">
          {search && (
            <input
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              placeholder={search.placeholder ?? 'Buscar…'}
              className="min-w-0 flex-1 rounded-lg border border-divider bg-chip px-3 py-2 text-sm outline-none focus:border-brand-secondary"
            />
          )}
          {onExport && (
            <button
              type="button"
              onClick={onExport}
              className="rounded-lg border border-divider px-3 py-2 text-sm font-medium text-muted hover:border-brand-secondary hover:text-main"
            >
              Exportar CSV
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-panel border border-divider">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-divider bg-chip">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`px-3 py-2 font-semibold ${c.className ?? ''}`}>
                  {c.header}
                </th>
              ))}
              {actions && <th className="px-3 py-2 text-right font-semibold">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-3 py-6 text-center text-muted">
                  Cargando…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-3 py-6 text-center text-muted">
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={rowKey(row)} className="border-b border-divider last:border-0 hover:bg-main/5">
                  {columns.map((c) => (
                    <td key={c.key} className={`px-3 py-2 ${c.className ?? ''}`}>
                      {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                    </td>
                  ))}
                  {actions && <td className="px-3 py-2 text-right">{actions(row)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.lastPage > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => pagination.onPage(pagination.page - 1)}
            className="rounded px-3 py-1 hover:bg-main/10 disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span className="text-muted">
            Página {pagination.page} de {pagination.lastPage}
          </span>
          <button
            type="button"
            disabled={pagination.page >= pagination.lastPage}
            onClick={() => pagination.onPage(pagination.page + 1)}
            className="rounded px-3 py-1 hover:bg-main/10 disabled:opacity-40"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
