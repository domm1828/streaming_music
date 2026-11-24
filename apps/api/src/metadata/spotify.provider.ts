import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IntegrationsConfig } from '../config/configuration';
import {
  MetadataProvider,
  NormalizedAlbum,
  NormalizedArtist,
  NormalizedPlaylist,
  NormalizedTrack,
  ProviderNotConfiguredError,
} from './provider.types';

const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API = 'https://api.spotify.com/v1';

interface SpImage {
  url: string;
}
interface SpArtist {
  id: string;
  name: string;
  images?: SpImage[];
  genres?: string[];
  followers?: { total: number };
  popularity?: number;
}
interface SpTrack {
  id: string;
  name: string;
  track_number?: number;
  duration_ms?: number;
  popularity?: number;
  preview_url?: string | null;
  artists?: { id: string }[];
}
interface SpAlbum {
  id: string;
  name: string;
  images?: SpImage[];
  release_date?: string;
  popularity?: number;
  genres?: string[];
  artists?: { id: string }[];
  tracks?: { items: SpTrack[] };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Cliente Spotify con autenticación client-credentials y manejo de rate limit. */
@Injectable()
export class SpotifyProvider implements MetadataProvider {
  readonly name = 'spotify';
  private readonly logger = new Logger(SpotifyProvider.name);
  private token: string | null = null;
  private tokenExpiresAt = 0;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(config: ConfigService) {
    const cfg = config.get<IntegrationsConfig>('integrations');
    this.clientId = cfg?.spotifyClientId ?? '';
    this.clientSecret = cfg?.spotifyClientSecret ?? '';
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) throw new ProviderNotConfiguredError(this.name);
  }

  /** Obtiene (y cachea) el access token, renovándolo cuando expira. */
  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiresAt - 5000) return this.token;
    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) throw new Error(`Spotify auth falló: ${res.status}`);
    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.token = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
    return this.token;
  }

  /** GET autenticado con reintento ante rate limit (429, respeta Retry-After). */
  private async get<T>(path: string, attempt = 0): Promise<T> {
    const token = await this.getToken();
    const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 429 && attempt < 2) {
      const wait = Number(res.headers.get('Retry-After') ?? '1') * 1000;
      this.logger.warn(`Rate limit de Spotify; reintentando en ${wait}ms`);
      await sleep(wait);
      return this.get<T>(path, attempt + 1);
    }
    if (!res.ok) throw new Error(`Spotify ${path} → ${res.status}`);
    return (await res.json()) as T;
  }

  private normArtist(a: SpArtist): NormalizedArtist {
    return {
      externalId: a.id,
      name: a.name,
      image: a.images?.[0]?.url ?? null,
      bio: null,
      genres: a.genres ?? [],
      followers: a.followers?.total ?? 0,
      popularity: a.popularity ?? 0,
    };
  }

  private normTrack(t: SpTrack): NormalizedTrack {
    return {
      externalId: t.id,
      name: t.name,
      number: t.track_number ?? 1,
      durationSeconds: Math.round((t.duration_ms ?? 0) / 1000),
      popularity: t.popularity ?? 0,
      artistExternalIds: (t.artists ?? []).map((x) => x.id),
      previewUrl: t.preview_url ?? null,
    };
  }

  private normAlbum(a: SpAlbum): NormalizedAlbum {
    return {
      externalId: a.id,
      name: a.name,
      image: a.images?.[0]?.url ?? null,
      releaseDate: a.release_date ?? null,
      popularity: a.popularity ?? 0,
      artistExternalIds: (a.artists ?? []).map((x) => x.id),
      genres: a.genres ?? [],
      tracks: (a.tracks?.items ?? []).map((t) => this.normTrack(t)),
    };
  }

  async searchArtists(query: string, limit = 10): Promise<NormalizedArtist[]> {
    this.assertConfigured();
    const data = await this.get<{ artists: { items: SpArtist[] } }>(
      `/search?type=artist&limit=${limit}&q=${encodeURIComponent(query)}`,
    );
    return data.artists.items.map((a) => this.normArtist(a));
  }

  async getArtist(externalId: string): Promise<NormalizedArtist> {
    this.assertConfigured();
    return this.normArtist(await this.get<SpArtist>(`/artists/${externalId}`));
  }

  async getArtistAlbums(externalId: string, limit = 20): Promise<NormalizedAlbum[]> {
    this.assertConfigured();
    const list = await this.get<{ items: SpAlbum[] }>(
      `/artists/${externalId}/albums?include_groups=album,single&limit=${limit}`,
    );
    // Cada álbum detallado trae sus pistas.
    const albums: NormalizedAlbum[] = [];
    for (const summary of list.items) {
      const full = await this.get<SpAlbum>(`/albums/${summary.id}`);
      albums.push(this.normAlbum(full));
    }
    return albums;
  }

  async getNewReleases(limit = 20): Promise<NormalizedAlbum[]> {
    this.assertConfigured();
    const data = await this.get<{ albums: { items: SpAlbum[] } }>(`/browse/new-releases?limit=${limit}`);
    return data.albums.items.map((a) => this.normAlbum(a));
  }

  async getFeaturedPlaylists(limit = 20): Promise<NormalizedPlaylist[]> {
    this.assertConfigured();
    const data = await this.get<{ playlists: { items: Array<{ id: string; name: string; description: string | null; images?: SpImage[] }> } }>(
      `/browse/featured-playlists?limit=${limit}`,
    );
    return data.playlists.items.map((p) => ({
      externalId: p.id,
      name: p.name,
      description: p.description ?? null,
      image: p.images?.[0]?.url ?? null,
      trackExternalIds: [],
    }));
  }
}
