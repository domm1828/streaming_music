import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { UsersService } from '../users/users.service';
import type { UserDocument } from '../users/schemas/user.schema';

export interface TwoFactorSetup {
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string;
}

@Injectable()
export class TwoFactorService {
  constructor(private readonly users: UsersService) {}

  isEnabled(user: Pick<UserDocument, 'twoFactor'>): boolean {
    return Boolean(user.twoFactor?.confirmedAt);
  }

  /** Genera un secreto TOTP (aún sin confirmar) y el QR para escanear. */
  async setup(userId: string, email: string): Promise<TwoFactorSetup> {
    const secret = speakeasy.generateSecret({ name: `Stream Music (${email})`, length: 20 });
    await this.users.setTwoFactorSecret(userId, secret.base32);
    const otpauthUrl = secret.otpauth_url ?? '';
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
    return { secret: secret.base32, otpauthUrl, qrDataUrl };
  }

  private verifyTotp(secret: string, token: string): boolean {
    return speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 });
  }

  /** Confirma la activación verificando un código y devuelve los códigos de recuperación. */
  async enable(userId: string, token: string): Promise<{ recoveryCodes: string[] }> {
    const user = await this.users.findById(userId);
    const secret = user?.twoFactor?.secret;
    if (!secret) throw new BadRequestException('Primero generá el secreto (setup)');
    if (!this.verifyTotp(secret, token)) throw new BadRequestException('Código inválido');

    const recoveryCodes = Array.from({ length: 10 }, () => randomBytes(5).toString('hex'));
    const hashes = await Promise.all(recoveryCodes.map((c) => bcrypt.hash(c, 8)));
    await this.users.confirmTwoFactor(userId, hashes);
    return { recoveryCodes };
  }

  async disable(userId: string, token: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user?.twoFactor?.confirmedAt) throw new BadRequestException('2FA no está activo');
    const okTotp = user.twoFactor.secret && this.verifyTotp(user.twoFactor.secret, token);
    const okRecovery = await this.matchRecovery(userId, user, token);
    if (!okTotp && !okRecovery) throw new BadRequestException('Código inválido');
    await this.users.disableTwoFactor(userId);
  }

  /** Verifica un código TOTP o un código de recuperación (que se consume). */
  async verify(userId: string, token: string): Promise<boolean> {
    const user = await this.users.findById(userId);
    if (!user?.twoFactor?.confirmedAt || !user.twoFactor.secret) return false;
    if (this.verifyTotp(user.twoFactor.secret, token)) return true;
    return this.matchRecovery(userId, user, token);
  }

  /** Comprueba un código de recuperación y lo consume si coincide. */
  private async matchRecovery(userId: string, user: UserDocument, token: string): Promise<boolean> {
    const codes = user.twoFactor?.recoveryCodes ?? [];
    for (let i = 0; i < codes.length; i++) {
      if (await bcrypt.compare(token, codes[i])) {
        const remaining = codes.filter((_, idx) => idx !== i);
        await this.users.setRecoveryCodes(userId, remaining);
        return true;
      }
    }
    return false;
  }

  assertVerified(ok: boolean): void {
    if (!ok) throw new UnauthorizedException('Código de dos factores inválido');
  }
}
