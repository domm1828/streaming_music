import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OtpCode, OtpCodeSchema } from '../auth/schemas/otp-code.schema';
import { RefreshToken, RefreshTokenSchema } from '../auth/schemas/refresh-token.schema';
import { ExportJob, ExportJobSchema } from '../exports/schemas/export-job.schema';
import { StorageService } from '../storage/storage.service';
import { MaintenanceService } from './maintenance.service';

const DAY = 86_400_000;

describe('MaintenanceService · limpieza programada (e2e, in-memory)', () => {
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let service: MaintenanceService;
  let otp: Model<OtpCode>;
  let refresh: Model<RefreshToken>;
  let exports: Model<ExportJob>;
  const deleted: string[] = [];

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongod.getUri()),
        MongooseModule.forFeature([
          { name: OtpCode.name, schema: OtpCodeSchema },
          { name: RefreshToken.name, schema: RefreshTokenSchema },
          { name: ExportJob.name, schema: ExportJobSchema },
        ]),
      ],
      providers: [
        MaintenanceService,
        { provide: StorageService, useValue: { delete: async (p: string) => void deleted.push(p) } },
      ],
    }).compile();
    service = moduleRef.get(MaintenanceService);
    otp = moduleRef.get(getModelToken(OtpCode.name));
    refresh = moduleRef.get(getModelToken(RefreshToken.name));
    exports = moduleRef.get(getModelToken(ExportJob.name));

    const now = Date.now();
    const user = new Types.ObjectId();
    await otp.collection.insertMany([
      { user, codeHash: 'a', purpose: 'email-verify', expiresAt: new Date(now - DAY) }, // vencido
      { user, codeHash: 'b', purpose: 'email-verify', expiresAt: new Date(now + DAY) }, // vigente
    ]);
    await refresh.collection.insertMany([
      { user, tokenHash: 'x', expiresAt: new Date(now - DAY), revokedAt: null }, // vencido
      { user, tokenHash: 'y', expiresAt: new Date(now + DAY), revokedAt: new Date(now - 40 * DAY) }, // revocado viejo
      { user, tokenHash: 'z', expiresAt: new Date(now + DAY), revokedAt: null }, // vigente
    ]);
    await exports.collection.insertMany([
      { type: 'users', status: 'done', filePath: '/uploads/exports/old.csv', createdAt: new Date(now - 40 * DAY) },
      { type: 'users', status: 'done', filePath: '/uploads/exports/new.csv', createdAt: new Date(now) },
    ]);
  });

  afterAll(async () => {
    await moduleRef?.close();
    await mongod?.stop();
  });

  it('purga OTP vencidos, refresh tokens vencidos/revocados-viejos y exports antiguos', async () => {
    const res = await service.runCleanup();
    expect(res.otpCodes).toBe(1);
    expect(res.refreshTokens).toBe(2);
    expect(res.exportJobs).toBe(1);
    // Se intentó borrar el archivo del export antiguo (no el reciente).
    expect(deleted).toContain('/uploads/exports/old.csv');
    expect(deleted).not.toContain('/uploads/exports/new.csv');
    // Quedan los vigentes.
    expect(await otp.countDocuments().exec()).toBe(1);
    expect(await refresh.countDocuments().exec()).toBe(1);
    expect(await exports.countDocuments().exec()).toBe(1);
  });
});
