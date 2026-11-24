import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { buildPaginationMeta } from '@stream-music/shared';
import { LogEntry, LogEntryDocument, LogLevel } from './log-entry.schema';

@Injectable()
export class LogsService {
  private readonly logger = new Logger(LogsService.name);

  constructor(@InjectModel(LogEntry.name) private readonly model: Model<LogEntryDocument>) {}

  /** Registra una entrada de log sin romper el flujo si falla la escritura. */
  async record(level: LogLevel, message: string, meta?: { context?: string; [k: string]: unknown }): Promise<void> {
    try {
      const { context, ...rest } = meta ?? {};
      await this.model.create({
        level,
        message: message.slice(0, 2000),
        context: context ?? null,
        meta: Object.keys(rest).length ? rest : null,
      });
    } catch (e) {
      this.logger.warn(`No se pudo registrar el log: ${(e as Error).message}`);
    }
  }

  async list(level: LogLevel | undefined, page: number, perPage: number) {
    const filter = level ? { level } : {};
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).lean().exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data, pagination: buildPaginationMeta(total, page, perPage) };
  }
}
