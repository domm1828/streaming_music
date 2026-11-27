import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TracksService } from './tracks.service';
import { AudioService } from './audio.service';
import { StorageService } from '../storage/storage.service';
import { Track, TrackSchema } from './schemas/track.schema';
import { Lyric, LyricSchema } from './schemas/lyric.schema';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';

const admin = { id: new Types.ObjectId().toString(), permissions: ['*'] } as unknown as AuthenticatedUser;

describe('TracksService.bulkUpdate (e2e, in-memory)', () => {
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let service: TracksService;
  let trackModel: Model<Track>;

  const insertTrack = (over: Partial<Record<string, unknown>> = {}) => {
    const _id = new Types.ObjectId();
    return trackModel.collection
      .insertOne({ _id, name: 'Pista', srcType: 'audio', artists: [], genres: [], tags: [], plays: 0, ...over })
      .then(() => _id);
  };

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongod.getUri()),
        MongooseModule.forFeature([
          { name: Track.name, schema: TrackSchema },
          { name: Lyric.name, schema: LyricSchema },
        ]),
      ],
      providers: [
        TracksService,
        { provide: StorageService, useValue: {} },
        { provide: AudioService, useValue: {} },
        { provide: EventEmitter2, useValue: { emit: () => true } },
      ],
    }).compile();
    service = moduleRef.get(TracksService);
    trackModel = moduleRef.get(getModelToken(Track.name));
  });

  afterAll(async () => {
    await moduleRef?.close();
    await mongod?.stop();
  });

  it('aplica solo los campos enviados y deja intactos los ausentes', async () => {
    const genre = new Types.ObjectId();
    const album = new Types.ObjectId();
    const id1 = await insertTrack({ genres: [genre] });
    const id2 = await insertTrack({ genres: [genre] });

    const res = await service.bulkUpdate(
      { trackIds: [id1.toString(), id2.toString()], album: album.toString() },
      admin,
    );

    expect(res).toEqual({ updated: 2, skipped: 0 });
    const t1 = await trackModel.findById(id1).lean().exec();
    const t2 = await trackModel.findById(id2).lean().exec();
    // El álbum se seteó en ambas…
    expect(String(t1?.album)).toBe(album.toString());
    expect(String(t2?.album)).toBe(album.toString());
    // …y los géneros, que no se enviaron, quedaron intactos.
    expect(t1?.genres?.map(String)).toEqual([genre.toString()]);
  });

  it('reemplaza los multivaluados (artistas, géneros, tags)', async () => {
    const oldGenre = new Types.ObjectId();
    const id = await insertTrack({ genres: [oldGenre], tags: [new Types.ObjectId()] });
    const artistA = new Types.ObjectId().toString();
    const artistB = new Types.ObjectId().toString();
    const newGenre = new Types.ObjectId().toString();

    const res = await service.bulkUpdate(
      { trackIds: [id.toString()], artists: [artistA, artistB], genres: [newGenre], tags: [] },
      admin,
    );

    expect(res).toEqual({ updated: 1, skipped: 0 });
    const t = await trackModel.findById(id).lean().exec();
    expect(t?.artists?.map((a) => String(a.artist))).toEqual([artistA, artistB]);
    expect(t?.artists?.[0].primary).toBe(true);
    expect(t?.genres?.map(String)).toEqual([newGenre]);
    expect(t?.tags).toEqual([]);
  });

  it('saltea pistas sin permiso y las inexistentes, y actualiza el resto', async () => {
    const ownerA = new Types.ObjectId().toString();
    const ownerB = new Types.ObjectId().toString();
    const mine = await insertTrack({ owner: new Types.ObjectId(ownerA) });
    const foreign = await insertTrack({ owner: new Types.ObjectId(ownerB) });
    const missing = new Types.ObjectId().toString();
    const image = 'https://cdn/x.jpg';

    // Usuario común (sin '*' ni catalog.manage) dueño solo de `mine`.
    const user = { id: ownerA, permissions: [] } as unknown as AuthenticatedUser;
    const res = await service.bulkUpdate(
      { trackIds: [mine.toString(), foreign.toString(), missing], image },
      user,
    );

    expect(res).toEqual({ updated: 1, skipped: 2 });
    const t = await trackModel.findById(mine).lean().exec();
    const other = await trackModel.findById(foreign).lean().exec();
    expect(t?.image).toBe(image);
    expect(other?.image ?? null).toBeNull();
  });
});
