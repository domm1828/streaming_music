import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailSettingsController } from './mail-settings.controller';

@Global()
@Module({
  controllers: [MailSettingsController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
