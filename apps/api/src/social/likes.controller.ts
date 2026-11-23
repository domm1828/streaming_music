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
import { LikeDto, LikesQueryDto } from './dto/social.dto';
import { LikeableType, LIKEABLE_TYPES } from './schemas/like.schema';
import { LikesService } from './likes.service';

function parseType(value: string): LikeableType {
  if (!LIKEABLE_TYPES.includes(value as LikeableType)) {
    throw new BadRequestException(`Tipo inválido: ${value}`);
  }
  return value as LikeableType;
}

@Controller()
export class LikesController {
  constructor(private readonly service: LikesService) {}

  @Post('me/likes')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  like(@Body() dto: LikeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.like(user.id, dto.type, dto.id);
  }

  @Delete('me/likes/:type/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  unlike(@Param('type') type: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.unlike(user.id, parseType(type), id);
  }

  @Get('me/likes')
  @UseGuards(JwtAuthGuard)
  list(@Query() query: LikesQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.list(user.id, query.type, query.page, query.perPage);
  }

  /** ¿El usuario marcó esta entidad? (para el estado del botón de like). */
  @Get('me/likes/check/:type/:id')
  @UseGuards(JwtAuthGuard)
  async check(@Param('type') type: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const liked = await this.service.isLiked(user.id, parseType(type), id);
    return { liked };
  }

  /** Contador público de favoritos de una entidad. */
  @Get('likes/count/:type/:id')
  async count(@Param('type') type: string, @Param('id') id: string) {
    const total = await this.service.countFor(parseType(type), id);
    return { total };
  }
}
