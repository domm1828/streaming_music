import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Track } from '../catalog/schemas/track.schema';
import { TrackPlay } from '../catalog/schemas/track-play.schema';
import { Artist } from '../catalog/schemas/artist.schema';
import { Album } from '../catalog/schemas/album.schema';
import { User } from '../users/schemas/user.schema';
import { AnalyticsModule } from './analytics.module';
import { AnalyticsService } from './analytics.service';

describe('Analytics (e2e, in-memory)', () => {
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let service: AnalyticsService;
  let trackModel: Model<Track>;
  let playModel: Model<TrackPlay>;
  let userModel: Model<User>;
  let artistModel: Model<Artist>;
  let albumModel: Model<Album>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    moduleRef = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(mongod.getUri()), AnalyticsModule],
    }).compile();
    service = moduleRef.get(AnalyticsService);
    trackModel = moduleRef.get(getModelToken(Track.name));
    playModel = moduleRef.get(getModelToken(TrackPlay.name));
    userModel = moduleRef.get(getModelToken(User.name));
    artistModel = moduleRef.get(getModelToken(Artist.name));
    albumModel = moduleRef.get(getModelToken(Album.name));

    const t1 = new Types.ObjectId();
    const t2 = new Types.ObjectId();
    const artist1 = new Types.ObjectId();
    const album1 = new Types.ObjectId();
    const userA = new Types.ObjectId();
    const userB = new Types.ObjectId();
    const now = new Date();
    const old = new Date(Date.now() - 60 * 86_400_000); // fuera de 7/14 días
    await trackModel.collection.insertMany([
      { _id: t1, name: 'Hit', album: album1, artists: [{ artist: artist1, primary: true }], createdAt: now },
      { _id: t2, name: 'B-side', album: album1, artists: [{ artist: artist1, primary: true }], createdAt: now },
    ]);
    await artistModel.collection.insertOne({ _id: artist1, name: 'Nova', slug: 'nova', createdAt: now });
    await albumModel.collection.insertOne({ _id: album1, name: 'Primer Álbum', slug: 'primer-album', createdAt: now });
    await userModel.collection.insertMany([
      { _id: userA, email: 'a@x.com', username: 'a', name: 'A', createdAt: now },
      { _id: userB, email: 'b@x.com', username: 'b', name: 'B', createdAt: now },
    ]);
    await playModel.collection.insertMany([
      { track: t1, user: userA, country: 'AR', device: 'mobile', platform: 'android', createdAt: now },
      { track: t1, user: userA, country: 'AR', device: 'desktop', platform: 'web', createdAt: now },
      { track: t1, user: userB, country: 'UY', device: 'mobile', platform: 'ios', createdAt: now },
      { track: t2, user: null, country: 'AR', device: 'desktop', platform: 'web', createdAt: now },
      { track: t1, user: userA, country: 'AR', device: 'mobile', platform: 'android', createdAt: old },
    ]);
  });

  afterAll(async () => {
    await moduleRef?.close();
    await mongod?.stop();
  });

  it('agrega totales, tops y desgloses del período (14 días por defecto)', async () => {
    const o = await service.overview();
    expect(o.days).toBe(14);
    expect(o.totals.tracks).toBe(2);
    expect(o.totals.users).toBe(2);
    expect(o.totals.plays).toBe(5); // all-time incluye el play viejo
    // Tops del período (excluyen el play de hace 60 días).
    expect(o.topTracks[0]).toMatchObject({ name: 'Hit', plays: 3 });
    expect(o.topArtists[0]).toMatchObject({ name: 'Nova', plays: 4 });
    expect(o.topAlbums[0]).toMatchObject({ name: 'Primer Álbum', plays: 4 });
    expect(o.topUsers[0]).toMatchObject({ username: 'a', plays: 2 });
    expect(o.topCountries.find((c) => c.country === 'AR')?.plays).toBe(3);
    // Desgloses.
    expect(o.devices.find((d) => d.label === 'mobile')?.plays).toBe(2);
    expect(o.devices.find((d) => d.label === 'desktop')?.plays).toBe(2);
    expect(o.platforms.find((p) => p.label === 'web')?.plays).toBe(2);
    expect(o.platforms.find((p) => p.label === 'android')?.plays).toBe(1);
    expect(o.playsByDay.reduce((s, d) => s + d.plays, 0)).toBe(4);
    expect(o.newUsers).toBe(2);
  });

  it('respeta el rango de fechas', async () => {
    const wide = await service.overview(90);
    expect(wide.days).toBe(90);
    // El rango amplio incluye el play de hace 60 días.
    expect(wide.playsByDay.reduce((s, d) => s + d.plays, 0)).toBe(5);
    expect(wide.topTracks[0]).toMatchObject({ name: 'Hit', plays: 4 });
    // Un rango inválido cae al default de 14.
    const fallback = await service.overview(999);
    expect(fallback.days).toBe(14);
  });
});
