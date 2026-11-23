import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Post } from '@nestjs/common';
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
    // Restringir la reproducción si el usuario agotó su cuota de minutos.
    if (user && !(await this.service.hasRemainingMinutes(user.id))) {
      throw new ForbiddenException('Agotaste tus minutos de escucha de este periodo');
    }
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

  /** Minutos escuchados y restantes en el periodo actual. */
  @Get('me/listening')
  @UseGuards(JwtAuthGuard)
  listening(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listeningStatus(user.id);
  }

  /** Insights agregados de la actividad de escucha del usuario. */
  @Get('me/insights')
  @UseGuards(JwtAuthGuard)
  insights(@Query('days') days: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    const parsed = days ? Math.min(Math.max(parseInt(days, 10) || 30, 1), 365) : 30;
    return this.service.insights(user.id, parsed);
  }
}
