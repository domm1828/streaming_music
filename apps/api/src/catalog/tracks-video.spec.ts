import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { TracksService } from './tracks.service';
import { TracksController } from './tracks.controller';
import { AudioService } from './audio.service';
import { VideoService } from './video.service';
import { StorageService } from '../storage/storage.service';
import { SettingsService } from '../settings/settings.service';
import { LyricsService } from './lyrics.service';
import { Track, TrackSchema } from './schemas/track.schema';
import { Lyric, LyricSchema } from './schemas/lyric.schema';
import { Artist, ArtistSchema } from './schemas/artist.schema';
import { Album, AlbumSchema } from './schemas/album.schema';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';

const admin = { id: new Types.ObjectId().toString(), permissions: ['*'] } as unknown as AuthenticatedUser;

const fakeFile = (over: Partial<Express.Multer.File> = {}): Express.Multer.File =>
  ({
    originalname: 'clip.mp4',
    mimetype: 'video/mp4',
    size: 10 * 1024 * 1024,
    buffer: Buffer.from('fake-video-bytes'),
    ...over,
  }) as Express.Multer.File;

describe('TracksService — pistas de video (e2e, in-memory)', () => {
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let service: TracksService;
  let trackModel: Model<Track>;
  const deleted: string[] = [];

  // Storage stub: devuelve rutas /uploads/* (para que resolvePlayback las trate como locales).
  const storage = {
    saveBuffer: vi.fn(async (_buf: Buffer, subdir: string, filename: string) => ({
      publicPath: `/uploads/${subdir}/${filename}`,
      absolutePath: `/abs/${subdir}/${filename}`,
    })),
    publicUrl: vi.fn((p: string) => p),
    signedUrl: vi.fn(async (p: string) => `signed:${p}`),
    delete: vi.fn(async (p: string) => {
      deleted.push(p);
    }),
  };
  const video = { extract: vi.fn(async () => ({ duration: 123, poster: Buffer.from('jpeg') })) };

  const insertTrack = (over: Record<string, unknown> = {}) => {
    const _id = new Types.ObjectId();
    return trackModel.collection
      .insertOne({ _id, name: 'Pista', srcType: 'audio', artists: [], genres: [], tags: [], plays: 0, duration: 0, ...over })
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
          { name: Artist.name, schema: ArtistSchema },
          { name: Album.name, schema: AlbumSchema },
        ]),
      ],
      providers: [
        TracksService,
        { provide: StorageService, useValue: storage },
        { provide: AudioService, useValue: {} },
        { provide: VideoService, useValue: video },
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

  it('sube un video: setea srcType, src, duración y genera portada si no había', async () => {
    const id = await insertTrack();
    const track = await service.uploadVideo(id.toString(), fakeFile(), admin);

    expect(track.srcType).toBe('video');
    expect(track.src).toBe(`/uploads/video/${id}.mp4`);
    expect(track.duration).toBe(123);
    expect(track.image).toBe(`/uploads/video-posters/${id}.jpg`);
    // Dos saveBuffer: el video y la portada.
    expect(storage.saveBuffer).toHaveBeenCalledWith(expect.any(Buffer), 'video', `${id}.mp4`);
    expect(storage.saveBuffer).toHaveBeenCalledWith(expect.any(Buffer), 'video-posters', `${id}.jpg`);
  });

  it('no pisa una portada ya elegida a mano', async () => {
    const id = await insertTrack({ image: 'https://cdn/portada.jpg' });
    const track = await service.uploadVideo(id.toString(), fakeFile(), admin);

    expect(track.image).toBe('https://cdn/portada.jpg');
  });

  it('resolvePlayback devuelve type video y URL firmada para video local', async () => {
    const id = await insertTrack({ srcType: 'video', src: '/uploads/video/x.mp4', duration: 50 });
    const pb = await service.resolvePlayback(id.toString());

    expect(pb.type).toBe('video');
    expect(pb.src).toBe('/uploads/video/x.mp4');
    expect(pb.signedSrc).toBe('signed:/uploads/video/x.mp4');
    expect(pb.duration).toBe(50);
  });

  it('list filtra por tipo', async () => {
    await insertTrack({ name: 'Solo audio', srcType: 'audio' });
    await insertTrack({ name: 'Un video', srcType: 'video', src: '/uploads/video/v.mp4' });

    const res = await service.list(1, 50, undefined, 'video');
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data.every((t) => t.srcType === 'video')).toBe(true);
  });

  it('borrar una pista de video elimina su archivo', async () => {
    const id = await insertTrack({ srcType: 'video', src: '/uploads/video/del.mp4' });
    await service.remove(id.toString(), admin);

    expect(deleted).toContain('/uploads/video/del.mp4');
    expect(await trackModel.findById(id).lean().exec()).toBeNull();
  });
});

describe('TracksController.uploadVideo — validaciones', () => {
  const settings = { getNumber: vi.fn(async (_k: string, def: number) => def) } as unknown as SettingsService;
  const svc = { uploadVideo: vi.fn(async () => ({})) } as unknown as TracksService;
  const controller = new TracksController(svc, {} as LyricsService, settings);

  it('rechaza si falta el archivo', async () => {
    await expect(controller.uploadVideo('id', undefined, admin)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza si el archivo no es de video', async () => {
    const file = fakeFile({ mimetype: 'audio/mpeg' });
    await expect(controller.uploadVideo('id', file, admin)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza si el archivo supera el límite', async () => {
    const file = fakeFile({ size: 201 * 1024 * 1024 });
    await expect(controller.uploadVideo('id', file, admin)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('acepta un video válido y delega en el servicio', async () => {
    const file = fakeFile();
    await controller.uploadVideo('id', file, admin);
    expect(svc.uploadVideo).toHaveBeenCalledWith('id', file, admin);
  });
});
