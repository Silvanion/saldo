import { AppState } from "../types";
import { validateAndMigrateState } from "../utils/stateMigration";

export const LOCAL_STORAGE_KEY_V2 = "saldo-local-fallback-v2";
export const LOCAL_STORAGE_KEY_V1 = "saldo-local-fallback";

const DB_NAME = "saldo-app-db";
const DB_VERSION = 1;
const STORE_NAME = "app_state";
const STATE_KEY = "current";

/**
 * Open IndexedDB database connection wrapped in Promise
 */
export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error("Failed to open IndexedDB"));
    };
  });
}

/**
 * Saves state directly into IndexedDB store
 */
export async function saveStateToIDBOnly(state: AppState): Promise<void> {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(state, STATE_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Reads AppState from IndexedDB store
 */
export async function loadStateFromIDBOnly(): Promise<AppState | null> {
  const db = await openDb();
  return new Promise<AppState | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(STATE_KEY);
    req.onsuccess = () => resolve((req.result as AppState) || null);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Reads AppState from IndexedDB. If IDB is empty, checks localStorage (v2 then v1),
 * migrates state via validateAndMigrateState, saves to IDB, and returns it.
 */
export async function loadState(): Promise<AppState | null> {
  let idbState: unknown = null;

  try {
    idbState = await loadStateFromIDBOnly();
  } catch (err) {
    console.warn("IndexedDB load failed, falling back to localStorage:", err);
  }

  if (idbState) {
    return validateAndMigrateState(idbState);
  }

  // Fallback / One-time Migration from localStorage (v2 or v1)
  if (typeof localStorage !== "undefined") {
    const cachedV2 = localStorage.getItem(LOCAL_STORAGE_KEY_V2);
    if (cachedV2) {
      try {
        const parsed = validateAndMigrateState(JSON.parse(cachedV2));
        // Migrate data to IDB asynchronously
        try {
          await saveStateToIDBOnly(parsed);
        } catch (idbErr) {
          console.warn("Failed migrating localStorage V2 data to IndexedDB:", idbErr);
        }
        return parsed;
      } catch (err) {
        console.warn("Failed parsing localStorage V2:", err);
      }
    }

    const cachedV1 = localStorage.getItem(LOCAL_STORAGE_KEY_V1);
    if (cachedV1) {
      try {
        const parsedV1 = validateAndMigrateState(JSON.parse(cachedV1));
        try {
          await saveStateToIDBOnly(parsedV1);
          localStorage.setItem(LOCAL_STORAGE_KEY_V2, JSON.stringify(parsedV1));
          localStorage.removeItem(LOCAL_STORAGE_KEY_V1);
        } catch (idbErr) {
          console.warn("Failed migrating localStorage V1 data to IndexedDB/V2:", idbErr);
        }
        return parsedV1;
      } catch (err) {
        console.warn("Failed parsing localStorage V1:", err);
      }
    }
  }

  return null;
}

/**
 * Saves state to IndexedDB as primary store, and dual-writes to localStorage V2 as secondary backup.
 * Handles QuotaExceededError gracefully.
 */
export async function saveState(state: AppState): Promise<void> {
  let idbSaved = false;
  let idbQuotaError = false;

  // 1. Primary store: IndexedDB
  try {
    await saveStateToIDBOnly(state);
    idbSaved = true;
  } catch (err: any) {
    console.warn("IndexedDB save failed:", err);
    if (
      err &&
      (err.name === "QuotaExceededError" ||
        err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        err.code === 22 ||
        err.message?.includes("QuotaExceeded"))
    ) {
      idbQuotaError = true;
    }
  }

  // 2. Dual-write backup: localStorage V2
  let lsQuotaError = false;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_V2, JSON.stringify(state));
    } catch (err: any) {
      console.warn("localStorage backup save failed:", err);
      if (
        err &&
        (err.name === "QuotaExceededError" ||
          err.code === 22 ||
          err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
          err.message?.includes("QuotaExceeded"))
      ) {
        lsQuotaError = true;
      }
    }
  }

  // 3. Quota Exceeded handling
  if (idbQuotaError || lsQuotaError || (!idbSaved && lsQuotaError)) {
    // If IDB failed due to quota OR if localStorage failed due to quota when IDB failed
    if (idbQuotaError || (!idbSaved && lsQuotaError)) {
      throw new Error("QUOTA_EXCEEDED: Przekroczono limit pamięci przeglądarki. Zwolnij miejsce na urządzeniu.");
    }
  }

  if (!idbSaved && lsQuotaError) {
    throw new Error("STORAGE_FAILED: Nie udało się zapisać stanu w pamięci podręcznej.");
  }
}

/**
 * Clears state from IndexedDB and localStorage fallback keys
 */
export async function clearState(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(STATE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB clear failed:", err);
  }

  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY_V2);
      localStorage.removeItem(LOCAL_STORAGE_KEY_V1);
    } catch (_) {}
  }
}
