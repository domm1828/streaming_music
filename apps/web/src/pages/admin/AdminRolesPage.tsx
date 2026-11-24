import { useMemo, useState } from 'react';
import { Lock, X } from 'lucide-react';
import {
  useCreateRole,
  useDeleteRole,
  usePermissionCatalog,
  useRoles,
  useUpdateRole,
  type PermissionItem,
  type Role,
} from '../../features/admin/roles-queries';

const field = 'w-full rounded-lg border border-divider bg-chip px-3 py-2 text-sm outline-none focus:border-brand-secondary';

function RoleEditorDialog({ role, onClose }: { role: Role | null; onClose: () => void }) {
  const isEdit = Boolean(role);
  const isSystem = role?.system ?? false;
  const catalog = usePermissionCatalog();
  const create = useCreateRole();
  const update = useUpdateRole();

  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [isDefault, setIsDefault] = useState(role?.default ?? false);
  const [permissions, setPermissions] = useState<string[]>(role?.permissions ?? []);
  const hasWildcard = permissions.includes('*');

  const groups = useMemo(() => {
    const m = new Map<string, PermissionItem[]>();
    for (const p of catalog.data ?? []) {
      if (!m.has(p.group)) m.set(p.group, []);
      m.get(p.group)!.push(p);
    }
    return [...m.entries()];
  }, [catalog.data]);

  const toggle = (value: string) =>
    setPermissions((prev) => (prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]));

  const onSave = () => {
    const payload = { name: name.trim(), description: description.trim(), default: isDefault, permissions };
    if (role) update.mutate({ id: role._id, ...payload }, { onSuccess: onClose });
    else create.mutate(payload, { onSuccess: onClose });
  };

  const pending = create.isPending || update.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/50 p-4" onClick={onClose}>
      <div className="mt-10 w-full max-w-lg space-y-4 rounded-panel border border-divider bg-elevated p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{isEdit ? 'Editar rol' : 'Nuevo rol'}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-muted hover:bg-main/10 hover:text-main" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} disabled={isSystem} className={`${field} ${isSystem ? 'opacity-60' : ''}`} />
          {isSystem && <p className="mt-1 text-xs text-muted">Rol del sistema: nombre y permisos no editables.</p>}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Descripción</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className={field} />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} /> Asignar a usuarios nuevos
        </label>

        <div>
          <p className="mb-2 text-xs font-medium text-muted">Permisos</p>
          {hasWildcard ? (
            <p className="rounded-lg bg-chip px-3 py-2 text-sm text-muted">Este rol tiene acceso total (*).</p>
          ) : (
            <div className="space-y-3">
              {groups.map(([group, items]) => (
                <div key={group}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{group}</p>
                  <div className="space-y-1">
                    {items.map((p) => (
                      <label key={p.value} className={`flex items-center gap-2 text-sm ${isSystem ? 'opacity-60' : ''}`}>
                        <input type="checkbox" checked={permissions.includes(p.value)} disabled={isSystem} onChange={() => toggle(p.value)} />
                        {p.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded-full border border-divider px-4 py-2 text-sm text-muted hover:text-main">
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={pending || !name.trim()}
            className="rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light disabled:opacity-60"
          >
            {pending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminRolesPage() {
  const { data, isLoading } = useRoles();
  const del = useDeleteRole();
  const [editing, setEditing] = useState<Role | null | undefined>(undefined);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Roles</h2>
        <button onClick={() => setEditing(null)} className="rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light">
          Nuevo rol
        </button>
      </div>

      {isLoading ? (
        <p className="text-muted">Cargando…</p>
      ) : (
        <div className="overflow-hidden rounded-panel border border-divider">
          <table className="w-full text-sm">
            <thead className="bg-chip text-left text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Rol</th>
                <th className="px-4 py-2 font-medium">Permisos</th>
                <th className="px-4 py-2 font-medium">Usuarios</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {data?.map((r) => (
                <tr key={r._id} className="border-t border-divider">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-medium">
                      {r.system && <Lock size={13} className="text-muted" />}
                      {r.name}
                      {r.default && <span className="rounded bg-brand-secondary/15 px-1.5 py-0.5 text-[10px] text-brand-secondary">default</span>}
                    </div>
                    {r.description && <p className="text-xs text-muted">{r.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {r.permissions.includes('*') ? 'Acceso total (*)' : `${r.permissions.length} permiso(s)`}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted">{r.userCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditing(r)} className="rounded-full border border-divider px-3 py-1 text-xs hover:border-brand-secondary">
                        Editar
                      </button>
                      <button
                        onClick={() => !r.system && confirm(`¿Eliminar el rol "${r.name}"?`) && del.mutate(r._id)}
                        disabled={r.system}
                        className="rounded-full border border-divider px-3 py-1 text-xs text-muted hover:border-red-500 hover:text-red-500 disabled:opacity-30 disabled:hover:border-divider disabled:hover:text-muted"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing !== undefined && <RoleEditorDialog role={editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}
