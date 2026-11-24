import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Track, TrackDocument } from '../catalog/schemas/track.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { PlaylistsService } from '../playlists/playlists.service';
import { FollowsService } from '../social/follows.service';
import { RepostsService } from '../social/reposts.service';
import { UpdateProfileDto } from '../users/dto/update-profile.dto';

/** Campos públicos del perfil de un usuario. */
const PUBLIC_FIELDS =
  'name username image bio coverImage country links followersCount followingCount createdAt';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Track.name) private readonly trackModel: Model<TrackDocument>,
    private readonly playlists: PlaylistsService,
    private readonly follows: FollowsService,
    private readonly reposts: RepostsService,
  ) {}

  /** Actualiza el perfil del propio usuario. */
  async updateOwn(userId: string, dto: UpdateProfileDto) {
    const update: Record<string, unknown> = {};
    if (dto.name !== undefined) update.name = dto.name;
    if (dto.bio !== undefined) update.bio = dto.bio;
    if (dto.image !== undefined) update.image = dto.image;
    if (dto.coverImage !== undefined) update.coverImage = dto.coverImage;
    if (dto.country !== undefined) update.country = dto.country;
    if (dto.links !== undefined) update.links = dto.links;

    const user = await this.userModel
      .findByIdAndUpdate(userId, update, { new: true })
      .select(PUBLIC_FIELDS)
      .lean()
      .exec();
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  /** Perfil público por username, con sus paneles de contenido. */
  async getByUsername(username: string, viewerId?: string) {
    const user = await this.userModel
      .findOne({ username: username.toLowerCase() })
      .select(PUBLIC_FIELDS)
      .lean()
      .exec();
    if (!user) throw new NotFoundException('Perfil no encontrado');

    const userId = String(user._id);
    const [playlists, reposts, tracks, isFollowing] = await Promise.all([
      this.playlists.listPublicByOwner(userId, 1, 12),
      this.reposts.listByUser(userId, 1, 12),
      this.trackModel
        .find({ owner: new Types.ObjectId(userId) })
        .sort({ plays: -1 })
        .limit(12)
        .populate('artists.artist')
        .populate('album')
        .lean()
        .exec(),
      viewerId ? this.follows.isFollowing(viewerId, 'user', userId) : Promise.resolve(false),
    ]);

    return {
      user,
      isFollowing,
      isSelf: viewerId === userId,
      playlists: playlists.data,
      reposts: reposts.data,
      tracks,
    };
  }
}
