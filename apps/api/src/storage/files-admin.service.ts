import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { buildPaginationMeta } from '@stream-music/shared';
import { FileEntry, FileEntryDocument, MediaKind } from './file-entry.schema';
import { StorageService } from './storage.service';

export interface RecordFileInput {
  url: string;
  path: string;
  filename: string;
  mime?: string | null;
  size?: number;
  sha256?: string | null;
  kind?: MediaKind;
  userId?: string | null;
}

export interface ListFilesOptions {
  page: number;
  perPage: number;
  kind?: MediaKind;
  q?: string;
  userId?: string | null;
}

/** Categoría de medio a partir del mime. */
export function kindFromMime(mime?: string | null): MediaKind {
  if (!mime) return 'other';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  return 'other';
}

@Injectable()
export class FilesAdminService {
  constructor(
    @InjectModel(FileEntry.name) private readonly model: Model<FileEntryDocument>,
    private readonly storage: StorageService,
  ) {}

  async record(input: RecordFileInput): Promise<FileEntryDocument> {
    return this.model.create({
      url: input.url,
      path: input.path,
      filename: input.filename,
      mime: input.mime ?? null,
      size: input.size ?? 0,
      sha256: input.sha256 ?? null,
      kind: input.kind ?? kindFromMime(input.mime),
      user: input.userId ? new Types.ObjectId(input.userId) : null,
    });
  }

  /** Busca un archivo ya subido por su hash de contenido (deduplicación). */
  async findByHash(sha256: string): Promise<FileEntryDocument | null> {
    return this.model.findOne({ sha256 }).exec();
  }

  async list(opts: ListFilesOptions) {
    const { page, perPage, kind, q, userId } = opts;
    const filter: Record<string, unknown> = {};
    if (kind) filter.kind = kind;
    if (userId) filter.user = new Types.ObjectId(userId);
    if (q && q.trim()) filter.filename = { $regex: escapeRegex(q.trim()), $options: 'i' };

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .lean()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data, pagination: buildPaginationMeta(total, page, perPage) };
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Archivo no encontrado');
    const entry = await this.model.findById(id).exec();
    if (!entry) throw new NotFoundException('Archivo no encontrado');
    await this.storage.delete(entry.path).catch(() => undefined);
    await entry.deleteOne();
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
