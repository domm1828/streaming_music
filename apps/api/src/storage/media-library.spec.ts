import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import configuration from '../config/configuration';
import { StorageModule } from './storage.module';
import { FilesAdminService, kindFromMime } from './files-admin.service';

describe('Biblioteca de medios (e2e, in-memory)', () => {
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let files: FilesAdminService;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
        MongooseModule.forRoot(mongod.getUri()),
        StorageModule,
      ],
    }).compile();
    files = moduleRef.get(FilesAdminService);
  });

  afterAll(async () => {
    await moduleRef?.close();
    await mongod?.stop();
  });

  it('deriva el kind desde el mime', () => {
    expect(kindFromMime('image/png')).toBe('image');
    expect(kindFromMime('audio/mpeg')).toBe('audio');
    expect(kindFromMime('video/mp4')).toBe('video');
    expect(kindFromMime('application/pdf')).toBe('other');
    expect(kindFromMime(null)).toBe('other');
  });

  it('deduplica por hash de contenido', async () => {
    const hash = 'a'.repeat(64);
    const first = await files.record({ url: 'http://x/a.png', path: '/uploads/images/a.png', filename: 'a.png', mime: 'image/png', size: 10, sha256: hash });
    const found = await files.findByHash(hash);
    expect(found).not.toBeNull();
    expect(String(found!._id)).toBe(String(first._id));
    expect(await files.findByHash('b'.repeat(64))).toBeNull();
  });

  it('filtra por kind, por nombre y por usuario', async () => {
    const userA = new Types.ObjectId().toString();
    const userB = new Types.ObjectId().toString();
    await files.record({ url: 'u1', path: '/uploads/images/portada-azul.png', filename: 'portada-azul.png', mime: 'image/png', size: 1, userId: userA });
    await files.record({ url: 'u2', path: '/uploads/audio/cancion.mp3', filename: 'cancion.mp3', mime: 'audio/mpeg', size: 1, userId: userA });
    await files.record({ url: 'u3', path: '/uploads/images/portada-roja.png', filename: 'portada-roja.png', mime: 'image/png', size: 1, userId: userB });

    const images = await files.list({ page: 1, perPage: 20, kind: 'image' });
    expect(images.data.every((f) => f.kind === 'image')).toBe(true);

    const byName = await files.list({ page: 1, perPage: 20, q: 'portada' });
    expect(byName.pagination.total).toBe(2);

    const mineA = await files.list({ page: 1, perPage: 20, userId: userA });
    expect(mineA.pagination.total).toBe(2);
    expect(mineA.data.every((f) => String(f.user) === userA)).toBe(true);
  });
});
