import { describe, expect, it } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { SettingsService } from '../settings/settings.service';
import { LastfmProvider } from './lastfm.provider';
import { SpotifyProvider } from './spotify.provider';

function fakeConfig(integrations: Record<string, string> = {}): ConfigService {
  return { get: () => integrations } as unknown as ConfigService;
}

function fakeSettings(values: Record<string, unknown> = {}): SettingsService {
  const store = new Map<string, unknown>(Object.entries(values));
  return {
    async get<T>(key: string, fallback: T): Promise<T> {
      return (store.has(key) ? (store.get(key) as T) : fallback) ?? fallback;
    },
  } as unknown as SettingsService;
}

describe('Resolución de credenciales de proveedores', () => {
  it('Spotify: sin settings usa el .env', async () => {
    const p = new SpotifyProvider(
      fakeConfig({ spotifyClientId: 'env-id', spotifyClientSecret: 'env-sec' }),
      fakeSettings(),
    );
    await p.refreshCreds();
    expect(p.isConfigured()).toBe(true);
  });

  it('Spotify: los settings pisan al .env', async () => {
    const p = new SpotifyProvider(
      fakeConfig({ spotifyClientId: 'env-id', spotifyClientSecret: 'env-sec' }),
      fakeSettings({ 'providers.spotify.id': 'db-id', 'providers.spotify.secret': '' }),
    );
    await p.refreshCreds();
    expect(p.isConfigured()).toBe(false); // secret vacío en settings pisa al env
  });

  it('Spotify: sin credenciales en ningún lado no está configurado', async () => {
    const p = new SpotifyProvider(fakeConfig(), fakeSettings());
    await p.refreshCreds();
    expect(p.isConfigured()).toBe(false);
  });

  it('Last.fm: resuelve la API key desde settings con fallback al .env', async () => {
    const envOnly = new LastfmProvider(fakeConfig({ lastfmApiKey: 'env-key' }), fakeSettings());
    await envOnly.refreshCreds();
    expect(envOnly.isConfigured()).toBe(true);

    const fromDb = new LastfmProvider(fakeConfig(), fakeSettings({ 'providers.lastfm.apiKey': 'db-key' }));
    await fromDb.refreshCreds();
    expect(fromDb.isConfigured()).toBe(true);
  });
});
