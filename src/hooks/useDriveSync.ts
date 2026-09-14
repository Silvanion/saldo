
import { useState, useEffect, useCallback } from "react";
import { AppState } from "../types";
import { findBudgetFile, readBudgetFile, updateBudgetFile, createBudgetFile, GoogleAuthError } from "../googleDrive";
import { validateAndMigrateState } from "../utils/stateMigration";
import { prepareStateForRemoteSave, decryptProfile, activeKeys } from "../services/crypto";

export type ConflictResolutionChoice = "download_remote" | "upload_local" | "cancel";

export interface SyncConflictInfo {
  localState: AppState;
  remoteState: AppState;
  lastSyncedAt?: string | null;
  fileId?: string | null;
}

export interface DriveIntegrityReport {
  status: "synced" | "remote_newer" | "local_newer" | "conflict" | "no_remote_file" | "error";
  message: string;
  localUpdatedAt?: string | null;
  remoteUpdatedAt?: string | null;
  localProfilesCount?: number;
  remoteProfilesCount?: number;
  localTxCount?: number;
  remoteTxCount?: number;
  checkedAt: string;
}

interface UseDriveSyncProps {
  driveToken: string | null;
  state: AppState;
  onImportState: (newState: AppState) => void;
  onBeforeRestore?: () => void;
  onDriveAuthInvalid?: () => void;
}

const DRIVE_FILE_ID_KEY = "saldo-drive-file-id";
const LAST_SYNCED_AT_KEY = "saldo-drive-last-synced-iso";

/**
 * Pure function to detect conflict between local and remote state.
 */
export function detectConflict(
  local: { updatedAt?: string } | null | undefined,
  remote: { updatedAt?: string } | null | undefined,
  lastSyncedAt?: string | null
): boolean {
  if (!local || !remote) {
    return false;
  }

  const localTs = local.updatedAt || null;
  const remoteTs = remote.updatedAt || null;

  // Exact timestamp match means no conflict
  if (localTs && remoteTs && localTs === remoteTs) {
    return false;
  }

  if (lastSyncedAt) {
    const lastSyncedTime = new Date(lastSyncedAt).getTime();
    if (!isNaN(lastSyncedTime) && lastSyncedTime > 0) {
      const localTime = localTs ? new Date(localTs).getTime() : 0;
      const remoteTime = remoteTs ? new Date(remoteTs).getTime() : 0;

      const localHasNewerChanges = localTime > lastSyncedTime;
      const remoteHasNewerChanges = remoteTime > lastSyncedTime;

      if (localHasNewerChanges && remoteHasNewerChanges && localTs !== remoteTs) {
        return true;
      }

      return false;
    }
  }

  if (localTs && remoteTs && localTs !== remoteTs) {
    return true;
  }

  return false;
}

export function useDriveSync({
  driveToken,
  state,
  onImportState,
  onBeforeRestore,
  onDriveAuthInvalid
}: UseDriveSyncProps) {
  const [gdriveFileId, setGdriveFileId] = useState<string | null>(() => {
    return state.driveFileId || (typeof window !== "undefined" ? localStorage.getItem(DRIVE_FILE_ID_KEY) : null);
  });
  const [gdriveLastSynced, setGdriveLastSynced] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const savedIso = localStorage.getItem(LAST_SYNCED_AT_KEY);
    if (savedIso) {
      const d = new Date(savedIso);
      return isNaN(d.getTime()) ? savedIso : d.toLocaleString("pl-PL");
    }
    return null;
  });
  const [isDriveActionLoading, setIsDriveActionLoading] = useState<boolean>(false);
  const [driveConflictInfo, setDriveConflictInfo] = useState<SyncConflictInfo | null>(null);
  const [driveIntegrityReport, setDriveIntegrityReport] = useState<DriveIntegrityReport | null>(null);

  // Keep gdriveFileId and localStorage in sync
  useEffect(() => {
    if (state.driveFileId) {
      setGdriveFileId(state.driveFileId);
      if (typeof window !== "undefined") {
        localStorage.setItem(DRIVE_FILE_ID_KEY, state.driveFileId);
      }
    }
  }, [state.driveFileId]);

  // Auto-lookup the file when token is available if we don't have a known driveFileId
  useEffect(() => {
    if (driveToken) {
      const savedId = state.driveFileId || localStorage.getItem(DRIVE_FILE_ID_KEY);
      if (savedId) {
        setGdriveFileId(savedId);
      } else {
        findBudgetFile(driveToken)
          .then((file) => {
            if (file) {
              setGdriveFileId(file.id);
              localStorage.setItem(DRIVE_FILE_ID_KEY, file.id);
              if (file.modifiedTime) {
                setGdriveLastSynced(new Date(file.modifiedTime).toLocaleString("pl-PL"));
              }
            }
          })
          .catch((e) => {
            if (e instanceof GoogleAuthError || e.message?.includes("SESSION_EXPIRED")) {
              if (onDriveAuthInvalid) onDriveAuthInvalid();
            }
          });
      }
    } else {
      setGdriveFileId(null);
      setGdriveLastSynced(null);
    }
  }, [driveToken, state.driveFileId]);

  const backupToDriveManual = useCallback(
    async (options?: { forceAction?: ConflictResolutionChoice }): Promise<void> => {
      if (!navigator.onLine) {
        throw new Error("Jesteś offline. Połącz się z internetem, aby zsynchronizować z dyskiem.");
      }
      if (!driveToken) {
        throw new Error("Konto Google Drive nie jest podłączone.");
      }
      if (!state || !Array.isArray(state.profiles) || state.profiles.length === 0) {
        throw new Error("Błąd integralności: próba zapisu pustego profilu na Dysk Google.");
      }
      setIsDriveActionLoading(true);
      try {
        let fileId = gdriveFileId || state.driveFileId || localStorage.getItem(DRIVE_FILE_ID_KEY);
        const lastSyncedAtIso = localStorage.getItem(LAST_SYNCED_AT_KEY);

        // Fetch remote state to check for conflict unless forceAction is specified
        if (!options?.forceAction && fileId) {
          try {
            const rawRemote = await readBudgetFile(driveToken, fileId);
            if (rawRemote && Array.isArray(rawRemote.profiles)) {
              const validatedRemote = validateAndMigrateState(rawRemote);
              const isConflict = detectConflict(state, validatedRemote, lastSyncedAtIso);
              if (isConflict) {
                setDriveConflictInfo({
                  localState: state,
                  remoteState: validatedRemote,
                  lastSyncedAt: lastSyncedAtIso,
                  fileId
                });
                return;
              }
            }
          } catch (e: any) {
            if (e instanceof GoogleAuthError || e.message?.includes("SESSION_EXPIRED")) {
              throw e;
            }
          }
        }

        const stateToBackup = await prepareStateForRemoteSave(state);
        let targetFileId: string | null = fileId;

        if (fileId) {
          try {
            await updateBudgetFile(driveToken, fileId, stateToBackup);
          } catch (err: any) {
            if (err.message?.includes("FILE_NOT_FOUND")) {
              fileId = null;
              setGdriveFileId(null);
              localStorage.removeItem(DRIVE_FILE_ID_KEY);
              targetFileId = null;
            } else {
              throw err;
            }
          }
        }

        if (!targetFileId) {
          const existing = await findBudgetFile(driveToken);
          if (existing) {
            await updateBudgetFile(driveToken, existing.id, stateToBackup);
            targetFileId = existing.id;
          } else {
            targetFileId = await createBudgetFile(driveToken, stateToBackup);
          }
        }

        if (targetFileId) {
          setGdriveFileId(targetFileId);
          localStorage.setItem(DRIVE_FILE_ID_KEY, targetFileId);
          // Keep the local state decrypted after uploading the encrypted backup.
          onImportState({ ...state, driveFileId: targetFileId });
        }

        const syncIso = stateToBackup.updatedAt || new Date().toISOString();
        localStorage.setItem(LAST_SYNCED_AT_KEY, syncIso);
        setGdriveLastSynced(new Date().toLocaleString("pl-PL"));
      } catch (err: any) {
        if (err instanceof GoogleAuthError || err.message?.includes("SESSION_EXPIRED")) {
          if (onDriveAuthInvalid) onDriveAuthInvalid();
          throw new Error("Sesja Google Drive wygasła. Połącz Google Drive ponownie.");
        }
        throw err;
      } finally {
        setIsDriveActionLoading(false);
      }
    },
    [driveToken, gdriveFileId, state, onImportState, onDriveAuthInvalid]
  );

  const restoreFromDriveManual = useCallback(
    async (options?: { forceAction?: ConflictResolutionChoice }): Promise<void> => {
      if (!navigator.onLine) {
        throw new Error("Jesteś offline. Połącz się z internetem, aby pobrać kopię zapasową z dysku.");
      }
      if (!driveToken) {
        throw new Error("Konto Google Drive nie jest podłączone.");
      }
      setIsDriveActionLoading(true);
      try {
        let fileId = gdriveFileId || state.driveFileId || localStorage.getItem(DRIVE_FILE_ID_KEY);
        const lastSyncedAtIso = localStorage.getItem(LAST_SYNCED_AT_KEY);

        let importedRawState: AppState | null = null;
        let validFileId: string | null = null;

        if (fileId) {
          try {
            importedRawState = await readBudgetFile(driveToken, fileId);
            validFileId = fileId;
          } catch (e: any) {
            if (e instanceof GoogleAuthError || e.message?.includes("SESSION_EXPIRED")) {
              throw e;
            }
            fileId = null;
            setGdriveFileId(null);
            localStorage.removeItem(DRIVE_FILE_ID_KEY);
          }
        }

        if (!importedRawState) {
          const file = await findBudgetFile(driveToken);
          if (!file) {
            throw new Error("Nie odnaleziono pliku kopii zapasowej 'saldo_budget.json' na Dysku Google.");
          }
          importedRawState = await readBudgetFile(driveToken, file.id);
          validFileId = file.id;
        }

        if (importedRawState && Array.isArray(importedRawState.profiles)) {
          const validatedState = validateAndMigrateState({ ...importedRawState, driveFileId: validFileId });

          if (!options?.forceAction) {
            const isConflict = detectConflict(state, validatedState, lastSyncedAtIso);
            if (isConflict) {
              setDriveConflictInfo({
                localState: state,
                remoteState: validatedState,
                lastSyncedAt: lastSyncedAtIso,
                fileId: validFileId
              });
              return;
            }
          }

          const decryptedProfiles = await Promise.all(
            validatedState.profiles.map(async (p) => {
              if (p.encryptedPayload && activeKeys[p.id]) {
                try {
                  return await decryptProfile(p, activeKeys[p.id]);
                } catch (err) {
                  console.error("Failed decrypting restored profile:", p.id);
                  return p;
                }
              }
              return p;
            })
          );
          validatedState.profiles = decryptedProfiles;

          if (onBeforeRestore) {
            onBeforeRestore();
          }

          onImportState(validatedState);
          if (validFileId) {
            setGdriveFileId(validFileId);
            localStorage.setItem(DRIVE_FILE_ID_KEY, validFileId);
          }
          const syncIso = validatedState.updatedAt || new Date().toISOString();
          localStorage.setItem(LAST_SYNCED_AT_KEY, syncIso);
          setGdriveLastSynced(new Date().toLocaleString("pl-PL"));
        } else {
          throw new Error("Pobrany plik ma nieprawidłowy format danych.");
        }
      } catch (err: any) {
        if (err instanceof GoogleAuthError || err.message?.includes("SESSION_EXPIRED")) {
          if (onDriveAuthInvalid) onDriveAuthInvalid();
          throw new Error("Sesja Google Drive wygasła. Połącz Google Drive ponownie.");
        }
        throw err;
      } finally {
        setIsDriveActionLoading(false);
      }
    },
    [driveToken, gdriveFileId, state, onImportState, onBeforeRestore, onDriveAuthInvalid]
  );

  const resolveDriveConflict = useCallback(
    async (choice: ConflictResolutionChoice) => {
      // Task 4: Log decision locally without PII
      console.log(`[DriveSync] Decision logged locally: ${choice}`);
      try {
        const existingLogs = JSON.parse(localStorage.getItem("saldo-conflict-decision-logs") || "[]");
        existingLogs.push({
          timestamp: new Date().toISOString(),
          decision: choice
        });
        localStorage.setItem("saldo-conflict-decision-logs", JSON.stringify(existingLogs.slice(-20)));
      } catch (err) {
        console.warn("[DriveSync] Failed to persist conflict decision log:", err);
      }

      setDriveConflictInfo(null);

      if (choice === "download_remote") {
        await restoreFromDriveManual({ forceAction: "download_remote" });
      } else if (choice === "upload_local") {
        await backupToDriveManual({ forceAction: "upload_local" });
      } else {
        console.log("[DriveSync] Conflict resolution cancelled by user.");
      }
    },
    [backupToDriveManual, restoreFromDriveManual]
  );

  const checkDriveIntegrity = useCallback(async (): Promise<DriveIntegrityReport> => {
    if (!navigator.onLine) {
      const rep: DriveIntegrityReport = {
        status: "error",
        message: "Brak połączenia z internetem. Sprawdzenie spójności niemożliwe offline.",
        checkedAt: new Date().toISOString()
      };
      setDriveIntegrityReport(rep);
      return rep;
    }
    if (!driveToken) {
      const rep: DriveIntegrityReport = {
        status: "error",
        message: "Konto Google Drive nie jest podłączone.",
        checkedAt: new Date().toISOString()
      };
      setDriveIntegrityReport(rep);
      return rep;
    }
    setIsDriveActionLoading(true);
    try {
      let fileId = gdriveFileId || state.driveFileId || localStorage.getItem(DRIVE_FILE_ID_KEY);
      if (!fileId) {
        const file = await findBudgetFile(driveToken);
        if (!file) {
          const rep: DriveIntegrityReport = {
            status: "no_remote_file",
            message: "Plik saldo_budget.json nie istnieje jeszcze na Twoim Dysku Google. Wykonaj pierwszy zapis.",
            checkedAt: new Date().toISOString()
          };
          setDriveIntegrityReport(rep);
          return rep;
        }
        fileId = file.id;
        setGdriveFileId(file.id);
        localStorage.setItem(DRIVE_FILE_ID_KEY, file.id);
      }

      const remoteRaw = await readBudgetFile(driveToken, fileId);
      if (!remoteRaw || !Array.isArray(remoteRaw.profiles)) {
        const rep: DriveIntegrityReport = {
          status: "error",
          message: "Plik na Dysku Google ma nieprawidłowy format danych.",
          checkedAt: new Date().toISOString()
        };
        setDriveIntegrityReport(rep);
        return rep;
      }

      const validatedRemote = validateAndMigrateState(remoteRaw);
      const lastSyncedAtIso = localStorage.getItem(LAST_SYNCED_AT_KEY);
      const isConflict = detectConflict(state, validatedRemote, lastSyncedAtIso);

      const localTs = state.updatedAt ? new Date(state.updatedAt).getTime() : 0;
      const remoteTs = validatedRemote.updatedAt ? new Date(validatedRemote.updatedAt).getTime() : 0;

      const localTxCount = state.profiles.reduce((sum, p) => sum + (p.transactions?.length || 0), 0);
      const remoteTxCount = validatedRemote.profiles.reduce((sum, p) => sum + (p.transactions?.length || 0), 0);

      let status: DriveIntegrityReport["status"] = "synced";
      let message = "Wszystkie dane lokalne i plik na Dysku Google są w 100% spójne.";

      if (isConflict) {
        status = "conflict";
        message = "Wykryto rozbieżność: różne zmiany wprowadzono lokalnie i na Dysku Google.";
      } else if (remoteTs > localTs) {
        status = "remote_newer";
        message = "Na Dysku Google znajduje się nowsza wersja danych. Zalecane pobranie kopii z chmury.";
      } else if (localTs > remoteTs) {
        status = "local_newer";
        message = "Dane lokalne zawierają nowsze zmiany niż plik na Dysku. Zalecany zapis na Dysk Google.";
      }

      const report: DriveIntegrityReport = {
        status,
        message,
        localUpdatedAt: state.updatedAt,
        remoteUpdatedAt: validatedRemote.updatedAt,
        localProfilesCount: state.profiles.length,
        remoteProfilesCount: validatedRemote.profiles.length,
        localTxCount,
        remoteTxCount,
        checkedAt: new Date().toISOString()
      };
      setDriveIntegrityReport(report);
      return report;
    } catch (err: any) {
      const rep: DriveIntegrityReport = {
        status: "error",
        message: err.message || "Błąd podczas sprawdzania spójności z Dyskiem Google.",
        checkedAt: new Date().toISOString()
      };
      setDriveIntegrityReport(rep);
      return rep;
    } finally {
      setIsDriveActionLoading(false);
    }
  }, [driveToken, gdriveFileId, state]);

  return {
    gdriveFileId,
    gdriveLastSynced,
    isDriveActionLoading,
    driveConflictInfo,
    driveIntegrityReport,
    checkDriveIntegrity,
    clearIntegrityReport: () => setDriveIntegrityReport(null),
    backupToDriveManual,
    restoreFromDriveManual,
    resolveDriveConflict,
    closeDriveConflictModal: () => setDriveConflictInfo(null)
  };
}
