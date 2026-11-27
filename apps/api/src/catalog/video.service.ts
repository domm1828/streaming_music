import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

const run = promisify(execFile);

export interface VideoExtract {
  /** Duración en segundos (0 si no se pudo determinar). */
  duration: number;
  /** JPEG de un frame del video para usar como portada, o null si no se pudo. */
  poster: Buffer | null;
}

/**
 * Procesa archivos de video con binarios estáticos (ffmpeg-static / ffprobe-static),
 * sin requerir ffmpeg instalado en el sistema. Extrae la duración y un frame de portada.
 * Tolerante a fallos: nunca lanza, devuelve lo que pudo obtener.
 */
@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);
  private readonly ffmpeg = ffmpegPath as unknown as string | null;
  private readonly ffprobe = ffprobeStatic.path;

  async extract(buffer: Buffer, ext = '.mp4'): Promise<VideoExtract> {
    let dir: string | null = null;
    try {
      dir = await mkdtemp(join(tmpdir(), 'sm-video-'));
      const input = join(dir, `in${ext.startsWith('.') ? ext : `.${ext}`}`);
      await writeFile(input, buffer);
      const duration = await this.probeDuration(input);
      const poster = this.ffmpeg ? await this.grabFrame(input, dir, duration) : null;
      return { duration, poster };
    } catch (err) {
      this.logger.warn(`No se pudo procesar el video: ${(err as Error).message}`);
      return { duration: 0, poster: null };
    } finally {
      if (dir) await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async probeDuration(input: string): Promise<number> {
    try {
      const { stdout } = await run(this.ffprobe, [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        input,
      ]);
      const d = Math.round(parseFloat(stdout.trim()));
      return Number.isFinite(d) && d > 0 ? d : 0;
    } catch (err) {
      this.logger.warn(`ffprobe falló: ${(err as Error).message}`);
      return 0;
    }
  }

  private async grabFrame(input: string, dir: string, duration: number): Promise<Buffer | null> {
    try {
      // Un frame al ~10% del video (1s de fallback) suele ser representativo y evita el negro inicial.
      const at = duration > 0 ? Math.max(0, duration * 0.1) : 1;
      const out = join(dir, 'poster.jpg');
      await run(this.ffmpeg as string, [
        '-ss',
        at.toFixed(2),
        '-i',
        input,
        '-frames:v',
        '1',
        '-vf',
        'scale=640:-2',
        '-q:v',
        '3',
        '-y',
        out,
      ]);
      return await readFile(out);
    } catch (err) {
      this.logger.warn(`ffmpeg (frame) falló: ${(err as Error).message}`);
      return null;
    }
  }
}
