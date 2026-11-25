import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import configuration from '../config/configuration';
import { StorageModule } from '../storage/storage.module';
import { FilesAdminService } from '../storage/files-admin.service';
import { LogsModule } from './logs.module';
import { LogsService } from './logs.service';

describe('Logs y file manager (e2e, in-memory)', () => {
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let logs: LogsService;
  let files: FilesAdminService;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
        MongooseModule.forRoot(mongod.getUri()),
        StorageModule,
        LogsModule,
      ],
    }).compile();
    logs = moduleRef.get(LogsService);
    files = moduleRef.get(FilesAdminService);
  });

  afterAll(async () => {
    await moduleRef?.close();
    await mongod?.stop();
  });

  it('registra y lista logs por nivel', async () => {
    await logs.record('error', 'GET /x -> 500: boom', { context: 'http', statusCode: 500 });
    await logs.record('email', 'Enviado a a@x.com', { ok: true });
    await logs.record('error', 'otro error');

    const errors = await logs.list('error', 1, 20);
    expect(errors.pagination.total).toBe(2);
    expect(errors.data[0].level).toBe('error');

    const emails = await logs.list('email', 1, 20);
    expect(emails.pagination.total).toBe(1);

    const all = await logs.list(undefined, 1, 20);
    expect(all.pagination.total).toBe(3);
  });

  it('registra, lista y borra entradas de archivo', async () => {
    const e = await files.record({ url: 'http://x/u/a.png', path: '/uploads/images/a.png', filename: 'a.png', mime: 'image/png', size: 10 });
    const list = await files.list(1, 20);
    expect(list.pagination.total).toBe(1);

    await files.remove(String(e._id));
    expect((await files.list(1, 20)).pagination.total).toBe(0);
  });
});
