import { Controller, Get, NotFoundException, Param, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { AppConfig } from '../config/configuration';
import { FacebookOAuthService } from './facebook-oauth.service';
import { GoogleOAuthService } from './google-oauth.service';
import type { OAuthClient } from './oauth-provider';
import type { SocialProvider } from './schemas/social-profile.schema';
import { SocialAuthService } from './social-auth.service';
import { TwitterOAuthService } from './twitter-oauth.service';

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

  /** Inicia el flujo OAuth del proveedor. */
  @Get(':provider')
  async start(@Param('provider') provider: string, @Req() req: Request, @Res() res: Response) {
    const client = this.clientFor(provider);
    if (!client) throw new NotFoundException('Proveedor social desconocido');
    if (!(await client.isConfigured())) throw new NotFoundException(`Login con ${provider} no está configurado`);
    const { url, verifier } = await client.buildAuthorize(this.redirectUri(req, provider));
    if (verifier) {
      res.cookie(`sm_oauth_${provider}`, verifier, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000,
        path: '/api/v1/auth/social',
      });
    }
    res.redirect(url);
  }

  /** Callback del proveedor: intercambia el code, inicia sesión y vuelve al frontend con los tokens. */
  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const appUrl = this.config.get<AppConfig>('app')!.appUrl.replace(/\/$/, '');
    const client = this.clientFor(provider);
    if (!client || !code || !(await client.isConfigured())) {
      return res.redirect(`${appUrl}/login?social_error=1`);
    }
    try {
      const verifier = this.readCookie(req, `sm_oauth_${provider}`);
      const profile = await client.exchange(code, this.redirectUri(req, provider), verifier);
      const result = await this.social.loginWithProfile(provider as SocialProvider, profile, {
        userAgent: req.headers['user-agent'] ?? null,
        ip: req.ip ?? null,
      });
      res.clearCookie(`sm_oauth_${provider}`, { path: '/api/v1/auth/social' });
      const params = new URLSearchParams({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      res.redirect(`${appUrl}/auth/social?${params.toString()}`);
    } catch {
      res.redirect(`${appUrl}/login?social_error=1`);
    }
  }
}
