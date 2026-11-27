import { BadGatewayException, BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

export interface GenerateImageOptions {
  prompt: string;
  width?: number;
  height?: number;
  model?: string;
  seed?: number;
}

export interface GeneratedImage {
  buffer: Buffer;
  contentType: string;
}

const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt';
const DEFAULT_MODEL = 'flux';
const DIM_MIN = 64;
const DIM_MAX = 2048;
const TIMEOUT_MS = 90_000;

/** Mapea el content-type de la imagen a una extensión servible. */
export function extFromImageType(contentType: string): string {
  const t = contentType.toLowerCase();
  if (t.includes('png')) return '.png';
  if (t.includes('webp')) return '.webp';
  if (t.includes('gif')) return '.gif';
  if (t.includes('avif')) return '.avif';
  return '.jpg';
}

/**
 * Genera imágenes con Pollinations (gratis, sin API key). A Pollinations solo se
 * le manda el prompt; nunca datos del usuario. Devuelve los bytes para que el
 * controlador los guarde en nuestro storage, igual que una subida.
 */
@Injectable()
export class ImageGenService {
  private readonly logger = new Logger(ImageGenService.name);

  constructor(private readonly settings: SettingsService) {}

  async generate(opts: GenerateImageOptions): Promise<GeneratedImage> {
    const prompt = (opts.prompt ?? '').trim();
    if (prompt.length < 3) throw new BadRequestException('El prompt es demasiado corto');

    const width = clampDim(opts.width, 1024);
    const height = clampDim(opts.height, 1024);
    const configuredModel = await this.settings.get<string>('images.aiModel', DEFAULT_MODEL);
    const model = (opts.model || configuredModel || DEFAULT_MODEL).trim();
    const maxMb = await this.settings.getNumber('uploads.maxImageMb', 5);
    const token = process.env.POLLINATIONS_TOKEN?.trim();

    const params = new URLSearchParams({
      width: String(width),
      height: String(height),
      nologo: 'true',
      private: 'true',
      model,
    });
    if (opts.seed !== undefined && Number.isFinite(opts.seed)) {
      params.set('seed', String(Math.trunc(opts.seed)));
    }
    const url = `${POLLINATIONS_BASE}/${encodeURIComponent(prompt)}?${params.toString()}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, {
        signal: controller.signal,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    } catch (err) {
      const aborted = (err as Error).name === 'AbortError';
      this.logger.warn(`Fallo al generar imagen: ${(err as Error).message}`);
      throw new BadGatewayException(
        aborted ? 'La generación de la imagen tardó demasiado' : 'No se pudo contactar al generador de imágenes',
      );
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      this.logger.warn(`El generador respondió ${res.status}`);
      throw new BadGatewayException(`El generador de imágenes falló (${res.status})`);
    }
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().startsWith('image/')) {
      throw new BadGatewayException('El generador no devolvió una imagen');
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0) throw new BadGatewayException('El generador devolvió una imagen vacía');
    if (buffer.length > maxMb * 1024 * 1024) {
      throw new BadRequestException(`La imagen generada supera los ${maxMb} MB`);
    }
    return { buffer, contentType };
  }
}

function clampDim(v: number | undefined, fallback: number): number {
  const n = typeof v === 'number' ? Math.trunc(v) : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(DIM_MAX, Math.max(DIM_MIN, n));
}
