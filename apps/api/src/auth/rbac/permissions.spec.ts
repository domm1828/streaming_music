import { describe, expect, it } from 'vitest';
import { ALL_PERMISSIONS, hasPermissions, PERMISSIONS } from './permissions';

describe('hasPermissions', () => {
  it('concede todo con el comodín', () => {
    expect(hasPermissions([ALL_PERMISSIONS], [PERMISSIONS.USERS_DELETE])).toBe(true);
  });

  it('concede cuando están todos los permisos requeridos', () => {
    expect(
      hasPermissions([PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_UPDATE], [PERMISSIONS.USERS_VIEW]),
    ).toBe(true);
  });

  it('niega cuando falta un permiso', () => {
    expect(hasPermissions([PERMISSIONS.USERS_VIEW], [PERMISSIONS.USERS_DELETE])).toBe(false);
  });

  it('concede cuando no se requiere ninguno', () => {
    expect(hasPermissions([], [])).toBe(true);
  });
});
