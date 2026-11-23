import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ChannelsService } from './channels.service';

/** Refresco programado diario del contenido cacheado de los channels. */
@Injectable()
export class ChannelsScheduler {
  private readonly logger = new Logger(ChannelsScheduler.name);

  constructor(private readonly channels: ChannelsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'channels-refresh' })
  async refresh(): Promise<void> {
    this.logger.log('Ejecutando refresco programado de channels…');
    await this.channels.refreshAll();
  }
}
