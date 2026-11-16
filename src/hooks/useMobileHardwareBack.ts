import { useEffect, useRef } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

export interface HardwareBackState {
  isCommandPaletteOpen?: boolean;
  isTopUserMenuOpen?: boolean;
  isSecurityInfoOpen?: boolean;
  isModalOpen: boolean;
  isMobileMenuOpen: boolean;
  activeView: string;
}

export interface HardwareBackActions {
  closeCommandPalette?: () => void;
  closeTopUserMenu?: () => void;
  closeSecurityInfo?: () => void;
  closeModal: () => void;
  closeMobileMenu: () => void;
  goToDashboard: () => void;
  showToast: (msg: string, type?: "info" | "success" | "error" | "warning") => void;
  exitApp?: () => void;
}

export type HardwareBackResult =
  | "commandPalette"
  | "userMenu"
  | "securityInfo"
  | "modal"
  | "mobileMenu"
  | "toDashboard"
  | "exitToast"
  | "exitApp";

/**
 * Pure handler function to process Android back button events.
 * Returns the action taken and the next timestamp for double-press detection.
 */
export function handleHardwareBackAction(
  state: HardwareBackState,
  actions: HardwareBackActions,
  lastBackPress: number,
  now: number = Date.now(),
  exitDelayMs: number = 2000
): { actionTaken: HardwareBackResult; nextBackPress: number } {
  if (state.isCommandPaletteOpen && actions.closeCommandPalette) {
    actions.closeCommandPalette();
    return { actionTaken: "commandPalette", nextBackPress: 0 };
  }

  if (state.isTopUserMenuOpen && actions.closeTopUserMenu) {
    actions.closeTopUserMenu();
    return { actionTaken: "userMenu", nextBackPress: 0 };
  }

  if (state.isSecurityInfoOpen && actions.closeSecurityInfo) {
    actions.closeSecurityInfo();
    return { actionTaken: "securityInfo", nextBackPress: 0 };
  }

  if (state.isModalOpen) {
    actions.closeModal();
    return { actionTaken: "modal", nextBackPress: 0 };
  }

  if (state.isMobileMenuOpen) {
    actions.closeMobileMenu();
    return { actionTaken: "mobileMenu", nextBackPress: 0 };
  }

  if (state.activeView !== "dashboard") {
    actions.goToDashboard();
    return { actionTaken: "toDashboard", nextBackPress: 0 };
  }

  // Already on dashboard with no open modals/menus: double-tap to exit
  if (now - lastBackPress < exitDelayMs) {
    if (actions.exitApp) {
      actions.exitApp();
    } else {
      void App.exitApp();
    }
    return { actionTaken: "exitApp", nextBackPress: 0 };
  }

  actions.showToast("Naciśnij ponownie Wstecz, aby wyjść z aplikacji", "info");
  return { actionTaken: "exitToast", nextBackPress: now };
}

/**
 * Hook to register Android hardware back button handler when running in native Capacitor environment.
 */
export function useMobileHardwareBack(
  state: HardwareBackState,
  actions: HardwareBackActions
) {
  const stateRef = useRef(state);
  const actionsRef = useRef(actions);
  const lastBackPressRef = useRef<number>(0);

  useEffect(() => {
    stateRef.current = state;
    actionsRef.current = actions;
  });

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let handle: { remove: () => void } | undefined;

    const setupListener = async () => {
      try {
        const listener = await App.addListener("backButton", () => {
          const res = handleHardwareBackAction(
            stateRef.current,
            actionsRef.current,
            lastBackPressRef.current,
            Date.now()
          );
          lastBackPressRef.current = res.nextBackPress;
        });
        handle = listener;
      } catch (err) {
        console.warn("Failed to register hardware back button listener", err);
      }
    };

    void setupListener();

    return () => {
      if (handle) {
        void handle.remove();
      }
    };
  }, []);
}
