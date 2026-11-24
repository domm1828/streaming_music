import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Album, AlbumDocument } from '../catalog/schemas/album.schema';
import { Artist, ArtistDocument } from '../catalog/schemas/artist.schema';
import { Track, TrackDocument } from '../catalog/schemas/track.schema';
import { TrackPlay, TrackPlayDocument } from '../catalog/schemas/track-play.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

export interface AnalyticsOverview {
  totals: { users: number; artists: number; albums: number; tracks: number; plays: number };
  newUsers: number;
  topTracks: { id: string; name: string; plays: number }[];
  playsByDay: { day: string; plays: number }[];
  topCountries: { country: string; plays: number }[];
}

const WINDOW_DAYS = 14;

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Artist.name) private readonly artistModel: Model<ArtistDocument>,
    @InjectModel(Album.name) private readonly albumModel: Model<AlbumDocument>,
    @InjectModel(Track.name) private readonly trackModel: Model<TrackDocument>,
    @InjectModel(TrackPlay.name) private readonly playModel: Model<TrackPlayDocument>,
  ) {}

  async overview(): Promise<AnalyticsOverview> {
    const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000);

    const [users, artists, albums, tracks, plays] = await Promise.all([
      this.userModel.countDocuments().exec(),
      this.artistModel.countDocuments().exec(),
      this.albumModel.countDocuments().exec(),
      this.trackModel.countDocuments().exec(),
      this.playModel.countDocuments().exec(),
    ]);

    const [topTracks, playsByDay, topCountries, newUsers] = await Promise.all([
      this.playModel.aggregate<{ id: string; name: string; plays: number }>([
        { $group: { _id: '$track', plays: { $sum: 1 } } },
        { $sort: { plays: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'tracks', localField: '_id', foreignField: '_id', as: 'track' } },
        { $unwind: '$track' },
        { $project: { _id: 0, id: { $toString: '$_id' }, name: '$track.name', plays: 1 } },
      ]),
      this.playModel.aggregate<{ _id: string; plays: number }>([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, plays: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      this.playModel.aggregate<{ _id: string; plays: number }>([
        { $match: { country: { $ne: null } } },
        { $group: { _id: '$country', plays: { $sum: 1 } } },
        { $sort: { plays: -1 } },
        { $limit: 8 },
      ]),
      this.userModel.countDocuments({ createdAt: { $gte: since } }).exec(),
    ]);

    return {
      totals: { users, artists, albums, tracks, plays },
      newUsers,
      topTracks,
      playsByDay: playsByDay.map((d) => ({ day: d._id, plays: d.plays })),
      topCountries: topCountries.map((c) => ({ country: c._id, plays: c.plays })),
    };
  }
}
