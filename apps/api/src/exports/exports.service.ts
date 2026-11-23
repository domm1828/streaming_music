import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { join } from 'node:path';
import { Model, Types } from 'mongoose';
import { Track, TrackDocument } from '../catalog/schemas/track.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Report, ReportDocument } from '../community/schemas/report.schema';
import { StorageService } from '../storage/storage.service';
import { ExportJob, ExportJobDocument, ExportType } from './schemas/export-job.schema';

/** Escapa un valor para CSV (comillas y separadores). */
function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.join(','), ...rows.map((r) => r.map(csvCell).join(','))];
  return lines.join('\r\n');
}

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);

  constructor(
    @InjectModel(ExportJob.name) private readonly jobModel: Model<ExportJobDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Track.name) private readonly trackModel: Model<TrackDocument>,
    @InjectModel(Report.name) private readonly reportModel: Model<ReportDocument>,
    private readonly storage: StorageService,
  ) {}

  async createAndRun(type: ExportType, userId: string | null): Promise<ExportJobDocument> {
    const job = await this.jobModel.create({
      type,
      status: 'pending',
      createdBy: userId ? new Types.ObjectId(userId) : null,
    });
    void this.run(String(job._id));
    return job;
  }

  async run(jobId: string): Promise<void> {
    const job = await this.jobModel.findById(jobId).exec();
    if (!job) return;
    job.status = 'running';
    await job.save();
    try {
      const csv = await this.build(job.type);
      const stored = await this.storage.saveBuffer(Buffer.from(csv, 'utf8'), 'exports', `${jobId}.csv`);
      job.filePath = stored.publicPath;
      job.rows = Math.max(csv.split('\r\n').length - 1, 0);
      job.status = 'done';
      await job.save();
    } catch (e) {
      job.status = 'failed';
      job.error = (e as Error).message;
      await job.save();
      this.logger.warn(`Export ${jobId} falló: ${(e as Error).message}`);
    }
  }

  private async build(type: ExportType): Promise<string> {
    if (type === 'users') {
      const users = await this.userModel.find().select('name username email type createdAt').lean().exec();
      return toCsv(
        ['id', 'name', 'username', 'email', 'type', 'createdAt'],
        users.map((u) => [String(u._id), u.name, u.username, u.email, u.type, (u as { createdAt?: Date }).createdAt]),
      );
    }
    if (type === 'tracks') {
      const tracks = await this.trackModel.find().select('name plays duration srcType').lean().exec();
      return toCsv(
        ['id', 'name', 'plays', 'duration', 'srcType'],
        tracks.map((t) => [String(t._id), t.name, t.plays, t.duration, t.srcType]),
      );
    }
    const reports = await this.reportModel.find().select('reportableType reason status createdAt').lean().exec();
    return toCsv(
      ['id', 'type', 'reason', 'status', 'createdAt'],
      reports.map((r) => [String(r._id), r.reportableType, r.reason, r.status, (r as { createdAt?: Date }).createdAt]),
    );
  }

  async getJob(id: string) {
    return Types.ObjectId.isValid(id) ? this.jobModel.findById(id).lean().exec() : null;
  }

  listJobs(limit = 30) {
    return this.jobModel.find().sort({ createdAt: -1 }).limit(limit).lean().exec();
  }

  /** Ruta absoluta del CSV listo para descargar. */
  async fileForDownload(id: string): Promise<{ absolutePath: string; filename: string }> {
    const job = await this.getJob(id);
    if (!job || job.status !== 'done' || !job.filePath) {
      throw new NotFoundException('Exportación no disponible');
    }
    const relative = job.filePath.replace(/^\/uploads\/?/, '');
    return { absolutePath: join(this.storage.rootDir, relative), filename: `${job.type}-${id}.csv` };
  }
}
