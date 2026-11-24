import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSIONS } from '../auth/rbac/permissions';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CatalogListDto, CreateTrackDto, UpdateTrackDto, UpsertLyricDto } from './dto/catalog.dto';
import { LyricsService } from './lyrics.service';
import { TracksService } from './tracks.service';

const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

@Controller('tracks')
export class TracksController {
  constructor(
    private readonly service: TracksService,
    private readonly lyrics: LyricsService,
  ) {}

  @Get()
  list(@Query() query: CatalogListDto) {
    return this.service.list(query.page, query.perPage, query.search);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  mine(@Query() query: CatalogListDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.listByOwner(user.id, query.page, query.perPage);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findDetail(id);
  }

  @Get(':id/playback')
  playback(@Param('id') id: string) {
    return this.service.resolvePlayback(id);
  }

  @Get(':id/wave')
  async wave(@Param('id') id: string) {
    const waveformPath = await this.service.getWaveform(id);
    return { waveformPath };
  }

  @Get(':id/lyrics')
  lyricsFor(@Param('id') id: string) {
    return this.lyrics.getByTrack(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateTrackDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.id);
  }

  @Post(':id/audio')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  uploadAudio(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Falta el archivo de audio (campo "file")');
    if (!file.mimetype.startsWith('audio/')) {
      throw new BadRequestException('El archivo debe ser de audio');
    }
    if (file.size > MAX_AUDIO_BYTES) throw new BadRequestException('El archivo supera los 50 MB');
    return this.service.uploadAudio(id, file, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateTrackDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.service.remove(id, user);
    return { message: 'Pista eliminada' };
  }

  @Put(':id/lyrics')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOG_MANAGE)
  upsertLyrics(@Param('id') id: string, @Body() dto: UpsertLyricDto) {
    return this.lyrics.upsert(id, dto);
  }

  @Delete(':id/lyrics')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOG_MANAGE)
  @HttpCode(HttpStatus.OK)
  async removeLyrics(@Param('id') id: string) {
    await this.lyrics.remove(id);
    return { message: 'Letra eliminada' };
  }
}
