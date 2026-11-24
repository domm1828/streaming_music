import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Album, AlbumSchema } from '../catalog/schemas/album.schema';
import { Artist, ArtistSchema } from '../catalog/schemas/artist.schema';
import { Track, TrackSchema } from '../catalog/schemas/track.schema';
import { Playlist, PlaylistSchema } from '../playlists/schemas/playlist.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Like, LikeSchema } from './schemas/like.schema';
import { Follow, FollowSchema } from './schemas/follow.schema';
import { Repost, RepostSchema } from './schemas/repost.schema';
import { LikesService } from './likes.service';
import { FollowsService } from './follows.service';
import { RepostsService } from './reposts.service';
import { LikesController } from './likes.controller';
import { FollowsController } from './follows.controller';
import { RepostsController } from './reposts.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Like.name, schema: LikeSchema },
      { name: Follow.name, schema: FollowSchema },
      { name: Repost.name, schema: RepostSchema },
      { name: Track.name, schema: TrackSchema },
      { name: Album.name, schema: AlbumSchema },
      { name: Artist.name, schema: ArtistSchema },
      { name: Playlist.name, schema: PlaylistSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [LikesService, FollowsService, RepostsService],
  controllers: [LikesController, FollowsController, RepostsController],
  exports: [LikesService, FollowsService, RepostsService],
})
export class SocialModule {}
