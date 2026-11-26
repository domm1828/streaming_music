import {
  BadRequestException,
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
import { FilesAdminService, kindFromMime } from './files-admin.service';
import type { MediaKind } from './file-entry.schema';
import { ListFilesDto } from './dto/list-files.dto';

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

    // Deduplicación: si ya existe un archivo idéntico, se reutiliza su registro.
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    const existing = await this.files.findByHash(sha256);
    if (existing) {
      return { url: existing.url, id: String(existing._id), kind: existing.kind, filename: existing.filename, size: existing.size, deduped: true };
    }

    const filename = `${randomBytes(16).toString('hex')}${ext}`;
    const stored = await this.storage.saveBuffer(file.buffer, rules.subdir, filename);

    const proto = (req.headers['x-forwarded-proto'] as string) ?? req.protocol;
    const url = this.storage.publicUrl(stored.publicPath, `${proto}://${req.get('host')}`);

    const entry = await this.files.record({
      url,
      path: stored.publicPath,
      filename,
      mime: file.mimetype,
      size: file.size,
      sha256,
      kind,
      userId: user.id,
    });
    return { url, id: String(entry._id), kind, filename, size: file.size, deduped: false };
  }
}
