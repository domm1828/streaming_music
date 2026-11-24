import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { buildPaginationMeta } from '@stream-music/shared';
import { GeoService } from '../geo/geo.service';
import { TrackPlay, TrackPlayDocument } from './schemas/track-play.schema';
import { ListenUsage, ListenUsageDocument } from './schemas/listen-usage.schema';
import { TracksService } from './tracks.service';

export interface PlayMeta {
  platform?: string | null;
  device?: string | null;
  ip?: string | null;
}

/** Periodo mensual actual en formato YYYY-MM. */
function currentPeriod(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class PlaysService {
  constructor(
    @InjectModel(TrackPlay.name) private readonly model: Model<TrackPlayDocument>,
    @InjectModel(ListenUsage.name) private readonly usageModel: Model<ListenUsageDocument>,
    private readonly tracks: TracksService,
    private readonly config: ConfigService,
    private readonly geo: GeoService,
  ) {}

  async log(trackId: string, userId: string | null, meta: PlayMeta): Promise<void> {
    await this.model.create({
      track: new Types.ObjectId(trackId),
      user: userId ? new Types.ObjectId(userId) : null,
      platform: meta.platform ?? null,
      device: meta.device ?? null,
      country: this.geo.country(meta.ip),
    });
    await this.tracks.incrementPlays(trackId);

    // Acumular minutos de escucha del usuario autenticado para el límite de plan.
    if (userId) {
      const seconds = await this.tracks.getDurationSeconds(trackId);
      if (seconds > 0) {
        await this.usageModel.updateOne(
          { user: new Types.ObjectId(userId), period: currentPeriod() },
          { $inc: { seconds } },
          { upsert: true },
        );
      }
    }
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

  /** Minutos escuchados y restantes en el periodo actual. */
  async listeningStatus(userId: string) {
    const period = currentPeriod();
    const usage = await this.usageModel
      .findOne({ user: new Types.ObjectId(userId), period })
      .lean()
      .exec();
    const usedSeconds = usage?.seconds ?? 0;
    const limitMinutes = this.config.get<number>('features.listenMinutesLimit') ?? 0;
    const usedMinutes = Math.floor(usedSeconds / 60);
    const remainingMinutes =
      limitMinutes > 0 ? Math.max(limitMinutes - usedMinutes, 0) : null; // null = ilimitado
    return {
      period,
      usedMinutes,
      limitMinutes: limitMinutes > 0 ? limitMinutes : null,
      remainingMinutes,
      exhausted: remainingMinutes !== null && remainingMinutes <= 0,
    };
  }

  /** True si el usuario agotó su cuota de minutos (si hay límite configurado). */
  async hasRemainingMinutes(userId: string): Promise<boolean> {
    const status = await this.listeningStatus(userId);
    return !status.exhausted;
  }

  /**
   * Insights agregados del historial del usuario en un periodo:
   * total de reproducciones, pistas y artistas más escuchados.
   */
  async insights(userId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const user = new Types.ObjectId(userId);
    const baseMatch = { user, createdAt: { $gte: since } };

    const [totals, topTracks, topArtists] = await Promise.all([
      this.model.aggregate<{ totalPlays: number; uniqueTracks: string[] }>([
        { $match: baseMatch },
        { $group: { _id: null, totalPlays: { $sum: 1 }, uniqueTracks: { $addToSet: '$track' } } },
      ]),
      this.model.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$track', plays: { $sum: 1 } } },
        { $sort: { plays: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'tracks', localField: '_id', foreignField: '_id', as: 'track' } },
        { $unwind: '$track' },
        { $project: { _id: 0, plays: 1, track: { _id: 1, name: 1, image: 1, duration: 1 } } },
      ]),
      this.model.aggregate([
        { $match: baseMatch },
        { $lookup: { from: 'tracks', localField: 'track', foreignField: '_id', as: 'track' } },
        { $unwind: '$track' },
        { $unwind: '$track.artists' },
        { $group: { _id: '$track.artists.artist', plays: { $sum: 1 } } },
        { $sort: { plays: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'artists', localField: '_id', foreignField: '_id', as: 'artist' } },
        { $unwind: '$artist' },
        { $project: { _id: 0, plays: 1, artist: { _id: 1, name: 1, image: 1 } } },
      ]),
    ]);

    const summary = totals[0];
    return {
      periodDays: days,
      totalPlays: summary?.totalPlays ?? 0,
      uniqueTracks: summary?.uniqueTracks?.length ?? 0,
      topTracks,
      topArtists,
    };
  }
}
