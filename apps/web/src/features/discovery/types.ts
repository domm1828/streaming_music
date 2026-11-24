import type { Album, ArtistRef, Track } from '../catalog/types';
import type { PlaylistSummary } from '../library/types';

export type SearchableType = 'artist' | 'album' | 'track' | 'playlist';

export interface SearchOverview {
  query: string;
  results: {
    artist?: ArtistRef[];
    album?: Album[];
    track?: Track[];
    playlist?: PlaylistSummary[];
  };
}

export interface Suggestion {
  type: SearchableType;
  id: string;
  name: string;
  image: string | null;
}

export interface SuggestResponse {
  query: string;
  suggestions: Suggestion[];
}

export type ChannelLayout = 'grid' | 'carousel' | 'list';
export type ChannelItemType = 'track' | 'album' | 'artist' | 'playlist' | 'mixed';

export interface ResolvedChannel {
  _id: string;
  slug: string;
  name: string;
  type: string;
  layout: ChannelLayout;
  sourceType: string;
  itemType: ChannelItemType;
  items: Array<Record<string, unknown>>;
}

export interface RadioResult {
  seedType: 'track' | 'artist' | 'genre';
  seedId: string;
  count: number;
  tracks: Track[];
}

export interface LandingCta {
  label: string;
  path: string;
}

export interface Landing {
  hero: {
    title: string;
    subtitle: string;
    ctaPrimary: LandingCta;
    ctaSecondary: LandingCta;
  };
  features: { title: string; text: string }[];
  brand?: { primary: string; secondary: string; accent: string };
}
