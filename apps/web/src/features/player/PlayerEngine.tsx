import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { getOfflineBlob } from '../offline/offline-db';
import { currentTrack, usePlayerStore } from './player-store';
import { logPlay } from './use-log-play';
import { YouTubeProvider } from './YouTubeProvider';
import { NativeVideoProvider } from './NativeVideoProvider';

/**
 * Motor de reproducción. Usa un <audio> para fuentes 'audio' y 'hls'
 * (hls.js cuando el navegador no soporta HLS nativo) y delega las pistas
 * 'youtube' al YouTubeProvider.
 */
export function PlayerEngine() {
  const track = usePlayerStore(currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const pendingSeek = usePlayerStore((s) => s._pendingSeek);

  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const loadedIdRef = useRef<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const isYoutube = track?.srcType === 'youtube';
  const isNativeVideo = track?.srcType === 'video';
  // Pistas que no usan el elemento <audio> (tienen su propio motor de video).
  const external = isYoutube || isNativeVideo;

  // Carga la fuente cuando cambia la pista (audio / hls).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track || external || !track.src) return;
    if (loadedIdRef.current === track._id) return;
    loadedIdRef.current = track._id;

    hlsRef.current?.destroy();
    hlsRef.current = null;

    const revokeObjectUrl = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };

    const isHls = track.srcType === 'hls' || track.src.endsWith('.m3u8');
    if (isHls && Hls.isSupported()) {
      revokeObjectUrl();
      const hls = new Hls();
      hls.loadSource(track.src);
      hls.attachMedia(audio);
      hlsRef.current = hls;
      logPlay(track._id);
      if (usePlayerStore.getState().isPlaying) void audio.play().catch(() => undefined);
    } else {
      // Audio: preferir una copia offline (blob) si existe; si no, la red.
      const trackId = track._id;
      const networkSrc = track.src;
      void getOfflineBlob(trackId).then((blob) => {
        if (loadedIdRef.current !== trackId || !audioRef.current) return;
        revokeObjectUrl();
        if (blob) {
          const url = URL.createObjectURL(blob);
          objectUrlRef.current = url;
          audioRef.current.src = url;
        } else {
          audioRef.current.src = networkSrc;
        }
        audioRef.current.load();
        logPlay(trackId);
        if (usePlayerStore.getState().isPlaying) void audioRef.current.play().catch(() => undefined);
      });
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [track, external]);

  // Revocar el object URL offline al desmontar.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  // Play / pause.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || external) return;
    if (isPlaying) void audio.play().catch(() => undefined);
    else audio.pause();
  }, [isPlaying, external]);

  // Volumen.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Seek solicitado desde el store.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || external || pendingSeek === null) return;
    audio.currentTime = pendingSeek;
    usePlayerStore.getState().consumeSeek();
  }, [pendingSeek, external]);

  // Media Session API: metadata + controles del sistema operativo.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (!track) {
      navigator.mediaSession.metadata = null;
      return;
    }
    const artwork = track.image ?? track.album?.image ?? null;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.name,
      artist: track.artists?.map((a) => a.artist.name).join(', ') ?? '',
      album: track.album?.name ?? '',
      artwork: artwork ? [{ src: artwork, sizes: '512x512' }] : [],
    });
    const s = usePlayerStore.getState();
    navigator.mediaSession.setActionHandler('play', () => s.setPlaying(true));
    navigator.mediaSession.setActionHandler('pause', () => s.setPlaying(false));
    navigator.mediaSession.setActionHandler('previoustrack', () => usePlayerStore.getState().prev());
    navigator.mediaSession.setActionHandler('nexttrack', () => usePlayerStore.getState().next());
    navigator.mediaSession.setActionHandler('seekto', (e) => {
      if (typeof e.seekTime === 'number') usePlayerStore.getState().seekTo(e.seekTime);
    });
  }, [track]);

  useEffect(() => {
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // Atajos de teclado globales (ignorados al escribir en inputs).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      const s = usePlayerStore.getState();
      if (s.index < 0) return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          s.togglePlay();
          break;
        case 'ArrowRight':
          if (e.shiftKey) s.next();
          else s.seekTo(Math.min(s.duration || Infinity, s.currentTime + 5));
          break;
        case 'ArrowLeft':
          if (e.shiftKey) s.prev();
          else s.seekTo(Math.max(0, s.currentTime - 5));
          break;
        case 'ArrowUp':
          e.preventDefault();
          s.setVolume(s.volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          s.setVolume(s.volume - 0.1);
          break;
        case 'm':
          s.setVolume(s.volume > 0 ? 0 : 0.8);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { setProgress, next } = usePlayerStore.getState();

  return (
    <>
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime, e.currentTarget.duration || 0)}
        onEnded={() => {
          if (usePlayerStore.getState().repeat === 'one') {
            const a = audioRef.current;
            if (a) {
              a.currentTime = 0;
              void a.play().catch(() => undefined);
            }
          } else {
            next();
          }
        }}
        hidden
      />
      {isYoutube && track && <YouTubeProvider track={track} />}
      {isNativeVideo && track && <NativeVideoProvider track={track} />}
    </>
  );
}
