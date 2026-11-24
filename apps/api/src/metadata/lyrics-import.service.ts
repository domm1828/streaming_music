import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lyric, LyricDocument } from '../catalog/schemas/lyric.schema';
import { Track, TrackDocument } from '../catalog/schemas/track.schema';
import { Artist } from '../catalog/schemas/artist.schema';
import { LYRICS_PROVIDERS, LyricsProvider } from './provider.types';

export interface LyricsResult {
  found: boolean;
  source: string | null;
}

/** Orquesta las fuentes de letras: prueba en orden y guarda la primera que responde. */
@Injectable()
export class LyricsImportService {
  private readonly logger = new Logger(LyricsImportService.name);

  constructor(
    @Inject(LYRICS_PROVIDERS) private readonly providers: LyricsProvider[],
    @InjectModel(Track.name) private readonly trackModel: Model<TrackDocument>,
    @InjectModel(Lyric.name) private readonly lyricModel: Model<LyricDocument>,
  ) {}

  /** Nombres de las fuentes configuradas, en orden de prioridad. */
  get sources(): string[] {
    return this.providers.map((p) => p.name);
  }

  async fetchForTrack(trackId: string): Promise<LyricsResult> {
    if (!Types.ObjectId.isValid(trackId)) throw new NotFoundException('Pista no encontrada');
    const track = await this.trackModel
      .findById(trackId)
      .populate<{ artists: { artist: Artist }[] }>('artists.artist')
      .lean()
      .exec();
    if (!track) throw new NotFoundException('Pista no encontrada');

    const artistName = track.artists?.[0]?.artist?.name ?? '';

    for (const provider of this.providers) {
      const text = await provider.fetchLyrics(track.name, artistName);
      if (text) {
        await this.lyricModel.updateOne(
          { track: new Types.ObjectId(trackId) },
          { $set: { text, isSynced: false, source: provider.name } },
          { upsert: true },
        );
        this.logger.log(`Letra de "${track.name}" obtenida de ${provider.name}`);
        return { found: true, source: provider.name };
      }
    }
    return { found: false, source: null };
  }
}
