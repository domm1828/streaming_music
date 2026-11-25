import { create } from 'zustand';
import type { PlayerTrack } from '../player/player-store';
import { listOffline, putOffline, removeOffline, type OfflineMeta } from './offline-db';

interface OfflineState {
  /** Ids de pistas disponibles offline (lookup rápido). */
  ids: Record<string, true>;
  /** Metadata de las pistas offline, para listar en la biblioteca. */
  metas: OfflineMeta[];
  /** Pistas descargándose ahora (para deshabilitar el botón). */
  busy: Record<string, true>;
  ready: boolean;
  refresh: () => Promise<void>;
  download: (track: PlayerTrack) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  ids: {},
  metas: [],
  busy: {},
  ready: false,

  refresh: async () => {
    const metas = await listOffline();
    set({ metas, ids: Object.fromEntries(metas.map((m) => [m._id, true as const])), ready: true });
  },

  download: async (track) => {
    if (get().ids[track._id] || get().busy[track._id]) return;
    if (track.srcType !== 'audio' || !track.src) {
      throw new Error('Solo se pueden guardar offline las pistas de audio alojadas.');
    }
    set((s) => ({ busy: { ...s.busy, [track._id]: true } }));
    try {
      const res = await fetch(track.src, { credentials: 'include' });
      if (!res.ok) throw new Error(`No se pudo descargar el audio (${res.status})`);
      const blob = await res.blob();
      const meta: OfflineMeta = {
        _id: track._id,
        name: track.name,
        src: track.src,
        srcType: track.srcType,
        duration: track.duration,
        image: track.image ?? null,
        artists: track.artists,
        album: track.album ?? null,
        savedAt: Date.now(),
        size: blob.size,
      };
      await putOffline(meta, blob);
      set((s) => ({
        ids: { ...s.ids, [track._id]: true },
        metas: [meta, ...s.metas.filter((m) => m._id !== track._id)],
      }));
    } finally {
      set((s) => {
        const busy = { ...s.busy };
        delete busy[track._id];
        return { busy };
      });
    }
  },

  remove: async (id) => {
    await removeOffline(id);
    set((s) => {
      const ids = { ...s.ids };
      delete ids[id];
      return { ids, metas: s.metas.filter((m) => m._id !== id) };
    });
  },
}));
