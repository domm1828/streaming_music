import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as speakeasy from 'speakeasy';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import configuration from '../config/configuration';
import { MailModule } from '../mail/mail.module';
import { StorageModule } from '../storage/storage.module';
import { StorageService } from '../storage/storage.service';
import { GeoModule } from '../geo/geo.module';
import { GeoService } from '../geo/geo.service';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import { SettingsModule } from '../settings/settings.module';
import { CatalogModule } from '../catalog/catalog.module';
import { ArtistsService } from '../catalog/artists.service';
import { TracksService } from '../catalog/tracks.service';
import { AiModule } from '../ai/ai.module';
import { SemanticService } from '../ai/semantic.service';
import { EMBEDDINGS_PROVIDER, type EmbeddingsProvider } from '../ai/embeddings.provider';
import { AuthModule } from './auth.module';
import { TwoFactorService } from './two-factor.service';
import { SocialAuthService } from './social-auth.service';

/** Embedder determinista por frecuencia de letras (sin red). */
class FakeEmbedder implements EmbeddingsProvider {
  readonly name = 'fake';
  isConfigured() {
    return true;
  }
  embed(texts: string[]): Promise<number[][]> {
    return Promise.resolve(
      texts.map((t) => {
        const v = new Array(26).fill(0);
        for (const ch of t.toLowerCase()) {
          const i = ch.charCodeAt(0) - 97;
          if (i >= 0 && i < 26) v[i] += 1;
        }
        return v;
      }),
    );
  }
}

describe('Advanced & hardening (e2e, in-memory Mongo)', () => {
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let connection: Connection;
  let twoFactor: TwoFactorService;
  let social: SocialAuthService;
  let semantic: SemanticService;
  let storage: StorageService;
  let geo: GeoService;
  let users: UsersService;

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
        AuthModule,
        CatalogModule,
        AiModule,
      ],
    })
      .overrideProvider(EMBEDDINGS_PROVIDER)
      .useValue(new FakeEmbedder())
      .compile();
    await moduleRef.init();

    connection = moduleRef.get<Connection>(getConnectionToken());
    await connection.syncIndexes();
    twoFactor = moduleRef.get(TwoFactorService);
    social = moduleRef.get(SocialAuthService);
    semantic = moduleRef.get(SemanticService);
    storage = moduleRef.get(StorageService);
    geo = moduleRef.get(GeoService);
    users = moduleRef.get(UsersService);
  });

  afterAll(async () => {
    await moduleRef?.close();
    await mongod?.stop();
  });

  describe('2FA', () => {
    it('setup → enable → verifica TOTP y consume código de recuperación', async () => {
      const u = await users.create({ name: 'TF', username: 'tf', email: 'tf@test.io' });
      const id = String(u._id);
      const setup = await twoFactor.setup(id, 'tf@test.io');
      expect(setup.secret).toHaveLength(32);
      expect(setup.qrDataUrl.startsWith('data:image/png')).toBe(true);

      const token = speakeasy.totp({ secret: setup.secret, encoding: 'base32' });
      const { recoveryCodes } = await twoFactor.enable(id, token);
      expect(recoveryCodes).toHaveLength(10);

      const fresh = await users.findById(id);
      expect(twoFactor.isEnabled(fresh!)).toBe(true);

      expect(await twoFactor.verify(id, speakeasy.totp({ secret: setup.secret, encoding: 'base32' }))).toBe(true);
      expect(await twoFactor.verify(id, '000000')).toBe(false);

      // Código de recuperación: válido una vez.
      expect(await twoFactor.verify(id, recoveryCodes[0])).toBe(true);
      expect(await twoFactor.verify(id, recoveryCodes[0])).toBe(false);
    });
  });

  describe('Login social', () => {
    const meta = { userAgent: null, ip: null };
    const profile = { providerId: 'g1', email: 'social@test.io', emailVerified: true, name: 'Social' };

    it('crea la cuenta la primera vez y la reusa después, emitiendo JWT', async () => {
      const first = await social.loginWithProfile('google', profile, meta);
      expect(first.accessToken).toBeTruthy();
      expect(first.user.email).toBe('social@test.io');

      const second = await social.loginWithProfile('google', profile, meta);
      expect(second.user.id).toBe(first.user.id); // misma cuenta

      // Mismo email VERIFICADO, otro proveedorId → se enlaza a la cuenta existente.
      const linked = await social.loginWithProfile('google', { ...profile, providerId: 'g2' }, meta);
      expect(linked.user.id).toBe(first.user.id);
    });

    it('rechaza enlazar/crear cuando el email no está verificado (anti account-takeover)', async () => {
      await expect(
        social.loginWithProfile('google', { providerId: 'evil', email: 'social@test.io', emailVerified: false, name: 'Evil' }, meta),
      ).rejects.toThrow();
    });
  });

  describe('Búsqueda semántica', () => {
    it('genera embeddings y rankea por similitud', async () => {
      const artists = moduleRef.get(ArtistsService);
      const tracks = moduleRef.get(TracksService);
      const artist = await artists.create({ name: 'Zephyr' });
      await tracks.create({ name: 'Aurora Boreal', artists: [String(artist._id)] }, undefined);
      await tracks.create({ name: 'Xilofono Zumbido', artists: [String(artist._id)] }, undefined);

      const res = await semantic.generateMissing();
      expect(res.processed).toBeGreaterThanOrEqual(2);

      const search = await semantic.search('aurora boreal');
      expect(search.semantic).toBe(true);
      expect((search.data[0] as unknown as { name: string }).name).toBe('Aurora Boreal');
    });
  });

  describe('URLs firmadas (storage local)', () => {
    it('firma y valida; rechaza firmas alteradas o expiradas', async () => {
      const url = await storage.signedUrl('/uploads/audio/x.mp3', 60);
      const params = new URLSearchParams(url.split('?')[1]);
      const path = params.get('path')!;
      const exp = Number(params.get('exp'));
      const sig = params.get('sig')!;
      expect(storage.verifyLocalSignature(path, exp, sig)).toBe(true);
      expect(storage.verifyLocalSignature(path, exp, sig.slice(0, -2) + 'ff')).toBe(false);
      expect(storage.verifyLocalSignature(path, Date.now() - 1000, sig)).toBe(false);
    });
  });

  describe('GeoIP', () => {
    it('resuelve país desde la IP y maneja entradas inválidas', () => {
      expect(geo.country('8.8.8.8')).toBe('US');
      expect(geo.country('::ffff:8.8.8.8')).toBe('US');
      expect(geo.country(null)).toBeNull();
      expect(geo.country('no-es-ip')).toBeNull();
    });
  });
});
