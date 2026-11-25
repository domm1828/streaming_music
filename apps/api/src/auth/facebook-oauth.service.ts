import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IntegrationsConfig } from '../config/configuration';
import { SettingsService } from '../settings/settings.service';
import { BaseSocialOAuth } from './oauth-provider';
import type { SocialProvider } from './schemas/social-profile.schema';
import type { SocialProfileData } from './social-auth.service';

const GRAPH = 'https://graph.facebook.com/v19.0';
const AUTH_URL = 'https://www.facebook.com/v19.0/dialog/oauth';

/** Cliente OAuth de Facebook (authorization code). Credenciales desde settings/.env. */
@Injectable()
export class FacebookOAuthService extends BaseSocialOAuth {
  protected readonly provider: SocialProvider = 'facebook';

  constructor(config: ConfigService, settings: SettingsService) {
    super(config, settings);
  }

  protected envCreds(): { id: string; secret: string } {
    const cfg = this.config.get<IntegrationsConfig>('integrations');
    return { id: cfg?.facebookClientId ?? '', secret: cfg?.facebookClientSecret ?? '' };
  }

  async buildAuthorize(redirectUri: string): Promise<{ url: string }> {
    const { id } = await this.resolveCreds();
    const params = new URLSearchParams({
      client_id: id,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'email,public_profile',
    });
    return { url: `${AUTH_URL}?${params.toString()}` };
  }

  async exchange(code: string, redirectUri: string): Promise<SocialProfileData> {
    const { id, secret } = await this.resolveCreds();
    const tokenUrl = `${GRAPH}/oauth/access_token?${new URLSearchParams({
      client_id: id,
      client_secret: secret,
      redirect_uri: redirectUri,
      code,
    }).toString()}`;
    const tokenRes = await fetch(tokenUrl);
    if (!tokenRes.ok) throw new Error(`Facebook token → ${tokenRes.status}`);
    const token = (await tokenRes.json()) as { access_token: string };

    const infoRes = await fetch(
      `${GRAPH}/me?${new URLSearchParams({
        fields: 'id,name,email,picture.type(large)',
        access_token: token.access_token,
      }).toString()}`,
    );
    if (!infoRes.ok) throw new Error(`Facebook me → ${infoRes.status}`);
    const info = (await infoRes.json()) as {
      id: string;
      name?: string;
      email?: string;
      picture?: { data?: { url?: string } };
    };
    if (!info.email) throw new Error('Facebook no devolvió un email verificable');

    return {
      providerId: info.id,
      email: info.email,
      // Facebook sólo expone emails verificados en la Graph API.
      emailVerified: true,
      name: info.name ?? info.email.split('@')[0],
      image: info.picture?.data?.url ?? null,
    };
  }
}
