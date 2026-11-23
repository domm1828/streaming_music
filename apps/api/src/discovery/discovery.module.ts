import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Artist, ArtistSchema } from '../catalog/schemas/artist.schema';
import { Track, TrackSchema } from '../catalog/schemas/track.schema';
import { Setting, SettingSchema } from '../settings/schemas/setting.schema';
import { SettingsService } from '../settings/settings.service';
import { RadioService } from './radio.service';
import { DiscoveryController } from './discovery.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Track.name, schema: TrackSchema },
      { name: Artist.name, schema: ArtistSchema },
      { name: Setting.name, schema: SettingSchema },
    ]),
  ],
  providers: [RadioService, SettingsService],
  controllers: [DiscoveryController],
  exports: [SettingsService],
})
export class DiscoveryModule {}
