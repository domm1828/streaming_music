import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { buildPaginationMeta } from '@stream-music/shared';
import { PERMISSIONS } from '../auth/rbac/permissions';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CATALOG_CHANGED, CatalogChangedEvent } from '../common/events';
import { CreateAlbumDto, UpdateAlbumDto } from './dto/catalog.dto';
import { Album, AlbumDocument } from './schemas/album.schema';
import { Track, TrackDocument } from './schemas/track.schema';

@Injectable()
export class AlbumsService {
  constructor(
    @InjectModel(Album.name) private readonly model: Model<AlbumDocument>,
    @InjectModel(Track.name) private readonly trackModel: Model<TrackDocument>,
    private readonly events: EventEmitter2,
  ) {}

  private emit(id: unknown, action: CatalogChangedEvent['action']): void {
    this.events.emit(CATALOG_CHANGED, { type: 'album', id: String(id), action } as CatalogChangedEvent);
  }

  async create(dto: CreateAlbumDto, ownerId?: string): Promise<AlbumDocument> {
    const album = await this.model.create({
      name: dto.name,
      releaseDate: dto.releaseDate ? new Date(dto.releaseDate) : null,
      description: dto.description ?? null,
      image: dto.image ?? null,
      artists: dto.artists ?? [],
      genres: dto.genres ?? [],
      owner: ownerId ? new Types.ObjectId(ownerId) : null,
    });
    this.emit(album._id, 'upsert');
    return album;
  }

  async list(page: number, perPage: number, search?: string) {
    const filter = search ? { name: { $regex: search, $options: 'i' } } : {};
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ releaseDate: -1 }).skip((page - 1) * perPage).limit(perPage).populate('artists').lean().exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data, pagination: buildPaginationMeta(total, page, perPage) };
  }

  /** Detalle del álbum con sus artistas y sus pistas ordenadas. */
  async findWithTracks(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Álbum no encontrado');
    const album = await this.model
      .findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true })
      .populate('artists')
      .populate('genres')
      .lean()
      .exec();
    if (!album) throw new NotFoundException('Álbum no encontrado');
    const tracks = await this.trackModel
      .find({ album: album._id })
      .sort({ number: 1 })
      .populate('artists.artist')
      .lean()
      .exec();
    return { ...album, tracks };
  }

  private assertCanManage(album: AlbumDocument, user: AuthenticatedUser): void {
    const isOwner = album.owner && String(album.owner) === user.id;
    const canManage = user.permissions.includes('*') || user.permissions.includes(PERMISSIONS.CATALOG_MANAGE);
    if (!isOwner && !canManage) throw new ForbiddenException('No podés modificar este álbum');
  }

  async update(id: string, dto: UpdateAlbumDto, user: AuthenticatedUser): Promise<AlbumDocument> {
    const album = Types.ObjectId.isValid(id) ? await this.model.findById(id).exec() : null;
    if (!album) throw new NotFoundException('Álbum no encontrado');
    this.assertCanManage(album, user);
    if (dto.name !== undefined) album.name = dto.name;
    if (dto.releaseDate !== undefined) album.releaseDate = dto.releaseDate ? new Date(dto.releaseDate) : null;
    if (dto.description !== undefined) album.description = dto.description;
    if (dto.image !== undefined) album.image = dto.image;
    if (dto.artists !== undefined) album.artists = dto.artists.map((a) => new Types.ObjectId(a));
    if (dto.genres !== undefined) album.genres = dto.genres.map((g) => new Types.ObjectId(g));
    await album.save();
    this.emit(album._id, 'upsert');
    return album;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const album = Types.ObjectId.isValid(id) ? await this.model.findById(id).exec() : null;
    if (!album) throw new NotFoundException('Álbum no encontrado');
    this.assertCanManage(album, user);
    await album.deleteOne();
    this.emit(id, 'delete');
  }
}
