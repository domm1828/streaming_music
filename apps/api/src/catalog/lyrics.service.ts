import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UpsertLyricDto } from './dto/catalog.dto';
import { Lyric, LyricDocument } from './schemas/lyric.schema';
import { Track, TrackDocument } from './schemas/track.schema';

@Injectable()
export class LyricsService {
  constructor(
    @InjectModel(Lyric.name) private readonly model: Model<LyricDocument>,
    @InjectModel(Track.name) private readonly trackModel: Model<TrackDocument>,
  ) {}

  async getByTrack(trackId: string): Promise<LyricDocument> {
    const lyric = Types.ObjectId.isValid(trackId)
      ? await this.model.findOne({ track: new Types.ObjectId(trackId) }).exec()
      : null;
    if (!lyric) throw new NotFoundException('Esta pista no tiene letra');
    return lyric;
  }

  async upsert(trackId: string, dto: UpsertLyricDto): Promise<LyricDocument> {
    if (!(await this.trackModel.exists({ _id: trackId }))) {
      throw new NotFoundException('Pista no encontrada');
    }
    const lyric = await this.model
      .findOneAndUpdate(
        { track: new Types.ObjectId(trackId) },
        { text: dto.text, isSynced: dto.isSynced ?? false, track: new Types.ObjectId(trackId) },
        { upsert: true, new: true },
      )
      .exec();
    return lyric as LyricDocument;
  }

  async remove(trackId: string): Promise<void> {
    const res = await this.model.deleteOne({ track: trackId }).exec();
    if (res.deletedCount === 0) throw new NotFoundException('Esta pista no tiene letra');
  }
}
