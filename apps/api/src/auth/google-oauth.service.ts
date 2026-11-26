import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IntegrationsConfig } from '../config/configuration';
import { SettingsService } from '../settings/settings.service';
import { BaseSocialOAuth } from './oauth-provider';
import type { SocialProvider } from './schemas/social-profile.schema';
import type { SocialProfileData } from './social-auth.service';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

/** Cliente OAuth de Google (authorization code). Credenciales desde settings/.env. */
@Injectable()
export class GoogleOAuthService extends BaseSocialOAuth {
  protected readonly provider: SocialProvider = 'google';

  constructor(config: ConfigService, settings: SettingsService) {
    super(config, settings);
  }

  protected envCreds(): { id: string; secret: string } {
    const cfg = this.config.get<IntegrationsConfig>('integrations');
    return { id: cfg?.googleClientId ?? '', secret: cfg?.googleClientSecret ?? '' };
  }

  async buildAuthorize(redirectUri: string): Promise<{ url: string }> {
    const { id } = await this.resolveCreds();
    const params = new URLSearchParams({
      client_id: id,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
      prompt: 'select_account',
    });
    return { url: `${AUTH_URL}?${params.toString()}` };
  }

  /** Intercambia el code por el perfil del usuario. */
  async exchange(code: string, redirectUri: string): Promise<SocialProfileData> {
    const { id, secret } = await this.resolveCreds();
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: id,
        client_secret: secret,
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
