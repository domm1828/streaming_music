import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { buildPaginationMeta } from '@stream-music/shared';
import { Report, ReportDocument, ReportStatus, ReportableType } from './schemas/report.schema';

@Injectable()
export class ReportsService {
  constructor(@InjectModel(Report.name) private readonly model: Model<ReportDocument>) {}

  create(reporterId: string, type: ReportableType, id: string, reason: string): Promise<ReportDocument> {
    return this.model.create({
      reporter: new Types.ObjectId(reporterId),
      reportableType: type,
      reportable: new Types.ObjectId(id),
      reason,
    });
  }

  async list(status: ReportStatus | undefined, page: number, perPage: number) {
    const filter = status ? { status } : {};
    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .populate({ path: 'reporter', select: 'name username' })
        .lean()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data, pagination: buildPaginationMeta(total, page, perPage) };
  }

  /** Resuelve o descarta un reporte, registrando la acción de moderación. */
  async resolve(id: string, moderatorId: string, status: 'resolved' | 'dismissed', resolution?: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Reporte no encontrado');
    const report = await this.model
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status,
            resolution: resolution ?? null,
            resolvedBy: new Types.ObjectId(moderatorId),
            resolvedAt: new Date(),
          },
        },
        { new: true },
      )
      .lean()
      .exec();
    if (!report) throw new NotFoundException('Reporte no encontrado');
    return report;
  }
}
