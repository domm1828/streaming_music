import { Injectable, Logger } from '@nestjs/common';
import { LyricsProvider } from '../provider.types';

interface LrclibHit {
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
}

/** Fuente primaria: coincidencia exacta por artista + título (lrclib.net). */
@Injectable()
export class LrclibProvider implements LyricsProvider {
  readonly name = 'lrclib';
  private readonly logger = new Logger(LrclibProvider.name);

  async fetchLyrics(trackName: string, artistName: string): Promise<string | null> {
    try {
      const qs = new URLSearchParams({ track_name: trackName, artist_name: artistName });
      const res = await fetch(`https://lrclib.net/api/get?${qs.toString()}`, {
        headers: { 'User-Agent': 'StreamMusic (lyrics import)' },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`lrclib get → ${res.status}`);
      const hit = (await res.json()) as LrclibHit;
      return hit.plainLyrics?.trim() || null;
    } catch (e) {
      this.logger.warn(`lrclib get falló: ${(e as Error).message}`);
      return null;
    }
  }
}

/** Fuente secundaria: búsqueda difusa (primer resultado con letra). */
@Injectable()
export class LrclibSearchProvider implements LyricsProvider {
  readonly name = 'lrclib-search';
  private readonly logger = new Logger(LrclibSearchProvider.name);

  async fetchLyrics(trackName: string, artistName: string): Promise<string | null> {
    try {
      const qs = new URLSearchParams({ track_name: trackName, artist_name: artistName });
      const res = await fetch(`https://lrclib.net/api/search?${qs.toString()}`, {
        headers: { 'User-Agent': 'StreamMusic (lyrics import)' },
      });
      if (!res.ok) throw new Error(`lrclib search → ${res.status}`);
      const hits = (await res.json()) as LrclibHit[];
      const withLyrics = hits.find((h) => h.plainLyrics?.trim());
      return withLyrics?.plainLyrics?.trim() || null;
    } catch (e) {
      this.logger.warn(`lrclib search falló: ${(e as Error).message}`);
      return null;
    }
  }
}
