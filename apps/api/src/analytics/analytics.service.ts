import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Album, AlbumDocument } from '../catalog/schemas/album.schema';
import { Artist, ArtistDocument } from '../catalog/schemas/artist.schema';
import { Track, TrackDocument } from '../catalog/schemas/track.schema';
import { TrackPlay, TrackPlayDocument } from '../catalog/schemas/track-play.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

export interface TopEntity {
  id: string;
  name: string;
  plays: number;
}

export interface TopUser {
  id: string;
  name: string;
  username: string;
  plays: number;
}

export interface NamedCount {
  label: string;
  plays: number;
}

export interface AnalyticsOverview {
  days: number;
  totals: { users: number; artists: number; albums: number; tracks: number; plays: number };
  newUsers: number;
  playsByDay: { day: string; plays: number }[];
  topTracks: TopEntity[];
  topArtists: TopEntity[];
  topAlbums: TopEntity[];
  topUsers: TopUser[];
  topCountries: { country: string; plays: number }[];
  devices: NamedCount[];
  platforms: NamedCount[];
}

/** Rangos de días admitidos por el panel. */
export const ANALYTICS_WINDOWS = [7, 14, 30, 90] as const;
const DEFAULT_WINDOW = 14;

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Artist.name) private readonly artistModel: Model<ArtistDocument>,
    @InjectModel(Album.name) private readonly albumModel: Model<AlbumDocument>,
    @InjectModel(Track.name) private readonly trackModel: Model<TrackDocument>,
    @InjectModel(TrackPlay.name) private readonly playModel: Model<TrackPlayDocument>,
  ) {}

  /** Normaliza el rango pedido a uno admitido (default 14 días). */
  normalizeWindow(days?: number): number {
    return days && (ANALYTICS_WINDOWS as readonly number[]).includes(days) ? days : DEFAULT_WINDOW;
  }

  async overview(days?: number): Promise<AnalyticsOverview> {
    const windowDays = this.normalizeWindow(days);
    const since = new Date(Date.now() - windowDays * 86_400_000);
    const inWindow = { createdAt: { $gte: since } };

    const [users, artists, albums, tracks, plays] = await Promise.all([
      this.userModel.countDocuments().exec(),
      this.artistModel.countDocuments().exec(),
      this.albumModel.countDocuments().exec(),
      this.trackModel.countDocuments().exec(),
      this.playModel.countDocuments().exec(),
    ]);

    const [topTracks, topArtists, topAlbums, topUsers, playsByDay, topCountries, devices, platforms, newUsers] =
      await Promise.all([
        this.playModel.aggregate<TopEntity>([
          { $match: inWindow },
          { $group: { _id: '$track', plays: { $sum: 1 } } },
          { $sort: { plays: -1 } },
          { $limit: 10 },
          { $lookup: { from: 'tracks', localField: '_id', foreignField: '_id', as: 'track' } },
          { $unwind: '$track' },
          { $project: { _id: 0, id: { $toString: '$_id' }, name: '$track.name', plays: 1 } },
        ]),
        this.playModel.aggregate<TopEntity>([
          { $match: inWindow },
          { $lookup: { from: 'tracks', localField: 'track', foreignField: '_id', as: 't' } },
          { $unwind: '$t' },
          { $unwind: '$t.artists' },
          { $group: { _id: '$t.artists.artist', plays: { $sum: 1 } } },
          { $sort: { plays: -1 } },
          { $limit: 10 },
          { $lookup: { from: 'artists', localField: '_id', foreignField: '_id', as: 'a' } },
          { $unwind: '$a' },
          { $project: { _id: 0, id: { $toString: '$_id' }, name: '$a.name', plays: 1 } },
        ]),
        this.playModel.aggregate<TopEntity>([
          { $match: inWindow },
          { $lookup: { from: 'tracks', localField: 'track', foreignField: '_id', as: 't' } },
          { $unwind: '$t' },
          { $match: { 't.album': { $ne: null } } },
          { $group: { _id: '$t.album', plays: { $sum: 1 } } },
          { $sort: { plays: -1 } },
          { $limit: 10 },
          { $lookup: { from: 'albums', localField: '_id', foreignField: '_id', as: 'al' } },
          { $unwind: '$al' },
          { $project: { _id: 0, id: { $toString: '$_id' }, name: '$al.name', plays: 1 } },
        ]),
        this.playModel.aggregate<TopUser>([
          { $match: { ...inWindow, user: { $ne: null } } },
          { $group: { _id: '$user', plays: { $sum: 1 } } },
          { $sort: { plays: -1 } },
          { $limit: 10 },
          { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } },
          { $unwind: '$u' },
          { $project: { _id: 0, id: { $toString: '$_id' }, name: '$u.name', username: '$u.username', plays: 1 } },
        ]),
        this.playModel.aggregate<{ _id: string; plays: number }>([
          { $match: inWindow },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, plays: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
        this.playModel.aggregate<{ _id: string; plays: number }>([
          { $match: { ...inWindow, country: { $ne: null } } },
          { $group: { _id: '$country', plays: { $sum: 1 } } },
          { $sort: { plays: -1 } },
          { $limit: 8 },
        ]),
        this.playModel.aggregate<{ _id: string; plays: number }>([
          { $match: { ...inWindow, device: { $ne: null } } },
          { $group: { _id: '$device', plays: { $sum: 1 } } },
          { $sort: { plays: -1 } },
        ]),
        this.playModel.aggregate<{ _id: string; plays: number }>([
          { $match: { ...inWindow, platform: { $ne: null } } },
          { $group: { _id: '$platform', plays: { $sum: 1 } } },
          { $sort: { plays: -1 } },
        ]),
        this.userModel.countDocuments({ createdAt: { $gte: since } }).exec(),
      ]);

    return {
      days: windowDays,
      totals: { users, artists, albums, tracks, plays },
      newUsers,
      playsByDay: playsByDay.map((d) => ({ day: d._id, plays: d.plays })),
      topTracks,
      topArtists,
      topAlbums,
      topUsers,
      topCountries: topCountries.map((c) => ({ country: c._id, plays: c.plays })),
      devices: devices.map((d) => ({ label: d._id, plays: d.plays })),
      platforms: platforms.map((p) => ({ label: p._id, plays: p.plays })),
    };
  }
}
