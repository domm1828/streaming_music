import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CatalogListDto, LogPlayDto } from './dto/catalog.dto';
import { PlaysService } from './plays.service';

@Controller()
export class PlaysController {
  constructor(private readonly service: PlaysService) {}

  /** Registra una reproducción. Auth opcional (anónimo o usuario). */
  @Post('player/tracks')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async log(
    @Body() dto: LogPlayDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Req() req: Request,
  ) {
    await this.service.log(dto.trackId, user?.id ?? null, {
      platform: (req.headers['sec-ch-ua-platform'] as string) ?? null,
      device: req.headers['user-agent'] ?? null,
    });
    return { message: 'Reproducción registrada' };
  }

  /** Historial de reproducción del propio usuario. */
  @Get('tracks/plays/:userId')
  @UseGuards(JwtAuthGuard)
  history(
    @Param('userId') userId: string,
    @Query() query: CatalogListDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const target = userId === 'me' ? user.id : userId;
    return this.service.history(target, query.page, query.perPage);
  }
}
