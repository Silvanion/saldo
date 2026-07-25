import { Settings } from "lucide-react";
import { useApp } from "./providers/AppContext";
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { AppView, Profile, Payment, Goal } from "../types";
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
    handleUpdateProfile
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
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[60vh] bg-slate-50 rounded-2xl m-4 border border-dashed border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-3">Rozpocznij z Saldo</h2>
        <p className="text-slate-500 max-w-md mx-auto mb-8 text-sm">
          Nie masz jeszcze żadnego aktywnego profilu. Utwórz profil osobisty do własnych wydatków, lub profil wspólny, aby na bieżąco rozliczać się z partnerem.
        </p>
        <button 
          onClick={() => onOpenProfileModal()}
          className="bg-[#137566] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#0f5c50] transition shadow-sm"
        >
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
            state={state}
            saveState={saveState}
            profiles={profiles}
            activeProfileId={activeProfileId}
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
        className="w-full h-full"
      >
        {renderView()}
      </motion.div>
    </AnimatePresence>
  );
}
