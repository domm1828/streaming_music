import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule, getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection, Model, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import configuration from '../config/configuration';
import { Artist } from '../catalog/schemas/artist.schema';
import { Track } from '../catalog/schemas/track.schema';
import { MetadataModule } from './metadata.module';
import { ImportService } from './import.service';
import { LyricsImportService } from './lyrics-import.service';
import {
  LYRICS_PROVIDERS,
  METADATA_PROVIDER,
  SECONDARY_METADATA_PROVIDER,
  type LyricsProvider,
  type MetadataProvider,
  type NormalizedAlbum,
  type NormalizedArtist,
  type SecondaryMetadataProvider,
} from './provider.types';

// --- Proveedores fake (sin red) ---
const FAKE_ARTIST: NormalizedArtist = {
  externalId: 'art1',
  name: 'Fake Artist',
  image: 'http://img/a.jpg',
  bio: null,
  genres: ['Indie', 'Rock'],
  followers: 100,
  popularity: 50,
};
const FAKE_ALBUM: NormalizedAlbum = {
  externalId: 'alb1',
  name: 'Album One',
  image: 'http://img/alb.jpg',
  releaseDate: '2020-01-01',
  popularity: 40,
  artistExternalIds: ['art1'],
  genres: [],
  tracks: [
    { externalId: 'trk1', name: 'Song A', number: 1, durationSeconds: 200, popularity: 30, artistExternalIds: ['art1'], previewUrl: null },
    { externalId: 'trk2', name: 'Song B', number: 2, durationSeconds: 180, popularity: 20, artistExternalIds: ['art1'], previewUrl: 'http://p/b.mp3' },
  ],
};

class FakeProvider implements MetadataProvider {
  readonly name = 'fake';
  isConfigured() { return true; }
  searchArtists() { return Promise.resolve([FAKE_ARTIST]); }
  getArtist(id: string) {
    if (id === 'explode') return Promise.reject(new Error('transient boom'));
    return Promise.resolve({ ...FAKE_ARTIST, externalId: id });
  }
  getArtistAlbums() { return Promise.resolve([FAKE_ALBUM]); }
  getNewReleases() { return Promise.resolve([FAKE_ALBUM]); }
  getFeaturedPlaylists() {
    return Promise.resolve([{ externalId: 'pl1', name: 'Featured', description: null, image: null, trackExternalIds: [] }]);
  }
}
class FakeSecondary implements SecondaryMetadataProvider {
  readonly name = 'fake-secondary';
  isConfigured() { return true; }
  topGenres() { return Promise.resolve(['pop', 'rock', 'jazz']); }
  artistBio() { return Promise.resolve('Una bio de prueba'); }
}
class FakeLyrics implements LyricsProvider {
  readonly name = 'fake-lyrics';
  fetchLyrics(track: string) {
    return Promise.resolve(track === 'Song A' ? 'la la la' : null);
  }
}

describe('Metadata import (e2e, in-memory Mongo, proveedores mockeados)', () => {
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let connection: Connection;
  let importSvc: ImportService;
  let lyricsSvc: LyricsImportService;
  let artistModel: Model<Artist>;
  let trackModel: Model<Track>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
        EventEmitterModule.forRoot(),
        MongooseModule.forRoot(mongod.getUri()),
        MetadataModule,
      ],
    })
      .overrideProvider(METADATA_PROVIDER)
      .useValue(new FakeProvider())
      .overrideProvider(SECONDARY_METADATA_PROVIDER)
      .useValue(new FakeSecondary())
      .overrideProvider(LYRICS_PROVIDERS)
      .useValue([new FakeLyrics()])
      .compile();
    await moduleRef.init();

    connection = moduleRef.get<Connection>(getConnectionToken());
    await connection.syncIndexes();
    importSvc = moduleRef.get(ImportService);
    lyricsSvc = moduleRef.get(LyricsImportService);
    artistModel = moduleRef.get<Model<Artist>>(getModelToken(Artist.name));
    trackModel = moduleRef.get<Model<Track>>(getModelToken(Track.name));
  });

  afterAll(async () => {
    await moduleRef?.close();
    await mongod?.stop();
  });

  describe('Importar artista', () => {
    it('normaliza y guarda artista, álbumes y pistas con sus relaciones', async () => {
      const summary = await importSvc.importArtist('art1');
      expect(summary.artists).toBe(1);
      expect(summary.albums).toBe(1);
      expect(summary.tracks).toBe(2);

      const artist = await artistModel.findOne({ spotifyId: 'art1' }).lean().exec();
      expect(artist).toBeTruthy();
      expect(artist!.bio).toBe('Una bio de prueba'); // enriquecida desde el secundario
      expect(artist!.fullyScraped).toBe(true);
      expect(artist!.genres).toHaveLength(2);

      const track = await trackModel.findOne({ spotifyId: 'trk1' }).lean().exec();
      expect(track).toBeTruthy();
      expect(String(track!.artists[0].artist)).toBe(String(artist!._id));
      expect(track!.album).toBeTruthy();
    });

    it('es idempotente: no reprocesa un artista ya scrapeado', async () => {
      const again = await importSvc.importArtist('art1');
      expect(again.skipped).toBe(true);
      expect(await artistModel.countDocuments({ spotifyId: 'art1' }).exec()).toBe(1);
      expect(await trackModel.countDocuments({ spotifyId: 'trk1' }).exec()).toBe(1);
    });
  });

  describe('Jobs', () => {
    it('ejecuta la importación como job en segundo plano y refleja el estado', async () => {
      const job = await importSvc.createAndRun('artist', 'art2', null);
      expect(job.status).toBe('pending');
      const done = await waitForJob(importSvc, String(job._id));
      expect(done?.status).toBe('done');
      // art2 es un artista nuevo; álbum/pistas se comparten y ya existían (idempotente).
      expect((done?.result as { artists: number }).artists).toBe(1);
    });

    it('marca el job como fallido tras agotar los reintentos', async () => {
      const job = await importSvc.createAndRun('artist', 'explode', null);
      const done = await waitForJob(importSvc, String(job._id), 15000);
      expect(done?.status).toBe('failed');
      expect(done?.attempts).toBe(3);
      expect(done?.error).toContain('transient');
    });
  });

  describe('Letras', () => {
    it('obtiene la letra desde la primera fuente que responde y la guarda', async () => {
      const artist = await artistModel.create({ name: 'L', slug: 'l-' + Date.now() });
      const track = await trackModel.create({
        name: 'Song A',
        artists: [{ artist: artist._id, primary: true }],
      });
      const res = await lyricsSvc.fetchForTrack(String(track._id));
      expect(res.found).toBe(true);
      expect(res.source).toBe('fake-lyrics');
      const lyric = await connection.collection('lyrics').findOne({ track: new Types.ObjectId(String(track._id)) });
      expect(lyric?.text).toBe('la la la');
    });

    it('devuelve found:false si ninguna fuente tiene la letra', async () => {
      const artist = await artistModel.create({ name: 'M', slug: 'm-' + Date.now() });
      const track = await trackModel.create({ name: 'Unknown Song', artists: [{ artist: artist._id, primary: true }] });
      const res = await lyricsSvc.fetchForTrack(String(track._id));
      expect(res.found).toBe(false);
    });
  });
});

/** Espera a que un job deje de estar pendiente/corriendo. */
async function waitForJob(svc: ImportService, id: string, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const job = await svc.getJob(id);
    if (job && job.status !== 'pending' && job.status !== 'running') return job;
    await new Promise((r) => setTimeout(r, 100));
  }
  return svc.getJob(id);
}
