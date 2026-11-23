import { useState } from 'react';
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useUnreadCount,
} from './notification-queries';
import { useNotificationsSocket } from './use-notifications-socket';

export function NotificationBell() {
  useNotificationsSocket();
  const [open, setOpen] = useState(false);
  const { data: unread } = useUnreadCount();
  const { data } = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const count = unread?.count ?? 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg px-2 py-1.5 hover:bg-brand-primary/10"
        aria-label="Notificaciones"
      >
        <span aria-hidden>🔔</span>
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-accent px-1 text-[10px] font-bold text-brand-primary-dark">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border border-brand-secondary/20 bg-[color:var(--surface)] shadow-lg">
          <div className="flex items-center justify-between border-b border-brand-secondary/20 px-4 py-2">
            <span className="text-sm font-semibold">Notificaciones</span>
            {count > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                className="text-xs text-brand-secondary hover:underline"
              >
                Marcar todas
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-auto">
            {data?.data.length ? (
              data.data.map((n) => (
                <li
                  key={n._id}
                  className={`border-b border-brand-secondary/10 px-4 py-2 last:border-0 ${
                    n.readAt ? 'opacity-60' : 'bg-brand-primary/5'
                  }`}
                >
                  <button type="button" onClick={() => !n.readAt && markRead.mutate(n._id)} className="w-full text-left">
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body && <p className="text-xs opacity-70">{n.body}</p>}
                  </button>
                </li>
              ))
            ) : (
              <li className="px-4 py-6 text-center text-sm opacity-60">No tenés notificaciones.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
