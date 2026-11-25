import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomBytes } from 'node:crypto';
import slugify from 'slugify';
import { SettingsService } from '../settings/settings.service';
import { UsersService } from '../users/users.service';
import type { AuthResult } from './auth.service';
import { SessionMeta, TokensService } from './tokens.service';
import { SocialProfile, SocialProfileDocument, SocialProvider } from './schemas/social-profile.schema';

export interface SocialProfileData {
  providerId: string;
  email: string;
  /** El proveedor confirmó la titularidad del email. */
  emailVerified: boolean;
  name: string;
  image?: string | null;
}

@Injectable()
export class SocialAuthService {
  constructor(
    @InjectModel(SocialProfile.name) private readonly model: Model<SocialProfileDocument>,
    private readonly users: UsersService,
    private readonly tokens: TokensService,
    private readonly settings: SettingsService,
  ) {}

  private async buildResult(userId: string, email: string, meta: SessionMeta): Promise<AuthResult> {
    const user = await this.users.getAuthenticatedUser(userId);
    if (!user) throw new UnauthorizedException('No se pudo iniciar sesión');
    const pair = await this.tokens.issueTokenPair(userId, email, meta);
    return { user, ...pair };
  }

  private async uniqueUsername(base: string): Promise<string> {
    const slug = slugify(base, { lower: true, strict: true }) || 'user';
    return `${slug}-${randomBytes(3).toString('hex')}`;
  }

  /**
   * Inicia sesión con un perfil social ya verificado por el proveedor:
   * reusa el vínculo existente, o enlaza/crea la cuenta local. Emite los mismos JWT.
   */
  async loginWithProfile(
    provider: SocialProvider,
    profile: SocialProfileData,
    meta: SessionMeta,
  ): Promise<AuthResult> {
    // 1) Vínculo existente: ya es una identidad confiada, se reusa directamente.
    const existing = await this.model.findOne({ provider, providerId: profile.providerId }).lean().exec();
    if (existing) {
      const user = await this.users.findById(String(existing.user));
      if (!user) throw new UnauthorizedException('Cuenta no encontrada');
      return this.buildResult(String(user._id), user.email, meta);
    }

    // Para enlazar o crear por email, el proveedor DEBE haber verificado el email.
    // De lo contrario un atacante podría reclamar el email de otra cuenta (account takeover).
    if (!profile.emailVerified) {
      throw new UnauthorizedException('El proveedor no verificó la titularidad del email');
    }

    // 2) Enlazar a una cuenta existente por email, o crear una nueva.
    let user = await this.users.findByEmail(profile.email);
    if (!user) {
      // Si el admin exige cuenta previa, no se crea una nueva desde el login social.
      if (await this.settings.getBoolean('auth.social.requireAccount', false)) {
        throw new UnauthorizedException('Necesitás una cuenta existente para iniciar sesión con redes');
      }
      user = await this.users.create({
        name: profile.name,
        username: await this.uniqueUsername(profile.name || profile.email.split('@')[0]),
        email: profile.email,
        passwordHash: null,
      });
      await this.users.markEmailVerified(String(user._id)); // los proveedores verifican el email
    }

    await this.model.create({ user: user._id, provider, providerId: profile.providerId });
    return this.buildResult(String(user._id), user.email, meta);
  }
}
