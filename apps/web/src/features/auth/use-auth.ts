import { useAuthStore } from './auth-store';

/** Hook de conveniencia para leer el estado de autenticación. */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  return {
    user,
    isAuthenticated: Boolean(accessToken && user),
    hasPermission: (permission: string) =>
      Boolean(user && (user.permissions.includes('*') || user.permissions.includes(permission))),
  };
}
