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
import { RepostDto } from './dto/social.dto';
import { RepostableType, REPOSTABLE_TYPES } from './schemas/repost.schema';
import { RepostsService } from './reposts.service';

function parseType(value: string): RepostableType {
  if (!REPOSTABLE_TYPES.includes(value as RepostableType)) {
    throw new BadRequestException(`Tipo inválido: ${value}`);
  }
  return value as RepostableType;
}

@Controller()
export class RepostsController {
  constructor(private readonly service: RepostsService) {}

  @Post('me/reposts')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  repost(@Body() dto: RepostDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.repost(user.id, dto.type, dto.id);
  }

  @Delete('me/reposts/:type/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  unrepost(@Param('type') type: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.unrepost(user.id, parseType(type), id);
  }

  @Get('me/reposts')
  @UseGuards(JwtAuthGuard)
  mine(@Query() query: CatalogListDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.listByUser(user.id, query.page, query.perPage);
  }

  /** Reposts públicos de un usuario (para su perfil). */
  @Get('users/:userId/reposts')
  byUser(@Param('userId') userId: string, @Query() query: CatalogListDto) {
    return this.service.listByUser(userId, query.page, query.perPage);
  }
}
