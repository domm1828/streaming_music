import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtConfig } from '../../config/configuration';
import { UsersService } from '../../users/users.service';
import type { AuthenticatedUser, JwtPayload } from '../types/authenticated-user';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<JwtConfig>('jwt')!.accessSecret,
    });
  }

  /** Se ejecuta tras validar la firma/expiración del token. */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.getAuthenticatedUser(payload.sub);
    if (!user) throw new UnauthorizedException('Sesión inválida');
    return user;
  }
}
