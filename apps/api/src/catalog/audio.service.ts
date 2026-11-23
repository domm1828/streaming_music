import { Injectable, Logger } from '@nestjs/common';

export interface AudioMetadata {
  duration: number;
  title: string | null;
  artist: string | null;
  album: string | null;
}

@Injectable()
export class AudioService {
  private readonly logger = new Logger(AudioService.name);

  /** Extrae metadatos del archivo de audio (music-metadata es ESM: import dinámico). */
  async extractMetadata(buffer: Buffer): Promise<AudioMetadata> {
    try {
      const { parseBuffer } = await import('music-metadata');
      const meta = await parseBuffer(buffer);
      return {
        duration: Math.round(meta.format.duration ?? 0),
        title: meta.common.title ?? null,
        artist: meta.common.artist ?? null,
        album: meta.common.album ?? null,
      };
    } catch (err) {
      this.logger.warn(`No se pudieron extraer metadatos: ${(err as Error).message}`);
      return { duration: 0, title: null, artist: null, album: null };
    }
  }

  /**
   * Genera una representación de waveform (picos normalizados 0..1).
   * MVP: derivada del contenido del archivo de forma determinista.
   * Se reemplazará por audiowaveform/ffmpeg en Phase 8.
   */
  generateWaveformPeaks(buffer: Buffer, buckets = 200): number[] {
    if (buffer.length === 0) return [];
    const peaks: number[] = [];
    const bucketSize = Math.max(1, Math.floor(buffer.length / buckets));
    for (let i = 0; i < buckets; i++) {
      const start = i * bucketSize;
      let sum = 0;
      for (let j = start; j < start + bucketSize && j < buffer.length; j++) {
        sum += Math.abs(buffer[j] - 128);
      }
      peaks.push(Math.min(1, sum / bucketSize / 128));
    }
    return peaks;
  }
}
