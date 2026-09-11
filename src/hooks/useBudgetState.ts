import { auth } from "../firebase";
import { useState, useEffect, useRef, useCallback } from "react";
import { User } from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { AppState, Profile, RecurringRule, TransactionRule } from "../types";
import { db } from "../firebase";
import { decryptProfile, activeKeys, prepareStateForRemoteSave, estimateJsonSizeBytes, FIRESTORE_DOC_HARD_LIMIT_BYTES, FIRESTORE_DOC_WARNING_BYTES } from "../services/crypto";
import * as localDb from "../services/localDb";
import { getLocalDateIso } from "../utils";
import { validateAndMigrateState, CURRENT_SCHEMA_VERSION } from "../utils/stateMigration";



export function useBudgetState(googleUser: User | null) {
  const [state, setState] = useState<AppState>(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      const cachedV2 = localStorage.getItem(localDb.LOCAL_STORAGE_KEY_V2);
      if (cachedV2) {
        try {
          return validateAndMigrateState(JSON.parse(cachedV2));
        } catch (_) {}
      }
      const cachedV1 = localStorage.getItem(localDb.LOCAL_STORAGE_KEY_V1);
      if (cachedV1) {
        try {
          return validateAndMigrateState(JSON.parse(cachedV1));
        } catch (_) {}
      }
    }
    return {
      profiles: [],
      activeProfileId: null,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      updatedAt: "",
      lastModifiedBy: "domyślny",
      driveFileId: null,
      recurringRules: [],
      transactionRules: []
    };
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [historyState, setHistoryState] = useState<AppState | null>(null);

  // References to handle timestamp conflict resolution
  const localUpdatedAtRef = useRef<string>(state.updatedAt || "");
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const uploadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestSaveDataRef = useRef<unknown>(null);

  // Load from IndexedDB on mount with race-condition protection
  useEffect(() => {
    let isMounted = true;
    setIsSyncing(true);

    localDb.loadState().then((loaded) => {
      if (isMounted && loaded && loaded.updatedAt) {
        const loadedTime = loaded.updatedAt;
        const currentTime = localUpdatedAtRef.current;

        // Apply loaded ONLY if loaded.updatedAt is strictly newer than current in-memory timestamp
        if (loadedTime > currentTime) {
          setState(loaded);
          localUpdatedAtRef.current = loadedTime;
        }
      }
    }).catch((err) => {
      console.warn("Failed loading state from IndexedDB:", err);
    }).finally(() => {
      if (isMounted) {
        setIsSyncing(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Cleanup upload timeout on unmount
  useEffect(() => {
    return () => {
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
      }
    };
  }, []);

  // Create a backup snapshot before destructive operations (CSV import, restore etc)
  const makeUndoBackup = useCallback((customState?: AppState) => {
    setHistoryState(JSON.parse(JSON.stringify(customState || state)));
  }, [state]);

  // Refresh state from Firestore or the local cache after a recoverable error.
  const fetchState = useCallback(async (showLoader = false) => {
    if (showLoader) setIsSyncing(true);
    setApiError(null);

    try {
      if (googleUser && db) {
        const snapshot = await getDoc(doc(db, "users", googleUser.uid));
        if (snapshot.exists()) {
          const incoming = validateAndMigrateState(snapshot.data(), googleUser.email || "chmura");
          const rawIncoming = JSON.parse(JSON.stringify(incoming));
          const decryptedProfiles = await Promise.all(incoming.profiles.map(async (profile: Profile) => {
            if (profile.encryptedPayload && activeKeys[profile.id]) {
              try {
                return await decryptProfile(profile, activeKeys[profile.id]);
              } catch (err) {
                console.error("Failed decrypting refreshed profile:", profile.id, err);
                setApiError("Nie udało się odszyfrować danych profilu z chmury. Sprawdź poprawność kodu PIN.");
              }
            }
            return profile;
          }));

          incoming.profiles = decryptedProfiles;
          const incomingTime = new Date(incoming.updatedAt || 0).getTime();
          const localTime = new Date(localUpdatedAtRef.current || 0).getTime();
          if (incomingTime >= localTime) {
            setState(incoming);
            localUpdatedAtRef.current = incoming.updatedAt || localUpdatedAtRef.current;
            await localDb.saveState(rawIncoming);
          }
        }
      } else {
        const cached = await localDb.loadState();
        const cachedTime = new Date(cached?.updatedAt || 0).getTime();
        const localTime = new Date(localUpdatedAtRef.current || 0).getTime();
        if (cached && cachedTime > localTime) {
          setState(cached);
          localUpdatedAtRef.current = cached.updatedAt || localUpdatedAtRef.current;
        }
      }
    } catch (err) {
      console.error("State refresh failed:", err);
      setApiError("Nie udało się odświeżyć danych. Spróbuj ponownie później.");
    } finally {
      if (showLoader) setIsSyncing(false);
    }
  }, [googleUser]);

  // Save state to Firestore, local server or local storage / IDB
  const saveState = useCallback(async (newState: AppState, localOnly = false) => {
    const timestamp = new Date().toISOString();
    const userEmail = googleUser?.email || "lokalny";

    const preparedState = await prepareStateForRemoteSave({
      ...newState,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      updatedAt: timestamp,
      lastModifiedBy: userEmail
    });

    const cleanState = JSON.parse(JSON.stringify(preparedState));

    setState({
      ...newState,
      updatedAt: timestamp,
      lastModifiedBy: userEmail
    });
    localUpdatedAtRef.current = timestamp;

    try {
      await localDb.saveState(cleanState);
      setApiError(prev => (prev && prev.includes("Rozważ archiwizację") ? prev : null));
    } catch (err: any) {
      if (err?.message?.includes("QUOTA_EXCEEDED")) {
        setApiError("Przekroczono limit pamięci urządzenia (QuotaExceeded). Niektóre zmiany nie mogły zostać zapisane lokalnie.");
      } else {
        console.error("Local save failed:", err);
      }
    }

    if (localOnly) return;

    if (googleUser) {
      latestSaveDataRef.current = cleanState;
      
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
      }

      uploadTimeoutRef.current = setTimeout(() => {
        if (!navigator.onLine) {
          setApiError("Jesteś offline. Zmiany zapisano lokalnie.");
          return;
        }
        const dataToUpload = latestSaveDataRef.current;
        saveQueueRef.current = saveQueueRef.current.then(async () => {
          try {
            const payloadBytes = estimateJsonSizeBytes(dataToUpload);
            if (payloadBytes >= FIRESTORE_DOC_HARD_LIMIT_BYTES) {
              setApiError("Dane są zbyt duże, aby zapisać je w chmurze. Zmiany pozostają lokalnie na urządzeniu. Rozważ archiwizację starszych transakcji.");
              return;
            } else if (payloadBytes >= FIRESTORE_DOC_WARNING_BYTES) {
              setApiError("Dane zbliżają się do limitu chmury. Rozważ archiwizację starszych transakcji, aby uniknąć problemów z synchronizacją.");
            }

            const docRef = doc(db, "users", googleUser.uid);
            await setDoc(docRef, dataToUpload, { merge: false });
          } catch (err: any) {
            console.error("Firestore write failed:", err);
            const msg = String(err?.message || "").toLowerCase();
            const isSizeError = msg.includes("size") || msg.includes("1 mib") || msg.includes("maximum") || msg.includes("too large");
            if (isSizeError) {
              setApiError("Nie udało się zapisać danych w chmurze, bo dokument przekroczył limit rozmiaru. Zmiany pozostają lokalnie. Rozważ archiwizację starszych transakcji.");
            } else {
              setApiError("Błąd synchronizacji z chmurą. Dane zapisano lokalnie na urządzeniu.");
            }
          }
        });
      }, 500);
    }
  }, [googleUser]);

  // Undo the last destructive action
  const undo = useCallback(async () => {
    if (!historyState) return false;
    const previous = JSON.parse(JSON.stringify(historyState));
    setHistoryState(null);
    await saveState(previous);
    return true;
  }, [historyState, saveState]);

  // Subscribe to real-time updates from Firestore
  useEffect(() => {
    if (!googleUser || !db) {
      setIsSyncing(false);
      return;
    }

    setIsSyncing(true);
    setApiError(null);

    const docRef = doc(db, "users", googleUser.uid);
    let isFirstSnapshot = true;

    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      setIsSyncing(false);
      if (docSnap.exists()) {
        const incoming = validateAndMigrateState(docSnap.data(), googleUser.email || "chmura");
        
        const incomingTime = new Date(incoming.updatedAt || 0).getTime();
        const localTime = new Date(localUpdatedAtRef.current).getTime();
        
        if (isFirstSnapshot || incomingTime > localTime) {
          isFirstSnapshot = false;
          const rawIncoming = JSON.parse(JSON.stringify(incoming));
          const decryptedProfiles = await Promise.all(incoming.profiles.map(async (p: Profile) => {
            if (p.encryptedPayload && activeKeys[p.id]) {
              try {
                return await decryptProfile(p, activeKeys[p.id]);
              } catch (err) {
                console.error("Failed decrypting profile:", p.id, err);
                setApiError("Nie udało się odszyfrować danych profilu z chmury. Sprawdź poprawność kodu PIN.");
                return p;
              }
            }
            return p;
          }));
          incoming.profiles = decryptedProfiles;

          setState(incoming);
          localDb.saveState(rawIncoming).catch((err) => {
            if (err?.message?.includes("QUOTA_EXCEEDED")) {
              setApiError("Przekroczono limit pamięci urządzenia (QuotaExceeded).");
            }
          });
          localUpdatedAtRef.current = incoming.updatedAt || new Date().toISOString();
        }
      } else {
        const cached = await localDb.loadState();
        if (cached) {
          try {
            void saveState(cached);
          } catch (_) {}
        } else {
          const emptyProfile: Profile = {
            id: crypto.randomUUID(),
            name: "Mój profil",
            kind: "personal" as const,
            transactions: [],
            payments: [],
            goals: [],
            investments: [],
            currency: "PLN",
            budgets: {}
          };
          const emptyState: AppState = {
            profiles: [emptyProfile],
            activeProfileId: emptyProfile.id,
            schemaVersion: CURRENT_SCHEMA_VERSION,
            updatedAt: new Date().toISOString(),
            lastModifiedBy: googleUser.email || "użytkownik",
            driveFileId: null,
            recurringRules: [],
            transactionRules: []
          };
          void saveState(emptyState);
        }
      }
    }, (error) => {
      console.error("Firestore onSnapshot error:", error);
      setApiError("Błąd odczytu chmury. Praca w trybie lokalnym.");
      setIsSyncing(false);
    });

    return () => unsubscribe();
  }, [googleUser, fetchState, saveState]);

  return {
    state,
    saveState,
    isSyncing,
    apiError,
    setApiError,
    refreshState: () => fetchState(true),
    undo,
    canUndo: historyState !== null,
    makeUndoBackup
  };
}
