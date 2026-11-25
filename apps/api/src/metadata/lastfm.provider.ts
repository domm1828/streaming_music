import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import type { IntegrationsConfig } from '../config/configuration';
import { SETTINGS_CHANGED_EVENT, SettingsService } from '../settings/settings.service';
import { SecondaryMetadataProvider } from './provider.types';

const API = 'https://ws.audioscrobbler.com/2.0/';

/** Proveedor secundario Last.fm: géneros top y bios de artistas. Tolerante a fallos. */
@Injectable()
export class LastfmProvider implements SecondaryMetadataProvider, OnModuleInit {
  readonly name = 'lastfm';
  private readonly logger = new Logger(LastfmProvider.name);
  private apiKey: string;

  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly settings?: SettingsService,
  ) {
    this.apiKey = config.get<IntegrationsConfig>('integrations')?.lastfmApiKey ?? '';
  }

  async onModuleInit(): Promise<void> {
    await this.refreshCreds();
  }

  @OnEvent(SETTINGS_CHANGED_EVENT)
  async refreshCreds(): Promise<void> {
    const envKey = this.config.get<IntegrationsConfig>('integrations')?.lastfmApiKey ?? '';
    this.apiKey = this.settings ? await this.settings.get('providers.lastfm.apiKey', envKey) : envKey;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  private async call<T>(params: Record<string, string>): Promise<T | null> {
    if (!this.isConfigured()) return null;
    const qs = new URLSearchParams({ ...params, api_key: this.apiKey, format: 'json' });
    try {
      const res = await fetch(`${API}?${qs.toString()}`);
      if (!res.ok) throw new Error(`Last.fm → ${res.status}`);
      return (await res.json()) as T;
    } catch (e) {
      // Un fallo del proveedor secundario no debe romper el flujo.
      this.logger.warn(`Last.fm falló (${params.method}): ${(e as Error).message}`);
      return null;
    }
  }

  async topGenres(limit = 50): Promise<string[]> {
    const data = await this.call<{ toptags?: { tag?: { name: string }[] } }>({
      method: 'chart.gettoptags',
      limit: String(limit),
    });
    return (data?.toptags?.tag ?? []).map((t) => t.name);
  }

  async artistBio(name: string): Promise<string | null> {
    const data = await this.call<{ artist?: { bio?: { summary?: string } } }>({
      method: 'artist.getinfo',
      artist: name,
    });
    const summary = data?.artist?.bio?.summary?.trim();
    return summary ? summary.replace(/<a [^>]*>.*?<\/a>/g, '').trim() : null;
  }
}
