import { Controller, Get, NotFoundException, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { AppConfig } from '../config/configuration';
import { GoogleOAuthService } from './google-oauth.service';
import { SocialAuthService } from './social-auth.service';

@Controller('auth/social')
export class SocialAuthController {
  constructor(
    private readonly google: GoogleOAuthService,
    private readonly social: SocialAuthService,
    private readonly config: ConfigService,
  ) {}

  private redirectUri(req: Request): string {
    const proto = (req.headers['x-forwarded-proto'] as string) ?? req.protocol;
    return `${proto}://${req.get('host')}/api/v1/auth/social/google/callback`;
  }

  /** Estado de los proveedores sociales configurados. */
  @Get('providers')
  providers() {
    return { google: this.google.isConfigured() };
  }

  /** Inicia el flujo OAuth de Google. */
  @Get('google')
  googleStart(@Req() req: Request, @Res() res: Response) {
    if (!this.google.isConfigured()) throw new NotFoundException('Login con Google no está configurado');
    res.redirect(this.google.authorizeUrl(this.redirectUri(req)));
  }

  /** Callback de Google: intercambia el code, inicia sesión y vuelve al frontend con los tokens. */
  @Get('google/callback')
  async googleCallback(@Query('code') code: string | undefined, @Req() req: Request, @Res() res: Response) {
    const appUrl = this.config.get<AppConfig>('app')!.appUrl.replace(/\/$/, '');
    if (!this.google.isConfigured() || !code) {
      return res.redirect(`${appUrl}/login?social_error=1`);
    }
    try {
      const profile = await this.google.exchange(code, this.redirectUri(req));
      const result = await this.social.loginWithProfile('google', profile, {
        userAgent: req.headers['user-agent'] ?? null,
        ip: req.ip ?? null,
      });
      const params = new URLSearchParams({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      res.redirect(`${appUrl}/auth/social?${params.toString()}`);
    } catch {
      res.redirect(`${appUrl}/login?social_error=1`);
    }
  }
}
