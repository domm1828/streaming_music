import { describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reporta estado ok y el estado de la base de datos', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: getConnectionToken(), useValue: { readyState: 1 } }],
    }).compile();

    const controller = moduleRef.get(HealthController);
    const result = controller.check();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('stream-music-api');
    expect(result.database).toBe('connected');
  });
});
