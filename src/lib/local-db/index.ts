/**
 * Client-Side IndexedDB Local Cache for ANX CLUB
 * Tier 1 Frontend Local Storage with monotonic versioning and delta synchronization.
 * Prevents redundant network calls and supports offline browsing.
 */

const DB_NAME = 'anx_client_cache';
const DB_VERSION = 1;

export interface VersionedEntity {
  id: string;
  version?: number;
  updated_at?: number | string;
  [key: string]: any;
}

export interface SyncTombstone {
  entity_type: string;
  entity_id: string;
  deleted_at: number;
}

export interface DeltaPayload {
  cursor: number;
  events?: VersionedEntity[];
  event_registrations?: VersionedEntity[];
  mentor_requests?: VersionedEntity[];
  mentoring_sessions?: VersionedEntity[];
  tombstones?: SyncTombstone[];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported or running on server.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('events')) {
        db.createObjectStore('events', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('mentoring_sessions')) {
        db.createObjectStore('mentoring_sessions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('mentor_requests')) {
        db.createObjectStore('mentor_requests', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('tombstones')) {
        const store = db.createObjectStore('tombstones', { keyPath: 'id', autoIncrement: true });
        store.createIndex('entity_key', ['entity_type', 'entity_id'], { unique: false });
      }
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Monotonically upserts an entity into a specific store.
 * Rejects updates if local version is higher than incoming version.
 */
export async function upsertWithVersion<T extends VersionedEntity>(
  storeName: 'events' | 'mentoring_sessions' | 'mentor_requests',
  incoming: T
): Promise<boolean> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const getReq = store.get(incoming.id);

      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (existing) {
          const incomingVersion = incoming.version ?? 1;
          const existingVersion = existing.version ?? 1;

          if (incomingVersion < existingVersion) {
            // Monotonic check: incoming is stale
            resolve(false);
            return;
          }
        }

        const putReq = store.put(incoming);
        putReq.onsuccess = () => resolve(true);
        putReq.onerror = () => reject(putReq.error);
      };

      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    console.warn(`[LocalCache] Failed to upsert ${storeName}:`, err);
    return false;
  }
}

/**
 * Deletes an entity from local store (used when a tombstone is received)
 */
export async function deleteEntity(
  storeName: 'events' | 'mentoring_sessions' | 'mentor_requests',
  id: string
): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[LocalCache] Failed to delete from ${storeName}:`, err);
  }
}

/**
 * Returns all entities from a specific store
 */
export async function getAllFromCache<T>(
  storeName: 'events' | 'mentoring_sessions' | 'mentor_requests'
): Promise<T[]> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[LocalCache] Failed to read ${storeName}:`, err);
    return [];
  }
}

/**
 * Gets the last synchronized cursor timestamp
 */
export async function getLastSyncCursor(): Promise<number> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(['metadata'], 'readonly');
      const store = tx.objectStore('metadata');
      const req = store.get('last_sync_cursor');
      req.onsuccess = () => resolve(req.result?.value ?? 0);
      req.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

/**
 * Sets the last synchronized cursor timestamp
 */
export async function setLastSyncCursor(cursor: number): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['metadata'], 'readwrite');
      const store = tx.objectStore('metadata');
      const req = store.put({ key: 'last_sync_cursor', value: cursor });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[LocalCache] Failed to save cursor:', err);
  }
}

/**
 * Applies a full delta synchronization payload into the IndexedDB local cache.
 */
export async function applyDeltaPayload(delta: DeltaPayload): Promise<void> {
  if (delta.events && delta.events.length > 0) {
    for (const event of delta.events) {
      await upsertWithVersion('events', event);
    }
  }

  if (delta.mentoring_sessions && delta.mentoring_sessions.length > 0) {
    for (const session of delta.mentoring_sessions) {
      await upsertWithVersion('mentoring_sessions', session);
    }
  }

  if (delta.mentor_requests && delta.mentor_requests.length > 0) {
    for (const request of delta.mentor_requests) {
      await upsertWithVersion('mentor_requests', request);
    }
  }

  // Apply tombstones
  if (delta.tombstones && delta.tombstones.length > 0) {
    for (const tomb of delta.tombstones) {
      if (tomb.entity_type === 'events') {
        await deleteEntity('events', tomb.entity_id);
      } else if (tomb.entity_type === 'mentoring_sessions') {
        await deleteEntity('mentoring_sessions', tomb.entity_id);
      } else if (tomb.entity_type === 'mentor_requests') {
        await deleteEntity('mentor_requests', tomb.entity_id);
      }
    }
  }

  if (delta.cursor) {
    await setLastSyncCursor(delta.cursor);
  }
}
