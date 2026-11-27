import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { extname } from 'node:path';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { SettingsService } from '../settings/settings.service';
import { StorageService } from './storage.service';
import { ImageGenService, extFromImageType } from './image-gen.service';
import { FilesAdminService, kindFromMime } from './files-admin.service';
import type { MediaKind } from './file-entry.schema';
import { ListFilesDto } from './dto/list-files.dto';
import { GenerateImageDto } from './dto/generate-image.dto';

interface KindRules {
  subdir: string;
  exts: string[];
  maxMbKey: string;
  maxMbDefault: number;
}

const RULES: Record<Exclude<MediaKind, 'other'>, KindRules> = {
  image: { subdir: 'images', exts: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg'], maxMbKey: 'uploads.maxImageMb', maxMbDefault: 5 },
  audio: { subdir: 'audio', exts: ['.mp3', '.m4a', '.aac', '.ogg', '.oga', '.opus', '.wav', '.flac', '.weba'], maxMbKey: 'uploads.maxAudioMb', maxMbDefault: 50 },
  video: { subdir: 'video', exts: ['.mp4', '.webm', '.mov'], maxMbKey: 'uploads.maxVideoMb', maxMbDefault: 200 },
};

// Cualquier usuario autenticado puede subir medios (carátulas, portadas, avatar, audio, video).
@Controller('admin')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(
    private readonly storage: StorageService,
    private readonly files: FilesAdminService,
    private readonly settings: SettingsService,
    private readonly imageGen: ImageGenService,
  ) {}

  /** Sube solo imágenes (compatibilidad con los flujos existentes de carátula/portada). */
  @Post('uploads/image')
  @UseInterceptors(FileInterceptor('file'))
  async image(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.store(file, req, user, ['image']);
  }

  /** Genera una imagen con IA (Pollinations) y la guarda en el storage como una subida. */
  @Post('uploads/generate')
  async generate(@Body() dto: GenerateImageDto, @Req() req: Request, @CurrentUser() user: AuthenticatedUser) {
    const { buffer, contentType } = await this.imageGen.generate(dto);
    return this.persist(
      buffer,
      { mime: contentType, ext: extFromImageType(contentType), subdir: 'images', kind: 'image' },
      req,
      user,
    );
  }

  /** Lista los medios subidos por el usuario actual (para el selector de biblioteca). */
  @Get('media/mine')
  mine(@Query() query: ListFilesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.files.list({ page: query.page, perPage: query.perPage, kind: query.kind, q: query.q, userId: user.id });
  }

  /** Sube un medio genérico (imagen/audio/video) a la biblioteca, con deduplicación por hash. */
  @Post('media')
  @UseInterceptors(FileInterceptor('file'))
  async media(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.store(file, req, user, ['image', 'audio', 'video']);
  }

  private async store(
    file: Express.Multer.File | undefined,
    req: Request,
    user: AuthenticatedUser,
    allowed: Array<Exclude<MediaKind, 'other'>>,
  ) {
    if (!file) throw new BadRequestException('Falta el archivo (campo "file")');

    const kind = kindFromMime(file.mimetype);
    if (kind === 'other' || !allowed.includes(kind)) {
      throw new BadRequestException(`Tipo de archivo no permitido (${file.mimetype || 'desconocido'})`);
    }
    const rules = RULES[kind];

    const ext = (extname(file.originalname) || '').toLowerCase();
    if (!rules.exts.includes(ext)) {
      throw new BadRequestException(`Extensión no permitida para ${kind}: ${ext || '(ninguna)'}`);
    }

    const maxMb = await this.settings.getNumber(rules.maxMbKey, rules.maxMbDefault);
    if (file.size > maxMb * 1024 * 1024) {
      throw new BadRequestException(`El archivo supera los ${maxMb} MB`);
    }

    return this.persist(file.buffer, { mime: file.mimetype, ext, subdir: rules.subdir, kind }, req, user);
  }

  /**
   * Guarda un buffer en el storage con deduplicación por hash y lo registra en la
   * biblioteca. Compartido por la subida de archivos y la generación con IA.
   */
  private async persist(
    buffer: Buffer,
    meta: { mime: string; ext: string; subdir: string; kind: Exclude<MediaKind, 'other'> },
    req: Request,
    user: AuthenticatedUser,
  ) {
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    const existing = await this.files.findByHash(sha256);
    if (existing) {
      return { url: existing.url, id: String(existing._id), kind: existing.kind, filename: existing.filename, size: existing.size, deduped: true };
    }

    const filename = `${randomBytes(16).toString('hex')}${meta.ext}`;
    const stored = await this.storage.saveBuffer(buffer, meta.subdir, filename);

    const proto = (req.headers['x-forwarded-proto'] as string) ?? req.protocol;
    const url = this.storage.publicUrl(stored.publicPath, `${proto}://${req.get('host')}`);

    const entry = await this.files.record({
      url,
      path: stored.publicPath,
      filename,
      mime: meta.mime,
      size: buffer.length,
      sha256,
      kind: meta.kind,
      userId: user.id,
    });
    return { url, id: String(entry._id), kind: meta.kind, filename, size: buffer.length, deduped: false };
  }
}
