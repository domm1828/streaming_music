import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CATALOG_CHANGED, CatalogChangedEvent } from '../common/events';
import { AudioService } from '../catalog/audio.service';
import { Track, TrackDocument } from '../catalog/schemas/track.schema';
import { StorageService } from '../storage/storage.service';
import type { ImportSummary } from './import.service';
import { parseYoutubeId, YOUTUBE_DOWNLOADER, YoutubeDownloader } from './youtube-downloader';

/** Descarga el audio de un video de YouTube y lo agrega al catálogo como pista. */
@Injectable()
export class YoutubeIngestService {
  private readonly logger = new Logger(YoutubeIngestService.name);

  constructor(
    @Inject(YOUTUBE_DOWNLOADER) private readonly downloader: YoutubeDownloader,
    @InjectModel(Track.name) private readonly trackModel: Model<TrackDocument>,
    private readonly storage: StorageService,
    private readonly audio: AudioService,
    private readonly events: EventEmitter2,
  ) {}

  async ingest(url: string, userId: string | null): Promise<ImportSummary> {
    const summary: ImportSummary = { artists: 0, albums: 0, tracks: 0, playlists: 0, genres: 0, skipped: false };
    const videoId = parseYoutubeId(url);

    const info = await this.downloader.info(videoId);
    const { buffer, ext } = await this.downloader.downloadAudio(videoId);

    const trackId = new Types.ObjectId();
    const stored = await this.storage.saveBuffer(buffer, 'audio', `${trackId.toString()}.${ext}`);
    const meta = await this.audio.extractMetadata(buffer);

    const track = await this.trackModel.create({
      _id: trackId,
      name: info.title || meta.title || 'Audio de YouTube',
      srcType: 'audio',
      src: stored.publicPath,
      duration: meta.duration || info.durationSeconds || 0,
      owner: userId ? new Types.ObjectId(userId) : null,
    });

    void this.generateWaveform(String(track._id), buffer);
    this.events.emit(CATALOG_CHANGED, { type: 'track', id: String(track._id), action: 'upsert' } as CatalogChangedEvent);

    summary.tracks = 1;
    this.logger.log(`Audio importado de YouTube ${videoId} → pista ${track._id}`);
    return summary;
  }

  /** Genera la waveform sin bloquear (mismo patrón que TracksService). */
  private async generateWaveform(trackId: string, buffer: Buffer): Promise<void> {
    try {
      const peaks = this.audio.generateWaveformPeaks(buffer);
      const stored = await this.storage.saveJson('waveforms', `${trackId}.json`, { peaks });
      await this.trackModel.updateOne({ _id: trackId }, { waveformPath: stored.publicPath }).exec();
    } catch (err) {
      this.logger.warn(`Waveform falló para ${trackId}: ${(err as Error).message}`);
    }
  }
}
