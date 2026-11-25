import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { AlbumsService } from './albums.service';
import { AlbumTracksOrderDto, CatalogListDto, CreateAlbumDto, UpdateAlbumDto } from './dto/catalog.dto';

@Controller('albums')
export class AlbumsController {
  constructor(private readonly service: AlbumsService) {}

  @Get()
  list(@Query() query: CatalogListDto) {
    return this.service.list(query.page, query.perPage, query.search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findWithTracks(id);
  }

  @Get(':id/edit')
  @UseGuards(JwtAuthGuard)
  findForEdit(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findForEdit(id, user);
  }

  @Put(':id/tracks/order')
  @UseGuards(JwtAuthGuard)
  reorderTracks(@Param('id') id: string, @Body() dto: AlbumTracksOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.reorderTracks(id, dto.trackIds, user);
  }

  @Delete(':id/tracks/:trackId')
  @UseGuards(JwtAuthGuard)
  removeTrack(@Param('id') id: string, @Param('trackId') trackId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.removeTrack(id, trackId, user);
  }

  // Cualquier usuario autenticado puede crear un álbum (queda como dueño); editar/borrar: dueño o admin.
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateAlbumDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateAlbumDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.service.remove(id, user);
    return { message: 'Álbum eliminado' };
  }
}
