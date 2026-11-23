import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { buildPaginationMeta } from '@stream-music/shared';
import { Track, TrackDocument } from '../catalog/schemas/track.schema';
import { Album, AlbumDocument } from '../catalog/schemas/album.schema';
import { Artist, ArtistDocument } from '../catalog/schemas/artist.schema';
import { Playlist, PlaylistDocument } from '../playlists/schemas/playlist.schema';
import { Like, LikeDocument, LikeableType, LIKEABLE_TYPES } from './schemas/like.schema';

@Injectable()
export class LikesService {
  constructor(
    @InjectModel(Like.name) private readonly model: Model<LikeDocument>,
    @InjectModel(Track.name) private readonly trackModel: Model<TrackDocument>,
    @InjectModel(Album.name) private readonly albumModel: Model<AlbumDocument>,
    @InjectModel(Artist.name) private readonly artistModel: Model<ArtistDocument>,
    @InjectModel(Playlist.name) private readonly playlistModel: Model<PlaylistDocument>,
  ) {}

  private modelFor(type: LikeableType): Model<{ _id: Types.ObjectId }> {
    const map = {
      track: this.trackModel,
      album: this.albumModel,
      artist: this.artistModel,
      playlist: this.playlistModel,
    } as const;
    return map[type] as unknown as Model<{ _id: Types.ObjectId }>;
  }

  private async assertExists(type: LikeableType, id: string): Promise<void> {
    const exists = await this.modelFor(type).exists({ _id: new Types.ObjectId(id) });
    if (!exists) throw new NotFoundException('El contenido que querés marcar no existe');
  }

  /** Marca un favorito. Idempotente: si ya existe, no duplica. */
  async like(userId: string, type: LikeableType, id: string) {
    await this.assertExists(type, id);
    await this.model.updateOne(
      { user: new Types.ObjectId(userId), likeableType: type, likeable: new Types.ObjectId(id) },
      { $setOnInsert: { user: new Types.ObjectId(userId), likeableType: type, likeable: new Types.ObjectId(id) } },
      { upsert: true },
    );
    return { liked: true, type, id };
  }

  async unlike(userId: string, type: LikeableType, id: string) {
    await this.model.deleteOne({
      user: new Types.ObjectId(userId),
      likeableType: type,
      likeable: new Types.ObjectId(id),
    });
    return { liked: false, type, id };
  }

  /** Lista los favoritos del usuario, poblando la entidad referenciada. */
  async list(userId: string, type: LikeableType | undefined, page: number, perPage: number) {
    const filter: Record<string, unknown> = { user: new Types.ObjectId(userId) };
    if (type) filter.likeableType = type;

    const [likes, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).lean().exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    const data = await this.populate(likes);
    return { data, pagination: buildPaginationMeta(total, page, perPage) };
  }

  /** Dado un set de ids de un tipo, devuelve cuáles marcó el usuario (para la UI). */
  async likedIds(userId: string, type: LikeableType, ids: string[]): Promise<string[]> {
    if (!ids.length) return [];
    const liked = await this.model
      .find({
        user: new Types.ObjectId(userId),
        likeableType: type,
        likeable: { $in: ids.map((i) => new Types.ObjectId(i)) },
      })
      .select('likeable')
      .lean()
      .exec();
    return liked.map((l) => String(l.likeable));
  }

  async countFor(type: LikeableType, id: string): Promise<number> {
    if (!Types.ObjectId.isValid(id)) return 0;
    return this.model.countDocuments({ likeableType: type, likeable: new Types.ObjectId(id) }).exec();
  }

  async isLiked(userId: string, type: LikeableType, id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const found = await this.model.exists({
      user: new Types.ObjectId(userId),
      likeableType: type,
      likeable: new Types.ObjectId(id),
    });
    return Boolean(found);
  }

  /** Carga las entidades referenciadas por un conjunto de likes, preservando el orden. */
  private async populate(likes: Array<{ likeableType: LikeableType; likeable: Types.ObjectId; createdAt?: Date }>) {
    const byType = new Map<LikeableType, Types.ObjectId[]>();
    for (const t of LIKEABLE_TYPES) byType.set(t, []);
    for (const like of likes) byType.get(like.likeableType)!.push(like.likeable);

    const loaded = new Map<string, unknown>();
    await Promise.all(
      LIKEABLE_TYPES.map(async (type) => {
        const ids = byType.get(type)!;
        if (!ids.length) return;
        const query = this.modelFor(type).find({ _id: { $in: ids } });
        if (type === 'track') query.populate('artists.artist').populate('album');
        const docs = await query.lean().exec();
        for (const doc of docs) loaded.set(`${type}:${String(doc._id)}`, doc);
      }),
    );

    return likes
      .map((like) => {
        const entity = loaded.get(`${like.likeableType}:${String(like.likeable)}`);
        if (!entity) return null;
        return { type: like.likeableType, likedAt: like.createdAt ?? null, entity };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }
}
