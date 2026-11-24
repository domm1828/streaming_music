import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule, getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import configuration from '../config/configuration';
import { CatalogModule } from '../catalog/catalog.module';
import { MailModule } from '../mail/mail.module';
import { StorageModule } from '../storage/storage.module';
import { GeoModule } from '../geo/geo.module';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import { User } from '../users/schemas/user.schema';
import { Artist } from '../catalog/schemas/artist.schema';
import { SettingsModule } from '../settings/settings.module';
import { SettingsService } from '../settings/settings.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { BackstageModule } from '../backstage/backstage.module';
import { BackstageService } from '../backstage/backstage.service';
import { CommunityModule } from './community.module';
import { CommentsService } from './comments.service';
import { ReportsService } from './reports.service';

/** Gateway de tiempo real mockeado: registra las emisiones sin abrir un socket. */
class FakeGateway {
  emits: Array<{ userId: string; event: string; payload: unknown }> = [];
  emitToUser(userId: string, event: string, payload: unknown) {
    this.emits.push({ userId, event, payload });
  }
}

describe('Admin & plataforma (e2e, in-memory Mongo)', () => {
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let connection: Connection;
  let settings: SettingsService;
  let notifications: NotificationsService;
  let comments: CommentsService;
  let reports: ReportsService;
  let backstage: BackstageService;
  let users: UsersService;
  let userModel: Model<User>;
  let artistModel: Model<Artist>;
  const fakeGateway = new FakeGateway();

  let userId: string;
  let adminId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
        EventEmitterModule.forRoot(),
        MongooseModule.forRoot(mongod.getUri()),
        MailModule,
        StorageModule,
        GeoModule,
        SettingsModule,
        UsersModule,
        CatalogModule,
        NotificationsModule,
        CommunityModule,
        BackstageModule,
      ],
    })
      .overrideProvider(NotificationsGateway)
      .useValue(fakeGateway)
      .compile();
    await moduleRef.init();

    connection = moduleRef.get<Connection>(getConnectionToken());
    await connection.syncIndexes();
    settings = moduleRef.get(SettingsService);
    notifications = moduleRef.get(NotificationsService);
    comments = moduleRef.get(CommentsService);
    reports = moduleRef.get(ReportsService);
    backstage = moduleRef.get(BackstageService);
    users = moduleRef.get(UsersService);
    userModel = moduleRef.get<Model<User>>(getModelToken(User.name));
    artistModel = moduleRef.get<Model<Artist>>(getModelToken(Artist.name));

    const u = await users.create({ name: 'User', username: 'user', email: 'u@test.io' });
    const a = await users.create({ name: 'Admin', username: 'admin', email: 'a@test.io' });
    userId = String(u._id);
    adminId = String(a._id);
  });

  afterAll(async () => {
    await moduleRef?.close();
    await mongod?.stop();
  });

  describe('Settings', () => {
    it('siembra, lee y cachea, distinguiendo públicos de privados', async () => {
      const appName = await settings.get('appName', 'x');
      expect(appName).toBe('Stream Music');
      const pub = await settings.getPublic();
      expect(pub.appName).toBe('Stream Music');

      await settings.set('secretKey', 'shh', { isPublic: false, group: 'secrets' });
      const pub2 = await settings.getPublic();
      expect(pub2.secretKey).toBeUndefined(); // privado: no aparece en el mapa público
      expect(await settings.get('secretKey', '')).toBe('shh');
    });

    it('aplica cambios en lote (sin redeploy)', async () => {
      await settings.setMany([{ key: 'appName', value: 'Renombrado' }]);
      expect(await settings.get('appName', '')).toBe('Renombrado');
    });
  });

  describe('Notificaciones', () => {
    it('persiste, entrega en tiempo real y cuenta no leídas', async () => {
      const before = fakeGateway.emits.length;
      await notifications.create({ userId, type: 'test', title: 'Hola', body: 'cuerpo' });
      const list = await notifications.list(userId, 1, 20);
      expect(list.data.length).toBeGreaterThanOrEqual(1);
      expect(fakeGateway.emits.length).toBe(before + 1);
      expect(fakeGateway.emits.at(-1)!.userId).toBe(userId);
      expect(await notifications.unreadCount(userId)).toBeGreaterThanOrEqual(1);

      const first = list.data[0];
      await notifications.markRead(String(first._id), userId);
      const after = await notifications.list(userId, 1, 20);
      expect(after.data.find((n) => String(n._id) === String(first._id))?.readAt).toBeTruthy();
    });

    it('broadcast: cuenta la audiencia y entrega a cada usuario activo', async () => {
      const all = await notifications.countAudience({ kind: 'all' });
      expect(all).toBeGreaterThanOrEqual(2); // user + admin

      const res = await notifications.broadcast({
        title: 'Aviso general',
        body: 'Para todos',
        audience: { kind: 'all' },
      });
      expect(res.sent).toBe(all);

      // cada usuario recibió su propia notificación de broadcast
      const mine = await notifications.list(userId, 1, 50);
      expect(mine.data.some((n) => n.type === 'admin.broadcast' && n.title === 'Aviso general')).toBe(true);
    });

    it('broadcast: audiencia por usuarios puntuales solo alcanza a los elegidos', async () => {
      const res = await notifications.broadcast({
        title: 'Solo a uno',
        audience: { kind: 'users', userIds: [userId] },
      });
      expect(res.sent).toBe(1);
      const adminList = await notifications.list(adminId, 1, 50);
      expect(adminList.data.some((n) => n.title === 'Solo a uno')).toBe(false);
    });
  });

  describe('Comentarios y votos', () => {
    it('crea comentarios anidados, vota y modera', async () => {
      const trackId = String((await artistModel.create({ name: 'T', slug: 't-' + Date.now() }))._id);
      const root = await comments.create(userId, 'artist', trackId, 'Comentario raíz');
      const reply = await comments.create(adminId, 'artist', trackId, 'Respuesta', String(root._id));
      expect(reply.path).toBe(String(root._id)); // threading por path

      const voted = await comments.vote(String(root._id), adminId, 1);
      expect(voted.votes).toBe(1);

      const list = await comments.listForContent('artist', trackId, 1, 20);
      expect(list.data.length).toBe(2);

      await comments.hide(String(reply._id));
      const after = await comments.listForContent('artist', trackId, 1, 20);
      expect(after.data.length).toBe(1); // el oculto no aparece
    });

    it('respeta el ajuste commentsEnabled', async () => {
      const artId = String((await artistModel.create({ name: 'T2', slug: 't2-' + Date.now() }))._id);
      await settings.set('commentsEnabled', false);
      await expect(comments.create(userId, 'artist', artId, 'bloqueado')).rejects.toThrow();
      await settings.set('commentsEnabled', true);
      const ok = await comments.create(userId, 'artist', artId, 'permitido');
      expect(ok._id).toBeTruthy();
    });
  });

  describe('Reportes y moderación', () => {
    it('resuelve un reporte de comentario ocultando el contenido y lo previsualiza', async () => {
      const artId = String((await artistModel.create({ name: 'TR', slug: 'tr-' + Date.now() }))._id);
      const comment = await comments.create(userId, 'artist', artId, 'comentario reportado');
      const report = await reports.create(adminId, 'comment', String(comment._id), 'spam');

      // El listado trae un preview legible del contenido reportado.
      const open = await reports.list('open', 1, 50);
      const row = open.data.find((r) => String(r._id) === String(report._id));
      expect(row?.preview?.exists).toBe(true);
      expect(row?.preview?.label).toContain('comentario reportado');
      expect(row?.preview?.hidden).toBe(false);

      // Resolver con action=hide oculta el comentario y marca resuelto.
      const resolved = await reports.resolve(String(report._id), adminId, 'resolved', 'spam confirmado', 'hide');
      expect(resolved.status).toBe('resolved');
      expect(resolved.resolution).toBe('spam confirmado');

      const visible = await comments.listForContent('artist', artId, 1, 20);
      expect(visible.data.some((c) => String(c._id) === String(comment._id))).toBe(false);

      // Y el preview ahora lo marca como oculto.
      const after = await reports.list('resolved', 1, 50);
      const afterRow = after.data.find((r) => String(r._id) === String(report._id));
      expect(afterRow?.preview?.hidden).toBe(true);
    });

    it('resuelve aunque el contenido reportado ya no exista', async () => {
      const report = await reports.create(adminId, 'comment', String(adminId), 'inexistente');
      const resolved = await reports.resolve(String(report._id), adminId, 'dismissed', undefined, 'hide');
      expect(resolved.status).toBe('dismissed');
    });
  });

  describe('Backstage', () => {
    it('aprueba una solicitud: crea el artista, lo vincula y notifica', async () => {
      const emitsBefore = fakeGateway.emits.length;
      const req = await backstage.submit(userId, { type: 'new', artistName: 'Banda Nueva' }, []);
      const approved = await backstage.approve(String(req._id), adminId, 'bienvenida');
      expect(approved.status).toBe('approved');
      expect(approved.artist).toBeTruthy();

      const artist = await artistModel.findById(approved.artist).lean().exec();
      expect(artist?.verified).toBe(true);

      const user = await userModel.findById(userId).lean().exec();
      expect(user?.artistIds.map(String)).toContain(String(approved.artist));

      // Generó una notificación en tiempo real.
      expect(fakeGateway.emits.length).toBeGreaterThan(emitsBefore);
    });

    it('rechaza una solicitud pendiente', async () => {
      const req = await backstage.submit(userId, { type: 'new', artistName: 'Otra' }, []);
      const rejected = await backstage.reject(String(req._id), adminId, 'faltan datos');
      expect(rejected.status).toBe('rejected');
    });
  });
});
