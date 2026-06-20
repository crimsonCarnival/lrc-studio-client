const DB_NAME = 'lrc-studio-guest';
const DB_VERSION = 1;
const STORE_NAME = 'pending-project';
const RECORD_KEY = 'current';
const STALE_DAYS = 30;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Persist guest project payload to IndexedDB.
 * Adds a `savedAt` ISO timestamp for stale-data detection.
 */
export async function savePendingProject(payload: Record<string, unknown>): Promise<void> {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(
      { ...payload, savedAt: new Date().toISOString() },
      RECORD_KEY
    );
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new DOMException('IDB transaction aborted', 'AbortError'));
  });
}

/**
 * Read the pending guest project from IndexedDB.
 * Returns null if no record exists or if older than 30 days.
 */
export async function getPendingProject(): Promise<unknown | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(RECORD_KEY);
    req.onsuccess = () => {
      const record = req.result as { savedAt?: string } | undefined;
      if (!record) return resolve(null);
      const ageMs = Date.now() - new Date(record.savedAt ?? 0).getTime();
      if (ageMs > STALE_DAYS * 24 * 60 * 60 * 1000) return resolve(null);
      resolve(record);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Remove the pending guest project record from IndexedDB.
 * Safe to call even if no record exists.
 */
export async function clearPendingProject(): Promise<void> {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(RECORD_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
