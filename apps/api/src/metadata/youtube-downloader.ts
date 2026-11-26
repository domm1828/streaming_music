import { BadRequestException, Injectable } from '@nestjs/common';
import type { Readable } from 'node:stream';

export interface YoutubeAudioInfo {
  id: string;
  title: string;
  author: string | null;
  durationSeconds: number;
}

/** Abstracción de descarga de YouTube (inyectable → testeable + swappable a yt-dlp). */
export interface YoutubeDownloader {
  info(id: string): Promise<YoutubeAudioInfo>;
  downloadAudio(id: string): Promise<{ buffer: Buffer; ext: 'm4a' | 'webm' }>;
}

export const YOUTUBE_DOWNLOADER = Symbol('YOUTUBE_DOWNLOADER');

const ID_RE = /^[\w-]{11}$/;
const ALLOWED_HOSTS = ['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'];

/**
 * Extrae y valida el id de video de una URL de YouTube (o acepta un id suelto).
 * Rechaza hosts que no sean de YouTube (evita SSRF por el campo URL).
 */
export function parseYoutubeId(input: string): string {
  const trimmed = (input ?? '').trim();
  if (ID_RE.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new BadRequestException('URL inválida');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BadRequestException('Protocolo no permitido');
  }
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (!ALLOWED_HOSTS.includes(host)) {
    throw new BadRequestException('Solo se permiten URLs de YouTube');
  }

  let id: string | null;
  if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0] || null;
  else if (url.pathname.startsWith('/shorts/')) id = url.pathname.split('/')[2] ?? null;
  else id = url.searchParams.get('v');

  if (!id || !ID_RE.test(id)) throw new BadRequestException('No se encontró el id del video en la URL');
  return id;
}

/* --- Tipos mínimos de @distube/ytdl-core v5 (paquete ESM-only, cargado dinámicamente). --- */
interface YtFormat {
  itag: number;
  container?: string;
  hasAudio?: boolean;
  hasVideo?: boolean;
  audioBitrate?: number | null;
  bitrate?: number | null;
}
interface YtVideoInfo {
  videoDetails: { title: string; author?: { name?: string } | null; lengthSeconds: string | number };
  formats: YtFormat[];
}
interface YtClient {
  getInfo(video: string): Promise<YtVideoInfo>;
  download(video: YtVideoInfo, options: { filter: (f: YtFormat) => boolean }): Readable;
}
interface YtModule {
  Ytdl: new () => YtClient;
}

/**
 * Importa el paquete ESM-only desde un build CommonJS. Se envuelve en `Function`
 * para que TypeScript no reescriba el `import()` dinámico a `require()`, que
 * fallaría contra un módulo ESM.
 */
const importEsm = new Function('specifier', 'return import(specifier)') as (s: string) => Promise<YtModule>;

/** Implementación real con @distube/ytdl-core v5 (stream de audio-only, sin ffmpeg). */
@Injectable()
export class YtdlDownloader implements YoutubeDownloader {
  private readonly MAX_SECONDS = 20 * 60;
  private readonly MAX_BYTES = 60 * 1024 * 1024;
  private clientPromise: Promise<YtClient> | null = null;

  private client(): Promise<YtClient> {
    if (!this.clientPromise) {
      this.clientPromise = importEsm('@distube/ytdl-core').then((m) => new m.Ytdl());
    }
    return this.clientPromise;
  }

  async info(id: string): Promise<YoutubeAudioInfo> {
    const yt = await this.client();
    const info = await yt.getInfo(id);
    const d = info.videoDetails;
    return {
      id,
      title: d.title,
      author: d.author?.name ?? null,
      durationSeconds: Number(d.lengthSeconds) || 0,
    };
  }

  async downloadAudio(id: string): Promise<{ buffer: Buffer; ext: 'm4a' | 'webm' }> {
    const yt = await this.client();
    const info = await yt.getInfo(id);
    if (Number(info.videoDetails.lengthSeconds) > this.MAX_SECONDS) {
      throw new BadRequestException('El video supera la duración máxima permitida (20 min)');
    }

    const audio = info.formats
      .filter((f) => f.hasAudio && !f.hasVideo)
      .sort((a, b) => Number(b.audioBitrate ?? b.bitrate ?? 0) - Number(a.audioBitrate ?? a.bitrate ?? 0));
    const format = audio[0];
    if (!format) throw new BadRequestException('No se encontró un formato de audio para el video');
    const ext: 'm4a' | 'webm' = format.container === 'webm' ? 'webm' : 'm4a';

    const stream = yt.download(info, { filter: (f) => f.itag === format.itag });
    const chunks: Buffer[] = [];
    let total = 0;
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (c: Buffer) => {
        total += c.length;
        if (total > this.MAX_BYTES) {
          stream.destroy();
          reject(new BadRequestException('El audio supera el tamaño máximo permitido'));
          return;
        }
        chunks.push(c);
      });
      stream.on('end', () => resolve());
      stream.on('error', (e: Error) => reject(e));
    });
    return { buffer: Buffer.concat(chunks), ext };
  }
}
