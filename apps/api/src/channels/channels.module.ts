import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Album, AlbumSchema } from '../catalog/schemas/album.schema';
import { Artist, ArtistSchema } from '../catalog/schemas/artist.schema';
import { Track, TrackSchema } from '../catalog/schemas/track.schema';
import { Playlist, PlaylistSchema } from '../playlists/schemas/playlist.schema';
import { Channel, ChannelSchema } from './schemas/channel.schema';
import { ChannelsService } from './channels.service';
import { ChannelsScheduler } from './channels.scheduler';
import { ChannelsController } from './channels.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Channel.name, schema: ChannelSchema },
      { name: Track.name, schema: TrackSchema },
      { name: Album.name, schema: AlbumSchema },
      { name: Artist.name, schema: ArtistSchema },
      { name: Playlist.name, schema: PlaylistSchema },
    ]),
  ],
  providers: [ChannelsService, ChannelsScheduler],
  controllers: [ChannelsController],
  exports: [ChannelsService],
})
export class ChannelsModule {}
