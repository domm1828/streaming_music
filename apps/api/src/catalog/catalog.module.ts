import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Album, AlbumSchema } from './schemas/album.schema';
import { Artist, ArtistSchema } from './schemas/artist.schema';
import { Genre, GenreSchema } from './schemas/genre.schema';
import { Tag, TagSchema } from './schemas/tag.schema';
import { Lyric, LyricSchema } from './schemas/lyric.schema';
import { Track, TrackSchema } from './schemas/track.schema';
import { TrackPlay, TrackPlaySchema } from './schemas/track-play.schema';
import { ListenUsage, ListenUsageSchema } from './schemas/listen-usage.schema';
import { AudioService } from './audio.service';
import { AlbumsService } from './albums.service';
import { ArtistsService } from './artists.service';
import { GenresService } from './genres.service';
import { TagsService } from './tags.service';
import { LyricsService } from './lyrics.service';
import { PlaysService } from './plays.service';
import { TracksService } from './tracks.service';
import { AlbumsController } from './albums.controller';
import { ArtistsController } from './artists.controller';
import { GenresController } from './genres.controller';
import { TagsController } from './tags.controller';
import { PlaysController } from './plays.controller';
import { TracksController } from './tracks.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Genre.name, schema: GenreSchema },
      { name: Tag.name, schema: TagSchema },
      { name: Artist.name, schema: ArtistSchema },
      { name: Album.name, schema: AlbumSchema },
      { name: Track.name, schema: TrackSchema },
      { name: Lyric.name, schema: LyricSchema },
      { name: TrackPlay.name, schema: TrackPlaySchema },
      { name: ListenUsage.name, schema: ListenUsageSchema },
    ]),
  ],
  providers: [
    AudioService,
    GenresService,
    TagsService,
    ArtistsService,
    AlbumsService,
    TracksService,
    LyricsService,
    PlaysService,
  ],
  controllers: [
    GenresController,
    TagsController,
    ArtistsController,
    AlbumsController,
    TracksController,
    PlaysController,
  ],
})
export class CatalogModule {}
