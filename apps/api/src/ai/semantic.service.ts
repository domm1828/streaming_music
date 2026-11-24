import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Track, TrackDocument } from '../catalog/schemas/track.schema';
import { Artist } from '../catalog/schemas/artist.schema';
import { Genre } from '../catalog/schemas/genre.schema';
import { cosineSimilarity, EMBEDDINGS_PROVIDER, EmbeddingsProvider } from './embeddings.provider';

@Injectable()
export class SemanticService {
  private readonly logger = new Logger(SemanticService.name);

  constructor(
    @Inject(EMBEDDINGS_PROVIDER) private readonly provider: EmbeddingsProvider,
    @InjectModel(Track.name) private readonly trackModel: Model<TrackDocument>,
  ) {}

  isConfigured(): boolean {
    return this.provider.isConfigured();
  }

  private textFor(track: { name: string; artists?: { artist?: Artist }[]; genres?: Genre[] }): string {
    const artists = (track.artists ?? []).map((a) => a.artist?.name).filter(Boolean).join(', ');
    const genres = (track.genres ?? []).map((g) => g.displayName ?? g.name).filter(Boolean).join(', ');
    return [track.name, artists, genres].filter(Boolean).join(' — ');
  }

  /** Genera embeddings de forma incremental para pistas que no lo tienen. */
  async generateMissing(batch = 50): Promise<{ processed: number }> {
    if (!this.isConfigured()) return { processed: 0 };
    const tracks = await this.trackModel
      .find({ embedding: { $exists: false } })
      .limit(batch)
      .populate('artists.artist')
      .populate('genres')
      .exec();
    if (!tracks.length) return { processed: 0 };

    const texts = tracks.map((t) => this.textFor(t as unknown as { name: string }));
    const vectors = await this.provider.embed(texts);
    await Promise.all(
      tracks.map((t, i) => this.trackModel.updateOne({ _id: t._id }, { $set: { embedding: vectors[i] } }).exec()),
    );
    this.logger.log(`Embeddings generados para ${tracks.length} pistas`);
    return { processed: tracks.length };
  }

  /** Búsqueda semántica: embebe la consulta y rankea por similitud coseno. */
  async search(query: string, limit = 20) {
    if (!query.trim() || !this.isConfigured()) return { data: [], semantic: this.isConfigured() };
    const [queryVector] = await this.provider.embed([query]);
    const tracks = await this.trackModel
      .find({ embedding: { $exists: true } })
      .select('+embedding')
      .populate('artists.artist')
      .populate('album')
      .lean()
      .exec();

    const ranked = tracks
      .map((t) => ({ track: t, score: cosineSimilarity(queryVector, (t as { embedding?: number[] }).embedding ?? []) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r) => {
        const { embedding, ...track } = r.track as unknown as Record<string, unknown> & { embedding?: number[] };
        void embedding;
        return { ...track, _score: Number(r.score.toFixed(4)) };
      });

    return { data: ranked, semantic: true };
  }

  /** Pistas similares a una dada (recomendación semántica). */
  async similar(trackId: string, limit = 20) {
    if (!Types.ObjectId.isValid(trackId) || !this.isConfigured()) return { data: [] };
    const seed = await this.trackModel.findById(trackId).select('+embedding name').lean().exec();
    const seedVector = (seed as { embedding?: number[] } | null)?.embedding;
    if (!seedVector) return { data: [] };

    const tracks = await this.trackModel
      .find({ embedding: { $exists: true }, _id: { $ne: new Types.ObjectId(trackId) } })
      .select('+embedding')
      .populate('artists.artist')
      .lean()
      .exec();

    const ranked = tracks
      .map((t) => ({ track: t, score: cosineSimilarity(seedVector, (t as { embedding?: number[] }).embedding ?? []) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r) => {
        const { embedding, ...track } = r.track as unknown as Record<string, unknown> & { embedding?: number[] };
        void embedding;
        return track;
      });
    return { data: ranked };
  }
}
