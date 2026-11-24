import {
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
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CatalogListDto } from '../catalog/dto/catalog.dto';
import {
  AddTracksDto,
  CreatePlaylistDto,
  ReorderTracksDto,
  SetEditorsDto,
  UpdatePlaylistDto,
} from './dto/playlist.dto';
import { PlaylistsService } from './playlists.service';

@Controller()
export class PlaylistsController {
  constructor(private readonly service: PlaylistsService) {}

  @Get('me/playlists')
  @UseGuards(JwtAuthGuard)
  listMine(@Query() query: CatalogListDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.listMine(user.id, query.page, query.perPage);
  }

  @Post('playlists')
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreatePlaylistDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(user.id, dto);
  }

  @Get('playlists/:id')
  @UseGuards(OptionalJwtAuthGuard)
  findOne(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.service.findDetail(id, user?.id);
  }

  @Patch('playlists/:id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdatePlaylistDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.update(id, dto, user.id);
  }

  @Delete('playlists/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.service.remove(id, user.id);
    return { message: 'Playlist eliminada' };
  }

  @Post('playlists/:id/tracks')
  @UseGuards(JwtAuthGuard)
  addTracks(@Param('id') id: string, @Body() dto: AddTracksDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.addTracks(id, dto.trackIds, user.id);
  }

  @Delete('playlists/:id/tracks/:trackId')
  @UseGuards(JwtAuthGuard)
  removeTrack(
    @Param('id') id: string,
    @Param('trackId') trackId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.removeTrack(id, trackId, user.id);
  }

  @Put('playlists/:id/tracks/order')
  @UseGuards(JwtAuthGuard)
  reorder(@Param('id') id: string, @Body() dto: ReorderTracksDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.reorder(id, dto.trackIds, user.id);
  }

  @Put('playlists/:id/editors')
  @UseGuards(JwtAuthGuard)
  setEditors(@Param('id') id: string, @Body() dto: SetEditorsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.setEditors(id, dto.userIds, user.id);
  }

  /** Playlists públicas de un usuario (para su perfil). */
  @Get('users/:userId/playlists')
  byUser(@Param('userId') userId: string, @Query() query: CatalogListDto) {
    return this.service.listPublicByOwner(userId, query.page, query.perPage);
  }
}
