import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useDebounce } from '../../lib/use-debounce';
import { useAuthStore } from '../../features/auth/auth-store';
import { Column, DataTable } from '../../features/admin/DataTable';
import {
  useAdminUsers,
  useCreateExport,
  useImpersonate,
  useRoles,
  useSetBan,
  useSetUserRoles,
  type AdminUser,
} from '../../features/admin/admin-queries';

function RolesEditor({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const { data: roles } = useRoles();
  const setRoles = useSetUserRoles();
  const [selected, setSelected] = useState<string[]>(user.roles.map((r) => r._id));

  return (
    <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-brand-secondary/20 bg-[color:var(--surface)] p-3 shadow-lg">
      <p className="mb-2 text-xs font-semibold uppercase opacity-60">Roles de {user.username}</p>
      <ul className="space-y-1">
        {roles?.map((r) => (
          <li key={r._id}>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(r._id)}
                onChange={(e) =>
                  setSelected((s) => (e.target.checked ? [...s, r._id] : s.filter((x) => x !== r._id)))
                }
              />
              {r.name}
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="text-xs opacity-70 hover:opacity-100">
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => setRoles.mutate({ id: user._id, roleIds: selected }, { onSuccess: onClose })}
          className="rounded bg-brand-primary px-2 py-1 text-xs font-medium text-white"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}

export function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(search, 300);
  const { data, isLoading } = useAdminUsers(q, page);
  const setBan = useSetBan();
  const impersonate = useImpersonate();
  const createExport = useCreateExport();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<string | null>(null);

  const onImpersonate = (id: string) => {
    impersonate.mutate(id, {
      onSuccess: (result) => {
        useAuthStore.getState().setAuth(result);
        navigate('/');
      },
    });
  };

  const columns: Column<AdminUser>[] = [
    { key: 'name', header: 'Nombre', render: (u) => <span className="font-medium">{u.name}</span> },
    { key: 'username', header: 'Usuario', render: (u) => `@${u.username}` },
    { key: 'email', header: 'Email' },
    { key: 'roles', header: 'Roles', render: (u) => u.roles.map((r) => r.name).join(', ') || '—' },
    {
      key: 'status',
      header: 'Estado',
      render: (u) =>
        u.bannedAt ? <span className="text-red-500">Suspendido</span> : <span className="text-brand-primary">Activo</span>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={data?.data ?? []}
      rowKey={(u) => u._id}
      loading={isLoading}
      search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, placeholder: 'Buscar usuarios…' }}
      pagination={{ page, lastPage: data?.pagination.lastPage ?? 1, onPage: setPage }}
      onExport={() => createExport.mutate('users')}
      actions={(u) => (
        <div className="relative inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => setBan.mutate({ id: u._id, banned: !u.bannedAt })}
            className="rounded px-2 py-1 text-xs hover:bg-brand-primary/10"
          >
            {u.bannedAt ? 'Reactivar' : 'Suspender'}
          </button>
          <button
            type="button"
            onClick={() => onImpersonate(u._id)}
            className="rounded px-2 py-1 text-xs hover:bg-brand-primary/10"
          >
            Impersonar
          </button>
          <button
            type="button"
            onClick={() => setEditing(editing === u._id ? null : u._id)}
            className="rounded px-2 py-1 text-xs hover:bg-brand-primary/10"
          >
            Roles
          </button>
          {editing === u._id && <RolesEditor user={u} onClose={() => setEditing(null)} />}
        </div>
      )}
    />
  );
}
