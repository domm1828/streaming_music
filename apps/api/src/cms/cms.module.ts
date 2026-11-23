import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Album, AlbumSchema } from '../catalog/schemas/album.schema';
import { Artist, ArtistSchema } from '../catalog/schemas/artist.schema';
import { Track, TrackSchema } from '../catalog/schemas/track.schema';
import { Playlist, PlaylistSchema } from '../playlists/schemas/playlist.schema';
import { CustomPage, CustomPageSchema } from './schemas/custom-page.schema';
import { CustomPagesService } from './custom-pages.service';
import { SitemapService } from './sitemap.service';
import { CmsController } from './cms.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomPage.name, schema: CustomPageSchema },
      { name: Artist.name, schema: ArtistSchema },
      { name: Album.name, schema: AlbumSchema },
      { name: Track.name, schema: TrackSchema },
      { name: Playlist.name, schema: PlaylistSchema },
    ]),
  ],
  providers: [CustomPagesService, SitemapService],
  controllers: [CmsController],
})
export class CmsModule {}
