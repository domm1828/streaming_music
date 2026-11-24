import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { buildPaginationMeta } from '@stream-music/shared';
import { CATALOG_CHANGED, CatalogChangedEvent } from '../common/events';
import { CreateArtistDto, UpdateArtistDto } from './dto/catalog.dto';
import { Artist, ArtistDocument } from './schemas/artist.schema';
import { Album, AlbumDocument } from './schemas/album.schema';
import { Track, TrackDocument } from './schemas/track.schema';
import { uniqueSlug } from './slug';

@Injectable()
export class ArtistsService {
  constructor(
    @InjectModel(Artist.name) private readonly model: Model<ArtistDocument>,
    @InjectModel(Album.name) private readonly albumModel: Model<AlbumDocument>,
    @InjectModel(Track.name) private readonly trackModel: Model<TrackDocument>,
    private readonly events: EventEmitter2,
  ) {}

  private emit(id: unknown, action: CatalogChangedEvent['action']): void {
    this.events.emit(CATALOG_CHANGED, { type: 'artist', id: String(id), action } as CatalogChangedEvent);
  }

  async create(dto: CreateArtistDto): Promise<ArtistDocument> {
    const slug = await uniqueSlug(this.model, dto.name);
    const artist = await this.model.create({
      name: dto.name,
      slug,
      bio: dto.bio ?? null,
      image: dto.image ?? null,
      genres: dto.genres ?? [],
    });
    this.emit(artist._id, 'upsert');
    return artist;
  }

  async list(page: number, perPage: number, search?: string) {
    const filter = search ? { name: { $regex: search, $options: 'i' } } : {};
    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ spotifyPopularity: -1, name: 1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .populate('genres')
        .lean()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data, pagination: buildPaginationMeta(total, page, perPage) };
  }

  async findByIdOrFail(id: string): Promise<ArtistDocument> {
    const artist = Types.ObjectId.isValid(id)
      ? await this.model.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true }).populate('genres').exec()
      : null;
    if (!artist) throw new NotFoundException('Artista no encontrado');
    return artist;
  }

  async albums(artistId: string, page: number, perPage: number) {
    const filter = { artists: new Types.ObjectId(artistId) };
    const [data, total] = await Promise.all([
      this.albumModel.find(filter).sort({ releaseDate: -1 }).skip((page - 1) * perPage).limit(perPage).lean().exec(),
      this.albumModel.countDocuments(filter).exec(),
    ]);
    return { data, pagination: buildPaginationMeta(total, page, perPage) };
  }

  async tracks(artistId: string, page: number, perPage: number) {
    const filter = { 'artists.artist': new Types.ObjectId(artistId) };
    const [data, total] = await Promise.all([
      this.trackModel.find(filter).sort({ plays: -1 }).skip((page - 1) * perPage).limit(perPage).populate('album').lean().exec(),
      this.trackModel.countDocuments(filter).exec(),
    ]);
    return { data, pagination: buildPaginationMeta(total, page, perPage) };
  }

  async update(id: string, dto: UpdateArtistDto): Promise<ArtistDocument> {
    const artist = await this.model.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!artist) throw new NotFoundException('Artista no encontrado');
    this.emit(artist._id, 'upsert');
    return artist;
  }

  async remove(id: string): Promise<void> {
    const res = await this.model.deleteOne({ _id: id }).exec();
    if (res.deletedCount === 0) throw new NotFoundException('Artista no encontrado');
    this.emit(id, 'delete');
  }
}
