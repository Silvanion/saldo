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
    isGoogleLoading
  } = useApp();

  // Check and display browser notifications for upcoming payments
  useEffect(() => {
    if (activeProfile?.payments) {
      checkAndNotifyPayments(activeProfile, state.currencyPreference);
    }
  }, [activeProfile?.payments]);

  // Main Authentication Gate
  if (isGoogleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#137566]"></div>
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
        onOpenAiChatModal={() => openModal("aiChat")}
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
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm font-bold text-slate-500">Profil jest zablokowany kodem PIN...</p>
          </div>
        )}

        <ModalManager />

        {isProfileLocked && activeProfile && modalState.type !== "pin" && (
          <UnlockModal
            isOpen={true}
            profileName={activeProfile.name}
            onUnlock={async (pin) => {
              return await handleUnlockProfile(pin);
            }}
            onSelectOtherProfile={() => {
              openModal("profile");
            }}
          />
        )}
        <SecurityInfoModal />
      </AppShell>
    </>
  );
}
