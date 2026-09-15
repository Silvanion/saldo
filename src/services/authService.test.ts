import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AuthService } from "./authService";
import { Profile } from "../types";

describe("AuthService - Uwierzytelnianie, Bezpieczeństwo i Polityki Blokady", () => {
  let sampleProfile: Profile;

  beforeEach(async () => {
    // Utwórz profil testowy z zahaszowanym kodem PIN "1234"
    const { pinHash, salt } = await AuthService.hashPin("1234");
    sampleProfile = {
      id: "test-profile-1",
      name: "Test User",
      kind: "personal",
      currency: "PLN",
      pinHash,
      salt,
      failedAttempts: 0,
      lockedUntil: null,
      transactions: [],
      payments: [],
      goals: [],
      investments: [],
      budgets: {}
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Tryb Demo (Guest Sandbox)", () => {
    it("tworzy poprawny profil demonstracyjny z flagą is_demo: true", () => {
      const demoProfile = AuthService.createDemoProfile();
      expect(demoProfile.id).toBe("demo-guest-profile");
      expect(demoProfile.name).toBe("Profil Demonstracyjny (Gość)");
      expect(demoProfile.is_demo).toBe(true);
      expect(demoProfile.pinHash).toBeUndefined();
      expect(demoProfile.transactions.length).toBeGreaterThan(0);
    });
  });

  describe("Hashowanie i Weryfikacja PIN (PBKDF2-SHA256)", () => {
    it("generuje unikalną sól i poprawny hash dla tego samego kodu PIN", async () => {
      const hash1 = await AuthService.hashPin("4321");
      const hash2 = await AuthService.hashPin("4321");

      expect(hash1.pinHash).toBeDefined();
      expect(hash1.salt).toBeDefined();
      expect(hash1.salt).not.toBe(hash2.salt);
      expect(hash1.pinHash).not.toBe(hash2.pinHash);
    });

    it("poprawnie weryfikuje prawidłowy PIN i resetuje licznik prób", async () => {
      // Symulacja wcześniejszych 2 błędnych prób
      sampleProfile.failedAttempts = 2;

      const result = await AuthService.verifyPin(sampleProfile, "1234");
      expect(result.isValid).toBe(true);
      expect(result.failedAttempts).toBe(0);
      expect(result.lockedUntil).toBeNull();
      expect(result.errorMessage).toBeUndefined();
    });

    it("odrzuca nieprawidłowy PIN i inkrementuje licznik błędnych prób", async () => {
      const result = await AuthService.verifyPin(sampleProfile, "9999");
      expect(result.isValid).toBe(false);
      expect(result.failedAttempts).toBe(1);
      expect(result.lockedUntil).toBeNull();
      expect(result.errorMessage).toContain("Niepoprawny kod PIN");
    });
  });

  describe("Polityka Ochrony przed Atakami Brute-Force (Lockout Policy)", () => {
    it("nakłada 30 sekund blokady po 4 błędnych próbach", async () => {
      sampleProfile.failedAttempts = 3;

      const result = await AuthService.verifyPin(sampleProfile, "9999");
      expect(result.isValid).toBe(false);
      expect(result.failedAttempts).toBe(4);
      expect(result.lockedUntil).not.toBeNull();

      const remainingSec = AuthService.calculateLockoutRemaining(result.lockedUntil);
      expect(remainingSec).toBeGreaterThan(25);
      expect(remainingSec).toBeLessThanOrEqual(30);
      expect(result.errorMessage).toContain("Zbyt wiele prób");
    });

    it("nakłada 120 sekund blokady po 5 błędnych próbach", async () => {
      sampleProfile.failedAttempts = 4;

      const result = await AuthService.verifyPin(sampleProfile, "9999");
      expect(result.isValid).toBe(false);
      expect(result.failedAttempts).toBe(5);
      expect(result.lockedUntil).not.toBeNull();

      const remainingSec = AuthService.calculateLockoutRemaining(result.lockedUntil);
      expect(remainingSec).toBeGreaterThan(110);
      expect(remainingSec).toBeLessThanOrEqual(120);
    });

    it("nakłada 15 minut blokady po 6 lub więcej błędnych próbach", async () => {
      sampleProfile.failedAttempts = 5;

      const result = await AuthService.verifyPin(sampleProfile, "9999");
      expect(result.isValid).toBe(false);
      expect(result.failedAttempts).toBe(6);
      expect(result.lockedUntil).not.toBeNull();

      const remainingSec = AuthService.calculateLockoutRemaining(result.lockedUntil);
      expect(remainingSec).toBeGreaterThan(850);
      expect(remainingSec).toBeLessThanOrEqual(900);
    });

    it("blokuje próbę weryfikacji jeśli profil jest aktywnie zablokowany", async () => {
      // Ustaw blokadę na 60 sekund w przyszłości
      const futureLock = new Date(Date.now() + 60000).toISOString();
      sampleProfile.lockedUntil = futureLock;
      sampleProfile.failedAttempts = 4;

      expect(AuthService.isProfileLocked(sampleProfile)).toBe(true);

      const result = await AuthService.verifyPin(sampleProfile, "1234");
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain("Profil jest tymczasowo zablokowany");
    });

    it("calculateLockoutRemaining zwraca 0 dla dat z przeszłości lub pustych", () => {
      expect(AuthService.calculateLockoutRemaining(null)).toBe(0);
      expect(AuthService.calculateLockoutRemaining(undefined)).toBe(0);

      const pastLock = new Date(Date.now() - 10000).toISOString();
      expect(AuthService.calculateLockoutRemaining(pastLock)).toBe(0);
    });
  });

  describe("Detekcja Biometrii i Passkeys", () => {
    it("poprawnie obsługuje brak Electron API i brak wsparcia WebAuthn w testowym jsdom", async () => {
      const bioAvailable = await AuthService.checkPlatformBiometricsSupport();
      expect(typeof bioAvailable).toBe("boolean");

      const passkeysAvailable = await AuthService.supportsPasskeys();
      expect(typeof passkeysAvailable).toBe("boolean");
    });
  });
});
