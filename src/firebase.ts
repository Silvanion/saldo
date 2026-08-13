import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, Auth } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, Firestore } from "firebase/firestore";
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

let cachedUser: User | null = null;

// Initialize Auth State Listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  if (!isFirebaseConfigured || !auth?.app) {
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }
  try {
    return onAuthStateChanged(auth, async (user: User | null) => {
      cachedUser = user;
      if (user) {
        if (onAuthSuccess) onAuthSuccess(user, tokens.basic);
      } else {
        tokens = { basic: null, drive: null, calendar: null };
        if (onAuthFailure) onAuthFailure();
      }
    });
  } catch (err) {
    console.warn("Błąd podczas nasłuchiwania stanu autoryzacji Firebase:", err);
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }
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
    
    const result = await signInWithPopup(auth, provider);
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
