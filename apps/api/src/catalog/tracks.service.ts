import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { extname } from 'node:path';
import { Model, Types } from 'mongoose';
import { buildPaginationMeta } from '@stream-music/shared';
import { PERMISSIONS } from '../auth/rbac/permissions';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CATALOG_CHANGED, CatalogChangedEvent } from '../common/events';
import { StorageService } from '../storage/storage.service';
import { AudioService } from './audio.service';
import { CreateTrackDto, UpdateTrackDto } from './dto/catalog.dto';
import { Lyric, LyricDocument } from './schemas/lyric.schema';
import { Track, TrackDocument } from './schemas/track.schema';

export interface PlaybackSource {
  trackId: string;
  type: Track['srcType'];
  src: string | null;
  /** URL firmada temporal para entrega controlada (audio/hls local). */
  signedSrc: string | null;
  duration: number;
}

@Injectable()
export class TracksService {
  private readonly logger = new Logger(TracksService.name);

  constructor(
    @InjectModel(Track.name) private readonly model: Model<TrackDocument>,
    @InjectModel(Lyric.name) private readonly lyricModel: Model<LyricDocument>,
    private readonly storage: StorageService,
    private readonly audio: AudioService,
    private readonly events: EventEmitter2,
  ) {}

  private emit(id: unknown, action: CatalogChangedEvent['action']): void {
    this.events.emit(CATALOG_CHANGED, { type: 'track', id: String(id), action } as CatalogChangedEvent);
  }

  private artistRefs(artistIds?: string[]) {
    return (artistIds ?? []).map((id, idx) => ({
      artist: new Types.ObjectId(id),
      primary: idx === 0,
    }));
  }

  async create(dto: CreateTrackDto, ownerId?: string): Promise<TrackDocument> {
    const track = await this.model.create({
      name: dto.name,
      album: dto.album ? new Types.ObjectId(dto.album) : null,
      number: dto.number ?? 1,
      artists: this.artistRefs(dto.artists),
      genres: dto.genres ?? [],
      src: dto.src ?? null,
      srcType: dto.srcType ?? (dto.src ? 'youtube' : 'audio'),
      image: dto.image ?? null,
      owner: ownerId ? new Types.ObjectId(ownerId) : null,
    });
    this.emit(track._id, 'upsert');
    return track;
  }

  /** Pistas subidas por un usuario (su biblioteca de creador). */
  async listByOwner(ownerId: string, page: number, perPage: number) {
    const filter = { owner: new Types.ObjectId(ownerId) };
    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .populate('artists.artist')
        .populate('album')
        .lean()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data, pagination: buildPaginationMeta(total, page, perPage) };
  }

  async list(page: number, perPage: number, search?: string) {
    const filter = search ? { name: { $regex: search, $options: 'i' } } : {};
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ plays: -1 }).skip((page - 1) * perPage).limit(perPage).populate('artists.artist').populate('album').lean().exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data, pagination: buildPaginationMeta(total, page, perPage) };
  }

  private async getOrFail(id: string): Promise<TrackDocument> {
    const track = Types.ObjectId.isValid(id) ? await this.model.findById(id).exec() : null;
    if (!track) throw new NotFoundException('Pista no encontrada');
    return track;
  }

  async findDetail(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Pista no encontrada');
    const track = await this.model.findById(id).populate('artists.artist').populate('album').populate('genres').lean().exec();
    if (!track) throw new NotFoundException('Pista no encontrada');
    const lyric = await this.lyricModel.findOne({ track: track._id }).lean().exec();
    return { ...track, lyric: lyric ?? null };
  }

  private assertCanManage(track: TrackDocument, user: AuthenticatedUser): void {
    const isOwner = track.owner && String(track.owner) === user.id;
    const canManage = user.permissions.includes('*') || user.permissions.includes(PERMISSIONS.CATALOG_MANAGE);
    if (!isOwner && !canManage) throw new ForbiddenException('No podés modificar esta pista');
  }

  async uploadAudio(id: string, file: Express.Multer.File, user: AuthenticatedUser): Promise<TrackDocument> {
    const track = await this.getOrFail(id);
    this.assertCanManage(track, user);

    const ext = extname(file.originalname) || '.mp3';
    const stored = await this.storage.saveBuffer(file.buffer, 'audio', `${track._id}${ext}`);
    const metadata = await this.audio.extractMetadata(file.buffer);

    track.src = stored.publicPath;
    track.srcType = 'audio';
    if (metadata.duration > 0) track.duration = metadata.duration;
    await track.save();

    // Generar waveform sin bloquear la respuesta de subida.
    void this.generateWaveform(String(track._id), file.buffer);
    return track;
  }

  private async generateWaveform(trackId: string, buffer: Buffer): Promise<void> {
    try {
      const peaks = this.audio.generateWaveformPeaks(buffer);
      const stored = await this.storage.saveJson('waveforms', `${trackId}.json`, { peaks });
      await this.model.updateOne({ _id: trackId }, { waveformPath: stored.publicPath }).exec();
    } catch (err) {
      this.logger.warn(`Waveform falló para ${trackId}: ${(err as Error).message}`);
    }
  }

  async getWaveform(id: string): Promise<string | null> {
    const track = await this.getOrFail(id);
    return track.waveformPath;
  }

  /** Resuelve la fuente reproducible según el tipo de la pista. */
  async resolvePlayback(id: string): Promise<PlaybackSource> {
    const track = await this.getOrFail(id);
    // Para audio/HLS alojado localmente, entregar una URL firmada temporal.
    const isLocal = (track.srcType === 'audio' || track.srcType === 'hls') && track.src?.startsWith('/uploads/');
    const signedSrc = isLocal && track.src ? await this.storage.signedUrl(track.src, 3600) : null;
    return {
      trackId: String(track._id),
      type: track.srcType,
      src: track.src,
      signedSrc,
      duration: track.duration,
    };
  }

  async update(id: string, dto: UpdateTrackDto, user: AuthenticatedUser): Promise<TrackDocument> {
    const track = await this.getOrFail(id);
    this.assertCanManage(track, user);
    if (dto.name !== undefined) track.name = dto.name;
    if (dto.number !== undefined) track.number = dto.number;
    if (dto.album !== undefined) track.album = new Types.ObjectId(dto.album);
    if (dto.artists !== undefined) track.artists = this.artistRefs(dto.artists);
    if (dto.genres !== undefined) track.genres = dto.genres.map((g) => new Types.ObjectId(g));
    if (dto.image !== undefined) track.image = dto.image;
    await track.save();
    this.emit(track._id, 'upsert');
    return track;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const track = await this.getOrFail(id);
    this.assertCanManage(track, user);
    if (track.srcType === 'audio' && track.src) await this.storage.delete(track.src);
    if (track.waveformPath) await this.storage.delete(track.waveformPath);
    await this.lyricModel.deleteOne({ track: track._id }).exec();
    await track.deleteOne();
    this.emit(id, 'delete');
  }

  async incrementPlays(id: string): Promise<void> {
    await this.model.updateOne({ _id: id }, { $inc: { plays: 1 } }).exec();
  }

  /** Duración en segundos de una pista (0 si no existe). */
  async getDurationSeconds(id: string): Promise<number> {
    if (!Types.ObjectId.isValid(id)) return 0;
    const track = await this.model.findById(id).select('duration').lean().exec();
    return track?.duration ?? 0;
  }
}
