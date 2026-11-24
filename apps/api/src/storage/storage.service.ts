import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { AppConfig, StorageConfig } from '../config/configuration';

export interface StoredFile {
  publicPath: string;
  absolutePath: string;
}

/**
 * Abstracción de almacenamiento con driver local (por defecto) o S3.
 * Expone URLs firmadas para archivos privados.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly root: string;
  private readonly publicBase: string;
  private readonly cfg: StorageConfig;
  private s3Client: S3Client | null = null;
  // Cargados perezosamente para no pagar el costo del SDK si se usa el driver local.
  private s3Mod: typeof import('@aws-sdk/client-s3') | null = null;
  private presignMod: typeof import('@aws-sdk/s3-request-presigner') | null = null;

  constructor(private readonly config: ConfigService) {
    const app = config.get<AppConfig>('app')!;
    this.root = app.uploadsDir;
    this.publicBase = app.uploadsPublicPath;
    this.cfg = config.get<StorageConfig>('storage')!;
  }

  get rootDir(): string {
    return this.root;
  }

  get driver(): 'local' | 's3' {
    return this.cfg.driver;
  }

  private publicToRelative(publicPath: string): string {
    return publicPath.replace(new RegExp(`^${this.publicBase}/?`), '');
  }

  private async s3() {
    if (!this.s3Client) {
      this.s3Mod = await import('@aws-sdk/client-s3');
      this.presignMod = await import('@aws-sdk/s3-request-presigner');
      this.s3Client = new this.s3Mod.S3Client({
        region: this.cfg.s3Region,
        endpoint: this.cfg.s3Endpoint || undefined,
        forcePathStyle: Boolean(this.cfg.s3Endpoint),
        credentials: { accessKeyId: this.cfg.s3AccessKey, secretAccessKey: this.cfg.s3SecretKey },
      });
    }
    return { client: this.s3Client, mod: this.s3Mod!, presign: this.presignMod! };
  }

  async saveBuffer(buffer: Buffer, subdir: string, filename: string): Promise<StoredFile> {
    const relative = `${subdir}/${filename}`;
    if (this.cfg.driver === 's3') {
      const { client, mod } = await this.s3();
      const cmd: PutObjectCommand = new mod.PutObjectCommand({ Bucket: this.cfg.s3Bucket, Key: relative, Body: buffer });
      await client.send(cmd);
      return { publicPath: `${this.publicBase}/${relative}`, absolutePath: relative };
    }
    const absolutePath = join(this.root, relative);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, buffer);
    return { publicPath: `${this.publicBase}/${relative}`, absolutePath };
  }

  async saveJson(subdir: string, filename: string, data: unknown): Promise<StoredFile> {
    return this.saveBuffer(Buffer.from(JSON.stringify(data)), subdir, filename);
  }

  async delete(publicPath: string): Promise<void> {
    const relative = this.publicToRelative(publicPath);
    if (this.cfg.driver === 's3') {
      const { client, mod } = await this.s3();
      await client.send(new mod.DeleteObjectCommand({ Bucket: this.cfg.s3Bucket, Key: relative })).catch(() => undefined);
      return;
    }
    try {
      await rm(join(this.root, relative), { force: true });
    } catch (err) {
      this.logger.warn(`No se pudo borrar ${publicPath}: ${(err as Error).message}`);
    }
  }

  // --- URLs firmadas (entrega de archivos privados) ---

  private sign(payload: string): string {
    return createHmac('sha256', this.cfg.signingSecret).update(payload).digest('hex');
  }

  /** URL temporal firmada para un archivo privado (HMAC local o presigned S3). */
  async signedUrl(publicPath: string, ttlSeconds = 3600): Promise<string> {
    const relative = this.publicToRelative(publicPath);
    if (this.cfg.driver === 's3') {
      const { client, mod, presign } = await this.s3();
      const cmd: GetObjectCommand = new mod.GetObjectCommand({ Bucket: this.cfg.s3Bucket, Key: relative });
      return presign.getSignedUrl(client, cmd, { expiresIn: ttlSeconds });
    }
    const exp = Date.now() + ttlSeconds * 1000;
    const sig = this.sign(`${relative}:${exp}`);
    const params = new URLSearchParams({ path: relative, exp: String(exp), sig });
    return `/api/v1/files/signed?${params.toString()}`;
  }

  /** Verifica una firma local (no expirada y HMAC válido). */
  verifyLocalSignature(relative: string, exp: number, sig: string): boolean {
    if (!Number.isFinite(exp) || Date.now() > exp) return false;
    const expected = this.sign(`${relative}:${exp}`);
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }

  absolutePathFor(relative: string): string {
    return join(this.root, relative);
  }
}
