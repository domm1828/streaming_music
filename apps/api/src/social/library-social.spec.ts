import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule, getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection, Model, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import configuration from '../config/configuration';
import { CatalogModule } from '../catalog/catalog.module';
import { PlaysService } from '../catalog/plays.service';
import { TracksService } from '../catalog/tracks.service';
import { Track } from '../catalog/schemas/track.schema';
import { StorageModule } from '../storage/storage.module';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import { PlaylistsModule } from '../playlists/playlists.module';
import { PlaylistsService } from '../playlists/playlists.service';
import { SocialModule } from './social.module';
import { LikesService } from './likes.service';
import { FollowsService } from './follows.service';
import { Like } from './schemas/like.schema';

describe('Library & Social (e2e, in-memory Mongo)', () => {
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let connection: Connection;
  let users: UsersService;
  let tracks: TracksService;
  let playlists: PlaylistsService;
  let likes: LikesService;
  let follows: FollowsService;
  let plays: PlaysService;
  let trackModel: Model<Track>;
  let likeModel: Model<Like>;

  // Actores y contenido reutilizados en los tests.
  let owner: string;
  let collaborator: string;
  let stranger: string;
  let artistId: string;
  const trackIds: string[] = [];

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
        MongooseModule.forRoot(mongod.getUri()),
        StorageModule,
        UsersModule,
        CatalogModule,
        PlaylistsModule,
        SocialModule,
      ],
    }).compile();
    await moduleRef.init();

    connection = moduleRef.get<Connection>(getConnectionToken());
    await connection.syncIndexes();

    users = moduleRef.get(UsersService);
    tracks = moduleRef.get(TracksService);
    playlists = moduleRef.get(PlaylistsService);
    likes = moduleRef.get(LikesService);
    follows = moduleRef.get(FollowsService);
    plays = moduleRef.get(PlaysService);
    trackModel = moduleRef.get<Model<Track>>(getModelToken(Track.name));
    likeModel = moduleRef.get<Model<Like>>(getModelToken(Like.name));

    const u1 = await users.create({ name: 'Owner', username: 'owner', email: 'owner@test.io' });
    const u2 = await users.create({ name: 'Collab', username: 'collab', email: 'collab@test.io' });
    const u3 = await users.create({ name: 'Stranger', username: 'stranger', email: 'stranger@test.io' });
    owner = String(u1._id);
    collaborator = String(u2._id);
    stranger = String(u3._id);

    for (const name of ['T1', 'T2', 'T3']) {
      const t = await tracks.create({ name }, owner);
      trackIds.push(String(t._id));
    }
    // Una pista con duración para probar minutos de escucha.
    await trackModel.updateOne({ _id: trackIds[0] }, { duration: 180 }).exec();

    // Un artista para los follows.
    const artist = await connection
      .collection('artists')
      .insertOne({ name: 'Artist A', slug: 'artist-a', followers: 0 });
    artistId = String(artist.insertedId);
  });

  afterAll(async () => {
    await moduleRef?.close();
    await mongod?.stop();
  });

  describe('Playlists', () => {
    let playlistId: string;

    it('crea una playlist y agrega pistas ordenadas', async () => {
      const pl = await playlists.create(owner, { name: 'Mi playlist' });
      playlistId = String(pl._id);
      const updated = await playlists.addTracks(playlistId, trackIds, owner);
      expect(updated.tracks).toHaveLength(3);
      expect(updated.tracks.map((t) => t.position)).toEqual([0, 1, 2]);
      expect(updated.tracks.map((t) => String(t.track))).toEqual(trackIds);
    });

    it('reordena las pistas y persiste el nuevo orden', async () => {
      const order = [trackIds[2], trackIds[0], trackIds[1]];
      await playlists.reorder(playlistId, order, owner);
      const detail = await playlists.findDetail(playlistId, owner);
      expect(detail.tracks.map((t: { track: { _id: unknown } }) => String(t.track._id))).toEqual(order);
      expect(detail.tracks.map((t: { position: number }) => t.position)).toEqual([0, 1, 2]);
      // El dueño debe poder editar (regresión: populate mutaba owner y rompía isOwner).
      expect(detail.isOwner).toBe(true);
      expect(detail.canEdit).toBe(true);
    });

    it('quita una pista y recompone las posiciones', async () => {
      const updated = await playlists.removeTrack(playlistId, trackIds[0], owner);
      expect(updated.tracks).toHaveLength(2);
      expect(updated.tracks.map((t) => t.position)).toEqual([0, 1]);
      expect(updated.tracks.some((t) => String(t.track) === trackIds[0])).toBe(false);
    });

    it('impide ver una playlist privada a terceros', async () => {
      await playlists.update(playlistId, { public: false }, owner);
      await expect(playlists.findDetail(playlistId, stranger)).rejects.toBeInstanceOf(ForbiddenException);
      // El dueño sí puede verla.
      await expect(playlists.findDetail(playlistId, owner)).resolves.toBeDefined();
    });

    it('permite editar a los colaboradores en playlists colaborativas', async () => {
      await playlists.update(playlistId, { collaborative: true }, owner);
      await playlists.setEditors(playlistId, [collaborator], owner);
      // El colaborador puede agregar pistas.
      const updated = await playlists.addTracks(playlistId, [trackIds[0]], collaborator);
      expect(updated.tracks.some((t) => String(t.track) === trackIds[0])).toBe(true);
      // Un tercero no.
      await expect(playlists.addTracks(playlistId, [trackIds[1]], stranger)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('solo el dueño puede borrar la playlist', async () => {
      await expect(playlists.remove(playlistId, stranger)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(playlists.remove(playlistId, owner)).resolves.toBeUndefined();
    });
  });

  describe('Likes', () => {
    it('da like de forma idempotente y lo lista', async () => {
      await likes.like(owner, 'track', trackIds[1]);
      await likes.like(owner, 'track', trackIds[1]); // repetido: no duplica
      expect(await likes.countFor('track', trackIds[1])).toBe(1);
      const list = await likes.list(owner, 'track', 1, 20);
      expect(list.data.some((x) => String((x.entity as { _id: unknown })._id) === trackIds[1])).toBe(true);
    });

    it('tiene índice único por usuario+entidad', async () => {
      const doc = {
        user: new Types.ObjectId(owner),
        likeableType: 'album',
        likeable: new Types.ObjectId(),
        createdAt: new Date(),
      };
      await likeModel.collection.insertOne(doc);
      await expect(likeModel.collection.insertOne(doc)).rejects.toMatchObject({ code: 11000 });
    });

    it('quita el like', async () => {
      await likes.unlike(owner, 'track', trackIds[1]);
      expect(await likes.countFor('track', trackIds[1])).toBe(0);
    });
  });

  describe('Follows', () => {
    it('sigue a un artista sin duplicar y mantiene el contador', async () => {
      await follows.follow(owner, 'artist', artistId);
      await follows.follow(owner, 'artist', artistId); // repetido
      const artist = await connection.collection('artists').findOne({ _id: new Types.ObjectId(artistId) });
      expect(artist?.followers).toBe(1);
      expect(await follows.isFollowing(owner, 'artist', artistId)).toBe(true);
    });

    it('sigue a un usuario y actualiza followers/following', async () => {
      await follows.follow(owner, 'user', collaborator);
      const target = await connection.collection('users').findOne({ _id: new Types.ObjectId(collaborator) });
      const self = await connection.collection('users').findOne({ _id: new Types.ObjectId(owner) });
      expect(target?.followersCount).toBe(1);
      expect(self?.followingCount).toBe(1);
    });

    it('no permite seguirse a uno mismo', async () => {
      await expect(follows.follow(owner, 'user', owner)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deja de seguir y revierte el contador', async () => {
      await follows.unfollow(owner, 'artist', artistId);
      const artist = await connection.collection('artists').findOne({ _id: new Types.ObjectId(artistId) });
      expect(artist?.followers).toBe(0);
    });
  });

  describe('Historial y minutos', () => {
    it('registra reproducciones en el historial y acumula minutos', async () => {
      await plays.log(trackIds[0], owner, {});
      await plays.log(trackIds[0], owner, {});
      const history = await plays.history(owner, 1, 20);
      expect(history.data.length).toBeGreaterThanOrEqual(2);
      const status = await plays.listeningStatus(owner);
      // 2 reproducciones * 180s = 360s = 6 min.
      expect(status.usedMinutes).toBe(6);
    });
  });
});
