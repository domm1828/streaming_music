import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import configuration from '../config/configuration';
import { StorageModule } from '../storage/storage.module';
import { Track } from '../catalog/schemas/track.schema';
import { MetadataModule } from './metadata.module';
import { YoutubeIngestService } from './youtube-ingest.service';
import { YOUTUBE_DOWNLOADER, YoutubeDownloader, parseYoutubeId } from './youtube-downloader';

class FakeDownloader implements YoutubeDownloader {
  info(id: string) {
    return Promise.resolve({ id, title: 'Fake Song', author: 'Fake Artist', durationSeconds: 180 });
  }
  downloadAudio() {
    return Promise.resolve({ buffer: Buffer.from('fake-audio-bytes'), ext: 'm4a' as const });
  }
}

describe('Importar audio de YouTube', () => {
  describe('parseYoutubeId', () => {
    it('acepta URLs y un id suelto', () => {
      expect(parseYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(parseYoutubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(parseYoutubeId('https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=x')).toBe('dQw4w9WgXcQ');
      expect(parseYoutubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('rechaza hosts que no sean de YouTube (anti-SSRF) e ids inválidos', () => {
      expect(() => parseYoutubeId('http://169.254.169.254/latest/meta-data')).toThrow();
      expect(() => parseYoutubeId('https://evil.com/watch?v=dQw4w9WgXcQ')).toThrow();
      expect(() => parseYoutubeId('https://www.youtube.com/watch?v=corto')).toThrow();
      expect(() => parseYoutubeId('file:///etc/passwd')).toThrow();
    });
  });

  describe('ingesta (downloader mockeado)', () => {
    let mongod: MongoMemoryServer;
    let moduleRef: TestingModule;
    let ingest: YoutubeIngestService;
    let trackModel: Model<Track>;

    beforeAll(async () => {
      mongod = await MongoMemoryServer.create();
      process.env.MONGODB_URI = mongod.getUri();
      moduleRef = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
          EventEmitterModule.forRoot(),
          MongooseModule.forRoot(mongod.getUri()),
          StorageModule,
          MetadataModule,
        ],
      })
        .overrideProvider(YOUTUBE_DOWNLOADER)
        .useValue(new FakeDownloader())
        .compile();
      await moduleRef.init();
      ingest = moduleRef.get(YoutubeIngestService);
      trackModel = moduleRef.get<Model<Track>>(getModelToken(Track.name));
    });

    afterAll(async () => {
      await moduleRef?.close();
      await mongod?.stop();
    });

    it('descarga el audio y crea una pista en el catálogo', async () => {
      const summary = await ingest.ingest('https://youtu.be/dQw4w9WgXcQ', null);
      expect(summary.tracks).toBe(1);

      const track = await trackModel.findOne({ name: 'Fake Song' }).lean().exec();
      expect(track).toBeTruthy();
      expect(track!.srcType).toBe('audio');
      expect(track!.src).toMatch(/^\/uploads\/audio\/.+\.m4a$/);
      expect(track!.duration).toBe(180); // cae a la duración del info cuando el buffer no es audio real
    });
  });
});
