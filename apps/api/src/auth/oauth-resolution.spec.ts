import { describe, expect, it } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { SettingsService } from '../settings/settings.service';
import { GoogleOAuthService } from './google-oauth.service';

/** SettingsService falso en memoria (sólo lo que usa la resolución). */
function fakeSettings(values: Record<string, unknown> = {}): SettingsService {
  const store = new Map<string, unknown>(Object.entries(values));
  return {
    async get<T>(key: string, fallback: T): Promise<T> {
      return (store.has(key) ? (store.get(key) as T) : fallback) ?? fallback;
    },
    async getBoolean(key: string, fallback: boolean): Promise<boolean> {
      return store.has(key) ? Boolean(store.get(key)) : fallback;
    },
  } as unknown as SettingsService;
}

function fakeConfig(integrations: Record<string, string> = {}): ConfigService {
  return { get: () => integrations } as unknown as ConfigService;
}

describe('Resolución de credenciales OAuth social (Google)', () => {
  it('no está configurado sin credenciales', async () => {
    const svc = new GoogleOAuthService(fakeConfig(), fakeSettings());
    expect(await svc.isConfigured()).toBe(false);
  });

  it('usa las credenciales del .env y el enable por defecto (había creds)', async () => {
    const svc = new GoogleOAuthService(
      fakeConfig({ googleClientId: 'env-id', googleClientSecret: 'env-secret' }),
      fakeSettings(),
    );
    expect(await svc.isConfigured()).toBe(true);
    const { url } = await svc.buildAuthorize('https://x/cb');
    expect(url).toContain('client_id=env-id');
  });

  it('los settings pisan al .env y el enable explícito manda', async () => {
    const svc = new GoogleOAuthService(
      fakeConfig({ googleClientId: 'env-id', googleClientSecret: 'env-secret' }),
      fakeSettings({ 'auth.social.google.enable': false }),
    );
    expect(await svc.isConfigured()).toBe(false); // deshabilitado desde el panel

    const svc2 = new GoogleOAuthService(
      fakeConfig(),
      fakeSettings({
        'auth.social.google.enable': true,
        'auth.social.google.id': 'db-id',
        'auth.social.google.secret': 'db-secret',
      }),
    );
    expect(await svc2.isConfigured()).toBe(true);
    const { url } = await svc2.buildAuthorize('https://x/cb');
    expect(url).toContain('client_id=db-id');
  });
});
