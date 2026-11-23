export type SearchableType = 'artist' | 'album' | 'track' | 'playlist';
export const SEARCHABLE_TYPES: SearchableType[] = ['artist', 'album', 'track', 'playlist'];

/** Nombre del índice Meilisearch por tipo. */
export const SEARCH_INDEXES: Record<SearchableType, string> = {
  artist: 'artists',
  album: 'albums',
  track: 'tracks',
  playlist: 'playlists',
};

export interface Suggestion {
  type: SearchableType;
  id: string;
  name: string;
  image: string | null;
}

/** Escapa una cadena para usarla literalmente dentro de un regex de Mongo. */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
