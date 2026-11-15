import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isFirebaseConfigured,
  clearGoogleTokens,
  getGoogleToken,
  saveUserStateToFirestore,
  deleteOwnAccount,
} from "./firebase";
import { AppState } from "./types";

// Mock Firebase SDK dynamic imports
const mockSetDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockAddDoc = vi.fn();
const mockDoc = vi.fn((...args: any[]) => ({ path: `${args[1]}/${args[2]}` }));
const mockCollection = vi.fn((...args: any[]) => ({ path: args[1] }));

const mockDeleteUser = vi.fn();
const mockReauthenticateWithCredential = vi.fn();
const mockReauthenticateWithPopup = vi.fn();
const mockSignOut = vi.fn();

const mockCurrentUser = {
  uid: "test-user-123",
  email: "test@example.com",
  providerData: [{ providerId: "google.com" }],
};

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({ name: "[DEFAULT]" })),
  getApps: vi.fn(() => []),
}));

vi.mock("firebase/auth", () => {
  return {
    getAuth: vi.fn(() => ({
      currentUser: mockCurrentUser,
      onAuthStateChanged: vi.fn(),
    })),
    setPersistence: vi.fn(),
    browserSessionPersistence: {},
    GoogleAuthProvider: class {
      setCustomParameters = vi.fn();
      addScope = vi.fn();
      static credentialFromResult = vi.fn();
    },
    EmailAuthProvider: {
      credential: vi.fn((email, pass) => ({ email, pass })),
    },
    reauthenticateWithCredential: (...args: any[]) => mockReauthenticateWithCredential(...args),
    reauthenticateWithPopup: (...args: any[]) => mockReauthenticateWithPopup(...args),
    deleteUser: (...args: any[]) => mockDeleteUser(...args),
    signOut: (...args: any[]) => mockSignOut(...args),
    getRedirectResult: vi.fn().mockResolvedValue(null),
    signInWithPopup: vi.fn(),
    signInWithRedirect: vi.fn(),
  };
});

vi.mock("firebase/firestore", () => ({
  getFirestore: vi.fn(() => ({ type: "firestore" })),
  doc: (...args: any[]) => mockDoc(...args),
  collection: (...args: any[]) => mockCollection(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  deleteDoc: (...args: any[]) => mockDeleteDoc(...args),
  addDoc: (...args: any[]) => mockAddDoc(...args),
}));

describe("Firebase Integration Module (src/firebase.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Konfiguracja i zarządzanie tokenami", () => {
    it("rozpoznaje skonfigurowane Firebase API", () => {
      expect(isFirebaseConfigured).toBe(true);
    });

    it("zarządza i poprawnie czyści tokeny Google", () => {
      expect(getGoogleToken("basic")).toBeNull();
      expect(getGoogleToken("drive")).toBeNull();
      expect(getGoogleToken("calendar")).toBeNull();

      clearGoogleTokens();
      expect(getGoogleToken("basic")).toBeNull();
    });
  });

  describe("saveUserStateToFirestore", () => {
    it("filtruje pola stanu przez pickSyncableState przed zapisem do Firestore", async () => {
      mockSetDoc.mockResolvedValueOnce(undefined);

      const testState: AppState = {
        profiles: [],
        activeProfileId: "prof-1",
        schemaVersion: 1,
        // Niedozwolone pole, które nie może trafić do chmury
        ...({ nonSyncableTempField: "nie_wysylac" } as any),
      };

      await saveUserStateToFirestore("user-test-uid", testState);

      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      const savedPayload = mockSetDoc.mock.calls[0][1];
      expect(savedPayload.activeProfileId).toBe("prof-1");
      expect(savedPayload.updatedAt).toBeDefined();
      expect((savedPayload as any).nonSyncableTempField).toBeUndefined();
    });

    it("rzuca CLOUD_LIMIT_EXCEEDED gdy rozmiar przekracza 950KB", async () => {
      // Duży obiekt przekraczający limit 950KB
      const hugeString = "X".repeat(960 * 1024);
      const oversizedState = {
        profiles: [],
        activeProfileId: "p1",
        smartRules: [{ id: "r1", name: hugeString } as any],
      } as unknown as AppState;

      await expect(saveUserStateToFirestore("user-test-uid", oversizedState)).rejects.toThrow(
        /CLOUD_LIMIT_EXCEEDED/
      );
      expect(mockSetDoc).not.toHaveBeenCalled();
    });
  });

  describe("deleteOwnAccount (RODO / GDPR)", () => {
    it("obsługuje usunięcie konta Google: reautentykacja, usunięcie Firestore i usunięcie Auth", async () => {
      mockCurrentUser.providerData = [{ providerId: "google.com" }] as any;
      mockReauthenticateWithPopup.mockResolvedValueOnce({});
      mockDeleteDoc.mockResolvedValueOnce(undefined);
      mockDeleteUser.mockResolvedValueOnce(undefined);

      await deleteOwnAccount();

      expect(mockReauthenticateWithPopup).toHaveBeenCalledTimes(1);
      expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
      expect(mockDeleteUser).toHaveBeenCalledTimes(1);
    });

    it("obsługuje usunięcie konta email/hasło po podaniu hasła", async () => {
      mockCurrentUser.providerData = [{ providerId: "password" }] as any;
      mockReauthenticateWithCredential.mockResolvedValueOnce({});
      mockDeleteDoc.mockResolvedValueOnce(undefined);
      mockDeleteUser.mockResolvedValueOnce(undefined);

      await deleteOwnAccount("SecretPassword123!");

      expect(mockReauthenticateWithCredential).toHaveBeenCalledTimes(1);
      expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
      expect(mockDeleteUser).toHaveBeenCalledTimes(1);
    });

    it("wymaga podania hasła dla kont z hasłem", async () => {
      mockCurrentUser.providerData = [{ providerId: "password" }] as any;

      await expect(deleteOwnAccount("")).rejects.toThrow(
        "Wymagane jest podanie aktualnego hasła do potwierdzenia tożsamości."
      );
      expect(mockDeleteDoc).not.toHaveBeenCalled();
      expect(mockDeleteUser).not.toHaveBeenCalled();
    });
  });
});
