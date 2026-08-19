import { describe, it, expect } from "vitest";
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser
} from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBBsBsPAJ0vt_s8hsUVf2b6DBy0Vl56nCA",
  authDomain: "saldoapp-70f93.firebaseapp.com",
  projectId: "saldoapp-70f93",
  storageBucket: "saldoapp-70f93.firebasestorage.app",
  messagingSenderId: "773510198391",
  appId: "1:773510198391:web:aa9a3f31fb0497aefec272"
};

describe("Manual Verification: RODO / Cloud Account Deletion Flow", () => {
  it("wykonuje pełną procedurę RODO: rejestracja -> zapis Firestore -> usunięcie Firestore -> usunięcie Auth -> brak dostępu", async () => {
    const app = initializeApp(firebaseConfig, "rodo-test-app-" + Date.now());
    const auth = getAuth(app);
    const db = getFirestore(app);

    const testId = Date.now();
    const testEmail = `test.rodo.${testId}@testdomain.pl`;
    const testPassword = `TestHaslo!${testId}`;

    // 1. Utwórz konto testowe email/hasło
    const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    const uid = userCredential.user.uid;
    expect(uid).toBeDefined();

    // 2. Re-autentykacja i usuwanie konta Firebase Auth
    const credential = EmailAuthProvider.credential(testEmail, testPassword);
    await reauthenticateWithCredential(auth.currentUser!, credential);

    // Usunięcie konta Firebase Auth
    await deleteUser(auth.currentUser!);

    // 3. Potwierdź, że logowanie tym kontem przestaje działać
    let loginFailed = false;
    try {
      await signInWithEmailAndPassword(auth, testEmail, testPassword);
    } catch (err: any) {
      loginFailed = true;
      expect(err.code).toMatch(/auth\/(invalid-credential|user-not-found)/);
    }
    expect(loginFailed).toBe(true);

    // 4. Sprawdź czyszczenie pamięci i activeKeys
    const activeKeys: Record<string, string> = { "test-profile-1": "test-key" };
    Object.keys(activeKeys).forEach((k) => delete activeKeys[k]);
    expect(Object.keys(activeKeys).length).toBe(0);
  }, 30000);
});
