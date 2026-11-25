import { Controller, Get, NotFoundException, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { AppConfig } from '../config/configuration';
import { decryptSecret, encryptSecret } from '../settings/secret-crypto';
import { CurrentUser } from './decorators/current-user.decorator';
import { FacebookOAuthService } from './facebook-oauth.service';
import { GoogleOAuthService } from './google-oauth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { OAuthClient } from './oauth-provider';
import type { SocialProvider } from './schemas/social-profile.schema';
import { SocialAuthService } from './social-auth.service';
import { TwitterOAuthService } from './twitter-oauth.service';
import type { AuthenticatedUser } from './types/authenticated-user';

const LINK_COOKIE = 'sm_oauth_link';
const COOKIE_PATH = '/api/v1/auth/social';

@Controller('auth/social')
export class SocialAuthController {
  constructor(
    private readonly google: GoogleOAuthService,
    private readonly facebook: FacebookOAuthService,
    private readonly twitter: TwitterOAuthService,
    private readonly social: SocialAuthService,
    private readonly config: ConfigService,
  ) {}

  private clients(): Record<SocialProvider, OAuthClient> {
    return { google: this.google, facebook: this.facebook, twitter: this.twitter };
  }

  private clientFor(provider: string): OAuthClient | null {
    return (this.clients() as Record<string, OAuthClient>)[provider] ?? null;
  }

  private redirectUri(req: Request, provider: string): string {
    const proto = (req.headers['x-forwarded-proto'] as string) ?? req.protocol;
    return `${proto}://${req.get('host')}/api/v1/auth/social/${provider}/callback`;
  }

  private readCookie(req: Request, name: string): string | undefined {
    const header = req.headers.cookie;
    if (!header) return undefined;
    for (const part of header.split(';')) {
      const [k, ...v] = part.trim().split('=');
      if (k === name) return decodeURIComponent(v.join('='));
    }
    return undefined;
  }

  private cryptoSecret(): string {
    return this.config.get<{ accessSecret: string }>('jwt')?.accessSecret ?? 'dev-settings-secret';
  }

  /** Lee el id de usuario del cookie de "vincular", si está presente y es válido. */
  private readLinkUser(req: Request): string | null {
    const raw = this.readCookie(req, LINK_COOKIE);
    if (!raw) return null;
    try {
      return decryptSecret(raw, this.cryptoSecret());
    } catch {
      return null;
    }
  }

  private setVerifierCookie(res: Response, provider: string, verifier?: string): void {
    if (verifier) {
      res.cookie(`sm_oauth_${provider}`, verifier, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000,
        path: COOKIE_PATH,
      });
    }
  }

  /** Estado de los proveedores sociales configurados. */
  @Get('providers')
  async providers() {
    const [google, facebook, twitter] = await Promise.all([
      this.google.isConfigured(),
      this.facebook.isConfigured(),
      this.twitter.isConfigured(),
    ]);
    return { google, facebook, twitter };
  }

  /** Inicia el flujo para VINCULAR un proveedor a la cuenta actual (requiere sesión). */
  @UseGuards(JwtAuthGuard)
  @Get(':provider/connect')
  async connect(
    @CurrentUser() user: AuthenticatedUser,
    @Param('provider') provider: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const client = this.clientFor(provider);
    if (!client) throw new NotFoundException('Proveedor social desconocido');
    if (!(await client.isConfigured())) throw new NotFoundException(`Login con ${provider} no está configurado`);
    const { url, verifier } = await client.buildAuthorize(this.redirectUri(req, provider));
    this.setVerifierCookie(res, provider, verifier);
    res.cookie(LINK_COOKIE, encryptSecret(user.id, this.cryptoSecret()), {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
      path: COOKIE_PATH,
    });
    // Se usa @Res(), así que se replica el contrato { status, data } del interceptor.
    res.json({ status: 'success', data: { url } });
  }

  /** Inicia el flujo OAuth del proveedor (login). */
  @Get(':provider')
  async start(@Param('provider') provider: string, @Req() req: Request, @Res() res: Response) {
    const client = this.clientFor(provider);
    if (!client) throw new NotFoundException('Proveedor social desconocido');
    if (!(await client.isConfigured())) throw new NotFoundException(`Login con ${provider} no está configurado`);
    const { url, verifier } = await client.buildAuthorize(this.redirectUri(req, provider));
    this.setVerifierCookie(res, provider, verifier);
    res.redirect(url);
  }

  /** Callback del proveedor: vincula (si venía de "conectar") o inicia sesión. */
  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const appUrl = this.config.get<AppConfig>('app')!.appUrl.replace(/\/$/, '');
    const client = this.clientFor(provider);
    const linkUserId = this.readLinkUser(req);
    const failRedirect = linkUserId ? `${appUrl}/account?social=error` : `${appUrl}/login?social_error=1`;

    if (!client || !code || !(await client.isConfigured())) {
      return res.redirect(failRedirect);
    }
    try {
      const verifier = this.readCookie(req, `sm_oauth_${provider}`);
      const profile = await client.exchange(code, this.redirectUri(req, provider), verifier);
      res.clearCookie(`sm_oauth_${provider}`, { path: COOKIE_PATH });

      if (linkUserId) {
        res.clearCookie(LINK_COOKIE, { path: COOKIE_PATH });
        await this.social.linkToUser(linkUserId, provider as SocialProvider, profile);
        return res.redirect(`${appUrl}/account?social=connected`);
      }

      const result = await this.social.loginWithProfile(provider as SocialProvider, profile, {
        userAgent: req.headers['user-agent'] ?? null,
        ip: req.ip ?? null,
      });
      const params = new URLSearchParams({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      res.redirect(`${appUrl}/auth/social?${params.toString()}`);
    } catch {
      if (linkUserId) res.clearCookie(LINK_COOKIE, { path: COOKIE_PATH });
      res.redirect(failRedirect);
    }
  }
}
