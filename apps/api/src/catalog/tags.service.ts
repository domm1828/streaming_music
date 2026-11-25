import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import slugify from 'slugify';
import { CreateTagDto, UpdateTagDto } from './dto/catalog.dto';
import { Tag, TagDocument } from './schemas/tag.schema';
import { Track, TrackDocument } from './schemas/track.schema';

export interface TagWithStats {
  _id: Types.ObjectId;
  name: string;
  displayName: string;
  color: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  tracksCount: number;
}

export interface TagOverview {
  tag: TagDocument;
  tracks: TrackDocument[];
}

@Injectable()
export class TagsService {
  constructor(
    @InjectModel(Tag.name) private readonly model: Model<TagDocument>,
    @InjectModel(Track.name) private readonly trackModel: Model<TrackDocument>,
  ) {}

  async create(dto: CreateTagDto): Promise<TagDocument> {
    const name = slugify(dto.name ?? dto.displayName, { lower: true, strict: true });
    if (!name) throw new ConflictException('Nombre de tag inválido');
    if (await this.model.exists({ name })) {
      throw new ConflictException('Ya existe un tag con ese nombre');
    }
    return this.model.create({
      name,
      displayName: dto.displayName,
      color: dto.color ?? null,
      description: dto.description ?? null,
    });
  }

  findAll(): Promise<TagDocument[]> {
    return this.model.find().sort({ displayName: 1 }).lean<TagDocument[]>().exec();
  }

  /** Lista con cuántas pistas usa cada tag (panel admin). */
  findAllWithStats(): Promise<TagWithStats[]> {
    return this.model
      .aggregate<TagWithStats>([
        { $lookup: { from: 'tracks', localField: '_id', foreignField: 'tags', as: 'tracksRef' } },
        {
          $project: {
            name: 1,
            displayName: 1,
            color: 1,
            description: 1,
            createdAt: 1,
            updatedAt: 1,
            tracksCount: { $size: '$tracksRef' },
          },
        },
        { $sort: { tracksCount: -1, displayName: 1 } },
      ])
      .exec();
  }

  async findByIdOrFail(id: string): Promise<TagDocument> {
    const tag = Types.ObjectId.isValid(id) ? await this.model.findById(id).exec() : null;
    if (!tag) throw new NotFoundException('Tag no encontrado');
    return tag;
  }

  /** Contenido público de un tag: sus pistas top. */
  async overview(id: string): Promise<TagOverview> {
    const tag = await this.findByIdOrFail(id);
    const tracks = await this.trackModel
      .find({ tags: tag._id })
      .sort({ plays: -1 })
      .limit(50)
      .populate('artists.artist')
      .populate('album')
      .lean<TrackDocument[]>()
      .exec();
    return { tag, tracks };
  }

  async update(id: string, dto: UpdateTagDto): Promise<TagDocument> {
    const tag = await this.model.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!tag) throw new NotFoundException('Tag no encontrado');
    return tag;
  }

  async remove(id: string): Promise<void> {
    const tag = await this.findByIdOrFail(id);
    // Quitar la referencia del tag de todas las pistas que lo usan.
    await this.trackModel.updateMany({ tags: tag._id }, { $pull: { tags: tag._id } }).exec();
    await tag.deleteOne();
  }
}
