import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { BroadcastDto, toAudience } from './dto/broadcast.dto';
import { NotificationsService } from './notifications.service';

@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.NOTIFICATIONS_SEND)
export class AdminNotificationsController {
  constructor(private readonly service: NotificationsService) {}

  /** Estima cuántos usuarios recibirían el broadcast (previsualización). */
  @Post('preview')
  async preview(@Body() dto: BroadcastDto) {
    const count = await this.service.countAudience(toAudience(dto));
    return { count };
  }

  /** Envía la notificación a la audiencia resuelta. */
  @Post('broadcast')
  broadcast(@Body() dto: BroadcastDto) {
    return this.service.broadcast({
      title: dto.title,
      body: dto.body ?? null,
      link: dto.link ?? null,
      email: dto.email ?? false,
      audience: toAudience(dto),
    });
  }
}
