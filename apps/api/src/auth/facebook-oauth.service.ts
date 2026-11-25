import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IntegrationsConfig } from '../config/configuration';
import type { OAuthClient } from './oauth-provider';
import type { SocialProfileData } from './social-auth.service';

const GRAPH = 'https://graph.facebook.com/v19.0';
const AUTH_URL = 'https://www.facebook.com/v19.0/dialog/oauth';

/** Cliente OAuth de Facebook (authorization code). Gracioso si no hay credenciales. */
@Injectable()
export class FacebookOAuthService implements OAuthClient {
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(config: ConfigService) {
    const cfg = config.get<IntegrationsConfig>('integrations');
    this.clientId = cfg?.facebookClientId ?? '';
    this.clientSecret = cfg?.facebookClientSecret ?? '';
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  buildAuthorize(redirectUri: string): { url: string } {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'email,public_profile',
    });
    return { url: `${AUTH_URL}?${params.toString()}` };
  }

  async exchange(code: string, redirectUri: string): Promise<SocialProfileData> {
    const tokenUrl = `${GRAPH}/oauth/access_token?${new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
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
