import { useEffect } from "react";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Capacitor } from "@capacitor/core";

export interface MobileStatusBarConfig {
  theme: "light" | "dark";
  darkBackgroundColor?: string;
  lightBackgroundColor?: string;
}

/**
 * Applies status bar style and color based on the active theme.
 * Runs only on native platforms (Android / iOS).
 */
export async function applyMobileStatusBar(
  config: MobileStatusBarConfig,
  isNative: boolean = Capacitor.isNativePlatform()
): Promise<boolean> {
  if (!isNative) return false;

  const isDark = config.theme === "dark";
  const darkBg = config.darkBackgroundColor || "#181a1d";
  const lightBg = config.lightBackgroundColor || "#ffffff";

  try {
    await StatusBar.setStyle({
      style: isDark ? Style.Dark : Style.Light,
    });
    await StatusBar.setBackgroundColor({
      color: isDark ? darkBg : lightBg,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Hook to synchronize Android status bar appearance with app theme changes.
 */
export function useMobileStatusBar(theme: "light" | "dark") {
  useEffect(() => {
    void applyMobileStatusBar({ theme });
  }, [theme]);
}
