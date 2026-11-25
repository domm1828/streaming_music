import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TagsService } from './tags.service';
import { Tag, TagSchema } from './schemas/tag.schema';
import { Track, TrackSchema } from './schemas/track.schema';
import { Artist, ArtistSchema } from './schemas/artist.schema';
import { Album, AlbumSchema } from './schemas/album.schema';

describe('Tags (e2e, in-memory)', () => {
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let service: TagsService;
  let trackModel: Model<Track>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongod.getUri()),
        MongooseModule.forFeature([
          { name: Tag.name, schema: TagSchema },
          { name: Track.name, schema: TrackSchema },
          { name: Artist.name, schema: ArtistSchema },
          { name: Album.name, schema: AlbumSchema },
        ]),
      ],
      providers: [TagsService],
    }).compile();
    service = moduleRef.get(TagsService);
    trackModel = moduleRef.get(getModelToken(Track.name));
  });

  afterAll(async () => {
    await moduleRef?.close();
    await mongod?.stop();
  });

  it('crea un tag derivando el slug y rechaza duplicados', async () => {
    const tag = await service.create({ displayName: 'Para Entrenar' });
    expect(tag.name).toBe('para-entrenar');
    expect(tag.displayName).toBe('Para Entrenar');
    await expect(service.create({ displayName: 'Para Entrenar' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('devuelve el overview con las pistas del tag, ordenadas por reproducciones', async () => {
    const tag = await service.create({ displayName: 'Chill', color: '#4e8c56' });
    const artist = new Types.ObjectId();
    await trackModel.collection.insertMany([
      { _id: new Types.ObjectId(), name: 'Baja', tags: [tag._id], artists: [{ artist, primary: true }], plays: 5 },
      { _id: new Types.ObjectId(), name: 'Alta', tags: [tag._id], artists: [{ artist, primary: true }], plays: 99 },
      { _id: new Types.ObjectId(), name: 'OtroTag', tags: [new Types.ObjectId()], artists: [], plays: 999 },
    ]);
    const o = await service.overview(tag._id.toString());
    expect(o.tag.displayName).toBe('Chill');
    expect(o.tracks.map((t) => t.name)).toEqual(['Alta', 'Baja']);
  });

  it('al eliminar un tag quita su referencia de las pistas', async () => {
    const tag = await service.create({ displayName: 'Temporal' });
    const artist = new Types.ObjectId();
    const trackId = new Types.ObjectId();
    await trackModel.collection.insertOne({
      _id: trackId,
      name: 'Con Tag',
      tags: [tag._id],
      artists: [{ artist, primary: true }],
      plays: 1,
    });
    await service.remove(tag._id.toString());
    const after = await trackModel.findById(trackId).lean().exec();
    expect(after?.tags).toEqual([]);
    await expect(service.findByIdOrFail(tag._id.toString())).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lanza 404 ante un id inválido o inexistente', async () => {
    await expect(service.overview('no-es-objectid')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.overview(new Types.ObjectId().toString())).rejects.toBeInstanceOf(NotFoundException);
  });
});
