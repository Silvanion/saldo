import { useState, useCallback } from "react";
import { ModalState, ModalType } from "../uiTypes";

export function useModalManager() {
  const [modalState, setModalState] = useState<ModalState>({ type: null });

  function openModal(type: "transaction", payload?: import("../types").Transaction): void;
  function openModal(type: "payment", payload?: import("../types").Payment): void;
  function openModal(type: "goal" | "profile" | "pin" | "budget" | "aiChat" | "changelog"): void;
  function openModal(type: "goalDeposit", payload: import("../types").Goal): void;
  function openModal(type: "calendarAi", payload?: import("../types").Payment): void;
  function openModal(type: "confirm", payload: import("../uiTypes").ConfirmPayload): void;
  function openModal(type: ModalType, payload?: any) {
    if (type === "goalDeposit") {
      setModalState({ type, payload });
    } else if (type === "calendarAi") {
      setModalState({ type, payload });
    } else if (type === "transaction") {
      setModalState({ type, payload });
    } else if (type === "payment") {
      setModalState({ type, payload });
    } else if (type === "confirm") {
      setModalState({ type, payload });
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
