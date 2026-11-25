import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IntegrationsConfig } from '../config/configuration';
import { SettingsService } from '../settings/settings.service';
import { BaseSocialOAuth, createPkce } from './oauth-provider';
import type { SocialProvider } from './schemas/social-profile.schema';
import type { SocialProfileData } from './social-auth.service';

const AUTH_URL = 'https://twitter.com/i/oauth2/authorize';
const TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
const ME_URL = 'https://api.twitter.com/2/users/me';

/**
 * Cliente OAuth 2.0 (PKCE) de Twitter/X. Credenciales desde settings/.env.
 * Nota: X sólo entrega el email de la cuenta a apps con acceso elevado; sin él,
 * el login falla de forma controlada (no se puede enlazar/crear sin email verificable).
 */
@Injectable()
export class TwitterOAuthService extends BaseSocialOAuth {
  protected readonly provider: SocialProvider = 'twitter';

  constructor(config: ConfigService, settings: SettingsService) {
    super(config, settings);
  }

  protected envCreds(): { id: string; secret: string } {
    const cfg = this.config.get<IntegrationsConfig>('integrations');
    return { id: cfg?.twitterClientId ?? '', secret: cfg?.twitterClientSecret ?? '' };
  }

  async buildAuthorize(redirectUri: string): Promise<{ url: string; verifier: string }> {
    const { id } = await this.resolveCreds();
    const { verifier, challenge } = createPkce();
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: id,
      redirect_uri: redirectUri,
      scope: 'users.read tweet.read offline.access',
      state: 'state',
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });
    return { url: `${AUTH_URL}?${params.toString()}`, verifier };
  }

  async exchange(code: string, redirectUri: string, verifier?: string): Promise<SocialProfileData> {
    const { id, secret } = await this.resolveCreds();
    const auth = Buffer.from(`${id}:${secret}`).toString('base64');
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: id,
        redirect_uri: redirectUri,
        code_verifier: verifier ?? '',
      }).toString(),
    });
    if (!tokenRes.ok) throw new Error(`Twitter token → ${tokenRes.status}`);
    const token = (await tokenRes.json()) as { access_token: string };

    const infoRes = await fetch(`${ME_URL}?user.fields=profile_image_url`, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!infoRes.ok) throw new Error(`Twitter me → ${infoRes.status}`);
    const body = (await infoRes.json()) as {
      data?: { id: string; name?: string; username?: string; email?: string; profile_image_url?: string };
    };
    const info = body.data;
    if (!info) throw new Error('Twitter no devolvió el perfil');
    if (!info.email) throw new Error('Twitter no expuso un email (requiere acceso elevado)');

    return {
      providerId: info.id,
      email: info.email,
      emailVerified: true,
      name: info.name ?? info.username ?? info.email.split('@')[0],
      image: info.profile_image_url ?? null,
    };
  }
}
