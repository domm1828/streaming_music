import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { buildPaginationMeta } from '@stream-music/shared';
import { Track, TrackDocument } from '../catalog/schemas/track.schema';
import { CreatePlaylistDto, UpdatePlaylistDto } from './dto/playlist.dto';
import { Playlist, PlaylistDocument, PlaylistTrack } from './schemas/playlist.schema';

@Injectable()
export class PlaylistsService {
  constructor(
    @InjectModel(Playlist.name) private readonly model: Model<PlaylistDocument>,
    @InjectModel(Track.name) private readonly trackModel: Model<TrackDocument>,
  ) {}

  private async getOrFail(id: string): Promise<PlaylistDocument> {
    const playlist = Types.ObjectId.isValid(id) ? await this.model.findById(id).exec() : null;
    if (!playlist) throw new NotFoundException('Playlist no encontrada');
    return playlist;
  }

  private isOwner(playlist: PlaylistDocument, userId?: string): boolean {
    return Boolean(userId) && String(playlist.owner) === userId;
  }

  private isEditor(playlist: PlaylistDocument, userId?: string): boolean {
    return Boolean(userId) && playlist.editors.some((e) => String(e) === userId);
  }

  /** Ver: pública, o el dueño/editor. */
  private assertCanView(playlist: PlaylistDocument, userId?: string): void {
    if (playlist.public || this.isOwner(playlist, userId) || this.isEditor(playlist, userId)) return;
    throw new ForbiddenException('Esta playlist es privada');
  }

  /** Editar pistas: dueño, o editor si es colaborativa. */
  private assertCanEditTracks(playlist: PlaylistDocument, userId: string): void {
    if (this.isOwner(playlist, userId)) return;
    if (playlist.collaborative && this.isEditor(playlist, userId)) return;
    throw new ForbiddenException('No podés editar las pistas de esta playlist');
  }

  /** Ajustes/borrado/editores: solo el dueño. */
  private assertOwner(playlist: PlaylistDocument, userId: string): void {
    if (!this.isOwner(playlist, userId)) throw new ForbiddenException('Solo el dueño puede hacer esto');
  }

  create(ownerId: string, dto: CreatePlaylistDto): Promise<PlaylistDocument> {
    return this.model.create({
      name: dto.name,
      description: dto.description ?? null,
      image: dto.image ?? null,
      public: dto.public ?? true,
      collaborative: dto.collaborative ?? false,
      owner: new Types.ObjectId(ownerId),
      tracks: [],
      editors: [],
    });
  }

  async update(id: string, dto: UpdatePlaylistDto, userId: string): Promise<PlaylistDocument> {
    const playlist = await this.getOrFail(id);
    this.assertOwner(playlist, userId);
    if (dto.name !== undefined) playlist.name = dto.name;
    if (dto.description !== undefined) playlist.description = dto.description;
    if (dto.image !== undefined) playlist.image = dto.image;
    if (dto.public !== undefined) playlist.public = dto.public;
    if (dto.collaborative !== undefined) playlist.collaborative = dto.collaborative;
    await playlist.save();
    return playlist;
  }

  async remove(id: string, userId: string): Promise<void> {
    const playlist = await this.getOrFail(id);
    this.assertOwner(playlist, userId);
    await playlist.deleteOne();
  }

  /** Detalle con pistas pobladas (y control de visibilidad). */
  async findDetail(id: string, userId?: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Playlist no encontrada');
    const playlist = await this.getOrFail(id);
    this.assertCanView(playlist, userId);
    // Calcular los flags ANTES de poblar: populate() muta owner/editors in-place
    // y dejaría de comparar ObjectIds.
    const isOwner = this.isOwner(playlist, userId);
    const canEdit = isOwner || (playlist.collaborative && this.isEditor(playlist, userId));
    const populated = await playlist.populate([
      { path: 'tracks.track', populate: [{ path: 'artists.artist' }, { path: 'album' }] },
      { path: 'owner', select: 'name username image' },
      { path: 'editors', select: 'name username image' },
    ]);
    const obj = populated.toObject();
    // Ordenar pistas por posición y descartar referencias rotas.
    obj.tracks = (obj.tracks ?? [])
      .filter((t: { track: unknown }) => t.track)
      .sort((a: { position: number }, b: { position: number }) => a.position - b.position);
    return { ...obj, canEdit, isOwner };
  }

  /** Playlists propias del usuario. */
  async listMine(userId: string, page: number, perPage: number) {
    const filter = { owner: new Types.ObjectId(userId) };
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * perPage).limit(perPage).lean().exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data, pagination: buildPaginationMeta(total, page, perPage) };
  }

  /** Playlists públicas de un dueño (para el perfil). */
  async listPublicByOwner(ownerId: string, page: number, perPage: number) {
    if (!Types.ObjectId.isValid(ownerId)) {
      return { data: [], pagination: buildPaginationMeta(0, page, perPage) };
    }
    const filter = { owner: new Types.ObjectId(ownerId), public: true };
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * perPage).limit(perPage).lean().exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data, pagination: buildPaginationMeta(total, page, perPage) };
  }

  /** Devuelve varias playlists por id (para la biblioteca: playlists seguidas). */
  async findManyByIds(ids: string[]) {
    if (!ids.length) return [];
    return this.model
      .find({ _id: { $in: ids.map((i) => new Types.ObjectId(i)) } })
      .lean()
      .exec();
  }

  async addTracks(id: string, trackIds: string[], userId: string): Promise<PlaylistDocument> {
    const playlist = await this.getOrFail(id);
    this.assertCanEditTracks(playlist, userId);

    const validIds = await this.trackModel
      .find({ _id: { $in: trackIds.map((t) => new Types.ObjectId(t)) } })
      .select('_id')
      .lean()
      .exec();
    const validSet = new Set(validIds.map((t) => String(t._id)));

    let position = playlist.tracks.reduce((max, t) => Math.max(max, t.position), -1);
    for (const trackId of trackIds) {
      if (!validSet.has(trackId)) continue;
      position += 1;
      playlist.tracks.push({
        track: new Types.ObjectId(trackId),
        position,
        addedBy: new Types.ObjectId(userId),
        addedAt: new Date(),
      } as PlaylistTrack);
    }
    await playlist.save();
    return playlist;
  }

  async removeTrack(id: string, trackId: string, userId: string): Promise<PlaylistDocument> {
    const playlist = await this.getOrFail(id);
    this.assertCanEditTracks(playlist, userId);
    playlist.tracks = playlist.tracks.filter((t) => String(t.track) !== trackId);
    // Recomponer posiciones consecutivas.
    playlist.tracks
      .sort((a, b) => a.position - b.position)
      .forEach((t, idx) => {
        t.position = idx;
      });
    await playlist.save();
    return playlist;
  }

  /** Reordena las pistas según la lista completa de ids provista. */
  async reorder(id: string, orderedTrackIds: string[], userId: string): Promise<PlaylistDocument> {
    const playlist = await this.getOrFail(id);
    this.assertCanEditTracks(playlist, userId);

    const byTrack = new Map(playlist.tracks.map((t) => [String(t.track), t]));
    const reordered: PlaylistTrack[] = [];
    orderedTrackIds.forEach((trackId) => {
      const existing = byTrack.get(trackId);
      if (existing) {
        existing.position = reordered.length;
        reordered.push(existing);
        byTrack.delete(trackId);
      }
    });
    // Anexar al final las pistas no mencionadas, conservando su orden relativo.
    for (const leftover of byTrack.values()) {
      leftover.position = reordered.length;
      reordered.push(leftover);
    }
    playlist.tracks = reordered;
    await playlist.save();
    return playlist;
  }

  async setEditors(id: string, userIds: string[], userId: string): Promise<PlaylistDocument> {
    const playlist = await this.getOrFail(id);
    this.assertOwner(playlist, userId);
    const unique = Array.from(new Set(userIds.filter((u) => u !== String(playlist.owner))));
    playlist.editors = unique.map((u) => new Types.ObjectId(u));
    await playlist.save();
    return playlist;
  }
}
