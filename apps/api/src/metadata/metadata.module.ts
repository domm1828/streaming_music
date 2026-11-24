import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Album, AlbumSchema } from '../catalog/schemas/album.schema';
import { Artist, ArtistSchema } from '../catalog/schemas/artist.schema';
import { Genre, GenreSchema } from '../catalog/schemas/genre.schema';
import { Lyric, LyricSchema } from '../catalog/schemas/lyric.schema';
import { Track, TrackSchema } from '../catalog/schemas/track.schema';
import { Playlist, PlaylistSchema } from '../playlists/schemas/playlist.schema';
import { ImportJob, ImportJobSchema } from './schemas/import-job.schema';
import {
  LYRICS_PROVIDERS,
  METADATA_PROVIDER,
  SECONDARY_METADATA_PROVIDER,
} from './provider.types';
import { SpotifyProvider } from './spotify.provider';
import { LastfmProvider } from './lastfm.provider';
import { LrclibProvider, LrclibSearchProvider } from './lyrics/lyrics.providers';
import { ImportService } from './import.service';
import { LyricsImportService } from './lyrics-import.service';
import { ImportController } from './import.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Artist.name, schema: ArtistSchema },
      { name: Album.name, schema: AlbumSchema },
      { name: Track.name, schema: TrackSchema },
      { name: Genre.name, schema: GenreSchema },
      { name: Lyric.name, schema: LyricSchema },
      { name: Playlist.name, schema: PlaylistSchema },
      { name: ImportJob.name, schema: ImportJobSchema },
    ]),
  ],
  providers: [
    LrclibProvider,
    LrclibSearchProvider,
    { provide: METADATA_PROVIDER, useClass: SpotifyProvider },
    { provide: SECONDARY_METADATA_PROVIDER, useClass: LastfmProvider },
    {
      provide: LYRICS_PROVIDERS,
      useFactory: (primary: LrclibProvider, secondary: LrclibSearchProvider) => [primary, secondary],
      inject: [LrclibProvider, LrclibSearchProvider],
    },
    ImportService,
    LyricsImportService,
  ],
  controllers: [ImportController],
  exports: [ImportService, LyricsImportService],
})
export class MetadataModule {}
