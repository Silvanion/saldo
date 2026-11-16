import { describe, it, expect, vi, beforeEach } from "vitest";
import { HapticsService } from "./HapticsService";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";

vi.mock("@capacitor/haptics", () => ({
  Haptics: {
    impact: vi.fn().mockResolvedValue(undefined),
    notification: vi.fn().mockResolvedValue(undefined),
  },
  ImpactStyle: {
    Light: "LIGHT",
    Medium: "MEDIUM",
    Heavy: "HEAVY",
  },
  NotificationType: {
    Success: "SUCCESS",
    Warning: "WARNING",
    Error: "ERROR",
  },
}));

describe("HapticsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when platform is not native", async () => {
    vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(false);

    await HapticsService.lightImpact();
    await HapticsService.success();
    await HapticsService.error();

    expect(Haptics.impact).not.toHaveBeenCalled();
    expect(Haptics.notification).not.toHaveBeenCalled();
  });

  it("triggers light impact on native platform", async () => {
    vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(true);

    await HapticsService.lightImpact();

    expect(Haptics.impact).toHaveBeenCalledWith({ style: ImpactStyle.Light });
  });

  it("triggers medium impact on native platform", async () => {
    vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(true);

    await HapticsService.mediumImpact();

    expect(Haptics.impact).toHaveBeenCalledWith({ style: ImpactStyle.Medium });
  });

  it("triggers success notification on native platform", async () => {
    vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(true);

    await HapticsService.success();

    expect(Haptics.notification).toHaveBeenCalledWith({ type: NotificationType.Success });
  });

  it("triggers error notification on native platform", async () => {
    vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(true);

    await HapticsService.error();

    expect(Haptics.notification).toHaveBeenCalledWith({ type: NotificationType.Error });
  });
});
