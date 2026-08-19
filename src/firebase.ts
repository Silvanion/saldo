import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, onAuthStateChanged, User, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, EmailAuthProvider, reauthenticateWithCredential, updatePassword, verifyBeforeUpdateEmail, deleteUser, Auth, setPersistence, browserSessionPersistence } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, Firestore } from "firebase/firestore";
import { AppState } from "./types";

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const isValidApiKey = Boolean(
  apiKey &&
  apiKey !== "your-public-firebase-api-key" &&
  apiKey !== "your_firebase_api_key_here" &&
  !apiKey.startsWith("your-") &&
  apiKey.length > 10
);

let app: FirebaseApp | null = null;
let authInstance: Auth | any = null;
let dbInstance: Firestore | any = null;
let isFirebaseConfigured = false;

if (isValidApiKey) {
  try {
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };

    app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
    isFirebaseConfigured = true;
  } catch (error) {
    console.warn("Nie udało się zainicjalizować modułu Firebase:", error);
    isFirebaseConfigured = false;
  }
}

if (!authInstance) {
  authInstance = {
    currentUser: null,
    onAuthStateChanged: (_authObj: any, callback: any) => {
      callback(null);
      return () => {};
    }
  };
}

export const auth = authInstance;
export const db = dbInstance;
export { isFirebaseConfigured };

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.name : 'UnknownError',
    operationType,
    path
  };
  console.error('Firestore Error:', errInfo);
  throw new Error(`Wystąpił błąd podczas operacji na bazie danych (${operationType}).`);
}

// Flag to indicate if sign-in is in progress
let isSigningIn = false;

type GoogleScopeSet = "basic" | "drive" | "calendar";

let tokens: Record<GoogleScopeSet, string | null> = {
  basic: null,
  drive: null,
  calendar: null,
};

export const clearGoogleTokens = (): void => {
  tokens = { basic: null, drive: null, calendar: null };
};

export const getGoogleToken = (kind: GoogleScopeSet) => tokens[kind];

const SESSION_PERSISTENCE_MIGRATION_KEY = "saldo-session-persistence-migrated-v1";

const isSessionPersistenceMigrated = () =>
  typeof localStorage !== "undefined" &&
  localStorage.getItem(SESSION_PERSISTENCE_MIGRATION_KEY) === "true";

let cachedUser: User | null = null;

export const authPersistenceReady: Promise<void> =
  authInstance?.app
    ? setPersistence(authInstance, browserSessionPersistence).catch((error) => {
        console.warn(
          "Nie udało się ustawić sesyjnej persystencji Firebase Auth:",
          error
        );
      })
    : Promise.resolve();

// Initialize Auth State Listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  if (!isFirebaseConfigured || !auth?.app) {
    onAuthFailure?.();
    return () => {};
  }

  let cancelled = false;
  let unsubscribe: (() => void) | null = null;

  authPersistenceReady.then(() => {
    if (cancelled) return;

    if (typeof window !== "undefined") {
      getRedirectResult(auth).catch(() => {
        // Ignoruj brak wyniku redirectu
      });
    }

    if (cancelled) return;

    unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (cancelled) return;

      const migrated = isSessionPersistenceMigrated();

      if (user && !migrated) {
        try {
          await signOut(auth);
        } catch (err) {
          console.warn("Nie udało się wykonać jednorazowej migracji persystencji sesji:", err);
        } finally {
          if (typeof localStorage !== "undefined") {
            localStorage.setItem(
              SESSION_PERSISTENCE_MIGRATION_KEY,
              "true"
            );
          }

          cachedUser = null;
          tokens = { basic: null, drive: null, calendar: null };
          onAuthFailure?.();
        }

        if (cancelled) return;
        return;
      }

      if (!migrated && typeof localStorage !== "undefined") {
        localStorage.setItem(
          SESSION_PERSISTENCE_MIGRATION_KEY,
          "true"
        );
      }

      cachedUser = user;
      if (user) {
        if (onAuthSuccess) onAuthSuccess(user, tokens.basic);
      } else {
        tokens = { basic: null, drive: null, calendar: null };
        if (onAuthFailure) onAuthFailure();
      }
    });
  }).catch((err) => {
    console.warn("Błąd podczas inicjalizacji persystencji Firebase:", err);
    onAuthFailure?.();
  });

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
};

// Sign in with Google Popup (Basic)
export const googleSignInBasic = async (): Promise<{ user: User; accessToken: string } | null> => {
  return requestGoogleAccess("basic", []);
};

export const requestGoogleDriveAccess = async (): Promise<{ user: User; accessToken: string } | null> => {
  return requestGoogleAccess("drive", ["https://www.googleapis.com/auth/drive.file"]);
};

export const requestGoogleCalendarAccess = async (): Promise<{ user: User; accessToken: string } | null> => {
  return requestGoogleAccess("calendar", ["https://www.googleapis.com/auth/calendar.events"]);
};

const requestGoogleAccess = async (kind: GoogleScopeSet, scopes: string[]): Promise<{ user: User; accessToken: string } | null> => {
  if (!isFirebaseConfigured || !auth?.app) {
    throw new Error("Logowanie Firebase jest niedostępne (brak poprawnego VITE_FIREBASE_API_KEY).");
  }
  try {
    isSigningIn = true;
    const provider = new GoogleAuthProvider();
    const customParams: Record<string, string> = { include_granted_scopes: "true" };
    if (!tokens[kind] && scopes.length > 0) {
      customParams.prompt = "consent";
    }
    provider.setCustomParameters(customParams);
    scopes.forEach(scope => provider.addScope(scope));
    
    let result;
    try {
      result = await signInWithPopup(auth, provider);
    } catch (popupError: any) {
      const code = popupError?.code || "";
      const msg = (popupError?.message || "").toLowerCase();

      const isPopupBlocked =
        code === "auth/popup-blocked" ||
        code === "auth/cancelled-popup-request" ||
        msg.includes("popup-blocked") ||
        msg.includes("popup_blocked") ||
        msg.includes("blocked");

      if (code === "auth/popup-closed-by-user" || msg.includes("popup-closed-by-user") || code === "auth/unauthorized-domain") {
        throw popupError;
      }

      if (isPopupBlocked) {
        console.warn("Okno popup zablokowane przez przeglądarkę / adblock. Przełączanie na signInWithRedirect...", popupError);
        await signInWithRedirect(auth, provider);
        return null;
      }

      throw popupError;
    }

    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken && scopes.length > 0) {
      throw new Error("Nie udało się pobrać tokenu dostępu Google z usługi Firebase Auth.");
    }

    if (credential?.accessToken) {
      tokens[kind] = credential.accessToken;
    }
    cachedUser = result.user;
    return { user: result.user, accessToken: tokens[kind] || '' };
  } catch (error: any) {
    console.error("Firebase Sign-in Error:", error);
    if (error?.code === 'auth/unauthorized-domain') {
       throw new Error(`Błąd: Domena "${window.location.hostname}" nie jest autoryzowana. Wejdź w konsolę Firebase -> Authentication -> Ustawienia (Settings) -> Autoryzowane domeny (Authorized domains) i dodaj tę domenę.`);
    }
    if (error?.code === 'auth/popup-closed-by-user' || error?.message?.includes('popup-closed-by-user')) {
       throw new Error("Okno logowania Google zostało zamknięte przed ukończeniem autoryzacji.");
    }
    if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/cancelled-popup-request' || error?.message?.includes('popup-blocked')) {
       throw new Error("Okno wyskakujące zostało zablokowane przez przeglądarkę lub rozszerzenie (AdBlock). Rozpoczynamy przekierowanie do logowania...");
    }
    if (error?.code === 'auth/network-request-failed' || error?.message?.includes('network-request-failed')) {
       throw new Error("Połączenie z usługą autoryzacji Google zostało zablokowane (np. przez rozszerzenie prywatności / AdBlock lub brak sieci).");
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Email/Password Auth
export const registerWithEmail = async (email: string, pass: string) => {
  if (!isFirebaseConfigured || !auth?.app) {
    throw new Error("Rejestracja jest niedostępna (brak połączenia z Firebase).");
  }
  return createUserWithEmailAndPassword(auth, email, pass);
};

export const loginWithEmail = async (email: string, pass: string) => {
  if (!isFirebaseConfigured || !auth?.app) {
    throw new Error("Logowanie jest niedostępne (brak połączenia z Firebase).");
  }
  return signInWithEmailAndPassword(auth, email, pass);
};

// Reset hasła — wysyłka linku na podany email
export const resetPassword = async (email: string) => {
  if (!isFirebaseConfigured || !auth?.app) {
    throw new Error("Reset hasła jest niedostępny (brak połączenia z Firebase).");
  }
  return sendPasswordResetEmail(auth, email);
};

// Weryfikacja email — wysyłka linku weryfikacyjnego do zalogowanego użytkownika
export const verifyEmail = async () => {
  if (!auth?.currentUser) {
    throw new Error("Brak zalogowanego użytkownika do weryfikacji.");
  }
  return sendEmailVerification(auth.currentUser);
};

// Zmiana hasła po uwierzytelnieniu
export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  if (!isFirebaseConfigured || !auth?.currentUser) {
    throw new Error("Brak zalogowanego użytkownika lub połączenia z Firebase.");
  }
  if (!auth.currentUser.email) {
    throw new Error("Użytkownik nie posiada powiązanego adresu email.");
  }

  try {
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
    await updatePassword(auth.currentUser, newPassword);
  } catch (error: any) {
    const code = error?.code || "";
    if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
      throw new Error("Aktualne hasło jest nieprawidłowe.");
    } else if (code === "auth/too-many-requests") {
      throw new Error("Zbyt wiele prób. Spróbuj ponownie później.");
    } else if (code === "auth/weak-password") {
      throw new Error("Nowe hasło jest zbyt słabe. Wymagane co najmniej 6 znaków.");
    } else if (code === "auth/requires-recent-login") {
      throw new Error("Ta operacja wymaga ponownego zalogowania ze względów bezpieczeństwa.");
    } else if (code === "auth/network-request-failed") {
      throw new Error("Brak połączenia z siecią. Sprawdź swoje połączenie internetowe.");
    }
    throw new Error(error?.message || "Wystąpił błąd podczas zmiany hasła.");
  }
};

// Zmiana emaila po uwierzytelnieniu
export const changeEmail = async (currentPassword: string, newEmail: string): Promise<void> => {
  if (!isFirebaseConfigured || !auth?.currentUser) {
    throw new Error("Brak zalogowanego użytkownika lub połączenia z Firebase.");
  }
  if (!auth.currentUser.email) {
    throw new Error("Użytkownik nie posiada powiązanego adresu email.");
  }

  try {
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
    await verifyBeforeUpdateEmail(auth.currentUser, newEmail);
  } catch (error: any) {
    const code = error?.code || "";
    if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
      throw new Error("Aktualne hasło jest nieprawidłowe.");
    } else if (code === "auth/too-many-requests") {
      throw new Error("Zbyt wiele prób. Spróbuj ponownie później.");
    } else if (code === "auth/email-already-in-use") {
      throw new Error("Podany adres email jest już powiązany z innym kontem.");
    } else if (code === "auth/invalid-email") {
      throw new Error("Podany adres email jest nieprawidłowy.");
    } else if (code === "auth/requires-recent-login") {
      throw new Error("Ta operacja wymaga ponownego zalogowania ze względów bezpieczeństwa.");
    } else if (code === "auth/network-request-failed") {
      throw new Error("Brak połączenia z siecią. Sprawdź swoje połączenie internetowe.");
    }
    throw new Error(error?.message || "Wystąpił błąd podczas zmiany adresu email.");
  }
};

// Trwałe usunięcie konta i danych w chmurze (RODO / GDPR)
export const deleteOwnAccount = async (currentPassword?: string): Promise<void> => {
  if (!isFirebaseConfigured || !auth?.currentUser) {
    throw new Error("Brak zalogowanego użytkownika lub połączenia z Firebase.");
  }

  const user = auth.currentUser;
  const hasPasswordProvider = user.providerData?.some((p: any) => p.providerId === "password");

  // 1. Reautentykacja
  if (hasPasswordProvider) {
    if (!currentPassword) {
      throw new Error("Wymagane jest podanie aktualnego hasła do potwierdzenia tożsamości.");
    }
    if (!user.email) {
      throw new Error("Konto nie posiada przypisanego adresu email.");
    }
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
    } catch (error: any) {
      const code = error?.code || "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
        throw new Error("Aktualne hasło jest nieprawidłowe.");
      } else if (code === "auth/too-many-requests") {
        throw new Error("Zbyt wiele prób. Spróbuj ponownie później.");
      } else if (code === "auth/requires-recent-login") {
        throw new Error("Ta operacja wymaga ponownego zalogowania ze względów bezpieczeństwa.");
      } else if (code === "auth/network-request-failed") {
        throw new Error("Brak połączenia z siecią. Sprawdź swoje połączenie internetowe.");
      }
      throw new Error(error?.message || "Błąd uwierzytelnienia przed usunięciem konta.");
    }
  } else {
    // Google-only account
    throw new Error("Usuwanie kont powiązanych wyłącznie z Google nie jest obsługiwane z poziomu hasła. Zarządzaj dostępem na koncie Google.");
  }

  // 2. Krok 1 usuwania: Usunięcie dokumentu użytkownika z Firestore
  let firestoreDeleted = false;
  if (db) {
    try {
      const userDocRef = doc(db, "users", user.uid);
      await deleteDoc(userDocRef);
      firestoreDeleted = true;
    } catch (error: any) {
      const code = error?.code || "";
      console.error("Firestore document deletion failed:", error);
      if (code === "permission-denied") {
        throw new Error("Brak uprawnień do usunięcia danych w chmurze (błąd uprawnień Firestore).");
      }
      throw new Error(error?.message || "Nie udało się usunąć danych w chmurze. Konto logowania nie zostało naruszone.");
    }
  }

  // 3. Krok 2 usuwania: Usunięcie konta Firebase Auth
  try {
    await deleteUser(user);
  } catch (error: any) {
    console.error("Firebase Auth user deletion failed:", error);
    const code = error?.code || "";
    if (code === "auth/requires-recent-login") {
      throw new Error(
        firestoreDeleted
          ? "Twoje dane w chmurze zostały pomyślnie usunięte, ale usunięcie konta logowania wymaga świeżej sesji. Zaloguj się ponownie, aby dokończyć usuwanie konta."
          : "Operacja usunięcia konta wymaga ponownego zalogowania."
      );
    }
    throw new Error(
      firestoreDeleted
        ? "Twoje dane w chmurze zostały usunięte, ale wystąpił błąd podczas usuwania konta logowania. Spróbuj ponownie za chwilę."
        : error?.message || "Wystąpił błąd podczas usuwania konta."
    );
  }

  // 4. Krok 3: Wyczyść lokalne tokeny sesji
  tokens = { basic: null, drive: null, calendar: null };
  cachedUser = null;
};

// Retrieve currently cached access token (for basic compat)
export const getAccessToken = async (): Promise<string | null> => {
  return tokens.basic;
};

// Retrieve currently cached user
export const getCurrentUser = (): User | null => {
  return cachedUser;
};

// Log out and clear cached token
export const logout = async () => {
  try {
    if (isFirebaseConfigured && auth?.app) {
      await signOut(auth);
    }
    tokens = { basic: null, drive: null, calendar: null };
    cachedUser = null;
  } catch (error) {
    console.error("Firebase Sign-out Error:", error);
    tokens = { basic: null, drive: null, calendar: null };
    cachedUser = null;
  }
};

export const saveUserStateToFirestore = async (uid: string, state: AppState): Promise<void> => {
  if (!uid || !isFirebaseConfigured || !db) return;
  const path = `users/${uid}`;

  const payloadToSave = {
    ...state,
    updatedAt: new Date().toISOString()
  };

  try {
    const payloadString = JSON.stringify(payloadToSave);
    // Use TextEncoder to get actual byte length (handles multi-byte characters)
    const payloadSizeBytes = new TextEncoder().encode(payloadString).length;
    
    // 950KB safe threshold to prevent Firestore 1MB hard limit crash
    if (payloadSizeBytes > 950 * 1024) {
      throw new Error("CLOUD_LIMIT_EXCEEDED: Rozmiar danych przekracza bezpieczny limit chmury (1MB). Wyczyść starą historię lub zapisz kopię zapasową lokalnie.");
    }

    const userDocRef = doc(db, "users", uid);
    await setDoc(userDocRef, payloadToSave, { merge: true });
    console.log("State successfully saved to Firestore for user:", uid);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("CLOUD_LIMIT_EXCEEDED")) {
      console.error("Firestore Size Limit Error:", error.message);
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const loadUserStateFromFirestore = async (uid: string): Promise<AppState | null> => {
  if (!uid || !isFirebaseConfigured || !db) return null;
  const path = `users/${uid}`;
  try {
    const userDocRef = doc(db, "users", uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      console.log("State successfully loaded from Firestore for user:", uid);
      return docSnap.data() as AppState;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};
