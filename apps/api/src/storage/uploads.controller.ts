import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { randomBytes } from 'node:crypto';
import { extname } from 'node:path';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { StorageService } from './storage.service';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];

@Controller('admin/uploads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.CATALOG_MANAGE)
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  /** Sube una imagen pública y devuelve su URL absoluta. */
  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async image(@UploadedFile() file: Express.Multer.File | undefined, @Req() req: Request) {
    if (!file) throw new BadRequestException('Falta el archivo (campo "file")');
    if (!file.mimetype.startsWith('image/')) throw new BadRequestException('El archivo debe ser una imagen');
    if (file.size > MAX_IMAGE_BYTES) throw new BadRequestException('La imagen supera los 5 MB');
    const ext = (extname(file.originalname) || '.jpg').toLowerCase();
    if (!ALLOWED.includes(ext)) throw new BadRequestException('Formato de imagen no permitido');

    const filename = `${randomBytes(16).toString('hex')}${ext}`;
    const stored = await this.storage.saveBuffer(file.buffer, 'images', filename);

    const proto = (req.headers['x-forwarded-proto'] as string) ?? req.protocol;
    const url = this.storage.driver === 'local' ? `${proto}://${req.get('host')}${stored.publicPath}` : stored.publicPath;
    return { url };
  }
}
