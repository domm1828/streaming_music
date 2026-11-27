import { useEffect, useRef } from 'react';
import { Maximize2 } from 'lucide-react';
import { currentTrack, usePlayerStore } from './player-store';

/**
 * Mini-ventana de video (abajo a la derecha, sobre la barra del reproductor) que
 * se muestra mientras suena una pista con video y el fullscreen está cerrado.
 *
 * El <video>/iframe real es único y se posiciona vía `videoBox`; este dock solo
 * aporta el marco y el botón de expandir, y mide su rectángulo para alimentar el
 * `videoBox`. La prioridad la tiene el `FullscreenPlayer`: cuando está abierto,
 * este dock no toca el `videoBox` (ni lo limpia al ocultarse).
 */
export function MiniVideoDock({ fullOpen, onExpand }: { fullOpen: boolean; onExpand: () => void }) {
  const track = usePlayerStore(currentTrack);
  const isVideo = track?.srcType === 'youtube' || track?.srcType === 'video';
  const shouldShow = Boolean(isVideo) && !fullOpen;
  const slotRef = useRef<HTMLDivElement | null>(null);
  const fullOpenRef = useRef(fullOpen);
  fullOpenRef.current = fullOpen;

  useEffect(() => {
    if (!shouldShow) return;
    const setVideoBox = usePlayerStore.getState().setVideoBox;
    const measure = () => {
      const el = slotRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setVideoBox({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    const raf = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
      // No pisar al fullscreen: solo ocultar el video si no tomó el control.
      if (!fullOpenRef.current) setVideoBox(null);
    };
  }, [shouldShow, track?._id]);

  if (!shouldShow) return null;

  return (
    <div className="pointer-events-none fixed bottom-[92px] right-3 z-[61] w-[240px] sm:w-[320px]">
      <div ref={slotRef} className="relative aspect-video rounded-2xl shadow-2xl ring-1 ring-white/15">
        {/* El video real se dibuja encima (z-60) exactamente sobre este slot. */}
        <button
          type="button"
          onClick={onExpand}
          className="pointer-events-auto absolute right-2 top-2 z-[62] rounded-full bg-black/60 p-1.5 text-white backdrop-blur transition hover:bg-black/80"
          aria-label="Pantalla completa"
        >
          <Maximize2 size={15} />
        </button>
      </div>
    </div>
  );
}
