import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { buildPaginationMeta } from '@stream-music/shared';
import { TrackPlay, TrackPlayDocument } from './schemas/track-play.schema';
import { TracksService } from './tracks.service';

export interface PlayMeta {
  platform?: string | null;
  device?: string | null;
}

@Injectable()
export class PlaysService {
  constructor(
    @InjectModel(TrackPlay.name) private readonly model: Model<TrackPlayDocument>,
    private readonly tracks: TracksService,
  ) {}

  async log(trackId: string, userId: string | null, meta: PlayMeta): Promise<void> {
    await this.model.create({
      track: new Types.ObjectId(trackId),
      user: userId ? new Types.ObjectId(userId) : null,
      platform: meta.platform ?? null,
      device: meta.device ?? null,
    });
    await this.tracks.incrementPlays(trackId);
  }

  async history(userId: string, page: number, perPage: number) {
    const filter = { user: new Types.ObjectId(userId) };
    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .populate({ path: 'track', populate: { path: 'artists.artist' } })
        .lean()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data, pagination: buildPaginationMeta(total, page, perPage) };
  }
}
