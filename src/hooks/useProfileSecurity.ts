import { useState, useCallback, useMemo } from "react";
import { Profile, AppState } from "../types";
import { hashPin } from "../utils";
import { deriveKeyFromPin, activeKeys, decryptProfile, generateRandomSalt } from "../services/crypto";

export function useProfileSecurity({
  state,
  activeProfile,
  saveState,
}: {
  state: AppState;
  activeProfile: Profile | null;
  saveState: (newState: AppState, localOnly?: boolean) => void;
}) {
  const [unlockedProfileId, setUnlockedProfileId] = useState<string | null>(null);
  const [isSecurityInfoOpen, setIsSecurityInfoOpen] = useState(false);

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
          activeKeys[activeProfile.id] = key;
          
          const updatedProfiles = state.profiles.map(p => p.id === activeProfile.id ? decrypted : p);
          
          saveState({ ...state, profiles: updatedProfiles }, true);
          unlockProfile(activeProfile.id);
          return true;
        }
        return false;
      } catch (err) {
        console.error("Unlock profile error:", err);
        return false;
      }
    },
    [activeProfile, unlockProfile, state, saveState]
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
        saveState({ ...state, profiles: updatedProfiles });
        unlockProfile(activeProfile.id);
      } else {
        delete activeKeys[activeProfile.id];
        const updatedProfiles = state.profiles.map((p) => {
          if (p.id === activeProfile.id) {
            const { encryptedPayload, salt, pinHash, ...rest } = p;
            return { ...rest, pinHash: "" };
          }
          return p;
        });
        saveState({ ...state, profiles: updatedProfiles });
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
    handleSetProfilePin
  };
}
