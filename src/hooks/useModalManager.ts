import { useState, useCallback } from "react";
import { ModalState, ModalType } from "../uiTypes";

export function useModalManager() {
  const [modalState, setModalState] = useState<ModalState>({ type: null });

  function openModal(type: "transaction", payload?: import("../types").Transaction | Partial<import("../types").Transaction>): void;
  function openModal(type: "payment", payload?: import("../types").Payment | Partial<import("../types").Payment>): void;
  function openModal(type: "goal", payload?: { name?: string; target?: number }): void;
  function openModal(type: "profile" | "pin" | "budget" | "changelog" | "smartRulesManager"): void;
  function openModal(type: "goalDeposit", payload: import("../types").Goal): void;
  function openModal(type: "calendarAi", payload?: import("../types").Payment | Partial<import("../types").Payment>): void;
  function openModal(type: "confirm", payload: import("../uiTypes").ConfirmPayload): void;
  function openModal(type: "exportReports", payload?: { initialTab?: "pdf" | "csv" | "backup" }): void;
  function openModal(type: "bugReport"): void;
  function openModal(type: ModalType, payload?: any) {
    if (type === "goalDeposit") {
      setModalState({ type, payload });
    } else if (type === "calendarAi") {
      setModalState({ type, payload });
    } else if (type === "transaction") {
      setModalState({ type, payload });
    } else if (type === "payment") {
      setModalState({ type, payload });
    } else if (type === "goal") {
      setModalState({ type, payload });
    } else if (type === "confirm") {
      setModalState({ type, payload });
    } else if (type === "exportReports") {
      setModalState({ type, payload });
    } else if (type === "bugReport") {
      setModalState({ type });
    } else if (type) {
      setModalState({ type } as ModalState);
    }
  }

  const closeModal = useCallback(() => {
    setModalState({ type: null });
  }, []);

  const isOpen = useCallback((type: ModalType) => modalState.type === type, [modalState.type]);

  return {
    modalState,
    openModal,
    closeModal,
    isOpen
  };
}
