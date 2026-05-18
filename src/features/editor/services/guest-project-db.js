const DB_NAME = 'lrc-studio-guest';
const DB_VERSION = 1;
const STORE_NAME = 'pending-project';
const RECORD_KEY = 'current';
const STALE_DAYS = 30;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Persist guest project payload to IndexedDB.
 * Adds a `savedAt` ISO timestamp for stale-data detection.
 * @param {object} payload - Project data shaped for POST /projects
 * @returns {Promise<void>}
 */
export async function savePendingProject(payload) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(
      { ...payload, savedAt: new Date().toISOString() },
      RECORD_KEY
    );
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
    tx.onabort = () => reject(new DOMException('IDB transaction aborted', 'AbortError'));
  });
}

/**
 * Read the pending guest project from IndexedDB.
 * Returns null if no record exists or if older than 30 days.
 * @returns {Promise<object|null>}
 */
export async function getPendingProject() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(RECORD_KEY);
    req.onsuccess = (e) => {
      const record = e.target.result;
      if (!record) return resolve(null);
      const ageMs = Date.now() - new Date(record.savedAt).getTime();
      if (ageMs > STALE_DAYS * 24 * 60 * 60 * 1000) return resolve(null);
      resolve(record);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Remove the pending guest project record from IndexedDB.
 * Safe to call even if no record exists.
 * @returns {Promise<void>}
 */
export async function clearPendingProject() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(RECORD_KEY);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}
