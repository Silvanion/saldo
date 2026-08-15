import { Settings, Wallet, Lock, ArrowRight, Plus } from "lucide-react";
import { useApp } from "./providers/AppContext";
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Profile, Payment, Goal } from "../types";
import { AppView } from "../uiTypes";
import { DashboardView } from "../components/DashboardView";
import { TransactionsView } from "../components/TransactionsView";
import { PaymentsView } from "../components/PaymentsView";
import { BudgetView } from "../components/BudgetView";
import { GoalsView } from "../components/GoalsView";
import { AnalysisView } from "../components/AnalysisView";
import { SettingsView } from "../components/SettingsView";
import { HelpView } from "../components/HelpView";

export function AppViewRouter({
  onOpenTxModal,
  onOpenBudgetModal,
  onOpenPaymentModal,
  onTriggerCalendarAi,
  onOpenGoalModal,
  onOpenGoalDepositModal,
  onOpenProfileModal,
  onOpenPinModal
}: {
  onOpenTxModal: (tx?: import("../types").Transaction) => void;
  onOpenBudgetModal: () => void;
  onOpenPaymentModal: (payment?: Payment) => void;
  onTriggerCalendarAi: (p: Payment) => void;
  onOpenGoalModal: () => void;
  onOpenGoalDepositModal: (g: Goal) => void;
  onOpenProfileModal: () => void;
  onOpenPinModal: () => void;
}) {
  const {
    state, saveState,
    activeView, setActiveView,
    activeProfile,
    selectedDate, handlePrevMonth, handleNextMonth,
    handleTogglePaymentStatus,
    handleDeleteTransaction,
    handleImportTransactions,
    makeUndoBackup,
    handleDeletePayment,
    handleAddPayment,
    calendarToken,
    handleAddInvestment,
    handleDeleteGoal,
    handleSelectProfile,
    handleDeleteProfile,
    unlockedProfileId,
    handleSaveTransactionRules,
    handleSaveRecurringRules,
    handleAddSettlement,
    handleDeleteSettlement,
    handleSaveAccounts,
    handleExportData,
    handleResetData,
    googleUser,
    isGoogleLoading,
    googleError,
    isDriveActionLoading,
    gdriveFileId,
    gdriveLastSynced,
    isDriveAutoSyncEnabled,
    handleConnectGoogle,
    handleDisconnectGoogle,
    handleSyncToDrive,
    handleLoadFromDrive,
    toggleAutoSync,
    handleImportLocalData,
    theme,
    handleThemeChange,
    handleUpdateProfile,
    showToast
  } = useApp();

  const onPrevMonth = handlePrevMonth;
  const onNextMonth = handleNextMonth;
  const onTogglePaymentStatus = handleTogglePaymentStatus;
  const onChangeView = setActiveView;
  const onDeleteTransaction = handleDeleteTransaction;
  const onImportTransactions = handleImportTransactions;
  const onDeletePayment = handleDeletePayment;
  const onAddInvestment = handleAddInvestment;
  const onDeleteGoal = handleDeleteGoal;
  const profiles = state.profiles;
  const activeProfileId = state.activeProfileId;
  const onSelectProfile = (id: string) => {
    handleSelectProfile(id);
    const p = state.profiles.find((pr: any) => pr.id === id);
    if (p?.pinHash && unlockedProfileId !== id) {
      onOpenPinModal();
    }
  };
  const onSaveTransactionRules = handleSaveTransactionRules;
  const onSaveRecurringRules = handleSaveRecurringRules;
  const onSaveAccounts = handleSaveAccounts;
  const onExportData = handleExportData;
  const onResetData = handleResetData;
  const onConnectGoogle = handleConnectGoogle;
  const onDisconnectGoogle = handleDisconnectGoogle;
  const onSyncToDrive = () => handleSyncToDrive(false);
  const onLoadFromDrive = handleLoadFromDrive;
  const onToggleDriveAutoSync = toggleAutoSync;
  const onImportLocalData = handleImportLocalData;
  const onThemeChange = handleThemeChange;

  if (!activeProfile && activeView !== "settings") {
    if (profiles.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[60vh] bg-surface/30 rounded-2xl m-4 border border-dashed border-border">
          <h2 className="text-2xl font-bold text-text-main mb-3">Rozpocznij z Saldo</h2>
          <p className="text-text-muted max-w-md mx-auto mb-8 text-sm">
            Nie masz jeszcze żadnego aktywnego profilu. Utwórz profil osobisty do własnych wydatków, lub profil wspólny, aby na bieżąco rozliczać się z partnerem.
          </p>
          <button 
            onClick={() => onOpenProfileModal()}
            className="bg-brand text-text-inverse px-6 py-3 rounded-xl font-bold hover:bg-brand-hover transition shadow-sm focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
          >
            Utwórz nowy profil (Osobisty / Wspólny)
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-6 sm:p-12 text-center h-full min-h-[60vh] max-w-4xl mx-auto">
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex p-3 bg-brand-subtle text-brand rounded-2xl mb-2">
            <Wallet className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-text-main tracking-tight">Wybierz profil do pracy</h2>
          <p className="text-text-muted max-w-md mx-auto text-sm">
            Zalogowano pomyślnie. Wybierz profil z poniższej listy, z którego chcesz teraz korzystać:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mx-auto mb-8">
          {profiles.map((p) => {
            const hasPin = Boolean(p.pinHash);
            const isShared = p.kind === "shared";
            return (
              <button
                key={p.id}
                onClick={() => onSelectProfile(p.id)}
                className="bg-surface hover:bg-surface-2 border border-border hover:border-brand/40 p-5 rounded-2xl text-left transition-all active:scale-[0.98] flex flex-col justify-between group shadow-xs hover:shadow-md cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-brand-subtle text-brand flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                      {p.avatar || "👤"}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {hasPin && (
                        <span className="px-2 py-0.5 bg-surface-2 border border-border rounded-lg text-xs font-medium text-text-muted flex items-center gap-1">
                          <Lock className="w-3 h-3 text-brand" /> PIN
                        </span>
                      )}
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                        isShared 
                          ? "bg-brand-subtle text-brand border border-brand/20" 
                          : "bg-surface-2 text-text-muted border border-border"
                      }`}>
                        {isShared ? (p.partnerName ? `Wspólny (${p.partnerName})` : "Wspólny") : "Osobisty"}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-text-main mt-4 group-hover:text-brand transition-colors truncate" title={p.name}>
                    {p.name}
                  </h3>
                  <p className="text-xs text-text-muted mt-1 truncate">
                    {p.transactions?.length || 0} transakcji • {p.currency || "PLN"}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-between text-xs font-bold text-brand">
                  <span>Otwórz ten profil</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onOpenProfileModal()}
          className="inline-flex items-center gap-2 bg-surface hover:bg-surface-2 border border-border text-text-main px-5 py-2.5 rounded-xl font-bold text-xs active:scale-[0.98] transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          <Plus className="w-4 h-4 text-brand" />
          Utwórz nowy profil (Osobisty / Wspólny)
        </button>
      </div>
    );
  }

  const renderView = () => {
    switch (activeView) {
      case "dashboard":
        return (
          <DashboardView
            profile={activeProfile}
            showToast={showToast}
            selectedDate={selectedDate}
            onPrevMonth={onPrevMonth}
            onNextMonth={onNextMonth}
            onTogglePaymentStatus={onTogglePaymentStatus}
            onOpenTxModal={onOpenTxModal}
            onOpenBudgetModal={onOpenBudgetModal}
            onOpenPaymentModal={onOpenPaymentModal}
            onChangeView={onChangeView}
            recurringRules={activeProfile?.recurringRules || []}
            onAddSettlement={handleAddSettlement}
            onDeleteSettlement={handleDeleteSettlement}
          />
        );
      case "transactions":
        return (
          <TransactionsView
            profile={activeProfile}
            onOpenTxModal={onOpenTxModal}
            onDeleteTransaction={onDeleteTransaction}
            onImportTransactions={onImportTransactions}
            onBeforeImport={makeUndoBackup}
          />
        );
      case "payments":
        return (
          <PaymentsView
            profile={activeProfile}
            selectedDate={selectedDate}
            onOpenPaymentModal={onOpenPaymentModal}
            onTogglePaymentStatus={onTogglePaymentStatus}
            onAddPayment={handleAddPayment}
            onDeletePayment={onDeletePayment}
            calendarToken={calendarToken}
            onTriggerCalendarAi={onTriggerCalendarAi}
          />
        );
      case "budget":
        return (
          <BudgetView
            profile={activeProfile}
            selectedDate={selectedDate}
            onOpenBudgetModal={onOpenBudgetModal}
          />
        );
      case "goals":
        return (
          <GoalsView
            profile={activeProfile}
            onOpenGoalModal={onOpenGoalModal}
            onOpenGoalDepositModal={onOpenGoalDepositModal}
            onDeleteGoal={onDeleteGoal}
            onAddInvestment={onAddInvestment}
          />
        );
      case "analysis":
        return (
          <AnalysisView
            profile={activeProfile}
            selectedDate={selectedDate}
          />
        );
      case "settings":
        return (
          <SettingsView
            showToast={showToast}
            state={state}
            saveState={saveState}
            profiles={profiles}
            activeProfileId={activeProfileId}
            selectedDate={selectedDate}
            onSelectProfile={onSelectProfile}
            onUpdateProfile={handleUpdateProfile}
            onDeleteProfile={handleDeleteProfile}
            onOpenProfileModal={onOpenProfileModal}
            onOpenPinModal={onOpenPinModal}
            transactionRules={activeProfile?.transactionRules || []}
            onSaveTransactionRules={handleSaveTransactionRules}
            recurringRules={activeProfile?.recurringRules || []}
            onSaveRecurringRules={handleSaveRecurringRules}
            onSaveAccounts={handleSaveAccounts}
            onExportData={onExportData}
            onResetData={onResetData}
            googleUser={googleUser}
            isGoogleLoading={isGoogleLoading}
            googleError={googleError}
            isDriveActionLoading={isDriveActionLoading}
            gdriveFileId={gdriveFileId}
            gdriveLastSynced={gdriveLastSynced}
            isDriveAutoSyncEnabled={isDriveAutoSyncEnabled}
            onConnectGoogle={() => handleConnectGoogle("drive")}
            onDisconnectGoogle={onDisconnectGoogle}
            onSyncToDrive={onSyncToDrive}
            onLoadFromDrive={onLoadFromDrive}
            onToggleDriveAutoSync={onToggleDriveAutoSync}
            onImportLocalData={onImportLocalData}
            theme={theme}
            onThemeChange={onThemeChange}
            calendarToken={calendarToken}
            onConnectCalendar={() => handleConnectGoogle("calendar")}
            unlockedProfileId={unlockedProfileId}
          />
        );
      case "help":
        return <HelpView />;
      default:
        return null;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeView}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
        className="w-full min-h-full flex flex-col min-w-0"
      >
        {renderView()}
      </motion.div>
    </AnimatePresence>
  );
}
