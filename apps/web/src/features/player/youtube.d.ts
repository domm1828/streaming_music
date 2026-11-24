// Tipos mínimos para la YouTube IFrame Player API.
export {};

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement | string, options: YTPlayerOptions) => YTPlayer;
      PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface YTPlayerOptions {
  videoId?: string;
  playerVars?: Record<string, number | string>;
  events?: {
    onReady?: (e: { target: YTPlayer }) => void;
    onStateChange?: (e: { data: number; target: YTPlayer }) => void;
  };
}

export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allow: boolean): void;
  loadVideoById(id: string): void;
  cueVideoById(id: string): void;
  setVolume(v: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}
