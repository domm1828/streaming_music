import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from './use-auth';

/** Protege rutas de administración: exige sesión y un permiso concreto. */
export function RequirePermission({ permission, children }: { permission: string; children: ReactNode }) {
  const { isAuthenticated, hasPermission } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!hasPermission(permission)) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">Acceso restringido</h1>
        <p className="mt-2 opacity-70">No tenés permisos para ver esta sección.</p>
      </div>
    );
  }
  return <>{children}</>;
}
