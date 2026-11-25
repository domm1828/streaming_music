import { ConfigModule } from '@nestjs/config';
import { MongooseModule, getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import configuration from '../config/configuration';
import { decryptSecret, encryptSecret, isEncrypted } from './secret-crypto';
import { Setting } from './schemas/setting.schema';
import { SettingsModule } from './settings.module';
import { SettingsService } from './settings.service';

describe('secret-crypto', () => {
  it('cifra y descifra ida y vuelta', () => {
    const enc = encryptSecret('hunter2', 'base-secret');
    expect(isEncrypted(enc)).toBe(true);
    expect(enc).not.toContain('hunter2');
    expect(decryptSecret(enc, 'base-secret')).toBe('hunter2');
  });

  it('isEncrypted es falso para texto plano y lo devuelve tal cual', () => {
    expect(isEncrypted('plain')).toBe(false);
    expect(decryptSecret('plain', 'base-secret')).toBe('plain');
  });
});

describe('SettingsService — secretos de email (e2e, in-memory Mongo)', () => {
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let connection: Connection;
  let settings: SettingsService;
  let model: Model<Setting>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
        MongooseModule.forRoot(mongod.getUri()),
        SettingsModule,
      ],
    }).compile();
    await moduleRef.init();
    settings = moduleRef.get(SettingsService);
    model = moduleRef.get<Model<Setting>>(getModelToken(Setting.name));
    connection = moduleRef.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    await connection?.close();
    await moduleRef?.close();
    await mongod?.stop();
  });

  it('siembra los settings de email como privados', async () => {
    const host = await model.findOne({ key: 'mail.host' }).lean();
    expect(host).toBeTruthy();
    expect(host!.group).toBe('email');
    expect(host!.isPublic).toBe(false);
  });

  it('cifra el secreto en reposo y lo descifra al consumirlo', async () => {
    await settings.set('mail.pass', 'hunter2');
    const doc = await model.findOne({ key: 'mail.pass' }).lean();
    expect(isEncrypted(doc!.value)).toBe(true);
    expect(await settings.get<string>('mail.pass', '')).toBe('hunter2');
  });

  it('redacta el secreto en getAll y reporta su presencia sin exponerlo', async () => {
    await settings.set('mail.pass', 's3cr3t');
    const all = await settings.getAll();
    const row = all.find((s) => s.key === 'mail.pass');
    expect(row!.value).toBe('');
    expect(await settings.hasSecret('mail.pass')).toBe(true);
  });

  it('nunca expone secretos en getPublic (bootstrap)', async () => {
    const pub = await settings.getPublic();
    expect(Object.keys(pub)).not.toContain('mail.pass');
    expect(Object.keys(pub)).not.toContain('mail.host');
  });
});
