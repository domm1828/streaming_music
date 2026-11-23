import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CatalogListDto } from '../catalog/dto/catalog.dto';
import { FollowDto, FollowingQueryDto } from './dto/social.dto';
import { FollowableType, FOLLOWABLE_TYPES } from './schemas/follow.schema';
import { FollowsService } from './follows.service';

function parseType(value: string): FollowableType {
  if (!FOLLOWABLE_TYPES.includes(value as FollowableType)) {
    throw new BadRequestException(`Tipo inválido: ${value}`);
  }
  return value as FollowableType;
}

@Controller()
export class FollowsController {
  constructor(private readonly service: FollowsService) {}

  @Post('me/following')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  follow(@Body() dto: FollowDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.follow(user.id, dto.type, dto.id);
  }

  @Delete('me/following/:type/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  unfollow(@Param('type') type: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.unfollow(user.id, parseType(type), id);
  }

  @Get('me/following')
  @UseGuards(JwtAuthGuard)
  following(@Query() query: FollowingQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.following(user.id, query.type, query.page, query.perPage);
  }

  /** ¿El usuario sigue a esta entidad? (para el estado del botón de seguir). */
  @Get('me/following/check/:type/:id')
  @UseGuards(JwtAuthGuard)
  async check(@Param('type') type: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const following = await this.service.isFollowing(user.id, parseType(type), id);
    return { following };
  }

  @Get('me/followers')
  @UseGuards(JwtAuthGuard)
  myFollowers(@Query() query: CatalogListDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.followers('user', user.id, query.page, query.perPage);
  }

  /** Seguidores públicos de cualquier entidad (usuario, artista o playlist). */
  @Get('followers/:type/:id')
  followers(@Param('type') type: string, @Param('id') id: string, @Query() query: CatalogListDto) {
    return this.service.followers(parseType(type), id, query.page, query.perPage);
  }
}
