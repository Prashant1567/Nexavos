import { openDB, IDBPDatabase } from 'idb';

export interface DraftCollection {
  id: string; // Generated client-side UUID
  project_id: string;
  worker_id: string;
  waste_type: 'municipal_solid' | 'organic' | 'plastic' | 'construction' | 'mixed';
  quantity: number;
  unit: 'kg' | 'ton';
  notes?: string;
  evidence: string[]; // Base64 data URIs of the captured photo evidence (max 3)
  photo_hash: string;   // Image SHA-256 / content hash
  collected_at: string;  // ISO string (corresponds to collected_at)
  gps_latitude: number;
  gps_longitude: number;
  gps_accuracy: number;
  device_metadata: {
    batteryLevel?: number;
    isCharging?: boolean;
    networkStatus: 'online' | 'offline';
    connectionType?: string;
    userAgent: string;
    viewport: string;
  };
  sync_status?: 'pending_sync' | 'synced';
}

const DB_NAME = 'dmrv-offline-db';
const STORE_NAME = 'draft_collections';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (typeof window === 'undefined') {
    return new Promise(() => {});
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveDraft(draft: DraftCollection): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, draft);
}

export async function getDrafts(): Promise<DraftCollection[]> {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

export async function deleteDraft(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function clearDrafts(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await tx.objectStore(STORE_NAME).clear();
  await tx.done;
}

export async function getDraftCount(): Promise<number> {
  const db = await getDB();
  return db.count(STORE_NAME);
}
