import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { buildPaginationMeta } from '@stream-music/shared';
import { FileEntry, FileEntryDocument } from './file-entry.schema';
import { StorageService } from './storage.service';

export interface RecordFileInput {
  url: string;
  path: string;
  filename: string;
  mime?: string | null;
  size?: number;
  userId?: string | null;
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
      user: input.userId ? new Types.ObjectId(input.userId) : null,
    });
  }

  async list(page: number, perPage: number) {
    const [data, total] = await Promise.all([
      this.model.find().sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).lean().exec(),
      this.model.countDocuments().exec(),
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
