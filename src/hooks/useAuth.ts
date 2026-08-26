import { useState, useEffect, useCallback } from "react";
import type { User } from "firebase/auth";
import { googleSignInBasic, requestGoogleDriveAccess, requestGoogleCalendarAccess, logout, initAuth, getGoogleToken } from "../firebase";
import { clearActiveKeys } from "../services/crypto";

interface UseAuthProps {
  onAuthSuccess?: (user: User, token: string | null) => void;
  onAuthFailure?: () => void;
}

type AuthMode = "basic" | "drive" | "calendar";

export function useAuth({ onAuthSuccess, onAuthFailure }: UseAuthProps = {}) {
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [calendarToken, setCalendarToken] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      async (user, _token) => {
        setGoogleUser(user);
        setDriveToken(getGoogleToken("drive"));
        setCalendarToken(getGoogleToken("calendar"));
        if (onAuthSuccess) {
          onAuthSuccess(user, getGoogleToken("basic"));
        }
      },
      () => {
        setGoogleUser(null);
        setDriveToken(null);
        setCalendarToken(null);
        if (onAuthFailure) {
          onAuthFailure();
        }
      }
    );
    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [onAuthSuccess, onAuthFailure]);

  const connectGoogle = useCallback(async (mode: AuthMode = "basic") => {
    setIsGoogleLoading(true);
    setGoogleError(null);
    try {
      let result;
      if (mode === "drive") {
        result = await requestGoogleDriveAccess();
        if (result) setDriveToken(result.accessToken);
      } else if (mode === "calendar") {
        result = await requestGoogleCalendarAccess();
        if (result) setCalendarToken(result.accessToken);
      } else {
        result = await googleSignInBasic();
      }
      
      if (result) {
        setGoogleUser(result.user);
        return result;
      }
      return null;
    } catch (err: any) {
      console.error("Failed to connect Google account:", err);
      if (err?.code === "auth/popup-closed-by-user" || err?.message?.includes("popup-closed-by-user")) {
        setGoogleError("auth/popup-closed-by-user");
      } else {
        setGoogleError(err?.message || String(err));
      }
      throw err;
    } finally {
      setIsGoogleLoading(false);
    }
  }, []);

  const disconnectGoogle = useCallback(async () => {
    try {
      await logout();
      clearActiveKeys();
      setGoogleUser(null);
      setDriveToken(null);
      setCalendarToken(null);
      setGoogleError(null);
    } catch (err) {
      console.error("Logout failed:", err);
      throw err;
    }
  }, []);

  const invalidateDriveToken = useCallback(() => {
    setDriveToken(null);
  }, []);

  const invalidateCalendarToken = useCallback(() => {
    setCalendarToken(null);
  }, []);

  return {
    googleUser,
    driveToken,
    calendarToken,
    isGoogleAuthenticated: Boolean(googleUser),
    hasDriveAccess: Boolean(driveToken),
    hasCalendarAccess: Boolean(calendarToken),
    isGoogleLoading,
    googleError,
    setGoogleError,
    connectGoogle,
    disconnectGoogle,
    invalidateDriveToken,
    invalidateCalendarToken
  };
}
