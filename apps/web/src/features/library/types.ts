import type { Album, ArtistRef, Track } from '../catalog/types';

export type LikeableType = 'track' | 'album' | 'artist' | 'playlist';
export type FollowableType = 'user' | 'artist' | 'playlist';
export type RepostableType = 'track' | 'playlist';

export interface UserRef {
  _id: string;
  name: string;
  username: string;
  image?: string | null;
  followersCount?: number;
}

export interface PlaylistTrackItem {
  track: Track;
  position: number;
  addedAt?: string;
}

/** Forma resumida (listados) de una playlist. */
export interface PlaylistSummary {
  _id: string;
  name: string;
  description?: string | null;
  image?: string | null;
  public: boolean;
  collaborative: boolean;
  owner: string | UserRef;
  followersCount: number;
  tracks?: unknown[];
  updatedAt?: string;
}

export interface PlaylistDetail extends Omit<PlaylistSummary, 'owner' | 'tracks'> {
  owner: UserRef;
  editors: UserRef[];
  tracks: PlaylistTrackItem[];
  canEdit: boolean;
  isOwner: boolean;
}

export interface LikeItem {
  type: LikeableType;
  likedAt: string | null;
  entity: Track | Album | ArtistRef | PlaylistSummary;
}

export interface FollowItem {
  type: FollowableType;
  followedAt: string | null;
  entity: UserRef | ArtistRef | PlaylistSummary;
}

export interface RepostItem {
  type: RepostableType;
  repostedAt: string | null;
  entity: Track | PlaylistSummary;
}

export interface ProfileLink {
  label: string;
  url: string;
}

export interface PublicUser {
  _id: string;
  name: string;
  username: string;
  image?: string | null;
  bio?: string | null;
  coverImage?: string | null;
  country?: string | null;
  links: ProfileLink[];
  followersCount: number;
  followingCount: number;
  createdAt?: string;
}

export interface PublicProfile {
  user: PublicUser;
  isFollowing: boolean;
  isSelf: boolean;
  playlists: PlaylistSummary[];
  reposts: RepostItem[];
  tracks: Track[];
}

export interface ListeningStatus {
  period: string;
  usedMinutes: number;
  limitMinutes: number | null;
  remainingMinutes: number | null;
  exhausted: boolean;
}

export interface Insights {
  periodDays: number;
  totalPlays: number;
  uniqueTracks: number;
  topTracks: { plays: number; track: { _id: string; name: string; image?: string | null; duration: number } }[];
  topArtists: { plays: number; artist: { _id: string; name: string; image?: string | null } }[];
}

export interface HistoryItem {
  _id: string;
  track: Track;
  createdAt: string;
}
