import { useCallback, useState } from "react";
import { Profile } from "../types";

function storageKey(profileId: string): string {
  return `saldo_google_promo_dismissed_${profileId}`;
}

function readDismissed(profileId: string): boolean {
  try {
    return localStorage.getItem(storageKey(profileId)) === "1";
  } catch {
    return false;
  }
}

export function useGoogleSyncPromo(profile: Profile | null, googleUser: unknown) {
  const [dismissed, setDismissed] = useState(() => (profile ? readDismissed(profile.id) : false));

  const eligible = Boolean(
    profile &&
    !googleUser &&
    !dismissed &&
    (profile.transactions?.length ?? 0) >= 1
  );

  const dismiss = useCallback(() => {
    if (!profile) return;
    try {
      localStorage.setItem(storageKey(profile.id), "1");
    } catch {
      // localStorage niedostępny (np. tryb prywatny) — wyciszamy tylko na tę sesję
    }
    setDismissed(true);
  }, [profile]);

  return { eligible, dismiss };
}
