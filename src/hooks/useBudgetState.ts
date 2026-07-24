import { auth } from "../firebase";
import { useState, useEffect, useRef, useCallback } from "react";
import { User } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { AppState, Profile, RecurringRule, TransactionRule } from "../types";
import { db } from "../firebase";
import { decryptProfile, activeKeys, prepareStateForRemoteSave, estimateJsonSizeBytes, FIRESTORE_DOC_HARD_LIMIT_BYTES, FIRESTORE_DOC_WARNING_BYTES } from "../services/crypto";
import * as localDb from "../services/localDb";
import { getLocalDateIso } from "../utils";

const CURRENT_SCHEMA_VERSION = 1;

// Helper to validate and migrate state safely
interface RawRule {
  id: string;
  profileId?: string;
  [key: string]: unknown;
}

function isRuleLike(val: unknown): val is RawRule {
  return (
    typeof val === "object" &&
    val !== null &&
    "id" in val &&
    typeof (val as { id: unknown }).id === "string" &&
    (val as { id: string }).id.trim() !== ""
  );
}

function normalizeRecurringRule(raw: RawRule): RecurringRule {
  const obj = raw as Record<string, unknown>;
  const freq = String(obj.frequency || "monthly");
  const validFreq: RecurringRule["frequency"] = ["weekly", "biweekly", "monthly", "quarterly", "yearly"].includes(freq)
    ? (freq as RecurringRule["frequency"])
    : "monthly";

  const ruleType = obj.type === "income" ? "income" : "expense";

  const rawDueDate = typeof obj.nextDueDate === "string" ? obj.nextDueDate.trim() : "";
  const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDueDate);
  const nextDueDate = isValidDate ? rawDueDate : getLocalDateIso();

  return {
    id: String(obj.id),
    name: String(obj.name || "Reguła cykliczna"),
    amount: typeof obj.amount === "number" && !isNaN(obj.amount) ? obj.amount : Number(obj.amount) || 0,
    type: ruleType,
    category: String(obj.category || "Inne"),
    ...(typeof obj.categoryIcon === "string" ? { categoryIcon: obj.categoryIcon } : {}),
    account: String(obj.account || "Konto główne"),
    frequency: validFreq,
    nextDueDate,
    ...(typeof obj.lastGeneratedDate === "string" ? { lastGeneratedDate: obj.lastGeneratedDate } : {}),
    ...(Array.isArray(obj.tags) ? { tags: obj.tags.map(String) } : {}),
    isActive: typeof obj.isActive === "boolean" ? obj.isActive : true,
    ...(obj.paidBy === "me" || obj.paidBy === "partner" || obj.paidBy === "joint" ? { paidBy: obj.paidBy } : {}),
    ...(obj.splitMode === "none" || obj.splitMode === "equal" ? { splitMode: obj.splitMode } : {})
  };
}

function normalizeTransactionRule(raw: RawRule): TransactionRule {
  const obj = raw as Record<string, unknown>;
  return {
    id: String(obj.id),
    pattern: String(obj.pattern || ""),
    category: String(obj.category || "Inne"),
    ...(typeof obj.categoryIcon === "string" ? { categoryIcon: obj.categoryIcon } : {}),
    ...(typeof obj.profileId === "string" && obj.profileId.trim() !== "" ? { profileId: obj.profileId } : {})
  };
}

function findTargetProfile(
  ruleProfileId: string | undefined,
  originalActiveProfileId: string | null,
  profiles: Profile[]
): Profile | null {
  // 1. If rule explicitly specified profileId
  if (ruleProfileId) {
    return profiles.find((p) => p.id === ruleProfileId) || null;
  }
  // 2. If no profileId specified, but originalActiveProfileId exists in RAW
  if (originalActiveProfileId) {
    return profiles.find((p) => p.id === originalActiveProfileId) || null;
  }
  // 3. If no profileId specified, no originalActiveProfileId in RAW, and exactly 1 profile exists
  if (profiles.length === 1) {
    return profiles[0];
  }
  // 4. Fallback: null (unmigrated)
  return null;
}

export function validateAndMigrateState(raw: unknown, defaultEmail = "użytkownik"): AppState {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const migrated: AppState = {
    profiles: Array.isArray(data.profiles) ? data.profiles : [],
    activeProfileId: typeof data.activeProfileId === "string" ? data.activeProfileId : null,
    schemaVersion: typeof data.schemaVersion === "number" ? data.schemaVersion : CURRENT_SCHEMA_VERSION,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString(),
    lastModifiedBy: typeof data.lastModifiedBy === "string" ? data.lastModifiedBy : defaultEmail,
    driveFileId: typeof data.driveFileId === "string" ? data.driveFileId : null,
    recurringRules: Array.isArray(data.recurringRules) ? data.recurringRules : [],
    transactionRules: Array.isArray(data.transactionRules) ? data.transactionRules : []
  };

  // Ensure each profile is fully typed with all arrays initialized
  migrated.profiles = migrated.profiles.map((p: unknown) => {
    const profileObj = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
    const rawRecurring = Array.isArray(profileObj.recurringRules) ? profileObj.recurringRules : [];
    const rawTx = Array.isArray(profileObj.transactionRules) ? profileObj.transactionRules : [];

    const profile: Profile = {
      id: String(profileObj.id || crypto.randomUUID()),
      name: String(profileObj.name || "Profil"),
      kind: (profileObj.kind === "shared" ? "shared" : "personal") as "personal" | "shared",
      partnerName: profileObj.partnerName ? String(profileObj.partnerName) : undefined,
      avatar: profileObj.avatar ? String(profileObj.avatar) : undefined,
      pinHash: profileObj.pinHash ? String(profileObj.pinHash) : undefined,
      salt: profileObj.salt ? String(profileObj.salt) : undefined,
      encryptedPayload: profileObj.encryptedPayload ? String(profileObj.encryptedPayload) : undefined,
      accounts: Array.isArray(profileObj.accounts) ? profileObj.accounts : [],
      transactions: Array.isArray(profileObj.transactions) ? profileObj.transactions : [],
      payments: Array.isArray(profileObj.payments) ? profileObj.payments : [],
      goals: Array.isArray(profileObj.goals) ? profileObj.goals : [],
      investments: Array.isArray(profileObj.investments) ? profileObj.investments : [],
      budgets: profileObj.budgets && typeof profileObj.budgets === "object" ? (profileObj.budgets as Record<string, number>) : {},
      recurringRules: rawRecurring.filter(isRuleLike).map(normalizeRecurringRule),
      transactionRules: rawTx.filter(isRuleLike).map((r) => {
        const clean = normalizeTransactionRule(r);
        delete clean.profileId;
        return clean;
      }),
      settlements: Array.isArray(profileObj.settlements) ? profileObj.settlements : []
    };

    // Ensure Goals are migrated with optional transfers list
    profile.goals = profile.goals.map((g: unknown) => {
      const goalObj = (g && typeof g === "object" ? g : {}) as Record<string, unknown>;
      return {
        id: String(goalObj.id || ""),
        name: String(goalObj.name || "Cel"),
        target: Number(goalObj.target || 0),
        saved: Number(goalObj.saved || 0),
        transfers: Array.isArray(goalObj.transfers) ? goalObj.transfers : [],
        ...(goalObj.targetDate ? { targetDate: String(goalObj.targetDate) } : {})
      };
    });
    return profile;
  });

  const originalActiveProfileId = (typeof data.activeProfileId === "string" && data.activeProfileId.trim() !== "")
    ? data.activeProfileId
    : null;

  if (!migrated.activeProfileId && migrated.profiles.length > 0) {
    migrated.activeProfileId = migrated.profiles[0].id;
  }

  // --- MIGRATION: AppState.recurringRules to Profile.recurringRules ---
  if (migrated.recurringRules && migrated.recurringRules.length > 0) {
    const unmigratedRules: RecurringRule[] = [];

    for (const rawRule of migrated.recurringRules) {
      if (!isRuleLike(rawRule)) {
        continue;
      }

      const ruleProfileId = typeof rawRule.profileId === "string" && rawRule.profileId.trim() !== "" ? rawRule.profileId : undefined;
      const targetProfile = findTargetProfile(ruleProfileId, originalActiveProfileId, migrated.profiles);

      if (targetProfile) {
        const cleanRule = normalizeRecurringRule(rawRule);
        if (!targetProfile.recurringRules) {
          targetProfile.recurringRules = [];
        }
        const exists = targetProfile.recurringRules.some((r) => r.id === cleanRule.id);
        if (!exists) {
          targetProfile.recurringRules.push(cleanRule);
        }
      } else {
        const cleanUnmigrated = normalizeRecurringRule(rawRule);
        if (ruleProfileId) {
          (cleanUnmigrated as RecurringRule & { profileId?: string }).profileId = ruleProfileId;
        }
        unmigratedRules.push(cleanUnmigrated);
      }
    }

    migrated.recurringRules = unmigratedRules;
  }

  // --- MIGRATION: AppState.transactionRules to Profile.transactionRules ---
  if (migrated.transactionRules && migrated.transactionRules.length > 0) {
    const unmigratedRules: TransactionRule[] = [];

    for (const rawRule of migrated.transactionRules) {
      if (!isRuleLike(rawRule)) {
        continue;
      }

      const ruleProfileId = typeof rawRule.profileId === "string" && rawRule.profileId.trim() !== "" ? rawRule.profileId : undefined;
      const targetProfile = findTargetProfile(ruleProfileId, originalActiveProfileId, migrated.profiles);

      if (targetProfile) {
        const cleanRule = normalizeTransactionRule(rawRule);
        delete cleanRule.profileId;
        if (!targetProfile.transactionRules) {
          targetProfile.transactionRules = [];
        }
        const exists = targetProfile.transactionRules.some((r) => r.id === cleanRule.id);
        if (!exists) {
          targetProfile.transactionRules.push(cleanRule);
        }
      } else {
        const cleanUnmigrated = normalizeTransactionRule(rawRule);
        if (ruleProfileId) {
          cleanUnmigrated.profileId = ruleProfileId;
        }
        unmigratedRules.push(cleanUnmigrated);
      }
    }

    migrated.transactionRules = unmigratedRules;
  }

  return migrated;
}

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

  // Fetch state from the backend Express server (Fallback / Demo mode)
  const fetchState = useCallback(async (showLoader = false) => {
    if (showLoader) setIsSyncing(true);
    setApiError(null);
    if (showLoader) setIsSyncing(false);
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
