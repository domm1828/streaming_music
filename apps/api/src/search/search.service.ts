import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Meilisearch, type Index } from 'meilisearch';
import { Model, Types } from 'mongoose';
import { buildPaginationMeta } from '@stream-music/shared';
import { Artist, ArtistDocument } from '../catalog/schemas/artist.schema';
import { Album, AlbumDocument } from '../catalog/schemas/album.schema';
import { Track, TrackDocument } from '../catalog/schemas/track.schema';
import { Playlist, PlaylistDocument } from '../playlists/schemas/playlist.schema';
import type { SearchConfig } from '../config/configuration';
import { escapeRegex, SEARCHABLE_TYPES, SEARCH_INDEXES, SearchableType, Suggestion } from './search.types';

interface TypeResult {
  type: SearchableType;
  data: unknown[];
  pagination: ReturnType<typeof buildPaginationMeta>;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private meili: Meilisearch | null = null;
  private meiliReady = false;

  constructor(
    private readonly config: ConfigService,
    @InjectModel(Artist.name) private readonly artistModel: Model<ArtistDocument>,
    @InjectModel(Album.name) private readonly albumModel: Model<AlbumDocument>,
    @InjectModel(Track.name) private readonly trackModel: Model<TrackDocument>,
    @InjectModel(Playlist.name) private readonly playlistModel: Model<PlaylistDocument>,
  ) {
    const cfg = this.config.get<SearchConfig>('search');
    if (cfg && cfg.driver !== 'mongo' && cfg.meiliHost) {
      this.meili = new Meilisearch({ host: cfg.meiliHost, apiKey: cfg.meiliKey || undefined });
    }
  }

  async onModuleInit(): Promise<void> {
    if (!this.meili) {
      this.logger.log('Búsqueda: driver Mongo (Meilisearch no configurado)');
      return;
    }
    try {
      await this.meili.health();
      await this.ensureIndexes();
      this.meiliReady = true;
      this.logger.log('Búsqueda: driver Meilisearch');
      void this.reindexAll().catch((e) =>
        this.logger.warn(`Reindex inicial falló: ${(e as Error).message}`),
      );
    } catch (e) {
      this.logger.warn(`Meilisearch no disponible (${(e as Error).message}); usando Mongo`);
    }
  }

  get usingMeili(): boolean {
    return this.meiliReady;
  }

  // ---------------------------------------------------------------------------
  // Lectura
  // ---------------------------------------------------------------------------

  /** Búsqueda de un tipo con paginación. */
  async searchType(type: SearchableType, q: string, page: number, perPage: number): Promise<TypeResult> {
    if (!q.trim()) return { type, data: [], pagination: buildPaginationMeta(0, page, perPage) };
    if (this.meiliReady) return this.meiliSearch(type, q, page, perPage);
    return this.mongoSearch(type, q, page, perPage);
  }

  /** Vista general: pocos resultados de cada tipo. */
  async overview(q: string, types: SearchableType[], perType = 6) {
    const results: Partial<Record<SearchableType, unknown[]>> = {};
    await Promise.all(
      types.map(async (type) => {
        const r = await this.searchType(type, q, 1, perType);
        results[type] = r.data;
      }),
    );
    return { query: q, results };
  }

  /** Sugerencias instantáneas (nombres + imagen) de baja latencia. */
  async suggest(q: string, limit = 5): Promise<{ query: string; suggestions: Suggestion[] }> {
    if (!q.trim()) return { query: q, suggestions: [] };
    const types: SearchableType[] = ['artist', 'album', 'track'];
    const perType = Math.max(1, Math.ceil(limit / types.length));
    const groups = await Promise.all(types.map((t) => this.searchType(t, q, 1, perType)));
    const suggestions: Suggestion[] = [];
    for (const g of groups) {
      for (const doc of g.data as Array<{ _id: unknown; name: string; image?: string | null }>) {
        suggestions.push({ type: g.type, id: String(doc._id), name: doc.name, image: doc.image ?? null });
      }
    }
    return { query: q, suggestions: suggestions.slice(0, limit) };
  }

  private async mongoSearch(
    type: SearchableType,
    q: string,
    page: number,
    perPage: number,
  ): Promise<TypeResult> {
    const rx = { $regex: escapeRegex(q), $options: 'i' };
    const skip = (page - 1) * perPage;

    const run = async (
      model: Model<unknown>,
      filter: Record<string, unknown>,
      sort: Record<string, 1 | -1>,
      populate: string[],
    ): Promise<TypeResult> => {
      let query = model.find(filter).sort(sort).skip(skip).limit(perPage);
      for (const p of populate) query = query.populate(p);
      const [data, total] = await Promise.all([
        query.lean().exec(),
        model.countDocuments(filter).exec(),
      ]);
      return { type, data, pagination: buildPaginationMeta(total, page, perPage) };
    };

    const asModel = (m: unknown) => m as Model<unknown>;
    switch (type) {
      case 'artist':
        return run(asModel(this.artistModel), { name: rx }, { followers: -1, views: -1 }, []);
      case 'album':
        return run(asModel(this.albumModel), { name: rx }, { createdAt: -1 }, ['artists']);
      case 'track':
        return run(asModel(this.trackModel), { name: rx }, { plays: -1 }, ['artists.artist', 'album']);
      case 'playlist':
        return run(asModel(this.playlistModel), { name: rx, public: true }, { followersCount: -1 }, []);
    }
  }

  private async meiliSearch(
    type: SearchableType,
    q: string,
    page: number,
    perPage: number,
  ): Promise<TypeResult> {
    const index = this.meili!.index(SEARCH_INDEXES[type]);
    const res = await index.search(q, { limit: perPage, offset: (page - 1) * perPage });
    // Rehidratar desde Mongo para devolver documentos poblados consistentes con el resto de la API.
    const hits = res.hits as Array<{ id: string }>;
    const ids = hits.map((h) => new Types.ObjectId(String(h.id)));
    const data = await this.hydrate(type, ids);
    return { type, data, pagination: buildPaginationMeta(res.estimatedTotalHits ?? data.length, page, perPage) };
  }

  private async hydrate(type: SearchableType, ids: Types.ObjectId[]): Promise<unknown[]> {
    if (!ids.length) return [];
    const order = new Map(ids.map((id, i) => [String(id), i]));
    const sortByOrder = (docs: Array<{ _id: unknown }>) =>
      docs.sort((a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0));
    switch (type) {
      case 'artist':
        return sortByOrder(await this.artistModel.find({ _id: { $in: ids } }).lean().exec());
      case 'album':
        return sortByOrder(await this.albumModel.find({ _id: { $in: ids } }).populate('artists').lean().exec());
      case 'track':
        return sortByOrder(
          await this.trackModel.find({ _id: { $in: ids } }).populate('artists.artist').populate('album').lean().exec(),
        );
      case 'playlist':
        return sortByOrder(await this.playlistModel.find({ _id: { $in: ids } }).lean().exec());
    }
  }

  // ---------------------------------------------------------------------------
  // Indexación (solo con Meilisearch activo; con Mongo la búsqueda lee las colecciones)
  // ---------------------------------------------------------------------------

  private async ensureIndexes(): Promise<void> {
    if (!this.meili) return;
    const searchable: Record<SearchableType, string[]> = {
      artist: ['name'],
      album: ['name'],
      track: ['name'],
      playlist: ['name', 'description'],
    };
    const sortable: Record<SearchableType, string[]> = {
      artist: ['followers', 'views'],
      album: ['createdAt'],
      track: ['plays'],
      playlist: ['followersCount'],
    };
    for (const type of SEARCHABLE_TYPES) {
      const index = this.meili.index(SEARCH_INDEXES[type]);
      await this.meili.createIndex(SEARCH_INDEXES[type], { primaryKey: 'id' }).catch(() => undefined);
      await index.updateSearchableAttributes(searchable[type]);
      await index.updateSortableAttributes(sortable[type]);
    }
  }

  private indexFor(type: SearchableType): Index | null {
    return this.meili ? this.meili.index(SEARCH_INDEXES[type]) : null;
  }

  private toDocument(type: SearchableType, doc: Record<string, unknown>): Record<string, unknown> {
    const base = { id: String(doc._id), name: doc.name };
    if (type === 'playlist') return { ...base, description: doc.description ?? '', followersCount: doc.followersCount ?? 0, public: doc.public };
    if (type === 'track') return { ...base, plays: doc.plays ?? 0 };
    if (type === 'album') return { ...base, createdAt: doc.createdAt };
    return { ...base, followers: doc.followers ?? 0, views: doc.views ?? 0 };
  }

  private modelFor(type: SearchableType): Model<{ _id: Types.ObjectId }> {
    const map = {
      artist: this.artistModel,
      album: this.albumModel,
      track: this.trackModel,
      playlist: this.playlistModel,
    } as const;
    return map[type] as unknown as Model<{ _id: Types.ObjectId }>;
  }

  /** Sincroniza (o elimina) un documento en el índice. No-op sin Meilisearch. */
  async syncOne(type: SearchableType, id: string): Promise<void> {
    if (!this.meiliReady) return;
    const index = this.indexFor(type);
    if (!index) return;
    const doc = await this.modelFor(type).findById(id).lean().exec();
    if (!doc) {
      await index.deleteDocument(id).catch(() => undefined);
      return;
    }
    await index.addDocuments([this.toDocument(type, doc as Record<string, unknown>)]);
  }

  async removeOne(type: SearchableType, id: string): Promise<void> {
    if (!this.meiliReady) return;
    await this.indexFor(type)?.deleteDocument(id).catch(() => undefined);
  }

  /** Reindexa todo el catálogo. Devuelve el conteo por tipo. */
  async reindexAll(): Promise<Record<SearchableType, number>> {
    const counts = { artist: 0, album: 0, track: 0, playlist: 0 } as Record<SearchableType, number>;
    if (!this.meiliReady) return counts;
    for (const type of SEARCHABLE_TYPES) {
      const index = this.indexFor(type)!;
      const filter = type === 'playlist' ? { public: true } : {};
      const docs = await this.modelFor(type).find(filter).lean().exec();
      if (docs.length) {
        await index.addDocuments(docs.map((d) => this.toDocument(type, d as Record<string, unknown>)));
      }
      counts[type] = docs.length;
    }
    return counts;
  }
}
