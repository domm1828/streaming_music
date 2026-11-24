import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import type { AuthenticatedUser } from './types/authenticated-user';
import { OtpService } from './otp.service';
import { SessionMeta, TokensService } from './tokens.service';
import { TwoFactorService } from './two-factor.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth.dto';

export interface AuthResult {
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokens: TokensService,
    private readonly otp: OtpService,
    private readonly mail: MailService,
    private readonly twoFactor: TwoFactorService,
  ) {}

  async register(dto: RegisterDto, meta: SessionMeta): Promise<AuthResult> {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      name: dto.name,
      username: dto.username,
      email: dto.email,
      passwordHash,
    });
    const id = String(user._id);
    const code = await this.otp.generate(id, 'email-verify');
    await this.mail.sendEmailVerification(user.email, code);
    return this.buildResult(id, user.email, meta);
  }

  async verifyEmail(email: string, code: string): Promise<void> {
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user) throw new BadRequestException('Código inválido');
    const ok = await this.otp.verifyAndConsume(String(user._id), 'email-verify', code);
    if (!ok) throw new BadRequestException('Código inválido o expirado');
    await this.usersService.markEmailVerified(String(user._id));
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user || user.emailVerifiedAt) return; // sin enumeración
    const code = await this.otp.generate(String(user._id), 'email-verify');
    await this.mail.sendEmailVerification(user.email, code);
  }

  async login(dto: LoginDto, meta: SessionMeta): Promise<AuthResult | { twoFactorRequired: true }> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user || !user.passwordHash) throw new UnauthorizedException('Credenciales inválidas');
    if (user.bannedAt) throw new UnauthorizedException('Tu cuenta está suspendida');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    // Segundo factor si está activo.
    if (this.twoFactor.isEnabled(user)) {
      if (!dto.twoFactorCode) return { twoFactorRequired: true };
      const valid = await this.twoFactor.verify(String(user._id), dto.twoFactorCode);
      this.twoFactor.assertVerified(valid);
    }
    return this.buildResult(String(user._id), user.email, meta);
  }

  async refresh(refreshToken: string, meta: SessionMeta): Promise<AuthResult> {
    const { userId, refreshToken: rotated } = await this.tokens.rotate(refreshToken, meta);
    const user = await this.usersService.getAuthenticatedUser(userId);
    if (!user) throw new UnauthorizedException('Sesión inválida');
    return {
      user,
      accessToken: this.tokens.signAccessToken(user.id, user.email),
      refreshToken: rotated,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokens.revoke(refreshToken);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) return; // sin enumeración de usuarios
    const code = await this.otp.generate(String(user._id), 'password-reset');
    await this.mail.sendPasswordReset(user.email, code);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) throw new BadRequestException('Código inválido');
    const ok = await this.otp.verifyAndConsume(String(user._id), 'password-reset', dto.code);
    if (!ok) throw new BadRequestException('Código inválido o expirado');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.usersService.setPassword(String(user._id), passwordHash);
    await this.tokens.revokeAllForUser(String(user._id)); // cierra todas las sesiones
  }

  /** Cambia la contraseña de un usuario autenticado (verifica la actual). */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.usersService.findByIdWithPassword(userId);
    if (!user || !user.passwordHash) {
      throw new BadRequestException('Esta cuenta no tiene una contraseña configurada');
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('La contraseña actual no es correcta');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersService.setPassword(userId, passwordHash);
  }

  /** Borra la cuenta del usuario (verifica contraseña si la tiene) y cierra sus sesiones. */
  async deleteAccount(userId: string, password: string): Promise<void> {
    const user = await this.usersService.findByIdWithPassword(userId);
    if (!user) throw new BadRequestException('Usuario no encontrado');
    if (user.passwordHash) {
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) throw new UnauthorizedException('Contraseña incorrecta');
    }
    await this.tokens.revokeAllForUser(userId);
    await this.usersService.remove(userId);
  }

  /** Emite tokens para otro usuario (impersonación por admin). */
  async impersonate(targetUserId: string, meta: SessionMeta): Promise<AuthResult> {
    const user = await this.usersService.getAuthenticatedUser(targetUserId);
    if (!user) throw new BadRequestException('Usuario no encontrado o suspendido');
    return {
      user,
      accessToken: this.tokens.signAccessToken(user.id, user.email),
      refreshToken: await this.tokens.issueRefreshToken(user.id, meta),
    };
  }

  private async buildResult(userId: string, email: string, meta: SessionMeta): Promise<AuthResult> {
    const user = await this.usersService.getAuthenticatedUser(userId);
    if (!user) throw new UnauthorizedException('No se pudo iniciar sesión');
    const pair = await this.tokens.issueTokenPair(userId, email, meta);
    return { user, ...pair };
  }
}
