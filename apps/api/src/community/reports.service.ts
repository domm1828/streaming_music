import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { buildPaginationMeta } from '@stream-music/shared';
import { CommentsService } from './comments.service';
import { Report, ReportDocument, ReportStatus, ReportableType } from './schemas/report.schema';

/** Acción de moderación que puede acompañar la resolución de un reporte. */
export type ModerationAction = 'hide' | 'none';

/** Vista previa del contenido reportado, para que el moderador sepa qué resuelve. */
export interface ReportPreview {
  /** El contenido reportado todavía existe. */
  exists: boolean;
  /** Texto principal: extracto del comentario o nombre de la entidad. */
  label: string;
  /** Texto secundario: autor del comentario o @username del usuario. */
  sublabel?: string;
  /** Enlace de la app para ver la entidad reportada. */
  link?: string;
  /** El comentario reportado ya está oculto. */
  hidden?: boolean;
}

/** Entidades simples reportables: tienen `name` y enlace `/<ruta>/<id>`. */
const SIMPLE_ENTITIES: { type: ReportableType; collection: string; route: string }[] = [
  { type: 'track', collection: 'tracks', route: 'track' },
  { type: 'album', collection: 'albums', route: 'album' },
  { type: 'artist', collection: 'artists', route: 'artist' },
  { type: 'playlist', collection: 'playlists', route: 'playlist' },
];

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Report.name) private readonly model: Model<ReportDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly comments: CommentsService,
  ) {}

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
    const previews = await this.buildPreviews(data);
    const enriched = data.map((r) => ({
      ...r,
      preview: previews.get(previewKey(r.reportableType, r.reportable)) ?? { exists: false, label: '(desconocido)' },
    }));
    return { data: enriched, pagination: buildPaginationMeta(total, page, perPage) };
  }

  /** Resuelve o descarta un reporte, registrando la acción de moderación. */
  async resolve(
    id: string,
    moderatorId: string,
    status: 'resolved' | 'dismissed',
    resolution?: string,
    action: ModerationAction = 'none',
  ) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Reporte no encontrado');
    const report = await this.model.findById(id).exec();
    if (!report) throw new NotFoundException('Reporte no encontrado');

    // Takedown: ocultar el comentario reportado. Si ya no existe, igual se resuelve.
    if (action === 'hide' && report.reportableType === 'comment') {
      try {
        await this.comments.hide(String(report.reportable));
      } catch (err) {
        if (!(err instanceof NotFoundException)) throw err;
      }
    }

    report.status = status;
    report.resolution = resolution ?? null;
    report.resolvedBy = new Types.ObjectId(moderatorId);
    report.resolvedAt = new Date();
    await report.save();
    return report.toObject();
  }

  /** Resuelve el contenido reportado a un preview legible, en lote por tipo. */
  private async buildPreviews(
    reports: { reportableType: ReportableType; reportable: Types.ObjectId }[],
  ): Promise<Map<string, ReportPreview>> {
    const result = new Map<string, ReportPreview>();
    const byType = new Map<ReportableType, Types.ObjectId[]>();
    for (const r of reports) {
      const arr = byType.get(r.reportableType) ?? [];
      arr.push(r.reportable);
      byType.set(r.reportableType, arr);
    }

    // Entidades con `name` y enlace directo.
    for (const s of SIMPLE_ENTITIES) {
      const ids = byType.get(s.type);
      if (!ids?.length) continue;
      const docs = await this.connection
        .collection(s.collection)
        .find({ _id: { $in: ids } }, { projection: { name: 1 } })
        .toArray();
      const found = new Map(docs.map((d) => [String(d._id), d]));
      for (const id of ids) {
        const d = found.get(String(id));
        result.set(
          previewKey(s.type, id),
          d
            ? { exists: true, label: (d.name as string) || '(sin nombre)', link: `/${s.route}/${String(id)}` }
            : { exists: false, label: '(eliminado)' },
        );
      }
    }

    // Usuarios.
    const userIds = byType.get('user');
    if (userIds?.length) {
      const docs = await this.connection
        .collection('users')
        .find({ _id: { $in: userIds } }, { projection: { name: 1, username: 1 } })
        .toArray();
      const found = new Map(docs.map((d) => [String(d._id), d]));
      for (const id of userIds) {
        const d = found.get(String(id));
        result.set(
          previewKey('user', id),
          d
            ? {
                exists: true,
                label: (d.name as string) || (d.username as string) || '(usuario)',
                sublabel: d.username ? `@${d.username as string}` : undefined,
                link: d.username ? `/u/${d.username as string}` : undefined,
              }
            : { exists: false, label: '(eliminado)' },
        );
      }
    }

    // Comentarios: extracto + autor + enlace a la entidad comentada.
    const commentIds = byType.get('comment');
    if (commentIds?.length) {
      const docs = await this.connection
        .collection('comments')
        .find(
          { _id: { $in: commentIds } },
          { projection: { content: 1, user: 1, hiddenAt: 1, commentableType: 1, commentable: 1 } },
        )
        .toArray();
      const authorIds = docs.map((d) => d.user).filter(Boolean) as Types.ObjectId[];
      const authors = authorIds.length
        ? await this.connection
            .collection('users')
            .find({ _id: { $in: authorIds } }, { projection: { username: 1 } })
            .toArray()
        : [];
      const authorMap = new Map(authors.map((a) => [String(a._id), a.username as string]));
      const found = new Map(docs.map((d) => [String(d._id), d]));
      for (const id of commentIds) {
        const d = found.get(String(id));
        if (!d) {
          result.set(previewKey('comment', id), { exists: false, label: '(eliminado)' });
          continue;
        }
        const username = d.user ? authorMap.get(String(d.user)) : undefined;
        const content = (d.content as string) ?? '';
        result.set(previewKey('comment', id), {
          exists: true,
          label: content.length > 140 ? `${content.slice(0, 140)}…` : content,
          sublabel: username ? `@${username}` : undefined,
          link: d.commentableType && d.commentable ? `/${d.commentableType as string}/${String(d.commentable)}` : undefined,
          hidden: Boolean(d.hiddenAt),
        });
      }
    }

    return result;
  }
}

function previewKey(type: ReportableType, id: unknown): string {
  return `${type}:${String(id)}`;
}
