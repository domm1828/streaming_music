import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { buildPaginationMeta } from '@stream-music/shared';
import { Artist, ArtistDocument } from '../catalog/schemas/artist.schema';
import { Playlist, PlaylistDocument } from '../playlists/schemas/playlist.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Follow, FollowDocument, FollowableType, FOLLOWABLE_TYPES } from './schemas/follow.schema';

@Injectable()
export class FollowsService {
  constructor(
    @InjectModel(Follow.name) private readonly model: Model<FollowDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Artist.name) private readonly artistModel: Model<ArtistDocument>,
    @InjectModel(Playlist.name) private readonly playlistModel: Model<PlaylistDocument>,
  ) {}

  private modelFor(type: FollowableType): Model<{ _id: Types.ObjectId }> {
    const map = {
      user: this.userModel,
      artist: this.artistModel,
      playlist: this.playlistModel,
    } as const;
    return map[type] as unknown as Model<{ _id: Types.ObjectId }>;
  }

  /** Mantiene los contadores desnormalizados al seguir (delta +1) o dejar de seguir (-1). */
  private async adjustCounters(
    followerId: string,
    type: FollowableType,
    id: string,
    delta: 1 | -1,
  ): Promise<void> {
    if (type === 'user') {
      await Promise.all([
        this.userModel.updateOne({ _id: id }, { $inc: { followersCount: delta } }),
        this.userModel.updateOne({ _id: followerId }, { $inc: { followingCount: delta } }),
      ]);
    } else if (type === 'artist') {
      await this.artistModel.updateOne({ _id: id }, { $inc: { followers: delta } });
    } else {
      await this.playlistModel.updateOne({ _id: id }, { $inc: { followersCount: delta } });
    }
  }

  async follow(followerId: string, type: FollowableType, id: string) {
    if (type === 'user' && followerId === id) {
      throw new BadRequestException('No podés seguirte a vos mismo');
    }
    const exists = await this.modelFor(type).exists({ _id: new Types.ObjectId(id) });
    if (!exists) throw new NotFoundException('La cuenta que querés seguir no existe');

    const res = await this.model.updateOne(
      { follower: new Types.ObjectId(followerId), followableType: type, followable: new Types.ObjectId(id) },
      {
        $setOnInsert: {
          follower: new Types.ObjectId(followerId),
          followableType: type,
          followable: new Types.ObjectId(id),
        },
      },
      { upsert: true },
    );
    // Solo ajustar contadores si realmente se creó el follow (no duplicado).
    if (res.upsertedCount > 0) await this.adjustCounters(followerId, type, id, 1);
    return { following: true, type, id };
  }

  async unfollow(followerId: string, type: FollowableType, id: string) {
    const res = await this.model.deleteOne({
      follower: new Types.ObjectId(followerId),
      followableType: type,
      followable: new Types.ObjectId(id),
    });
    if (res.deletedCount > 0) await this.adjustCounters(followerId, type, id, -1);
    return { following: false, type, id };
  }

  /** Entidades que el usuario sigue (opcionalmente filtradas por tipo), pobladas. */
  async following(followerId: string, type: FollowableType | undefined, page: number, perPage: number) {
    const filter: Record<string, unknown> = { follower: new Types.ObjectId(followerId) };
    if (type) filter.followableType = type;

    const [follows, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).lean().exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    const data = await this.populateFollowables(follows);
    return { data, pagination: buildPaginationMeta(total, page, perPage) };
  }

  /** Seguidores (usuarios) de una entidad. */
  async followers(type: FollowableType, id: string, page: number, perPage: number) {
    if (!Types.ObjectId.isValid(id)) {
      return { data: [], pagination: buildPaginationMeta(0, page, perPage) };
    }
    const filter = { followableType: type, followable: new Types.ObjectId(id) };
    const [follows, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .populate({ path: 'follower', select: 'name username image' })
        .lean()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    const data = follows.map((f) => f.follower).filter(Boolean);
    return { data, pagination: buildPaginationMeta(total, page, perPage) };
  }

  async isFollowing(followerId: string, type: FollowableType, id: string): Promise<boolean> {
    const found = await this.model.exists({
      follower: new Types.ObjectId(followerId),
      followableType: type,
      followable: new Types.ObjectId(id),
    });
    return Boolean(found);
  }

  async followingIds(followerId: string, type: FollowableType, ids: string[]): Promise<string[]> {
    if (!ids.length) return [];
    const rows = await this.model
      .find({
        follower: new Types.ObjectId(followerId),
        followableType: type,
        followable: { $in: ids.map((i) => new Types.ObjectId(i)) },
      })
      .select('followable')
      .lean()
      .exec();
    return rows.map((r) => String(r.followable));
  }

  private async populateFollowables(
    follows: Array<{ followableType: FollowableType; followable: Types.ObjectId; createdAt?: Date }>,
  ) {
    const byType = new Map<FollowableType, Types.ObjectId[]>();
    for (const t of FOLLOWABLE_TYPES) byType.set(t, []);
    for (const f of follows) byType.get(f.followableType)!.push(f.followable);

    const loaded = new Map<string, unknown>();
    await Promise.all(
      FOLLOWABLE_TYPES.map(async (type) => {
        const ids = byType.get(type)!;
        if (!ids.length) return;
        const select = type === 'user' ? 'name username image followersCount' : undefined;
        const docs = await this.modelFor(type).find({ _id: { $in: ids } }, select).lean().exec();
        for (const doc of docs) loaded.set(`${type}:${String(doc._id)}`, doc);
      }),
    );

    return follows
      .map((f) => {
        const entity = loaded.get(`${f.followableType}:${String(f.followable)}`);
        if (!entity) return null;
        return { type: f.followableType, followedAt: f.createdAt ?? null, entity };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }
}
