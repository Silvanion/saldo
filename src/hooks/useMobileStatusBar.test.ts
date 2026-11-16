import { describe, it, expect, vi, beforeEach } from "vitest";
import { StatusBar, Style } from "@capacitor/status-bar";
import { applyMobileStatusBar } from "./useMobileStatusBar";

vi.mock("@capacitor/status-bar", () => ({
  StatusBar: {
    setStyle: vi.fn().mockResolvedValue(undefined),
    setBackgroundColor: vi.fn().mockResolvedValue(undefined),
  },
  Style: {
    Dark: "DARK",
    Light: "LIGHT",
    Default: "DEFAULT",
  },
}));

describe("applyMobileStatusBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when platform is not native", async () => {
    const applied = await applyMobileStatusBar({ theme: "dark" }, false);
    expect(applied).toBe(false);
    expect(StatusBar.setStyle).not.toHaveBeenCalled();
    expect(StatusBar.setBackgroundColor).not.toHaveBeenCalled();
  });

  it("sets dark status bar style and dark bg when theme is dark on native platform", async () => {
    const applied = await applyMobileStatusBar({ theme: "dark" }, true);
    expect(applied).toBe(true);
    expect(StatusBar.setStyle).toHaveBeenCalledWith({ style: Style.Dark });
    expect(StatusBar.setBackgroundColor).toHaveBeenCalledWith({ color: "#181a1d" });
  });

  it("sets light status bar style and light bg when theme is light on native platform", async () => {
    const applied = await applyMobileStatusBar({ theme: "light" }, true);
    expect(applied).toBe(true);
    expect(StatusBar.setStyle).toHaveBeenCalledWith({ style: Style.Light });
    expect(StatusBar.setBackgroundColor).toHaveBeenCalledWith({ color: "#ffffff" });
  });

  it("allows custom background colors", async () => {
    const applied = await applyMobileStatusBar(
      {
        theme: "dark",
        darkBackgroundColor: "#0b1120",
      },
      true
    );
    expect(applied).toBe(true);
    expect(StatusBar.setBackgroundColor).toHaveBeenCalledWith({ color: "#0b1120" });
  });
});
