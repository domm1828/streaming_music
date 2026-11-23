import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Track, TrackSchema } from '../catalog/schemas/track.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { PlaylistsModule } from '../playlists/playlists.module';
import { SocialModule } from '../social/social.module';
import { ProfilesService } from './profiles.service';
import { ProfilesController } from './profiles.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Track.name, schema: TrackSchema },
    ]),
    PlaylistsModule,
    SocialModule,
  ],
  providers: [ProfilesService],
  controllers: [ProfilesController],
})
export class ProfilesModule {}
