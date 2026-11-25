import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GenresService } from './genres.service';
import { Artist, ArtistSchema } from './schemas/artist.schema';
import { Album, AlbumSchema } from './schemas/album.schema';
import { Track, TrackSchema } from './schemas/track.schema';
import { Genre, GenreSchema } from './schemas/genre.schema';

describe('Géneros · overview (e2e, in-memory)', () => {
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let service: GenresService;
  let genreId: Types.ObjectId;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongod.getUri()),
        MongooseModule.forFeature([
          { name: Genre.name, schema: GenreSchema },
          { name: Artist.name, schema: ArtistSchema },
          { name: Album.name, schema: AlbumSchema },
          { name: Track.name, schema: TrackSchema },
        ]),
      ],
      providers: [GenresService],
    }).compile();
    service = moduleRef.get(GenresService);
    const genreModel = moduleRef.get<Model<Genre>>(getModelToken(Genre.name));
    const artistModel = moduleRef.get<Model<Artist>>(getModelToken(Artist.name));
    const albumModel = moduleRef.get<Model<Album>>(getModelToken(Album.name));
    const trackModel = moduleRef.get<Model<Track>>(getModelToken(Track.name));

    genreId = new Types.ObjectId();
    const otherGenre = new Types.ObjectId();
    const artist1 = new Types.ObjectId();
    const artist2 = new Types.ObjectId();
    const album1 = new Types.ObjectId();

    await genreModel.collection.insertMany([
      { _id: genreId, name: 'rock', displayName: 'Rock', image: null, popularity: 10 },
      { _id: otherGenre, name: 'jazz', displayName: 'Jazz', image: null, popularity: 5 },
    ]);
    await artistModel.collection.insertMany([
      { _id: artist1, name: 'Nova', slug: 'nova', genres: [genreId], followers: 100 },
      { _id: artist2, name: 'Eco', slug: 'eco', genres: [genreId], followers: 50 },
      { _id: new Types.ObjectId(), name: 'OtroJazz', slug: 'otro-jazz', genres: [otherGenre], followers: 999 },
    ]);
    await albumModel.collection.insertMany([
      { _id: album1, name: 'Álbum Rock', slug: 'album-rock', artists: [artist1], genres: [genreId], popularity: 8 },
      { _id: new Types.ObjectId(), name: 'Álbum Jazz', artists: [], genres: [otherGenre], popularity: 3 },
    ]);
    await trackModel.collection.insertMany([
      { _id: new Types.ObjectId(), name: 'Hit', album: album1, artists: [{ artist: artist1, primary: true }], plays: 500 },
      { _id: new Types.ObjectId(), name: 'B-side', album: album1, artists: [{ artist: artist2, primary: true }], plays: 10 },
      { _id: new Types.ObjectId(), name: 'JazzTune', album: null, artists: [{ artist: new Types.ObjectId(), primary: true }], plays: 9999 },
    ]);
  });

  afterAll(async () => {
    await moduleRef?.close();
    await mongod?.stop();
  });

  it('devuelve artistas, álbumes y pistas top del género', async () => {
    const o = await service.overview(genreId.toString());
    expect(o.genre.displayName).toBe('Rock');
    expect(o.artists.map((a) => a.name).sort()).toEqual(['Eco', 'Nova']);
    expect(o.albums.map((a) => a.name)).toEqual(['Álbum Rock']);
    // Pistas top solo de artistas del género, ordenadas por reproducciones.
    expect(o.topTracks.map((t) => t.name)).toEqual(['Hit', 'B-side']);
    expect(o.topTracks[0].name).toBe('Hit');
  });

  it('lanza 404 ante un id inválido o inexistente', async () => {
    await expect(service.overview('no-es-objectid')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.overview(new Types.ObjectId().toString())).rejects.toBeInstanceOf(NotFoundException);
  });
});
