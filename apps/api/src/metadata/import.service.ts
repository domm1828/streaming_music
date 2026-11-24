import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import slugify from 'slugify';
import { CATALOG_CHANGED, CatalogChangedEvent, SearchableEntity } from '../common/events';
import { Artist, ArtistDocument } from '../catalog/schemas/artist.schema';
import { Album, AlbumDocument } from '../catalog/schemas/album.schema';
import { Track, TrackDocument } from '../catalog/schemas/track.schema';
import { Genre, GenreDocument } from '../catalog/schemas/genre.schema';
import { Playlist, PlaylistDocument } from '../playlists/schemas/playlist.schema';
import {
  METADATA_PROVIDER,
  MetadataProvider,
  NormalizedAlbum,
  NormalizedArtist,
  ProviderNotConfiguredError,
  SECONDARY_METADATA_PROVIDER,
  SecondaryMetadataProvider,
} from './provider.types';
import { ImportJob, ImportJobDocument, ImportJobType } from './schemas/import-job.schema';
import { YoutubeIngestService } from './youtube-ingest.service';

export interface ImportSummary {
  artists: number;
  albums: number;
  tracks: number;
  playlists: number;
  genres: number;
  skipped: boolean;
}

const MAX_ATTEMPTS = 3;

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    @Inject(METADATA_PROVIDER) private readonly provider: MetadataProvider,
    @Inject(SECONDARY_METADATA_PROVIDER) private readonly secondary: SecondaryMetadataProvider,
    @InjectModel(Artist.name) private readonly artistModel: Model<ArtistDocument>,
    @InjectModel(Album.name) private readonly albumModel: Model<AlbumDocument>,
    @InjectModel(Track.name) private readonly trackModel: Model<TrackDocument>,
    @InjectModel(Genre.name) private readonly genreModel: Model<GenreDocument>,
    @InjectModel(Playlist.name) private readonly playlistModel: Model<PlaylistDocument>,
    @InjectModel(ImportJob.name) private readonly jobModel: Model<ImportJobDocument>,
    private readonly events: EventEmitter2,
    private readonly youtube: YoutubeIngestService,
  ) {}

  providerConfigured(): boolean {
    return this.provider.isConfigured();
  }

  private emit(type: SearchableEntity, id: unknown): void {
    this.events.emit(CATALOG_CHANGED, { type, id: String(id), action: 'upsert' } as CatalogChangedEvent);
  }

  // --- Upserts idempotentes por id externo / nombre ---

  private async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name, { lower: true, strict: true }) || 'artist';
    let slug = base;
    let i = 1;
    while (await this.artistModel.exists({ slug })) slug = `${base}-${++i}`;
    return slug;
  }

  private async ensureGenres(names: string[], cache: Map<string, Types.ObjectId>): Promise<Types.ObjectId[]> {
    const ids: Types.ObjectId[] = [];
    for (const raw of names) {
      const name = raw.trim().toLowerCase();
      if (!name) continue;
      if (cache.has(name)) {
        ids.push(cache.get(name)!);
        continue;
      }
      const existing = await this.genreModel.findOne({ name }).select('_id').lean().exec();
      let id: Types.ObjectId;
      if (existing) id = existing._id as Types.ObjectId;
      else {
        const created = await this.genreModel.create({ name, displayName: raw.trim() });
        id = created._id as Types.ObjectId;
      }
      cache.set(name, id);
      ids.push(id);
    }
    return ids;
  }

  /** Upsert de un artista por spotifyId. Devuelve id interno y si fue creado. */
  private async upsertArtist(
    norm: NormalizedArtist,
    genreCache: Map<string, Types.ObjectId>,
    counters: ImportSummary,
  ): Promise<ArtistDocument> {
    let artist = await this.artistModel.findOne({ spotifyId: norm.externalId }).exec();
    const genres = await this.ensureGenres(norm.genres, genreCache);
    if (!artist) {
      artist = await this.artistModel.create({
        name: norm.name,
        slug: await this.uniqueSlug(norm.name),
        spotifyId: norm.externalId,
        image: norm.image,
        bio: norm.bio,
        spotifyFollowers: norm.followers,
        spotifyPopularity: norm.popularity,
        genres,
      });
      counters.artists += 1;
    } else {
      artist.image = norm.image ?? artist.image;
      if (norm.bio) artist.bio = norm.bio;
      artist.spotifyFollowers = norm.followers;
      artist.spotifyPopularity = norm.popularity;
      if (genres.length) artist.genres = genres;
      await artist.save();
    }
    this.emit('artist', artist._id);
    return artist;
  }

  /** Asegura que un artista (por id externo) exista, importándolo si falta. */
  private async ensureArtist(
    externalId: string,
    idCache: Map<string, Types.ObjectId>,
    genreCache: Map<string, Types.ObjectId>,
    counters: ImportSummary,
  ): Promise<Types.ObjectId> {
    if (idCache.has(externalId)) return idCache.get(externalId)!;
    const existing = await this.artistModel.findOne({ spotifyId: externalId }).select('_id').lean().exec();
    if (existing) {
      idCache.set(externalId, existing._id as Types.ObjectId);
      return existing._id as Types.ObjectId;
    }
    const norm = await this.provider.getArtist(externalId);
    const artist = await this.upsertArtist(norm, genreCache, counters);
    idCache.set(externalId, artist._id as Types.ObjectId);
    return artist._id as Types.ObjectId;
  }

  private async upsertAlbumWithTracks(
    norm: NormalizedAlbum,
    idCache: Map<string, Types.ObjectId>,
    genreCache: Map<string, Types.ObjectId>,
    fallbackGenres: Types.ObjectId[],
    counters: ImportSummary,
  ): Promise<void> {
    const artistIds = await Promise.all(
      norm.artistExternalIds.map((ext) => this.ensureArtist(ext, idCache, genreCache, counters)),
    );
    const genres = norm.genres.length ? await this.ensureGenres(norm.genres, genreCache) : fallbackGenres;

    let album = await this.albumModel.findOne({ spotifyId: norm.externalId }).exec();
    if (!album) {
      album = await this.albumModel.create({
        name: norm.name,
        spotifyId: norm.externalId,
        image: norm.image,
        releaseDate: norm.releaseDate ? new Date(norm.releaseDate) : null,
        popularity: norm.popularity,
        artists: artistIds,
        genres,
        fullyScraped: true,
      });
      counters.albums += 1;
    } else {
      album.image = norm.image ?? album.image;
      album.artists = artistIds;
      if (genres.length) album.genres = genres;
      album.fullyScraped = true;
      await album.save();
    }
    this.emit('album', album._id);

    for (const t of norm.tracks) {
      const trackArtistIds =
        t.artistExternalIds.length > 0
          ? await Promise.all(t.artistExternalIds.map((ext) => this.ensureArtist(ext, idCache, genreCache, counters)))
          : artistIds;
      const artistsRef = trackArtistIds.map((id, idx) => ({ artist: id, primary: idx === 0 }));

      const existing = await this.trackModel.findOne({ spotifyId: t.externalId }).exec();
      if (!existing) {
        const created = await this.trackModel.create({
          name: t.name,
          spotifyId: t.externalId,
          album: album._id,
          number: t.number,
          duration: t.durationSeconds,
          popularity: t.popularity,
          src: t.previewUrl,
          srcType: t.previewUrl ? 'external' : 'audio',
          artists: artistsRef,
          genres,
        });
        counters.tracks += 1;
        this.emit('track', created._id);
      } else {
        existing.album = album._id as Types.ObjectId;
        existing.number = t.number;
        existing.duration = t.durationSeconds || existing.duration;
        existing.artists = artistsRef;
        await existing.save();
        this.emit('track', existing._id);
      }
    }
  }

  // --- Flujos de importación ---

  /** Importa un artista con sus álbumes y pistas. Idempotente y respeta fullyScraped. */
  async importArtist(externalId: string, force = false): Promise<ImportSummary> {
    const counters: ImportSummary = { artists: 0, albums: 0, tracks: 0, playlists: 0, genres: 0, skipped: false };
    const idCache = new Map<string, Types.ObjectId>();
    const genreCache = new Map<string, Types.ObjectId>();

    const existing = await this.artistModel.findOne({ spotifyId: externalId }).exec();
    if (existing?.fullyScraped && !force) {
      return { ...counters, skipped: true };
    }

    const norm = await this.provider.getArtist(externalId);
    // Enriquecer bio desde el proveedor secundario si falta.
    if (!norm.bio) norm.bio = await this.secondary.artistBio(norm.name).catch(() => null);

    const artist = await this.upsertArtist(norm, genreCache, counters);
    idCache.set(externalId, artist._id as Types.ObjectId);
    const artistGenres = artist.genres as Types.ObjectId[];

    const albums = await this.provider.getArtistAlbums(externalId);
    for (const album of albums) {
      await this.upsertAlbumWithTracks(album, idCache, genreCache, artistGenres, counters);
    }

    artist.fullyScraped = true;
    await artist.save();
    counters.genres = genreCache.size;
    return counters;
  }

  async importNewReleases(limit = 20): Promise<ImportSummary> {
    const counters: ImportSummary = { artists: 0, albums: 0, tracks: 0, playlists: 0, genres: 0, skipped: false };
    const idCache = new Map<string, Types.ObjectId>();
    const genreCache = new Map<string, Types.ObjectId>();
    const albums = await this.provider.getNewReleases(limit);
    for (const album of albums) {
      await this.upsertAlbumWithTracks(album, idCache, genreCache, [], counters);
    }
    counters.genres = genreCache.size;
    return counters;
  }

  async importFeaturedPlaylists(ownerId: string | null, limit = 20): Promise<ImportSummary> {
    const counters: ImportSummary = { artists: 0, albums: 0, tracks: 0, playlists: 0, genres: 0, skipped: false };
    const playlists = await this.provider.getFeaturedPlaylists(limit);
    for (const p of playlists) {
      const existing = await this.playlistModel.findOne({ externalId: p.externalId }).exec();
      if (existing) {
        existing.name = p.name;
        existing.description = p.description;
        existing.image = p.image;
        await existing.save();
        this.emit('playlist', existing._id);
      } else {
        const created = await this.playlistModel.create({
          name: p.name,
          description: p.description,
          image: p.image,
          public: true,
          collaborative: false,
          owner: ownerId ? new Types.ObjectId(ownerId) : new Types.ObjectId(),
          externalId: p.externalId,
        });
        counters.playlists += 1;
        this.emit('playlist', created._id);
      }
    }
    return counters;
  }

  async importTopGenres(limit = 50): Promise<ImportSummary> {
    const counters: ImportSummary = { artists: 0, albums: 0, tracks: 0, playlists: 0, genres: 0, skipped: false };
    const names = await this.secondary.topGenres(limit);
    const before = await this.genreModel.countDocuments().exec();
    await this.ensureGenres(names, new Map());
    const after = await this.genreModel.countDocuments().exec();
    counters.genres = after - before;
    return counters;
  }

  // --- Jobs (asíncronos, con reintentos) ---

  async createAndRun(type: ImportJobType, externalId: string | null, userId: string | null): Promise<ImportJobDocument> {
    const job = await this.jobModel.create({
      type,
      externalId,
      status: 'pending',
      createdBy: userId ? new Types.ObjectId(userId) : null,
    });
    // Ejecuta en segundo plano; el estado se consulta por el endpoint de jobs.
    void this.runJob(String(job._id));
    return job;
  }

  /** Ejecuta un job con reintentos ante fallos transitorios del proveedor. */
  async runJob(jobId: string): Promise<void> {
    const job = await this.jobModel.findById(jobId).exec();
    if (!job) return;
    job.status = 'running';
    await job.save();

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      job.attempts = attempt;
      try {
        const result = await this.dispatch(job.type, job.externalId, String(job.createdBy ?? '') || null);
        job.status = 'done';
        job.result = result;
        job.processed = result.artists + result.albums + result.tracks + result.playlists;
        job.error = null;
        await job.save();
        return;
      } catch (e) {
        const err = e as Error;
        // No reintentar si el proveedor no está configurado.
        if (err instanceof ProviderNotConfiguredError) {
          job.status = 'failed';
          job.error = err.message;
          await job.save();
          return;
        }
        this.logger.warn(`Job ${jobId} intento ${attempt} falló: ${err.message}`);
        if (attempt === MAX_ATTEMPTS) {
          job.status = 'failed';
          job.error = err.message;
          await job.save();
        } else {
          await new Promise((r) => setTimeout(r, 500 * attempt));
        }
      }
    }
  }

  private dispatch(type: ImportJobType, externalId: string | null, userId: string | null): Promise<ImportSummary> {
    switch (type) {
      case 'artist':
        return this.importArtist(externalId ?? '');
      case 'newReleases':
        return this.importNewReleases();
      case 'featuredPlaylists':
        return this.importFeaturedPlaylists(userId);
      case 'topGenres':
        return this.importTopGenres();
      case 'youtube':
        return this.youtube.ingest(externalId ?? '', userId);
    }
  }

  // --- Consultas de estado ---

  async getJob(id: string): Promise<ImportJobDocument | null> {
    return Types.ObjectId.isValid(id) ? this.jobModel.findById(id).lean().exec() : null;
  }

  async listJobs(limit = 30) {
    return this.jobModel.find().sort({ createdAt: -1 }).limit(limit).lean().exec();
  }

  async searchArtists(query: string) {
    return this.provider.searchArtists(query);
  }
}
