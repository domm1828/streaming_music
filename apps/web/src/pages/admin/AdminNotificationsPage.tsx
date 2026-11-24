import { useMemo, useState } from 'react';
import { Check, Search, Send, X } from 'lucide-react';
import { useAdminUsers, useRoles, type AdminUser } from '../../features/admin/admin-queries';
import {
  usePreviewBroadcast,
  useSendBroadcast,
  type AudienceKind,
  type BroadcastInput,
} from '../../features/admin/notifications-admin-queries';
import { useDebounce } from '../../lib/use-debounce';

const field =
  'w-full rounded-lg border border-divider bg-chip px-3 py-2 text-sm outline-none focus:border-brand-secondary';

const AUDIENCES: { value: AudienceKind; label: string; hint: string }[] = [
  { value: 'all', label: 'Todos los usuarios', hint: 'Cada cuenta activa (excluye baneados).' },
  { value: 'verified', label: 'Solo verificados', hint: 'Usuarios con el email confirmado.' },
  { value: 'role', label: 'Por rol', hint: 'Usuarios que tengan el rol elegido.' },
  { value: 'users', label: 'Usuarios puntuales', hint: 'Buscá y agregá destinatarios.' },
];

function UserPicker({ selected, onToggle }: { selected: AdminUser[]; onToggle: (u: AdminUser) => void }) {
  const [q, setQ] = useState('');
  const debounced = useDebounce(q, 300);
  const { data } = useAdminUsers(debounced, 1);
  const selectedIds = new Set(selected.map((u) => u._id));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-lg border border-divider bg-chip px-3 py-2">
        <Search size={15} className="text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, usuario o email…"
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((u) => (
            <button
              key={u._id}
              onClick={() => onToggle(u)}
              className="flex items-center gap-1 rounded-full bg-brand-secondary/15 px-2.5 py-1 text-xs text-brand-secondary"
            >
              {u.name} <X size={12} />
            </button>
          ))}
        </div>
      )}
      {debounced && (
        <div className="max-h-52 overflow-auto rounded-lg border border-divider">
          {data?.data.length ? (
            data.data.map((u) => {
              const on = selectedIds.has(u._id);
              return (
                <button
                  key={u._id}
                  onClick={() => onToggle(u)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-main/5"
                >
                  <span>
                    {u.name} <span className="text-muted">@{u.username}</span>
                  </span>
                  {on && <Check size={15} className="text-brand-secondary" />}
                </button>
              );
            })
          ) : (
            <p className="px-3 py-2 text-sm text-muted">Sin resultados.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminNotificationsPage() {
  const roles = useRoles();
  const preview = usePreviewBroadcast();
  const send = useSendBroadcast();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [email, setEmail] = useState(false);
  const [audience, setAudience] = useState<AudienceKind>('all');
  const [roleId, setRoleId] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [result, setResult] = useState<string | null>(null);

  const input = useMemo<BroadcastInput>(
    () => ({
      title: title.trim(),
      body: body.trim() || undefined,
      link: link.trim() || undefined,
      email,
      audience,
      roleId: audience === 'role' ? roleId || undefined : undefined,
      userIds: audience === 'users' ? users.map((u) => u._id) : undefined,
    }),
    [title, body, link, email, audience, roleId, users],
  );

  const audienceReady =
    (audience !== 'role' || Boolean(roleId)) && (audience !== 'users' || users.length > 0);
  const canSend = Boolean(title.trim()) && audienceReady && !send.isPending;

  const toggleUser = (u: AdminUser) =>
    setUsers((prev) => (prev.some((x) => x._id === u._id) ? prev.filter((x) => x._id !== u._id) : [...prev, u]));

  const onPreview = () => {
    setResult(null);
    preview.mutate(input);
  };

  const onSend = () => {
    if (!canSend) return;
    const n = preview.data?.count;
    if (!confirm(`¿Enviar la notificación${n != null ? ` a ${n} usuario(s)` : ''}?`)) return;
    send.mutate(input, {
      onSuccess: (res) => {
        setResult(`Enviada a ${res.sent} usuario(s).`);
        setTitle('');
        setBody('');
        setLink('');
        setUsers([]);
        preview.reset();
      },
    });
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Notificaciones</h2>
        <p className="text-sm text-muted">Enviá un aviso a los usuarios en tiempo real, con email opcional.</p>
      </div>

      <div className="space-y-4 rounded-panel border border-divider bg-elevated p-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Título</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} className={field} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Mensaje</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={2000} className={field} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Enlace (opcional)</label>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="/album/… o https://…"
            className={field}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} /> Enviar también por email
          <span className="text-xs text-muted">(respeta la preferencia de cada usuario)</span>
        </label>
      </div>

      <div className="space-y-3 rounded-panel border border-divider bg-elevated p-5">
        <p className="text-xs font-medium text-muted">Audiencia</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {AUDIENCES.map((a) => (
            <button
              key={a.value}
              onClick={() => {
                setAudience(a.value);
                preview.reset();
                setResult(null);
              }}
              className={`rounded-lg border p-3 text-left text-sm transition ${
                audience === a.value
                  ? 'border-brand-secondary bg-brand-secondary/10'
                  : 'border-divider hover:border-brand-secondary/50'
              }`}
            >
              <span className="font-medium">{a.label}</span>
              <span className="mt-0.5 block text-xs text-muted">{a.hint}</span>
            </button>
          ))}
        </div>

        {audience === 'role' && (
          <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className={field}>
            <option value="">Elegí un rol…</option>
            {roles.data?.map((r) => (
              <option key={r._id} value={r._id}>
                {r.name}
              </option>
            ))}
          </select>
        )}

        {audience === 'users' && <UserPicker selected={users} onToggle={toggleUser} />}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onPreview}
          disabled={!title.trim() || !audienceReady || preview.isPending}
          className="rounded-full border border-divider px-4 py-2 text-sm font-medium hover:border-brand-secondary disabled:opacity-50"
        >
          {preview.isPending ? 'Calculando…' : 'Previsualizar alcance'}
        </button>
        <button
          onClick={onSend}
          disabled={!canSend}
          className="flex items-center gap-2 rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light disabled:opacity-50"
        >
          <Send size={15} /> {send.isPending ? 'Enviando…' : 'Enviar'}
        </button>
        {preview.data && !result && (
          <span className="text-sm text-muted">Alcance estimado: {preview.data.count} usuario(s).</span>
        )}
        {result && <span className="text-sm font-medium text-brand-secondary">{result}</span>}
      </div>
    </div>
  );
}
