import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Artist, ArtistSchema } from '../catalog/schemas/artist.schema';
import { Track, TrackSchema } from '../catalog/schemas/track.schema';
import { RadioService } from './radio.service';
import { DiscoveryController } from './discovery.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Track.name, schema: TrackSchema },
      { name: Artist.name, schema: ArtistSchema },
    ]),
  ],
  providers: [RadioService],
  controllers: [DiscoveryController],
})
export class DiscoveryModule {}
