import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Artist, ArtistDocument } from '../catalog/schemas/artist.schema';
import { Track, TrackDocument } from '../catalog/schemas/track.schema';

export type RadioSeed = 'track' | 'artist' | 'genre';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

@Injectable()
export class RadioService {
  constructor(
    @InjectModel(Track.name) private readonly trackModel: Model<TrackDocument>,
    @InjectModel(Artist.name) private readonly artistModel: Model<ArtistDocument>,
  ) {}

  private populate(ids: Types.ObjectId[]) {
    return this.trackModel
      .find({ _id: { $in: ids } })
      .populate('artists.artist')
      .populate('album')
      .lean()
      .exec();
  }

  /** Genera una lista reproducible de pistas relacionadas a una semilla. */
  async radio(seedType: RadioSeed, seedId: string, limit = 25) {
    if (!Types.ObjectId.isValid(seedId)) throw new BadRequestException('Semilla inválida');
    const seed = new Types.ObjectId(seedId);
    const take = Math.min(Math.max(limit, 1), 50);

    let pool: Array<{ _id: Types.ObjectId; artists?: { artist: Types.ObjectId }[] }> = [];
    let primaryArtist: string | null = null;

    if (seedType === 'track') {
      const track = await this.trackModel.findById(seed).lean().exec();
      if (!track) throw new NotFoundException('Pista no encontrada');
      const artistIds = track.artists?.map((a) => a.artist) ?? [];
      primaryArtist = artistIds[0] ? String(artistIds[0]) : null;
      pool = await this.trackModel
        .find({
          _id: { $ne: seed },
          $or: [
            { 'artists.artist': { $in: artistIds } },
            { genres: { $in: track.genres ?? [] } },
            ...(track.album ? [{ album: track.album }] : []),
          ],
        })
        .select('_id artists')
        .limit(200)
        .lean()
        .exec();
    } else if (seedType === 'artist') {
      const artist = await this.artistModel.findById(seed).lean().exec();
      if (!artist) throw new NotFoundException('Artista no encontrado');
      primaryArtist = seedId;
      const related = [seed, ...(artist.similar ?? [])];
      pool = await this.trackModel
        .find({ $or: [{ 'artists.artist': { $in: related } }, { genres: { $in: artist.genres ?? [] } }] })
        .select('_id artists')
        .limit(200)
        .lean()
        .exec();
    } else {
      // genre
      pool = await this.trackModel
        .find({ genres: seed })
        .select('_id artists')
        .sort({ plays: -1 })
        .limit(200)
        .lean()
        .exec();
    }

    // Evitar repetir en exceso al artista semilla: como mucho ~40% de la lista.
    const maxFromSeedArtist = Math.ceil(take * 0.4);
    let fromSeedArtist = 0;
    const chosen: Types.ObjectId[] = [];
    for (const t of shuffle(pool)) {
      if (chosen.length >= take) break;
      const isSeedArtist =
        primaryArtist && (t.artists ?? []).some((a) => String(a.artist) === primaryArtist);
      if (isSeedArtist) {
        if (fromSeedArtist >= maxFromSeedArtist) continue;
        fromSeedArtist += 1;
      }
      chosen.push(t._id);
    }

    const tracks = await this.populate(chosen);
    // Conservar el orden barajado.
    const order = new Map(chosen.map((id, i) => [String(id), i]));
    tracks.sort((a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0));
    return { seedType, seedId, count: tracks.length, tracks };
  }
}
