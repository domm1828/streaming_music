import { useEffect, useRef, type CSSProperties } from 'react';
import { Loader2 } from 'lucide-react';
import { usePlayerStore, type PlayerTrack } from './player-store';
import { logPlay } from './use-log-play';
import { bufferedAhead } from './media-utils';

/**
 * Motor para pistas de video nativas (archivo subido). Reproduce un <video> que
 * se posiciona sobre el `videoBox` (mismo mecanismo que el de YouTube): visible
 * en fullscreen, y fuera de pantalla —pero sonando— cuando no hay caja asignada.
 */
export function NativeVideoProvider({ track }: { track: PlayerTrack }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const loadedIdRef = useRef<string | null>(null);
  const src = track.src ?? '';

  // Cargar la fuente al cambiar de pista.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !src) return;
    if (loadedIdRef.current === track._id) return;
    loadedIdRef.current = track._id;
    const { setBuffered, setBuffering } = usePlayerStore.getState();
    setBuffered(0);
    setBuffering(true);
    v.src = src;
    v.load();
    logPlay(track._id);
    if (usePlayerStore.getState().isPlaying) void v.play().catch(() => undefined);
  }, [track._id, src]);

  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const pendingSeek = usePlayerStore((s) => s._pendingSeek);
  const videoBox = usePlayerStore((s) => s.videoBox);
  const buffering = usePlayerStore((s) => s.buffering);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) void v.play().catch(() => undefined);
    else v.pause();
  }, [isPlaying]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (pendingSeek === null) return;
    if (videoRef.current) videoRef.current.currentTime = pendingSeek;
    usePlayerStore.getState().consumeSeek();
  }, [pendingSeek]);

  const { setProgress, setBuffered, setBuffering, next } = usePlayerStore.getState();

  const style: CSSProperties = videoBox
    ? {
        position: 'fixed',
        top: videoBox.top,
        left: videoBox.left,
        width: videoBox.width,
        height: videoBox.height,
        zIndex: 60,
        borderRadius: 16,
        overflow: 'hidden',
        background: '#000',
      }
    : { position: 'fixed', left: -9999, top: 0, width: 1, height: 1, pointerEvents: 'none' };

  return (
    <div className="sm-native-video" style={style}>
      <video
        ref={videoRef}
        poster={track.image ?? undefined}
        playsInline
        preload="auto"
        className="h-full w-full bg-black object-contain"
        onTimeUpdate={(e) => {
          setProgress(e.currentTarget.currentTime, e.currentTarget.duration || 0);
          setBuffered(bufferedAhead(e.currentTarget));
        }}
        onProgress={(e) => setBuffered(bufferedAhead(e.currentTarget))}
        onWaiting={() => setBuffering(true)}
        onStalled={() => setBuffering(true)}
        onSeeking={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onCanPlay={() => setBuffering(false)}
        onSeeked={(e) => {
          if (e.currentTarget.readyState >= 3) setBuffering(false);
        }}
        onEnded={() => {
          if (usePlayerStore.getState().repeat === 'one') {
            const v = videoRef.current;
            if (v) {
              v.currentTime = 0;
              void v.play().catch(() => undefined);
            }
          } else {
            next();
          }
        }}
      />
      {buffering && videoBox && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
          <Loader2 className="animate-spin text-white/90" size={36} />
        </div>
      )}
    </div>
  );
}
