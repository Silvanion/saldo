import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BiometricService } from "./BiometricService";

describe("BiometricService - Detekcja platformy i sprzętu biometrii", () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("wykrywa macOS z poprawnymi etykietami dla Touch ID / Apple Biometrics", () => {
    // Symulacja Electron macOS
    (globalThis as any).window = {
      electronAPI: {
        platform: "darwin",
        checkBiometricsStatus: vi.fn().mockResolvedValue({ available: true, isEnrolledForProfile: true })
      }
    };

    const platform = BiometricService.getPlatform();
    expect(platform).toBe("macos");

    const info = BiometricService.getPlatformInfo();
    expect(info.label).toContain("Touch ID");
    expect(info.isSupported).toBe(true);
    expect(info.storageBackend).toContain("macOS Keychain");
  });

  it("wykrywa Windows z poprawnymi etykietami dla Windows Hello", () => {
    // Symulacja Electron Windows
    (globalThis as any).window = {
      electronAPI: {
        platform: "win32",
        checkBiometricsStatus: vi.fn().mockResolvedValue({ available: true, isEnrolledForProfile: false })
      }
    };

    const platform = BiometricService.getPlatform();
    expect(platform).toBe("windows");

    const info = BiometricService.getPlatformInfo();
    expect(info.label).toBe("Windows Hello");
    expect(info.isSupported).toBe(true);
    expect(info.storageBackend).toContain("Windows DPAPI");
  });

  it("dla platformy Linux raportuje brak wsparcia i zwraca elegancki komunikat", () => {
    // Symulacja Electron Linux
    (globalThis as any).window = {
      electronAPI: {
        platform: "linux",
        checkBiometricsStatus: vi.fn().mockResolvedValue({ available: false, isEnrolledForProfile: false })
      }
    };

    const platform = BiometricService.getPlatform();
    expect(platform).toBe("linux");

    const info = BiometricService.getPlatformInfo();
    expect(info.isSupported).toBe(false);
    expect(info.unsupportedReason).toContain("Linux");
  });

  it("poprawnie wywołuje checkHardwareStatus z powrotem statusu i platformy", async () => {
    const mockCheck = vi.fn().mockResolvedValue({
      available: true,
      isEnrolledForProfile: true
    });

    (globalThis as any).window = {
      electronAPI: {
        platform: "darwin",
        checkBiometricsStatus: mockCheck,
        saveBiometricsPin: vi.fn().mockResolvedValue({ success: true }),
        promptBiometricsUnlock: vi.fn().mockResolvedValue({ success: true, pin: "1234" }),
        removeBiometricsPin: vi.fn().mockResolvedValue({ success: true })
      }
    };

    const status = await BiometricService.checkHardwareStatus("prof_123");
    expect(mockCheck).toHaveBeenCalledWith("prof_123");
    expect(status.available).toBe(true);
    expect(status.isEnrolledForProfile).toBe(true);
    expect(status.label).toContain("Touch ID");

    const enrollRes = await BiometricService.enrollBiometrics("prof_123", "1234");
    expect(enrollRes.success).toBe(true);

    const unlockRes = await BiometricService.promptUnlock("prof_123");
    expect(unlockRes.success).toBe(true);
    expect(unlockRes.pin).toBe("1234");

    const removeRes = await BiometricService.removeBiometrics("prof_123");
    expect(removeRes.success).toBe(true);
  });
});
