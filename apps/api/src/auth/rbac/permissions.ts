/** Comodín: concede todos los permisos. */
export const ALL_PERMISSIONS = '*';

/** Catálogo de permisos. Crece con cada fase. */
export const PERMISSIONS = {
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  USERS_BAN: 'users.ban',
  USERS_IMPERSONATE: 'users.impersonate',
  CATALOG_MANAGE: 'catalog.manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Roles por defecto que se siembran al iniciar. */
export const DEFAULT_ROLES = [
  {
    name: 'admin',
    description: 'Acceso total a la plataforma',
    default: false,
    permissions: [ALL_PERMISSIONS],
  },
  {
    name: 'user',
    description: 'Usuario estándar',
    default: true,
    permissions: [] as string[],
  },
];

/** True si el conjunto de permisos del usuario satisface todos los requeridos. */
export function hasPermissions(userPermissions: string[], required: string[]): boolean {
  if (userPermissions.includes(ALL_PERMISSIONS)) return true;
  return required.every((p) => userPermissions.includes(p));
}
