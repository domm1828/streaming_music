import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Track } from '../catalog/schemas/track.schema';
import { TrackPlay } from '../catalog/schemas/track-play.schema';
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

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    moduleRef = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(mongod.getUri()), AnalyticsModule],
    }).compile();
    service = moduleRef.get(AnalyticsService);
    trackModel = moduleRef.get(getModelToken(Track.name));
    playModel = moduleRef.get(getModelToken(TrackPlay.name));
    userModel = moduleRef.get(getModelToken(User.name));

    const t1 = new Types.ObjectId();
    const t2 = new Types.ObjectId();
    const now = new Date();
    await trackModel.collection.insertMany([
      { _id: t1, name: 'Hit', createdAt: now },
      { _id: t2, name: 'B-side', createdAt: now },
    ]);
    await userModel.collection.insertMany([
      { _id: new Types.ObjectId(), email: 'a@x.com', username: 'a', name: 'A', createdAt: now },
      { _id: new Types.ObjectId(), email: 'b@x.com', username: 'b', name: 'B', createdAt: now },
    ]);
    await playModel.collection.insertMany([
      { track: t1, country: 'AR', createdAt: now },
      { track: t1, country: 'AR', createdAt: now },
      { track: t1, country: 'UY', createdAt: now },
      { track: t2, country: 'AR', createdAt: now },
    ]);
  });

  afterAll(async () => {
    await moduleRef?.close();
    await mongod?.stop();
  });

  it('agrega totales, top tracks y países', async () => {
    const o = await service.overview();
    expect(o.totals.tracks).toBe(2);
    expect(o.totals.users).toBe(2);
    expect(o.totals.plays).toBe(4);
    expect(o.topTracks[0]).toMatchObject({ name: 'Hit', plays: 3 });
    expect(o.topCountries.find((c) => c.country === 'AR')?.plays).toBe(3);
    expect(o.playsByDay.reduce((s, d) => s + d.plays, 0)).toBe(4);
    expect(o.newUsers).toBe(2);
  });
});
