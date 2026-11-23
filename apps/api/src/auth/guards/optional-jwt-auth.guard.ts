import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Autenticación opcional: si hay un token válido adjunta el usuario,
 * si no, deja pasar con req.user indefinido (para endpoints públicos
 * que se enriquecen cuando hay sesión, p. ej. /bootstrap).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  override handleRequest<TUser>(_err: unknown, user: TUser): TUser {
    // Passport pasa `false` cuando no hay token; lo normalizamos a undefined.
    return (user || undefined) as TUser;
  }
}
