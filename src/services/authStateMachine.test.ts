import { describe, it, expect } from "vitest";
import { authReducer, INITIAL_AUTH_CONTEXT, AuthMachineContext } from "./authStateMachine";
import { Profile } from "../types";

const mockProfileWithoutPin: Profile = {
  id: "p-open",
  name: "Profil Otwarty",
  kind: "personal",
  currency: "PLN",
  transactions: [],
  payments: [],
  goals: [],
  investments: [],
  budgets: {}
};

const mockProfileWithPin: Profile = {
  id: "p-pin",
  name: "Profil PIN",
  kind: "personal",
  pinHash: "hash123",
  salt: "salt123",
  currency: "PLN",
  transactions: [],
  payments: [],
  goals: [],
  investments: [],
  budgets: {}
};

const mockProfileWithBiometrics: Profile = {
  id: "p-bio",
  name: "Profil Bio",
  kind: "personal",
  pinHash: "hash123",
  salt: "salt123",
  hasBiometrics: true,
  currency: "PLN",
  transactions: [],
  payments: [],
  goals: [],
  investments: [],
  budgets: {}
};

describe("AuthStateMachine - Deterministyczna Maszyna Stanów Uwierzytelniania", () => {
  it("rozpoczyna w stanie UNINITIALIZED", () => {
    expect(INITIAL_AUTH_CONTEXT.state).toBe("UNINITIALIZED");
  });

  it("STARTUP_COLD bez istniejących profili przechodzi bezpośrednio do DEMO_ACTIVE (Zero-Friction Cold Start)", () => {
    const next = authReducer(INITIAL_AUTH_CONTEXT, {
      type: "STARTUP_COLD",
      hasProfiles: false
    });
    expect(next.state).toBe("DEMO_ACTIVE");
  });

  it("STARTUP_COLD z istniejącymi profilami przechodzi do LOCKED_PROFILE_SELECTION", () => {
    const next = authReducer(INITIAL_AUTH_CONTEXT, {
      type: "STARTUP_COLD",
      hasProfiles: true
    });
    expect(next.state).toBe("LOCKED_PROFILE_SELECTION");
  });

  it("z DEMO_ACTIVE przejście do ONBOARDING_WIZARD", () => {
    const demoCtx: AuthMachineContext = {
      ...INITIAL_AUTH_CONTEXT,
      state: "DEMO_ACTIVE"
    };
    const next = authReducer(demoCtx, { type: "START_ONBOARDING" });
    expect(next.state).toBe("ONBOARDING_WIZARD");
  });

  it("w ONBOARDING_WIZARD ukończenie tworzenia profilu przechodzi do PROFILE_ACTIVE", () => {
    const wizardCtx: AuthMachineContext = {
      ...INITIAL_AUTH_CONTEXT,
      state: "ONBOARDING_WIZARD"
    };
    const next = authReducer(wizardCtx, {
      type: "COMPLETE_ONBOARDING",
      profile: mockProfileWithPin
    });
    expect(next.state).toBe("PROFILE_ACTIVE");
    expect(next.activeProfile?.id).toBe("p-pin");
  });

  it("wybór profilu bez hasła natychmiast odblokowuje do PROFILE_ACTIVE", () => {
    const selectionCtx: AuthMachineContext = {
      ...INITIAL_AUTH_CONTEXT,
      state: "LOCKED_PROFILE_SELECTION"
    };
    const next = authReducer(selectionCtx, {
      type: "SELECT_PROFILE",
      profile: mockProfileWithoutPin
    });
    expect(next.state).toBe("PROFILE_ACTIVE");
    expect(next.activeProfile?.id).toBe("p-open");
  });

  it("wybór profilu z biometrią przechodzi do AUTHENTICATING_BIOMETRIC", () => {
    const selectionCtx: AuthMachineContext = {
      ...INITIAL_AUTH_CONTEXT,
      state: "LOCKED_PROFILE_SELECTION"
    };
    const next = authReducer(selectionCtx, {
      type: "SELECT_PROFILE",
      profile: mockProfileWithBiometrics
    });
    expect(next.state).toBe("AUTHENTICATING_BIOMETRIC");
    expect(next.selectedProfileForAuth?.id).toBe("p-bio");
  });

  it("wybór profilu z PIN przechodzi do AUTHENTICATING_PIN", () => {
    const selectionCtx: AuthMachineContext = {
      ...INITIAL_AUTH_CONTEXT,
      state: "LOCKED_PROFILE_SELECTION"
    };
    const next = authReducer(selectionCtx, {
      type: "SELECT_PROFILE",
      profile: mockProfileWithPin
    });
    expect(next.state).toBe("AUTHENTICATING_PIN");
    expect(next.selectedProfileForAuth?.id).toBe("p-pin");
  });

  it("odrzucenie biometrii pozwala przejść do fallbacku PIN (FALLBACK_TO_PIN)", () => {
    const bioCtx: AuthMachineContext = {
      ...INITIAL_AUTH_CONTEXT,
      state: "AUTHENTICATING_BIOMETRIC",
      selectedProfileForAuth: mockProfileWithBiometrics
    };
    const next = authReducer(bioCtx, { type: "FALLBACK_TO_PIN" });
    expect(next.state).toBe("AUTHENTICATING_PIN");
  });

  it("poprawny PIN przechodzi do PROFILE_ACTIVE", () => {
    const pinCtx: AuthMachineContext = {
      ...INITIAL_AUTH_CONTEXT,
      state: "AUTHENTICATING_PIN",
      selectedProfileForAuth: mockProfileWithPin
    };
    const next = authReducer(pinCtx, {
      type: "PIN_SUCCESS",
      profile: mockProfileWithPin
    });
    expect(next.state).toBe("PROFILE_ACTIVE");
    expect(next.activeProfile?.id).toBe("p-pin");
    expect(next.failedPinAttempts).toBe(0);
  });

  it("blokada zablokowanego profilu uniemożliwia przejście do autentykacji", () => {
    const futureLocked = new Date(Date.now() + 60000).toISOString();
    const lockedProfile: Profile = {
      ...mockProfileWithPin,
      lockedUntil: futureLocked,
      failedAttempts: 4
    };
    const selectionCtx: AuthMachineContext = {
      ...INITIAL_AUTH_CONTEXT,
      state: "LOCKED_PROFILE_SELECTION"
    };
    const next = authReducer(selectionCtx, {
      type: "SELECT_PROFILE",
      profile: lockedProfile
    });
    expect(next.state).toBe("LOCKED_PROFILE_SELECTION");
    expect(next.errorMessage).toContain("zablokowany");
  });
});
