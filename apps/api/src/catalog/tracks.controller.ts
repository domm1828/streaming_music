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
import { SettingsService } from '../settings/settings.service';
import { BulkUpdateTracksDto, CatalogListDto, CreateTrackDto, UpdateTrackDto, UpsertLyricDto } from './dto/catalog.dto';
import { LyricsService } from './lyrics.service';
import { TracksService } from './tracks.service';

@Controller('tracks')
export class TracksController {
  constructor(
    private readonly service: TracksService,
    private readonly lyrics: LyricsService,
    private readonly settings: SettingsService,
  ) {}

  @Get()
  list(@Query() query: CatalogListDto) {
    return this.service.list(query.page, query.perPage, query.search, query.type);
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
  async uploadAudio(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Falta el archivo de audio (campo "file")');
    if (!file.mimetype.startsWith('audio/')) {
      throw new BadRequestException('El archivo debe ser de audio');
    }
    const maxMb = await this.settings.getNumber('uploads.maxAudioMb', 50);
    if (file.size > maxMb * 1024 * 1024) {
      throw new BadRequestException(`El archivo supera los ${maxMb} MB`);
    }
    return this.service.uploadAudio(id, file, user);
  }

  @Post(':id/video')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Falta el archivo de video (campo "file")');
    if (!file.mimetype.startsWith('video/')) {
      throw new BadRequestException('El archivo debe ser de video');
    }
    const maxMb = await this.settings.getNumber('uploads.maxVideoMb', 200);
    if (file.size > maxMb * 1024 * 1024) {
      throw new BadRequestException(`El archivo supera los ${maxMb} MB`);
    }
    return this.service.uploadVideo(id, file, user);
  }

  @Patch('bulk')
  @UseGuards(JwtAuthGuard)
  bulkUpdate(@Body() dto: BulkUpdateTracksDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.bulkUpdate(dto, user);
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
