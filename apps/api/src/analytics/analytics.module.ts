import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { Album, AlbumSchema } from '../catalog/schemas/album.schema';
import { Artist, ArtistSchema } from '../catalog/schemas/artist.schema';
import { Track, TrackSchema } from '../catalog/schemas/track.schema';
import { TrackPlay, TrackPlaySchema } from '../catalog/schemas/track-play.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Artist.name, schema: ArtistSchema },
      { name: Album.name, schema: AlbumSchema },
      { name: Track.name, schema: TrackSchema },
      { name: TrackPlay.name, schema: TrackPlaySchema },
    ]),
  ],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
