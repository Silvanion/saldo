import { useState, useCallback, useMemo } from "react";
import { Profile, AppState } from "../types";
import { hashPin } from "../utils";
import { deriveKeyFromPin, activeKeys, decryptProfile, generateRandomSalt } from "../services/crypto";

const MAX_ATTEMPTS_BEFORE_LOCKOUT = 5;
const BASE_LOCKOUT_MS = 30_000; // 30 seconds

export function useProfileSecurity({
  state,
  activeProfile,
  saveState,
}: {
  state: AppState;
  activeProfile: Profile | null;
  saveState: (newState: AppState, localOnly?: boolean) => Promise<void>;
}) {
  const [unlockedProfileId, setUnlockedProfileId] = useState<string | null>(null);
  const [isSecurityInfoOpen, setIsSecurityInfoOpen] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  const unlockProfile = useCallback((profileId: string) => {
    setUnlockedProfileId(profileId);
  }, []);

  const lockProfile = useCallback(() => {
    setUnlockedProfileId(null);
  }, []);

  const toggleSecurityInfo = useCallback((isOpen?: boolean) => {
    setIsSecurityInfoOpen((prev) => (isOpen !== undefined ? isOpen : !prev));
  }, []);

  const checkAccess = useCallback((profile: Profile | null): boolean => {
    if (!profile) return false;
    // Otwarty profil (brak PIN) lub profil poprawnie odblokowany
    return !profile.pinHash || unlockedProfileId === profile.id;
  }, [unlockedProfileId]);

  const isProfileLocked = useMemo(() => {
    return !!(activeProfile?.pinHash && unlockedProfileId !== activeProfile.id);
  }, [activeProfile, unlockedProfileId]);

  const handleUnlockProfile = useCallback(
    async (pin: string): Promise<boolean> => {
      if (!activeProfile) return false;

      // Check lockout
      if (lockoutUntil && Date.now() < lockoutUntil) {
        return false;
      }

      try {
        const salt = activeProfile.salt || activeProfile.id;
        const hashed = await hashPin(pin, salt);
        if (hashed === activeProfile.pinHash) {
          const key = await deriveKeyFromPin(pin, salt);
          
          let decrypted = activeProfile;
          if (activeProfile.encryptedPayload) {
            try {
              decrypted = await decryptProfile(activeProfile, key);
            } catch (decryptErr) {
              console.error("Unlock profile decryption error:", decryptErr);
              throw new Error("Nie udało się odszyfrować danych profilu. Sprawdź kod PIN lub spójność danych.");
            }
          }
          const updatedProfiles = state.profiles.map(p => p.id === activeProfile.id ? decrypted : p);

          // Await tak samo jak w handleSetProfilePin: caller (onUnlock) czeka na ten
          // Promise zanim zamknie UnlockModal, więc bez await szybki reload zaraz po
          // odblokowaniu mógł trafić na IndexedDB, które wciąż miało wersję zaszyfrowaną
          // (pusty transactions) — profil znów wyglądałby na zablokowany mimo poprawnego PIN-u.
          await saveState({ ...state, profiles: updatedProfiles }, true);
          unlockProfile(activeProfile.id);
          // Reset brute-force counters on success
          setFailedAttempts(0);
          setLockoutUntil(null);
          return true;
        }

        // Failed attempt
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        if (newAttempts >= MAX_ATTEMPTS_BEFORE_LOCKOUT) {
          const exponent = newAttempts - MAX_ATTEMPTS_BEFORE_LOCKOUT;
          const lockoutMs = BASE_LOCKOUT_MS * Math.pow(2, Math.min(exponent, 6)); // cap at ~32 min
          setLockoutUntil(Date.now() + lockoutMs);
        }
        return false;
      } catch (err) {
        console.error("Unlock profile error:", err);
        return false;
      }
    },
    [activeProfile, unlockProfile, state, saveState, failedAttempts, lockoutUntil]
  );

  const handleSetProfilePin = useCallback(
    async (pin: string | null) => {
      if (!activeProfile) return;
      if (pin) {
        const newSalt = generateRandomSalt();
        const newHash = await hashPin(pin, newSalt);
        const key = await deriveKeyFromPin(pin, newSalt);
        const updatedProfiles = state.profiles.map((p) => {
          if (p.id === activeProfile.id) {
            return { ...p, pinHash: newHash, salt: newSalt };
          }
          return p;
        });
        // Musi być await: onSavePin (ModalManager) czeka na tę funkcję i dopiero potem
        // zamyka modal. Bez await modal zamykał się (i pozwalał np. na reload strony)
        // zanim zaszyfrowany zapis faktycznie trafił do IndexedDB — szybki reload po
        // ustawieniu PIN-u cicho "cofał" ochronę, bo IndexedDB wciąż miało stary,
        // sprzed-PIN-owy stan.
        await saveState({ ...state, profiles: updatedProfiles });
        unlockProfile(activeProfile.id);
      } else {
        const updatedProfiles = state.profiles.map((p) => {
          if (p.id === activeProfile.id) {
            const { encryptedPayload, salt, pinHash, ...rest } = p;
            return { ...rest, pinHash: "" };
          }
          return p;
        });
        await saveState({ ...state, profiles: updatedProfiles });
      }
    },
    [activeProfile, state, saveState, unlockProfile]
  );

  return {
    unlockedProfileId,
    unlockProfile,
    lockProfile,
    isSecurityInfoOpen,
    toggleSecurityInfo,
    checkAccess,
    isProfileLocked,
    handleUnlockProfile,
    handleSetProfilePin,
    failedAttempts,
    lockoutUntil,
  };
}
