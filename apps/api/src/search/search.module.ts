import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Album, AlbumSchema } from '../catalog/schemas/album.schema';
import { Artist, ArtistSchema } from '../catalog/schemas/artist.schema';
import { Track, TrackSchema } from '../catalog/schemas/track.schema';
import { Playlist, PlaylistSchema } from '../playlists/schemas/playlist.schema';
import { SearchService } from './search.service';
import { SearchIndexListener } from './search.listener';
import { SearchController } from './search.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Artist.name, schema: ArtistSchema },
      { name: Album.name, schema: AlbumSchema },
      { name: Track.name, schema: TrackSchema },
      { name: Playlist.name, schema: PlaylistSchema },
    ]),
  ],
  providers: [SearchService, SearchIndexListener],
  controllers: [SearchController],
  exports: [SearchService],
})
export class SearchModule {}
