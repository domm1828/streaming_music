import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { NotificationsService } from './notifications.service';

@Controller('me/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(@Query() query: PaginationQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.list(user.id, query.page, query.perPage);
  }

  @Get('unread-count')
  async unread(@CurrentUser() user: AuthenticatedUser) {
    const count = await this.service.unreadCount(user.id);
    return { count };
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  async read(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.service.markRead(id, user.id);
    return { message: 'Notificación marcada como leída' };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  async readAll(@CurrentUser() user: AuthenticatedUser) {
    const count = await this.service.markAllRead(user.id);
    return { read: count };
  }
}
