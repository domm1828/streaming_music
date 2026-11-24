import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IntegrationsConfig } from '../config/configuration';
import type { SocialProfileData } from './social-auth.service';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

/** Cliente OAuth de Google (authorization code). Gracioso si no hay credenciales. */
@Injectable()
export class GoogleOAuthService {
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(config: ConfigService) {
    const cfg = config.get<IntegrationsConfig>('integrations');
    this.clientId = cfg?.googleClientId ?? '';
    this.clientSecret = cfg?.googleClientSecret ?? '';
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  authorizeUrl(redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
      prompt: 'select_account',
    });
    return `${AUTH_URL}?${params.toString()}`;
  }

  /** Intercambia el code por el perfil del usuario. */
  async exchange(code: string, redirectUri: string): Promise<SocialProfileData> {
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });
    if (!tokenRes.ok) throw new Error(`Google token → ${tokenRes.status}`);
    const token = (await tokenRes.json()) as { access_token: string };

    const infoRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!infoRes.ok) throw new Error(`Google userinfo → ${infoRes.status}`);
    const info = (await infoRes.json()) as {
      sub: string;
      email: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };

    return {
      providerId: info.sub,
      email: info.email,
      emailVerified: info.email_verified === true,
      name: info.name ?? info.email.split('@')[0],
      image: info.picture ?? null,
    };
  }
}
