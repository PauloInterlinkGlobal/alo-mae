/**
 * Local biometric gallery — IndexedDB (ADR 0002 §2).
 * Stores ONLY embeddings + labels. No images/frames ever leave memory.
 */

export interface GalleryEntry {
  id: string;
  name: string;
  samples: number[][]; // 1..K embeddings (multi-amostra)
  createdAt: number;
  updatedAt: number;
}

const DB_NAME = 'alomae_biometrics';
const STORE_NAME = 'face_gallery';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const req = fn(tx.objectStore(STORE_NAME));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function listGallery(): Promise<GalleryEntry[]> {
  try {
    const all = await withStore<GalleryEntry[]>('readonly', (s) => s.getAll() as IDBRequest<GalleryEntry[]>);
    return all || [];
  } catch {
    return [];
  }
}

export async function getEntry(id: string): Promise<GalleryEntry | undefined> {
  return withStore<GalleryEntry | undefined>('readonly', (s) => s.get(id) as IDBRequest<GalleryEntry | undefined>);
}

export async function upsertEntry(entry: GalleryEntry): Promise<void> {
  await withStore('readwrite', (s) => s.put(entry));
}

export async function deleteEntry(id: string): Promise<void> {
  await withStore('readwrite', (s) => s.delete(id));
}

export async function clearGallery(): Promise<void> {
  await withStore('readwrite', (s) => s.clear());
}
