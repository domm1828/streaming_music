import { useEffect, useRef } from 'react';
import { usePlayerStore, type PlayerTrack } from './player-store';
import type { YTPlayer } from './youtube';

let ytReady: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (ytReady) return ytReady;
  ytReady = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return ytReady;
}

export function YouTubeProvider({ track }: { track: PlayerTrack }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const videoId = track.src ?? '';

  useEffect(() => {
    let cancelled = false;
    void loadYouTubeApi().then(() => {
      if (cancelled || !containerRef.current || !window.YT) return;
      if (playerRef.current) {
        playerRef.current.loadVideoById(videoId);
        return;
      }
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: { autoplay: 1, controls: 0 },
        events: {
          onReady: (e) => {
            e.target.setVolume(usePlayerStore.getState().volume * 100);
            if (usePlayerStore.getState().isPlaying) e.target.playVideo();
          },
          onStateChange: (e) => {
            if (e.data === window.YT?.PlayerState.ENDED) {
              if (usePlayerStore.getState().repeat === 'one') e.target.seekTo(0, true);
              else usePlayerStore.getState().next();
            }
          },
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  // Destruir el player al desmontar.
  useEffect(() => {
    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const pendingSeek = usePlayerStore((s) => s._pendingSeek);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    if (isPlaying) p.playVideo();
    else p.pauseVideo();
  }, [isPlaying]);

  useEffect(() => {
    playerRef.current?.setVolume(volume * 100);
  }, [volume]);

  useEffect(() => {
    if (pendingSeek === null) return;
    playerRef.current?.seekTo(pendingSeek, true);
    usePlayerStore.getState().consumeSeek();
  }, [pendingSeek]);

  // Poll de progreso.
  useEffect(() => {
    const id = setInterval(() => {
      const p = playerRef.current;
      if (p && typeof p.getCurrentTime === 'function') {
        usePlayerStore.getState().setProgress(p.getCurrentTime(), p.getDuration() || 0);
      }
    }, 500);
    return () => clearInterval(id);
  }, []);

  return <div className="pointer-events-none fixed -left-[9999px] h-1 w-1"><div ref={containerRef} /></div>;
}
