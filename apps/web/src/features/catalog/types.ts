import type { PaginationMeta } from '@stream-music/shared';
import type { PlayerTrack } from '../player/player-store';

export interface Paginated<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface ArtistRef {
  _id: string;
  name: string;
  slug?: string;
  image?: string | null;
}

export interface Genre {
  _id: string;
  name: string;
  displayName: string;
}

export interface Track extends PlayerTrack {
  number: number;
  lyric?: { text: string; isSynced: boolean } | null;
}

export interface Album {
  _id: string;
  name: string;
  image?: string | null;
  releaseDate?: string | null;
  description?: string | null;
  artists: ArtistRef[];
  tracks?: Track[];
}

export interface Artist extends ArtistRef {
  bio?: string | null;
  genres?: Genre[];
  views?: number;
}

export interface GenreOverview {
  genre: Genre & { image?: string | null };
  artists: Artist[];
  albums: Album[];
  topTracks: Track[];
}
