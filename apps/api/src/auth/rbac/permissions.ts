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
  CONTENT_MANAGE: 'content.manage',
  NOTIFICATIONS_SEND: 'notifications.send',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Catálogo de permisos asignables, agrupados y con etiqueta legible (para el editor de roles). */
export const PERMISSION_CATALOG: { group: string; value: Permission; label: string }[] = [
  { group: 'Usuarios', value: PERMISSIONS.USERS_VIEW, label: 'Ver usuarios' },
  { group: 'Usuarios', value: PERMISSIONS.USERS_CREATE, label: 'Crear usuarios' },
  { group: 'Usuarios', value: PERMISSIONS.USERS_UPDATE, label: 'Editar usuarios y roles' },
  { group: 'Usuarios', value: PERMISSIONS.USERS_DELETE, label: 'Eliminar usuarios' },
  { group: 'Usuarios', value: PERMISSIONS.USERS_BAN, label: 'Banear / reactivar' },
  { group: 'Usuarios', value: PERMISSIONS.USERS_IMPERSONATE, label: 'Suplantar usuarios' },
  { group: 'Catálogo', value: PERMISSIONS.CATALOG_MANAGE, label: 'Gestionar catálogo (artistas/álbumes/pistas/géneros)' },
  { group: 'Contenido', value: PERMISSIONS.CONTENT_MANAGE, label: 'Gestionar contenido (channels, moderación, CMS)' },
  { group: 'Contenido', value: PERMISSIONS.NOTIFICATIONS_SEND, label: 'Enviar notificaciones a usuarios' },
];

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
