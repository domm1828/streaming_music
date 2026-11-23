import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { AppConfig } from '../config/configuration';

export interface StoredFile {
  /** Ruta pública para servir el archivo (p. ej. /uploads/audio/x.mp3). */
  publicPath: string;
  /** Ruta absoluta en disco. */
  absolutePath: string;
}

/**
 * Abstracción de almacenamiento. Driver local por defecto; se podrá sustituir
 * por S3/otros en Phase 8 manteniendo esta interfaz.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly root: string;
  private readonly publicBase: string;

  constructor(config: ConfigService) {
    const app = config.get<AppConfig>('app')!;
    this.root = app.uploadsDir;
    this.publicBase = app.uploadsPublicPath;
  }

  get rootDir(): string {
    return this.root;
  }

  private publicToRelative(publicPath: string): string {
    return publicPath.replace(new RegExp(`^${this.publicBase}/?`), '');
  }

  async saveBuffer(buffer: Buffer, subdir: string, filename: string): Promise<StoredFile> {
    const relative = `${subdir}/${filename}`;
    const absolutePath = join(this.root, relative);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, buffer);
    return { publicPath: `${this.publicBase}/${relative}`, absolutePath };
  }

  async saveJson(subdir: string, filename: string, data: unknown): Promise<StoredFile> {
    return this.saveBuffer(Buffer.from(JSON.stringify(data)), subdir, filename);
  }

  async delete(publicPath: string): Promise<void> {
    try {
      await rm(join(this.root, this.publicToRelative(publicPath)), { force: true });
    } catch (err) {
      this.logger.warn(`No se pudo borrar ${publicPath}: ${(err as Error).message}`);
    }
  }
}
