import type { PlayerTrack } from '../player/player-store';

/** Metadata guardada junto al audio para poder listar y reproducir offline. */
export interface OfflineMeta extends PlayerTrack {
  savedAt: number;
  size: number;
}

interface OfflineRecord {
  _id: string;
  meta: OfflineMeta;
  blob: Blob;
}

const DB_NAME = 'stream-music-offline';
const STORE = 'tracks';
const VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible'));
      return;
    }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: '_id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('No se pudo abrir la base offline'));
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('Operación offline fallida'));
        t.oncomplete = () => db.close();
      }),
  );
}

export async function putOffline(meta: OfflineMeta, blob: Blob): Promise<void> {
  const record: OfflineRecord = { _id: meta._id, meta, blob };
  await tx('readwrite', (s) => s.put(record));
}

export async function getOfflineBlob(id: string): Promise<Blob | null> {
  try {
    const rec = await tx<OfflineRecord | undefined>('readonly', (s) => s.get(id));
    return rec?.blob ?? null;
  } catch {
    return null;
  }
}

export async function listOffline(): Promise<OfflineMeta[]> {
  try {
    const recs = await tx<OfflineRecord[]>('readonly', (s) => s.getAll());
    return recs.map((r) => r.meta).sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

export async function removeOffline(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id));
}
