import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Localization, LocalizationSchema } from './schemas/localization.schema';
import { LocalizationService } from './localization.service';
import { LocalizationController } from './localization.controller';

@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: Localization.name, schema: LocalizationSchema }])],
  providers: [LocalizationService],
  controllers: [LocalizationController],
  exports: [LocalizationService],
})
export class LocalizationModule {}
