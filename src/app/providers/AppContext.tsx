import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Goal, Payment, AppState, Profile } from "../../types";
import { AppView } from "../../uiTypes";
import { useAuth } from "../../hooks/useAuth";
import { useBudgetState } from "../../hooks/useBudgetState";
import { useDriveSync } from "../../hooks/useDriveSync";
import { useProfileSecurity } from "../../hooks/useProfileSecurity";
import { useAppActions } from "../../hooks/useAppActions";
import { useModalManager } from "../../hooks/useModalManager";
import { useTheme } from "../../hooks/useTheme";
import { useToast } from "../../hooks/useToast";

type AuthData = ReturnType<typeof useAuth>;
type BudgetData = ReturnType<typeof useBudgetState>;
type DriveSyncData = ReturnType<typeof useDriveSync>;
type ProfileSecurityData = ReturnType<typeof useProfileSecurity>;
type AppActionsData = ReturnType<typeof useAppActions>;
type ModalManagerData = ReturnType<typeof useModalManager>;

type ThemeData = ReturnType<typeof useTheme>;
type ToastData = ReturnType<typeof useToast>;
export interface AppContextType extends ThemeData, AuthData, BudgetData, DriveSyncData, ProfileSecurityData, AppActionsData, ModalManagerData, ToastData {
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (val: boolean) => void;
  isOnline: boolean;
  setIsOnline: (val: boolean) => void;
  activeProfile: Profile | null;
  isDriveAutoSyncEnabled: boolean;
  toggleAutoSync: (enabled: boolean) => void;
  aiMode: "none" | "local" | "cloud";
  canUseCloudSync: boolean;
  isOfflineBudgetMode: boolean;
}

export const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeView, setActiveView] = useState<AppView>("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const authData = useAuth();
  const budgetData = useBudgetState(authData.googleUser);
  
  const [isDriveAutoSyncEnabled, setIsDriveAutoSyncEnabled] = useState(false);
  const toggleAutoSync = (enabled: boolean) => {
    setIsDriveAutoSyncEnabled(enabled);
  };

  const driveSyncData = useDriveSync({
    driveToken: authData.driveToken,
    state: budgetData.state,
    onImportState: budgetData.saveState,
    onBeforeRestore: budgetData.makeUndoBackup,
    onDriveAuthInvalid: authData.invalidateDriveToken
  });

  const activeProfile = budgetData.state.profiles.find((p) => p.id === budgetData.state.activeProfileId) || null;

  const securityData = useProfileSecurity({
    state: budgetData.state,
    saveState: budgetData.saveState,
    activeProfile
  });

  const modalData = useModalManager();
  const themeData = useTheme();
  const toastData = useToast();

  const actionsData = useAppActions({
    state: budgetData.state,
    saveState: budgetData.saveState,
    activeProfile,
    makeUndoBackup: budgetData.makeUndoBackup,
    unlockProfile: securityData.unlockProfile,
    lockProfile: securityData.lockProfile,
    setActiveView,
    connectGoogle: authData.connectGoogle,
    disconnectGoogle: authData.disconnectGoogle,
    toggleAutoSync,
    backupToDriveManual: driveSyncData.backupToDriveManual,
    restoreFromDriveManual: driveSyncData.restoreFromDriveManual,
    setApiError: budgetData.setApiError,
    showToast: toastData.showToast,
    openModal: modalData.openModal
  });

  const handlePrevMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 15));
  };

  const handleNextMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 15));
  };

  const aiMode: "none" | "local" | "cloud" =
    budgetData.state.aiMode === "local" || budgetData.state.aiMode === "cloud"
      ? budgetData.state.aiMode
      : "none";
  const canUseCloudSync = authData.isGoogleAuthenticated;
  const isOfflineBudgetMode = !authData.googleUser;

  const value = {
    isDemoMode, setIsDemoMode,
    selectedDate, setSelectedDate, handlePrevMonth, handleNextMonth,
    activeView, setActiveView,
    isMobileMenuOpen, setIsMobileMenuOpen,
    isOnline, setIsOnline,
    activeProfile,
    isDriveAutoSyncEnabled, toggleAutoSync,
    aiMode,
    canUseCloudSync,
    isOfflineBudgetMode,
    ...authData,
    ...budgetData,
    ...driveSyncData,
    ...securityData,
    ...actionsData,
    ...modalData,
    ...themeData,
    ...toastData,
  };

  return (
    <AppContext.Provider value={value}>
        {children}
    </AppContext.Provider>
  );
}
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
