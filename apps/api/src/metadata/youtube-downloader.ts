import { BadRequestException, Injectable } from '@nestjs/common';
import ytdl from '@distube/ytdl-core';

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

/** Implementación real con @distube/ytdl-core (descarga el mejor stream audio-only, sin ffmpeg). */
@Injectable()
export class YtdlDownloader implements YoutubeDownloader {
  private readonly MAX_SECONDS = 20 * 60;
  private readonly MAX_BYTES = 60 * 1024 * 1024;

  async info(id: string): Promise<YoutubeAudioInfo> {
    const info = await ytdl.getBasicInfo(id);
    const d = info.videoDetails;
    return {
      id,
      title: d.title,
      author: d.author?.name ?? null,
      durationSeconds: Number(d.lengthSeconds) || 0,
    };
  }

  async downloadAudio(id: string): Promise<{ buffer: Buffer; ext: 'm4a' | 'webm' }> {
    const info = await ytdl.getInfo(id);
    if (Number(info.videoDetails.lengthSeconds) > this.MAX_SECONDS) {
      throw new BadRequestException('El video supera la duración máxima permitida (20 min)');
    }
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
    const ext: 'm4a' | 'webm' = format.container === 'webm' ? 'webm' : 'm4a';

    const stream = ytdl.downloadFromInfo(info, { format });
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
