import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '../auth/auth-store';

/**
 * Conecta al namespace de tiempo real y refresca las notificaciones cuando
 * llega un evento `notification`. El token se pasa en el handshake.
 */
export function useNotificationsSocket() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();

  useEffect(() => {
    if (!token) return;
    const socket: Socket = io('/rt', { auth: { token }, transports: ['websocket', 'polling'] });

    socket.on('notification', () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [token, qc]);
}
