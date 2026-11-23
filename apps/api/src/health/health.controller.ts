import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

const STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  check() {
    const dbState = STATES[this.connection.readyState] ?? 'unknown';
    return {
      status: 'ok',
      service: 'stream-music-api',
      uptime: Math.round(process.uptime()),
      database: dbState,
      timestamp: new Date().toISOString(),
    };
  }
}
