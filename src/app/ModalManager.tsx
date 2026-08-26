import { useApp } from "./providers/AppContext";
import React, { Suspense, lazy } from "react";
import { Profile, Goal, Payment } from "../types";
import { ModalState } from "../uiTypes";
import {
  TransactionModal,
  PaymentModal,
  GoalModal,
  GoalDepositModal,
  ProfileModal,
  PinModal,
  BudgetModal,
} from "../components/Modals";
import { ConfirmModal } from "../components/ConfirmModal";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ModalFallback } from "../components/ModalFallback";

const CalendarReminderModal = lazy(() => import("../components/CalendarReminderModal").then(m => ({ default: m.CalendarReminderModal })));
const AiChatModal = lazy(() => import("../components/AiChatModal").then(m => ({ default: m.AiChatModal })));
const ChangelogModal = lazy(() => import("../components/ChangelogModal").then(m => ({ default: m.ChangelogModal })));
const DriveConflictModal = lazy(() => import("../components/DriveConflictModal").then(m => ({ default: m.DriveConflictModal })));
const SmartRulesManagerModal = lazy(() => import("../components/modals/SmartRulesManagerModal").then(m => ({ default: m.SmartRulesManagerModal })));

export function ModalManager() {
  const {
    modalState, closeModal, activeProfile,
    handleAddTransaction, handleUpdateTransaction, handleAddPayment, handleUpdatePayment, handleAddGoal, handleAddGoalDeposit,
    handleAddProfile, handleSetProfilePin, handleSaveBudgets,
    handleExportData,
    calendarToken,
    connectGoogle,
    invalidateCalendarToken,
    canUseAiChat,
    driveConflictInfo,
    resolveDriveConflict,
    closeDriveConflictModal,
    showToast,
    handleToggleSmartRule,
    handleDeleteSmartRule
  } = useApp();

  const onSaveTransaction = (data: any) => {
    // Brak "id" w payloadzie = nowy wpis wypełniony wstępnie, nie edycja.
    if (modalState.type === "transaction" && modalState.payload?.id) {
      handleUpdateTransaction(modalState.payload.id, data);
    } else {
      handleAddTransaction(data);
    }
    closeModal();
  };

  const onSavePayment = (data: any) => {
    if (modalState.type === "payment" && modalState.payload?.id) {
      handleUpdatePayment(modalState.payload.id, data);
    } else {
      handleAddPayment(data);
    }
    closeModal();
  };
  const onSaveGoal = (data: any) => { handleAddGoal(data); closeModal(); };
  const onSaveGoalDeposit = (amount: number, goal: Goal) => { handleAddGoalDeposit(goal, amount); closeModal(); };
  const onSaveProfile = (data: any) => { handleAddProfile(data); closeModal(); };
  const onSavePin = async (pin: string) => { await handleSetProfilePin(pin); closeModal(); };
  const onSaveBudgets = (budgets: any) => { handleSaveBudgets(budgets); closeModal(); };

  return (
    <>
      {modalState.type === "transaction" && activeProfile && (
        <TransactionModal
          isOpen={true}
          onClose={closeModal}
          activeProfile={activeProfile}
          initialData={modalState.payload}
          onSave={onSaveTransaction}
        />
      )}
      {modalState.type === "payment" && (
        <PaymentModal
          isOpen={true}
          onClose={closeModal}
          initialData={modalState.payload}
          onSave={onSavePayment}
        />
      )}
      {modalState.type === "goal" && (
        <GoalModal
          isOpen={true}
          onClose={closeModal}
          onSave={onSaveGoal}
        />
      )}
      {modalState.type === "goalDeposit" && (
        <GoalDepositModal
          isOpen={true}
          goalName={(modalState as any).payload.name}
          onClose={closeModal}
          onSave={(amount) => onSaveGoalDeposit(amount, (modalState as any).payload)}
        />
      )}
      {modalState.type === "profile" && (
        <ProfileModal
          isOpen={true}
          onClose={closeModal}
          onSave={onSaveProfile}
          showToast={showToast}
        />
      )}
      {modalState.type === "pin" && (
        <PinModal
          isOpen={true}
          onClose={closeModal}
          onSave={onSavePin}
          onExportData={handleExportData}
        />
      )}
      {modalState.type === "budget" && activeProfile && (
        <BudgetModal
          isOpen={true}
          currentBudgets={activeProfile.budgets}
          onClose={closeModal}
          onSave={onSaveBudgets}
        />
      )}
      {modalState.type === "calendarAi" && (
        <ErrorBoundary onReset={closeModal} title="Nie udało się załadować przypomnień kalendarza">
          <Suspense fallback={<ModalFallback />}>
            <CalendarReminderModal
              isOpen={true}
              payment={(modalState as any).payload ?? null}
              onClose={closeModal}
              calendarToken={calendarToken}
              onConnectCalendar={() => connectGoogle("calendar")}
              onCalendarAuthInvalid={invalidateCalendarToken}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {modalState.type === "aiChat" && canUseAiChat && (
        <ErrorBoundary onReset={closeModal} title="Nie udało się załadować asystenta AI">
          <Suspense fallback={<ModalFallback />}>
            <AiChatModal
              isOpen={true}
              onClose={closeModal}
              activeProfile={activeProfile}
            />
          </Suspense>
        </ErrorBoundary>
      )}
      {modalState.type === "smartRulesManager" && activeProfile && (
        <ErrorBoundary onReset={closeModal} title="Nie udało się załadować menedżera reguł">
          <Suspense fallback={<ModalFallback />}>
            <SmartRulesManagerModal
              isOpen={true}
              onClose={closeModal}
              rules={activeProfile.smartRules || []}
              onToggleRule={handleToggleSmartRule}
              onDeleteRule={handleDeleteSmartRule}
              getCategoryName={(id) => {
                const icon = activeProfile.categories?.find(c => c.id === id)?.icon || "";
                const name = activeProfile.categories?.find(c => c.id === id)?.name || id;
                return icon ? `${icon} ${name}` : name;
              }}
            />
          </Suspense>
        </ErrorBoundary>
      )}
      {modalState.type === "changelog" && (
        <ErrorBoundary onReset={closeModal} title="Nie udało się załadować historii zmian">
          <Suspense fallback={<ModalFallback />}>
            <ChangelogModal
              isOpen={true}
              onClose={closeModal}
            />
          </Suspense>
        </ErrorBoundary>
      )}
      {driveConflictInfo && (
        <ErrorBoundary onReset={closeDriveConflictModal} title="Nie udało się załadować asystenta konfliktów Drive">
          <Suspense fallback={<ModalFallback />}>
            <DriveConflictModal
              isOpen={true}
              onClose={closeDriveConflictModal}
              localState={driveConflictInfo.localState || null}
              remoteState={driveConflictInfo.remoteState || null}
              lastSyncedAt={driveConflictInfo.lastSyncedAt || null}
              onResolve={resolveDriveConflict}
            />
          </Suspense>
        </ErrorBoundary>
      )}
      {modalState.type === "confirm" && (
        <ConfirmModal
          isOpen={true}
          onClose={closeModal}
          payload={modalState.payload}
        />
      )}
    </>
  );
}
