/** Contratos de los proveedores externos de metadatos y sus formas normalizadas. */

export interface NormalizedArtist {
  externalId: string;
  name: string;
  image: string | null;
  bio: string | null;
  genres: string[];
  followers: number;
  popularity: number;
}

export interface NormalizedTrack {
  externalId: string;
  name: string;
  number: number;
  durationSeconds: number;
  popularity: number;
  artistExternalIds: string[];
  previewUrl: string | null;
}

export interface NormalizedAlbum {
  externalId: string;
  name: string;
  image: string | null;
  releaseDate: string | null;
  popularity: number;
  artistExternalIds: string[];
  genres: string[];
  tracks: NormalizedTrack[];
}

export interface NormalizedPlaylist {
  externalId: string;
  name: string;
  description: string | null;
  image: string | null;
  trackExternalIds: string[];
}

/** Proveedor principal de metadatos (p. ej. Spotify). */
export interface MetadataProvider {
  readonly name: string;
  isConfigured(): boolean;
  searchArtists(query: string, limit?: number): Promise<NormalizedArtist[]>;
  getArtist(externalId: string): Promise<NormalizedArtist>;
  getArtistAlbums(externalId: string, limit?: number): Promise<NormalizedAlbum[]>;
  getNewReleases(limit?: number): Promise<NormalizedAlbum[]>;
  getFeaturedPlaylists(limit?: number): Promise<NormalizedPlaylist[]>;
}

/** Proveedor secundario (p. ej. Last.fm): géneros top y bios. */
export interface SecondaryMetadataProvider {
  readonly name: string;
  isConfigured(): boolean;
  topGenres(limit?: number): Promise<string[]>;
  artistBio(name: string): Promise<string | null>;
}

/** Proveedor de letras intercambiable. */
export interface LyricsProvider {
  readonly name: string;
  fetchLyrics(trackName: string, artistName: string): Promise<string | null>;
}

// Tokens de inyección (interfaces no existen en runtime).
export const METADATA_PROVIDER = Symbol('METADATA_PROVIDER');
export const SECONDARY_METADATA_PROVIDER = Symbol('SECONDARY_METADATA_PROVIDER');
export const LYRICS_PROVIDERS = Symbol('LYRICS_PROVIDERS');

/** Error que indica que un proveedor no tiene credenciales configuradas. */
export class ProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`El proveedor "${provider}" no está configurado (faltan credenciales)`);
    this.name = 'ProviderNotConfiguredError';
  }
}
