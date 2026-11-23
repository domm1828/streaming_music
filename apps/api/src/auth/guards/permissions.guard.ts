import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { hasPermissions } from '../rbac/permissions';
import type { AuthenticatedUser } from '../types/authenticated-user';

/**
 * Verifica que el usuario autenticado tenga los permisos requeridos por el
 * endpoint (declarados con @RequirePermissions). Debe usarse junto al
 * JwtAuthGuard, que es quien adjunta req.user.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) throw new ForbiddenException('No autenticado');

    if (!hasPermissions(user.permissions, required)) {
      throw new ForbiddenException('No tenés permisos para esta acción');
    }
    return true;
  }
}
