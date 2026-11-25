import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import slugify from 'slugify';
import { CreateGenreDto, UpdateGenreDto } from './dto/catalog.dto';
import { Genre, GenreDocument } from './schemas/genre.schema';
import { Artist, ArtistDocument } from './schemas/artist.schema';
import { Album, AlbumDocument } from './schemas/album.schema';
import { Track, TrackDocument } from './schemas/track.schema';

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

export interface GenreOverview {
  genre: GenreDocument;
  artists: ArtistDocument[];
  albums: AlbumDocument[];
  topTracks: TrackDocument[];
}

@Injectable()
export class GenresService {
  constructor(
    @InjectModel(Genre.name) private readonly model: Model<GenreDocument>,
    @InjectModel(Artist.name) private readonly artistModel: Model<ArtistDocument>,
    @InjectModel(Album.name) private readonly albumModel: Model<AlbumDocument>,
    @InjectModel(Track.name) private readonly trackModel: Model<TrackDocument>,
  ) {}

  /** Contenido público de un género: artistas, álbumes y pistas top. */
  async overview(id: string): Promise<GenreOverview> {
    const genre = await this.findByIdOrFail(id);
    const genreId = genre._id;
    const [artists, albums] = await Promise.all([
      this.artistModel
        .find({ genres: genreId })
        .sort({ followers: -1, spotifyPopularity: -1, name: 1 })
        .limit(12)
        .lean<ArtistDocument[]>()
        .exec(),
      this.albumModel
        .find({ genres: genreId })
        .sort({ popularity: -1, releaseDate: -1 })
        .limit(12)
        .lean<AlbumDocument[]>()
        .exec(),
    ]);
    // Pistas top del género: de los artistas que lo tienen asignado, por reproducciones.
    const artistIds = await this.artistModel.find({ genres: genreId }).distinct('_id').exec();
    const topTracks = artistIds.length
      ? await this.trackModel
          .find({ 'artists.artist': { $in: artistIds } })
          .sort({ plays: -1 })
          .limit(20)
          .populate('album')
          .lean<TrackDocument[]>()
          .exec()
      : [];
    return { genre, artists, albums, topTracks };
  }

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
