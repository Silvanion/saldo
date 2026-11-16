import { describe, it, expect, vi } from "vitest";
import { handleHardwareBackAction, HardwareBackState, HardwareBackActions } from "./useMobileHardwareBack";

describe("handleHardwareBackAction", () => {
  const createMockActions = (): HardwareBackActions => ({
    closeCommandPalette: vi.fn(),
    closeTopUserMenu: vi.fn(),
    closeSecurityInfo: vi.fn(),
    closeModal: vi.fn(),
    closeMobileMenu: vi.fn(),
    goToDashboard: vi.fn(),
    showToast: vi.fn(),
    exitApp: vi.fn(),
  });

  const baseState: HardwareBackState = {
    isCommandPaletteOpen: false,
    isTopUserMenuOpen: false,
    isSecurityInfoOpen: false,
    isModalOpen: false,
    isMobileMenuOpen: false,
    activeView: "dashboard",
  };

  it("prioritizes closing Command Palette when open", () => {
    const actions = createMockActions();
    const state: HardwareBackState = { ...baseState, isCommandPaletteOpen: true, isModalOpen: true };

    const result = handleHardwareBackAction(state, actions, 0);

    expect(result.actionTaken).toBe("commandPalette");
    expect(actions.closeCommandPalette).toHaveBeenCalledTimes(1);
    expect(actions.closeModal).not.toHaveBeenCalled();
  });

  it("prioritizes closing Top User Menu when command palette is closed", () => {
    const actions = createMockActions();
    const state: HardwareBackState = { ...baseState, isTopUserMenuOpen: true, isModalOpen: true };

    const result = handleHardwareBackAction(state, actions, 0);

    expect(result.actionTaken).toBe("userMenu");
    expect(actions.closeTopUserMenu).toHaveBeenCalledTimes(1);
    expect(actions.closeModal).not.toHaveBeenCalled();
  });

  it("prioritizes closing Security Info modal when active", () => {
    const actions = createMockActions();
    const state: HardwareBackState = { ...baseState, isSecurityInfoOpen: true, isMobileMenuOpen: true };

    const result = handleHardwareBackAction(state, actions, 0);

    expect(result.actionTaken).toBe("securityInfo");
    expect(actions.closeSecurityInfo).toHaveBeenCalledTimes(1);
    expect(actions.closeMobileMenu).not.toHaveBeenCalled();
  });

  it("closes general Modal when open", () => {
    const actions = createMockActions();
    const state: HardwareBackState = { ...baseState, isModalOpen: true, isMobileMenuOpen: true };

    const result = handleHardwareBackAction(state, actions, 0);

    expect(result.actionTaken).toBe("modal");
    expect(actions.closeModal).toHaveBeenCalledTimes(1);
    expect(actions.closeMobileMenu).not.toHaveBeenCalled();
  });

  it("closes mobile menu drawer when open", () => {
    const actions = createMockActions();
    const state: HardwareBackState = { ...baseState, isMobileMenuOpen: true, activeView: "transactions" };

    const result = handleHardwareBackAction(state, actions, 0);

    expect(result.actionTaken).toBe("mobileMenu");
    expect(actions.closeMobileMenu).toHaveBeenCalledTimes(1);
    expect(actions.goToDashboard).not.toHaveBeenCalled();
  });

  it("navigates to dashboard when on another view and no overlays are open", () => {
    const actions = createMockActions();
    const state: HardwareBackState = { ...baseState, activeView: "budget" };

    const result = handleHardwareBackAction(state, actions, 0);

    expect(result.actionTaken).toBe("toDashboard");
    expect(actions.goToDashboard).toHaveBeenCalledTimes(1);
    expect(actions.showToast).not.toHaveBeenCalled();
    expect(actions.exitApp).not.toHaveBeenCalled();
  });

  it("shows exit toast on first back press when on dashboard", () => {
    const actions = createMockActions();
    const now = 10000;

    const result = handleHardwareBackAction(baseState, actions, 0, now, 2000);

    expect(result.actionTaken).toBe("exitToast");
    expect(result.nextBackPress).toBe(now);
    expect(actions.showToast).toHaveBeenCalledWith("Naciśnij ponownie Wstecz, aby wyjść z aplikacji", "info");
    expect(actions.exitApp).not.toHaveBeenCalled();
  });

  it("calls exitApp when back is pressed a second time within 2000ms", () => {
    const actions = createMockActions();
    const lastPress = 10000;
    const now = 11200; // 1200ms later

    const result = handleHardwareBackAction(baseState, actions, lastPress, now, 2000);

    expect(result.actionTaken).toBe("exitApp");
    expect(result.nextBackPress).toBe(0);
    expect(actions.exitApp).toHaveBeenCalledTimes(1);
    expect(actions.showToast).not.toHaveBeenCalled();
  });

  it("resets exit toast countdown when second press is after 2000ms", () => {
    const actions = createMockActions();
    const lastPress = 10000;
    const now = 12500; // 2500ms later (expired)

    const result = handleHardwareBackAction(baseState, actions, lastPress, now, 2000);

    expect(result.actionTaken).toBe("exitToast");
    expect(result.nextBackPress).toBe(now);
    expect(actions.showToast).toHaveBeenCalledWith("Naciśnij ponownie Wstecz, aby wyjść z aplikacji", "info");
    expect(actions.exitApp).not.toHaveBeenCalled();
  });
});
