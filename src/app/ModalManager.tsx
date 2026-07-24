import { useApp } from "./providers/AppContext";
import React from "react";
import { ModalState, Profile, Goal, Payment } from "../types";
import {
  TransactionModal,
  PaymentModal,
  GoalModal,
  GoalDepositModal,
  ProfileModal,
  PinModal,
  BudgetModal,
  ChangelogModal
} from "../components/Modals";
import { CalendarReminderModal } from "../components/CalendarReminderModal";
import { AiChatModal } from "../components/AiChatModal";
import { DriveConflictModal } from "../components/DriveConflictModal";

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
    closeDriveConflictModal
  } = useApp();

  const onSaveTransaction = (data: any) => {
    if (modalState.type === "transaction" && modalState.payload) {
      handleUpdateTransaction(modalState.payload.id, data);
    } else {
      handleAddTransaction(data);
    }
    closeModal();
  };

  const onSavePayment = (data: any) => {
    if (modalState.type === "payment" && modalState.payload) {
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
      <TransactionModal
        isOpen={modalState.type === "transaction" && activeProfile !== null}
        onClose={closeModal}
        activeProfile={activeProfile}
        initialData={modalState.type === "transaction" ? modalState.payload : undefined}
        onSave={onSaveTransaction}
      />
      <PaymentModal
        isOpen={modalState.type === "payment"}
        onClose={closeModal}
        initialData={modalState.type === "payment" ? modalState.payload : undefined}
        onSave={onSavePayment}
      />
      <GoalModal
        isOpen={modalState.type === "goal"}
        onClose={closeModal}
        onSave={onSaveGoal}
      />
      {modalState.type === "goalDeposit" && (
        <GoalDepositModal
          isOpen={true}
          goalName={(modalState as any).payload.name}
          onClose={closeModal}
          onSave={(amount) => onSaveGoalDeposit(amount, (modalState as any).payload)}
        />
      )}
      <ProfileModal
        isOpen={modalState.type === "profile"}
        onClose={closeModal}
        onSave={onSaveProfile}
      />
      <PinModal
        isOpen={modalState.type === "pin"}
        onClose={closeModal}
        onSave={onSavePin}
        onExportData={handleExportData}
      />
      {activeProfile && (
        <BudgetModal
          isOpen={modalState.type === "budget"}
          currentBudgets={activeProfile.budgets}
          onClose={closeModal}
          onSave={onSaveBudgets}
        />
      )}
      <CalendarReminderModal
        isOpen={modalState.type === "calendarAi"}
        payment={modalState.type === "calendarAi" ? (modalState as any).payload ?? null : null}
        onClose={closeModal}
        calendarToken={calendarToken}
        onConnectCalendar={() => connectGoogle("calendar")}
        onCalendarAuthInvalid={invalidateCalendarToken}
      />

      <AiChatModal
        isOpen={modalState.type === "aiChat" && canUseAiChat}
        onClose={closeModal}
        activeProfile={activeProfile}
      />
      <ChangelogModal
        isOpen={modalState.type === "changelog"}
        onClose={closeModal}
      />
      <DriveConflictModal
        isOpen={!!driveConflictInfo}
        onClose={closeDriveConflictModal}
        localState={driveConflictInfo?.localState || null}
        remoteState={driveConflictInfo?.remoteState || null}
        lastSyncedAt={driveConflictInfo?.lastSyncedAt || null}
        onResolve={resolveDriveConflict}
      />
    </>
  );
}
