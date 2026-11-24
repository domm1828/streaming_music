import { describe, expect, it } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PERMISSIONS } from '../rbac/permissions';
import type { AuthenticatedUser } from '../types/authenticated-user';

function contextWith(user: AuthenticatedUser | undefined) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as never;
}

function guardRequiring(required: string[] | undefined): PermissionsGuard {
  const reflector = {
    getAllAndOverride: () => required,
  } as unknown as Reflector;
  return new PermissionsGuard(reflector);
}

const baseUser: AuthenticatedUser = {
  id: '1',
  email: 'a@b.com',
  name: 'A',
  username: 'a',
  roles: ['user'],
  permissions: [],
  emailVerified: true,
};

describe('PermissionsGuard', () => {
  it('deja pasar si el endpoint no requiere permisos', () => {
    expect(guardRequiring(undefined).canActivate(contextWith(baseUser))).toBe(true);
  });

  it('deja pasar si el usuario tiene el permiso', () => {
    const user = { ...baseUser, permissions: [PERMISSIONS.USERS_VIEW] };
    expect(
      guardRequiring([PERMISSIONS.USERS_VIEW]).canActivate(contextWith(user)),
    ).toBe(true);
  });

  it('niega con 403 si falta el permiso', () => {
    expect(() =>
      guardRequiring([PERMISSIONS.USERS_DELETE]).canActivate(contextWith(baseUser)),
    ).toThrow(ForbiddenException);
  });

  it('niega si no hay usuario autenticado', () => {
    expect(() =>
      guardRequiring([PERMISSIONS.USERS_VIEW]).canActivate(contextWith(undefined)),
    ).toThrow(ForbiddenException);
  });
});
