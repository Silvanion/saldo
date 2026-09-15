import { useState, useCallback, useMemo, useEffect } from "react";
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

  // System lock listener (np. gdy PC zostaje uśpiony lub zablokowany)
  useEffect(() => {
    if (window.electronAPI?.onSystemLock) {
      return window.electronAPI.onSystemLock(() => {
        lockProfile();
      });
    }
  }, [lockProfile]);

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
          // Bez tego kolejny zapis/backup zaraz po odblokowaniu profilu widział brak
          // klucza w activeKeys i pokazywał komunikat "profil zablokowany", mimo że
          // użytkownik przed chwilą poprawnie podał PIN.
          activeKeys[activeProfile.id] = key;

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
        activeKeys[activeProfile.id] = key;
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

  // Aktywuje i (jeśli podano PIN) odszyfrowuje wskazany profil w jednym kroku —
  // używane przez ekran wyboru profilu, gdzie w momencie wywołania profil nie jest
  // jeszcze "activeProfile" z kontekstu, więc handleUnlockProfile (który operuje na
  // activeProfile z domknięcia) nie może być użyty bezpośrednio.
  const handleSelectAndUnlockProfile = useCallback(
    async (profile: Profile, pin?: string): Promise<boolean> => {
      if (!profile.pinHash || !pin) {
        await saveState({ ...state, activeProfileId: profile.id }, true);
        if (!profile.pinHash) unlockProfile(profile.id);
        return !profile.pinHash;
      }

      try {
        const salt = profile.salt || profile.id;
        const hashed = await hashPin(pin, salt);
        if (hashed !== profile.pinHash) return false;

        const key = await deriveKeyFromPin(pin, salt);
        activeKeys[profile.id] = key;
        let decrypted = profile;
        if (profile.encryptedPayload) {
          decrypted = await decryptProfile(profile, key);
        }
        const updatedProfiles = state.profiles.map(p => p.id === profile.id ? decrypted : p);
        await saveState({ ...state, profiles: updatedProfiles, activeProfileId: profile.id }, true);
        unlockProfile(profile.id);
        return true;
      } catch (err) {
        console.error("Select+unlock profile error:", err);
        return false;
      }
    },
    [state, saveState, unlockProfile]
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
    handleSelectAndUnlockProfile,
    failedAttempts,
    lockoutUntil,
  };
}
