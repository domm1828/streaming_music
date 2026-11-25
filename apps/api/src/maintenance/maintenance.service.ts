import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OtpCode, OtpCodeDocument } from '../auth/schemas/otp-code.schema';
import { RefreshToken, RefreshTokenDocument } from '../auth/schemas/refresh-token.schema';
import { ExportJob, ExportJobDocument } from '../exports/schemas/export-job.schema';
import { StorageService } from '../storage/storage.service';

const DAY = 86_400_000;
/** Cuánto se conservan los registros ya inservibles antes de purgarlos. */
export const REVOKED_TOKEN_RETENTION_DAYS = 30;
export const EXPORT_JOB_RETENTION_DAYS = 30;

export interface CleanupResult {
  otpCodes: number;
  refreshTokens: number;
  exportJobs: number;
}

/** Tareas de mantenimiento programadas: purga de datos efímeros vencidos. */
@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    @InjectModel(OtpCode.name) private readonly otpModel: Model<OtpCodeDocument>,
    @InjectModel(RefreshToken.name) private readonly refreshModel: Model<RefreshTokenDocument>,
    @InjectModel(ExportJob.name) private readonly exportModel: Model<ExportJobDocument>,
    private readonly storage: StorageService,
  ) {}

  /** OTP vencidos (ya no sirven ni para verificación ni para reseteo). */
  async pruneOtpCodes(now = new Date()): Promise<number> {
    const res = await this.otpModel.deleteMany({ expiresAt: { $lt: now } }).exec();
    return res.deletedCount ?? 0;
  }

  /** Refresh tokens vencidos, o revocados hace más de la retención. */
  async pruneRefreshTokens(now = new Date()): Promise<number> {
    const revokedCutoff = new Date(now.getTime() - REVOKED_TOKEN_RETENTION_DAYS * DAY);
    const res = await this.refreshModel
      .deleteMany({
        $or: [{ expiresAt: { $lt: now } }, { revokedAt: { $ne: null, $lt: revokedCutoff } }],
      })
      .exec();
    return res.deletedCount ?? 0;
  }

  /** Trabajos de exportación antiguos: borra el archivo generado y la fila. */
  async pruneExportJobs(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - EXPORT_JOB_RETENTION_DAYS * DAY);
    const old = await this.exportModel.find({ createdAt: { $lt: cutoff } }).lean().exec();
    for (const job of old) {
      if (job.filePath) {
        try {
          await this.storage.delete(job.filePath);
        } catch (e) {
          this.logger.warn(`No se pudo borrar el archivo de export ${String(job._id)}: ${(e as Error).message}`);
        }
      }
    }
    const res = await this.exportModel.deleteMany({ createdAt: { $lt: cutoff } }).exec();
    return res.deletedCount ?? 0;
  }

  /** Corre todas las purgas y devuelve los conteos. */
  async runCleanup(now = new Date()): Promise<CleanupResult> {
    const [otpCodes, refreshTokens, exportJobs] = await Promise.all([
      this.pruneOtpCodes(now),
      this.pruneRefreshTokens(now),
      this.pruneExportJobs(now),
    ]);
    return { otpCodes, refreshTokens, exportJobs };
  }

  /** Job diario (3:00). Aísla y registra los errores sin propagarlos. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async scheduledCleanup(): Promise<void> {
    try {
      const result = await this.runCleanup();
      this.logger.log(
        `Limpieza: ${result.otpCodes} OTP, ${result.refreshTokens} refresh tokens, ${result.exportJobs} exports.`,
      );
    } catch (e) {
      this.logger.error(`La limpieza programada falló: ${(e as Error).message}`);
    }
  }
}
