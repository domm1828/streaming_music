import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import slugify from 'slugify';
import { CreateGenreDto, UpdateGenreDto } from './dto/catalog.dto';
import { Genre, GenreDocument } from './schemas/genre.schema';

export interface GenreWithStats {
  _id: Types.ObjectId;
  name: string;
  displayName: string;
  image: string | null;
  popularity: number;
  createdAt: Date;
  updatedAt: Date;
  artistsCount: number;
}

@Injectable()
export class GenresService {
  constructor(@InjectModel(Genre.name) private readonly model: Model<GenreDocument>) {}

  async create(dto: CreateGenreDto): Promise<GenreDocument> {
    const name = slugify(dto.name, { lower: true, strict: true });
    if (await this.model.exists({ name })) {
      throw new ConflictException('Ya existe un género con ese nombre');
    }
    return this.model.create({ name, displayName: dto.displayName, image: dto.image ?? null });
  }

  findAll(): Promise<GenreDocument[]> {
    return this.model.find().sort({ popularity: -1, displayName: 1 }).lean<GenreDocument[]>().exec();
  }

  /** Lista con estadísticas para el panel admin: cuántos artistas usa cada género. */
  findAllWithStats(): Promise<GenreWithStats[]> {
    return this.model
      .aggregate<GenreWithStats>([
        { $lookup: { from: 'artists', localField: '_id', foreignField: 'genres', as: 'artistsRef' } },
        {
          $project: {
            name: 1,
            displayName: 1,
            image: 1,
            popularity: 1,
            createdAt: 1,
            updatedAt: 1,
            artistsCount: { $size: '$artistsRef' },
          },
        },
        { $sort: { artistsCount: -1, displayName: 1 } },
      ])
      .exec();
  }

  async findByIdOrFail(id: string): Promise<GenreDocument> {
    const genre = Types.ObjectId.isValid(id) ? await this.model.findById(id).exec() : null;
    if (!genre) throw new NotFoundException('Género no encontrado');
    return genre;
  }

  async update(id: string, dto: UpdateGenreDto): Promise<GenreDocument> {
    const genre = await this.model.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!genre) throw new NotFoundException('Género no encontrado');
    return genre;
  }

  async remove(id: string): Promise<void> {
    const res = await this.model.deleteOne({ _id: id }).exec();
    if (res.deletedCount === 0) throw new NotFoundException('Género no encontrado');
  }
}
