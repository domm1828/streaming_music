import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { buildPaginationMeta } from '@stream-music/shared';
import { Track, TrackDocument } from '../catalog/schemas/track.schema';
import { Playlist, PlaylistDocument } from '../playlists/schemas/playlist.schema';
import { Repost, RepostDocument, RepostableType, REPOSTABLE_TYPES } from './schemas/repost.schema';

@Injectable()
export class RepostsService {
  constructor(
    @InjectModel(Repost.name) private readonly model: Model<RepostDocument>,
    @InjectModel(Track.name) private readonly trackModel: Model<TrackDocument>,
    @InjectModel(Playlist.name) private readonly playlistModel: Model<PlaylistDocument>,
  ) {}

  private modelFor(type: RepostableType): Model<{ _id: Types.ObjectId }> {
    const map = { track: this.trackModel, playlist: this.playlistModel } as const;
    return map[type] as unknown as Model<{ _id: Types.ObjectId }>;
  }

  async repost(userId: string, type: RepostableType, id: string) {
    const exists = await this.modelFor(type).exists({ _id: new Types.ObjectId(id) });
    if (!exists) throw new NotFoundException('El contenido que querés compartir no existe');
    await this.model.updateOne(
      { user: new Types.ObjectId(userId), repostableType: type, repostable: new Types.ObjectId(id) },
      {
        $setOnInsert: {
          user: new Types.ObjectId(userId),
          repostableType: type,
          repostable: new Types.ObjectId(id),
        },
      },
      { upsert: true },
    );
    return { reposted: true, type, id };
  }

  async unrepost(userId: string, type: RepostableType, id: string) {
    await this.model.deleteOne({
      user: new Types.ObjectId(userId),
      repostableType: type,
      repostable: new Types.ObjectId(id),
    });
    return { reposted: false, type, id };
  }

  /** Reposts de un usuario (para su perfil), poblados. */
  async listByUser(userId: string, page: number, perPage: number) {
    if (!Types.ObjectId.isValid(userId)) {
      return { data: [], pagination: buildPaginationMeta(0, page, perPage) };
    }
    const filter = { user: new Types.ObjectId(userId) };
    const [reposts, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).lean().exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    const byType = new Map<RepostableType, Types.ObjectId[]>();
    for (const t of REPOSTABLE_TYPES) byType.set(t, []);
    for (const r of reposts) byType.get(r.repostableType)!.push(r.repostable);

    const loaded = new Map<string, unknown>();
    await Promise.all(
      REPOSTABLE_TYPES.map(async (type) => {
        const ids = byType.get(type)!;
        if (!ids.length) return;
        const query = this.modelFor(type).find({ _id: { $in: ids } });
        if (type === 'track') query.populate('artists.artist').populate('album');
        const docs = await query.lean().exec();
        for (const doc of docs) loaded.set(`${type}:${String(doc._id)}`, doc);
      }),
    );

    const data = reposts
      .map((r) => {
        const entity = loaded.get(`${r.repostableType}:${String(r.repostable)}`);
        if (!entity) return null;
        return { type: r.repostableType, repostedAt: r.createdAt ?? null, entity };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    return { data, pagination: buildPaginationMeta(total, page, perPage) };
  }
}
