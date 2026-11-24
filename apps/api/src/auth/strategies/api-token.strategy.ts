import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';
import { UsersService } from '../../users/users.service';
import type { AuthenticatedUser } from '../types/authenticated-user';
import { ApiTokensService } from '../api-tokens.service';

/**
 * Autentica con un token de acceso personal (Authorization: Bearer sm_...).
 * Se registra junto a la estrategia 'jwt' para que los endpoints protegidos
 * acepten tanto JWT como tokens de API.
 */
@Injectable()
export class ApiTokenStrategy extends PassportStrategy(Strategy, 'api-token') {
  constructor(
    private readonly apiTokens: ApiTokensService,
    private readonly usersService: UsersService,
  ) {
    super();
  }

  async validate(token: string): Promise<AuthenticatedUser> {
    const userId = await this.apiTokens.resolveUserId(token);
    if (!userId) throw new UnauthorizedException('Token de API inválido');
    const user = await this.usersService.getAuthenticatedUser(userId);
    if (!user) throw new UnauthorizedException('Token de API inválido');
    return user;
  }
}
