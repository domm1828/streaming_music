import { BadRequestException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import configuration from '../config/configuration';
import { ArtistsService } from '../catalog/artists.service';
import { AlbumsService } from '../catalog/albums.service';
import { TracksService } from '../catalog/tracks.service';
import { CatalogModule } from '../catalog/catalog.module';
import { PlaylistsModule } from '../playlists/playlists.module';
import { PlaylistsService } from '../playlists/playlists.service';
import { StorageModule } from '../storage/storage.module';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import { ChannelsModule } from '../channels/channels.module';
import { ChannelsService } from '../channels/channels.service';
import { DiscoveryModule } from '../discovery/discovery.module';
import { RadioService } from '../discovery/radio.service';
import { SearchModule } from './search.module';
import { SearchService } from './search.service';

describe('Search & Discovery (e2e, in-memory Mongo)', () => {
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let connection: Connection;
  let search: SearchService;
  let channels: ChannelsService;
  let radio: RadioService;

  let artistId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
        EventEmitterModule.forRoot(),
        ScheduleModule.forRoot(),
        MongooseModule.forRoot(mongod.getUri()),
        StorageModule,
        UsersModule,
        CatalogModule,
        PlaylistsModule,
        SearchModule,
        ChannelsModule,
        DiscoveryModule,
      ],
    }).compile();
    await moduleRef.init();

    connection = moduleRef.get<Connection>(getConnectionToken());
    await connection.syncIndexes();

    search = moduleRef.get(SearchService);
    channels = moduleRef.get(ChannelsService);
    radio = moduleRef.get(RadioService);

    const users = moduleRef.get(UsersService);
    const artists = moduleRef.get(ArtistsService);
    const albums = moduleRef.get(AlbumsService);
    const tracks = moduleRef.get(TracksService);
    const playlists = moduleRef.get(PlaylistsService);

    const user = await users.create({ name: 'Owner', username: 'owner', email: 'o@test.io' });
    const artist = await artists.create({ name: 'Aurora Skies' });
    artistId = String(artist._id);
    const album = await albums.create({ name: 'Northern Lights', artists: [artistId] });
    await tracks.create({ name: 'Polar Dawn', album: String(album._id), artists: [artistId] }, String(user._id));
    await tracks.create({ name: 'Midnight Sun', artists: [artistId] }, String(user._id));
    const pl = await playlists.create(String(user._id), { name: 'Aurora Mix' });
    void pl;
  });

  afterAll(async () => {
    await moduleRef?.close();
    await mongod?.stop();
  });

  describe('Búsqueda (driver Mongo)', () => {
    it('usa el driver Mongo cuando Meilisearch no está configurado', () => {
      expect(search.usingMeili).toBe(false);
    });

    it('busca por tipo con paginación', async () => {
      const r = await search.searchType('track', 'polar', 1, 20);
      expect(r.data).toHaveLength(1);
      expect((r.data[0] as { name: string }).name).toBe('Polar Dawn');
      expect(r.pagination.total).toBe(1);
    });

    it('devuelve resultados agrupados por tipo', async () => {
      const r = await search.overview('aurora', ['artist', 'album', 'track', 'playlist']);
      expect((r.results.artist ?? []).length).toBe(1);
      expect((r.results.playlist ?? []).length).toBe(1);
    });

    it('sugiere nombres con baja latencia', async () => {
      const r = await search.suggest('midnight', 5);
      expect(r.suggestions.some((s) => s.name === 'Midnight Sun')).toBe(true);
    });

    it('con query vacío no devuelve nada', async () => {
      const r = await search.searchType('artist', '   ', 1, 20);
      expect(r.data).toHaveLength(0);
    });
  });

  describe('Channels', () => {
    it('siembra channels por defecto y resuelve su contenido', async () => {
      const resolved = await channels.listResolved('home');
      expect(resolved.length).toBeGreaterThanOrEqual(4);
      const trending = resolved.find((c) => c.slug === 'trending');
      expect(trending?.itemType).toBe('track');
      expect(trending?.items.length).toBeGreaterThanOrEqual(1);
    });

    it('resuelve un channel manual con sus refs', async () => {
      const ch = await channels.create({
        name: 'Elegidos',
        config: { sourceType: 'manual', layout: 'list' },
        content: [{ refType: 'artist', refId: artistId }],
      });
      const resolved = await channels.getBySlugResolved(ch.slug);
      expect(resolved.itemType).toBe('mixed');
      expect(resolved.items).toHaveLength(1);
    });

    it('el refresco programado no rompe ante fallos y cuenta los ok', async () => {
      const res = await channels.refreshAll();
      expect(res.refreshed).toBeGreaterThanOrEqual(4);
      expect(res.failed).toBe(0);
    });
  });

  describe('Radio', () => {
    it('genera pistas relacionadas a un artista semilla', async () => {
      const r = await radio.radio('artist', artistId, 10);
      expect(r.count).toBeGreaterThanOrEqual(1);
      expect(r.tracks.every((t) => t && (t as { _id: unknown })._id)).toBe(true);
    });

    it('rechaza una semilla inválida', async () => {
      await expect(radio.radio('track', 'no-es-id', 10)).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
