import { Controller, ForbiddenException, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { StorageService } from './storage.service';

@Controller('files')
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  /** Sirve un archivo privado solo con una firma HMAC válida y no expirada. */
  @Get('signed')
  signed(
    @Query('path') path: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
    @Res() res: Response,
  ) {
    if (!path || !exp || !sig || !this.storage.verifyLocalSignature(path, Number(exp), sig)) {
      throw new ForbiddenException('Firma inválida o expirada');
    }
    res.sendFile(this.storage.absolutePathFor(path));
  }
}
