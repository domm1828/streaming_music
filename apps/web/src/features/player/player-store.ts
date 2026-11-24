import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SrcType = 'audio' | 'youtube' | 'hls' | 'external';

export interface PlayerTrack {
  _id: string;
  name: string;
  src: string | null;
  srcType: SrcType;
  duration: number;
  image?: string | null;
  artists?: { artist: { _id: string; name: string } }[];
  album?: { _id: string; name: string; image?: string | null } | null;
}

export type RepeatMode = 'off' | 'all' | 'one';

/** Semilla de la radio activa (para auto-extender la cola). */
export interface RadioSeed {
  type: 'track' | 'artist' | 'genre';
  id: string;
  label?: string;
}

interface PlayerState {
  queue: PlayerTrack[];
  index: number;
  isPlaying: boolean;
  repeat: RepeatMode;
  shuffle: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  radioSeed: RadioSeed | null;

  playQueue: (tracks: PlayerTrack[], startIndex?: number) => void;
  playTrack: (track: PlayerTrack) => void;
  /** Inicia una radio: reproduce las pistas y recuerda la semilla para extender. */
  playRadio: (tracks: PlayerTrack[], seed: RadioSeed) => void;
  /** Agrega pistas al final de la cola (sin repetir), para la radio infinita. */
  appendRadioTracks: (tracks: PlayerTrack[]) => void;
  setPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  setProgress: (currentTime: number, duration: number) => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  _pendingSeek: number | null;
  consumeSeek: () => number | null;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      queue: [],
      index: -1,
      isPlaying: false,
      repeat: 'off',
      shuffle: false,
      volume: 0.8,
      currentTime: 0,
      duration: 0,
      radioSeed: null,
      _pendingSeek: null,

      playQueue: (tracks, startIndex = 0) =>
        set({ queue: tracks, index: startIndex, isPlaying: true, currentTime: 0, radioSeed: null }),
      playTrack: (track) =>
        set({ queue: [track], index: 0, isPlaying: true, currentTime: 0, radioSeed: null }),
      playRadio: (tracks, seed) =>
        set({ queue: tracks, index: 0, isPlaying: true, currentTime: 0, radioSeed: seed }),
      appendRadioTracks: (tracks) =>
        set((s) => {
          const seen = new Set(s.queue.map((t) => t._id));
          const fresh = tracks.filter((t) => !seen.has(t._id));
          return fresh.length ? { queue: [...s.queue, ...fresh] } : {};
        }),
      setPlaying: (isPlaying) => set({ isPlaying }),
      togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying && s.index >= 0 ? true : !s.isPlaying })),

      next: () => {
        const { queue, index, shuffle, repeat } = get();
        if (queue.length === 0) return;
        if (shuffle) {
          set({ index: Math.floor(Math.random() * queue.length), isPlaying: true, currentTime: 0 });
          return;
        }
        if (index + 1 < queue.length) {
          set({ index: index + 1, isPlaying: true, currentTime: 0 });
        } else if (repeat === 'all') {
          set({ index: 0, isPlaying: true, currentTime: 0 });
        } else {
          set({ isPlaying: false });
        }
      },
      prev: () => {
        const { index, currentTime } = get();
        if (currentTime > 3) {
          set({ _pendingSeek: 0, currentTime: 0 });
          return;
        }
        if (index > 0) set({ index: index - 1, isPlaying: true, currentTime: 0 });
      },

      setProgress: (currentTime, duration) => set({ currentTime, duration }),
      seekTo: (time) => set({ _pendingSeek: time, currentTime: time }),
      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
      cycleRepeat: () =>
        set((s) => ({ repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off' })),
      toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
      consumeSeek: () => {
        const v = get()._pendingSeek;
        if (v !== null) set({ _pendingSeek: null });
        return v;
      },
    }),
    {
      name: 'stream-music-player',
      partialize: (s) => ({ volume: s.volume, repeat: s.repeat, shuffle: s.shuffle }),
    },
  ),
);

export function currentTrack(state: PlayerState): PlayerTrack | null {
  return state.index >= 0 && state.index < state.queue.length ? state.queue[state.index] : null;
}
