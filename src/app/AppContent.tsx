import React, { useEffect } from "react";
import { useApp } from "./providers/AppContext";
import { AppShell } from "./AppShell";
import { AppViewRouter } from "./AppViewRouter";
import { ModalManager } from "./ModalManager";
import { UnlockModal } from "../components/Modals";
import { checkAndNotifyPayments } from "../utils";
import { AuthScreen } from "./AuthScreen";
import { SecurityInfoModal } from "../components/SecurityInfoModal";
import { PWABadge } from "../components/PWABadge";
import { ToastContainer } from "../components/ToastContainer";
import { useIdleLock } from "../hooks/useIdleLock";
import { activeKeys } from "../services/crypto";

export function AppContent() {
  const {
    state, isDemoMode, setIsDemoMode, disconnectGoogle,
    activeProfile,
    isProfileLocked,
    modalState,
    handleUnlockProfile,
    openModal,
    saveState,
    googleUser,
    isGoogleLoading,
    failedAttempts,
    lockoutUntil,
    lockProfile,
    isSecurityInfoOpen,
  } = useApp();

  // Check and display browser notifications for upcoming payments
  useEffect(() => {
    if (activeProfile?.payments) {
      checkAndNotifyPayments(activeProfile, state.currencyPreference);
    }
  }, [activeProfile?.payments]);

  // Auto-lock PIN-protected profile after inactivity
  const autoLockMs = state.autoLockMinutes !== undefined
    ? state.autoLockMinutes * 60_000
    : 5 * 60_000; // default 5 min

  useIdleLock({
    isEnabled: !!activeProfile?.pinHash && !isProfileLocked && autoLockMs > 0,
    timeoutMs: autoLockMs,
    onLock: () => {
      if (activeProfile) {
        delete activeKeys[activeProfile.id];
      }
      lockProfile();
    },
  });

  // Main Authentication Gate
  if (isGoogleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    );
  }

  if (!googleUser && !isDemoMode) {
    return <AuthScreen onDemoClick={() => setIsDemoMode(true)} />;
  }

  return (
    <>

      <AppShell
        onQuickAdd={() => openModal("transaction")}
      >
        {!isProfileLocked ? (
          <AppViewRouter
            onOpenTxModal={(tx: any) => openModal("transaction", tx?.nativeEvent ? undefined : tx)}
            onOpenBudgetModal={() => openModal("budget")}
            onOpenPaymentModal={(p: any) => openModal("payment", p?.nativeEvent ? undefined : p)}
            onTriggerCalendarAi={(p: any) => openModal("calendarAi", p?.nativeEvent ? undefined : p)}
            onOpenGoalModal={() => openModal("goal")}
            onOpenGoalDepositModal={(g) => openModal("goalDeposit", g)}
            onOpenProfileModal={() => openModal("profile")}
            onOpenPinModal={() => openModal("pin")}
            openModal={openModal}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm font-bold text-text-muted">Profil jest zablokowany kodem PIN...</p>
          </div>
        )}

        <ModalManager />

        {isProfileLocked && activeProfile && modalState.type !== "pin" && (
          <UnlockModal
            isOpen={true}
            profileName={activeProfile.name}
            profileId={activeProfile.id}
            onUnlock={async (pin) => {
              return await handleUnlockProfile(pin);
            }}
            onSelectOtherProfile={() => {
              openModal("profile");
            }}
            failedAttempts={failedAttempts}
            lockoutUntil={lockoutUntil}
          />
        )}
        {isSecurityInfoOpen && <SecurityInfoModal />}
        <ToastContainer />
      </AppShell>
    </>
  );
}

