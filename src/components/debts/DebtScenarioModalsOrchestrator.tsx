import React from "react";
import { DebtScenarioModals, DebtScenarioModalsProps } from "./DebtScenarioModals";
import { DebtScenarioChooserModal } from "./DebtScenarioChooserModal";

export interface DebtScenarioModalsOrchestratorProps extends DebtScenarioModalsProps {
  /**
   * Props for the scenario chooser modal
   */
  isChooserModalOpen: boolean;
  onCloseChooserModal: () => void;
  onSelectOffer: () => void;
  onSelectScenario: () => void;
}

export function DebtScenarioModalsOrchestrator({
  // Props forwarded to DebtScenarioModals
  currency,
  isSaveScenarioModalOpen,
  scenarioNameInput,
  onScenarioNameChange,
  onSaveScenarioSubmit,
  onCloseSaveScenario,
  selectedPayoffStrategy,
  extraMonthlyPayoff,
  validatedCustomOrder,
  isCompareScenariosModalOpen,
  savedScenarios,
  validSelectedScenarioIds,
  activeDebts,
  onLoadScenario,
  onCloseCompareScenarios,
  renameModalScenario,
  renameScenarioInput,
  onRenameScenarioInputChange,
  onRenameSubmit,
  onCloseRenameScenario,
  duplicateModalScenario,
  duplicateScenarioInput,
  onDuplicateScenarioInputChange,
  onDuplicateSubmit,
  onCloseDuplicateScenario,
  // Props for chooser modal
  isChooserModalOpen,
  onCloseChooserModal,
  onSelectOffer,
  onSelectScenario,
}: DebtScenarioModalsOrchestratorProps) {
  return (
    <>
      <DebtScenarioModals
        currency={currency}
        isSaveScenarioModalOpen={isSaveScenarioModalOpen}
        scenarioNameInput={scenarioNameInput}
        onScenarioNameChange={onScenarioNameChange}
        onSaveScenarioSubmit={onSaveScenarioSubmit}
        onCloseSaveScenario={onCloseSaveScenario}
        selectedPayoffStrategy={selectedPayoffStrategy}
        extraMonthlyPayoff={extraMonthlyPayoff}
        validatedCustomOrder={validatedCustomOrder}
        isCompareScenariosModalOpen={isCompareScenariosModalOpen}
        savedScenarios={savedScenarios}
        validSelectedScenarioIds={validSelectedScenarioIds}
        activeDebts={activeDebts}
        onLoadScenario={onLoadScenario}
        onCloseCompareScenarios={onCloseCompareScenarios}
        renameModalScenario={renameModalScenario}
        renameScenarioInput={renameScenarioInput}
        onRenameScenarioInputChange={onRenameScenarioInputChange}
        onRenameSubmit={onRenameSubmit}
        onCloseRenameScenario={onCloseRenameScenario}
        duplicateModalScenario={duplicateModalScenario}
        duplicateScenarioInput={duplicateScenarioInput}
        onDuplicateScenarioInputChange={onDuplicateScenarioInputChange}
        onDuplicateSubmit={onDuplicateSubmit}
        onCloseDuplicateScenario={onCloseDuplicateScenario}
      />
      <DebtScenarioChooserModal
        isOpen={isChooserModalOpen}
        onClose={onCloseChooserModal}
        onSelectOffer={onSelectOffer}
        onSelectScenario={onSelectScenario}
      />
    </>
  );
}
