import React, { useState } from "react";
import type { User } from "firebase/auth";
import {
  Cloud,
  Database,
  Lock,
  ShieldCheck,
  Users,
  Palette,
  Landmark,
  Cpu,
  Settings2
} from "lucide-react";
import { Profile, RecurringRule, TransactionRule, AppState, BankAccount, SupportedCurrency } from "../types";
import {
  SettingsProfileSection,
  SettingsAppearanceSection,
  SettingsAccountsSection,
  BankAccountsManager,
  SettingsAutomationSection,
  TransactionRulesManager,
  RECOMMENDED_AI_MODELS,
  SettingsBackupSection,
  SettingsSecuritySection
} from "./settings";

export { BankAccountsManager, TransactionRulesManager, RECOMMENDED_AI_MODELS };
export type { RecommendedAiModel } from "./settings";

export interface SettingsViewProps {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  state: AppState;
  saveState: (s: AppState) => Promise<void>;
  profiles: Profile[];
  activeProfileId: string | null;
  onSelectProfile: (profileId: string) => void;
  onUpdateProfile: (
    profileId: string,
    data: {
      name: string;
      kind: "personal" | "shared";
      partnerName: string;
      avatar: string;
      currency: SupportedCurrency;
    }
  ) => void;
  onDeleteProfile: (profileId: string) => void;
  onOpenProfileModal: () => void;
  onOpenPinModal: () => void;
  onExportData: () => void;
  onResetData: () => void;

  // Google Drive integration props
  googleUser: User | null;
  isGoogleLoading: boolean;
  googleError?: string | null;
  isDriveActionLoading: boolean;
  gdriveFileId: string | null;
  gdriveLastSynced: string | null;
  isDriveAutoSyncEnabled: boolean;
  onConnectGoogle: () => Promise<void>;
  onDisconnectGoogle: () => Promise<void>;
  onSyncToDrive: () => Promise<void>;
  onLoadFromDrive: () => Promise<void>;
  onToggleDriveAutoSync: (enabled: boolean) => void;
  onImportLocalData: (state: AppState) => void;

  // Theme settings
  theme: "light" | "dark" | "auto";
  onThemeChange: (newTheme: "light" | "dark" | "auto") => void;

  selectedDate?: Date;
  calendarToken?: string | null;
  onConnectCalendar?: () => Promise<void>;
  unlockedProfileId?: string | null;

  // Rules and Automation
  recurringRules: RecurringRule[];
  onSaveRecurringRules: (rules: RecurringRule[]) => void;
  transactionRules: TransactionRule[];
  onSaveTransactionRules: (rules: TransactionRule[]) => void;
  onSaveAccounts: (accounts: BankAccount[]) => void;
  onOpenExportReports?: (tab?: "pdf" | "csv" | "backup") => void;
}

export function SettingsView({
  showToast,
  state,
  saveState,
  profiles,
  activeProfileId,
  onSelectProfile,
  onUpdateProfile,
  onDeleteProfile,
  onOpenProfileModal,
  onOpenPinModal,
  onExportData,
  onResetData,
  googleUser,
  isGoogleLoading,
  googleError,
  isDriveActionLoading,
  gdriveFileId,
  gdriveLastSynced,
  isDriveAutoSyncEnabled,
  onConnectGoogle,
  onDisconnectGoogle,
  onSyncToDrive,
  onLoadFromDrive,
  onToggleDriveAutoSync,
  onImportLocalData,
  theme,
  onThemeChange,
  selectedDate,
  recurringRules,
  onSaveRecurringRules,
  transactionRules,
  onSaveTransactionRules,
  onSaveAccounts,
  calendarToken,
  onConnectCalendar,
  unlockedProfileId,
  onOpenExportReports
}: SettingsViewProps) {
  const activeProfile = profiles.find((p) => p.id === activeProfileId);
  const [settingsTab, setSettingsTab] = useState<
    "all" | "profiles" | "appearance" | "accounts" | "automation" | "backup" | "security"
  >("all");

  return (
    <div className="w-full max-w-7xl mx-auto pb-24 space-y-6" id="settings-view-container">
      {/* HEADER CONTEXT STRIP */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-4 sm:p-5 rounded-xl border border-border/70 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
              <Settings2 className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-text-main tracking-tight">Ustawienia systemu</h2>
          </div>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">
            Zarządzaj profilami domowymi, automatyzacją, kontami bankowymi i bezpieczeństwem danych
          </p>
        </div>

        {/* Quick Context Badges */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {activeProfile && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 border border-border/70 text-xs shadow-xs">
              <span className="text-base leading-none">{activeProfile.avatar || "👤"}</span>
              <span className="font-bold text-text-main">{activeProfile.name}</span>
              <span className="text-text-muted text-[11px]">({activeProfile.currency || "PLN"})</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-border/70 text-xs text-text-muted font-medium shadow-xs">
            <Database className="w-3.5 h-3.5 text-brand" />
            <span>Local-First</span>
            {googleUser && (
              <span className="inline-flex items-center gap-1 text-success font-semibold ml-1">
                • <Cloud className="w-3 h-3" /> Drive
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-border/70 text-xs font-medium shadow-xs">
            {activeProfile?.pinHash ? (
              <span className="text-brand flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> PIN aktywny
              </span>
            ) : (
              <span className="text-text-muted flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Brak PIN
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* SIDEBAR NAVIGATION */}
        <div className="w-full lg:w-64 xl:w-72 shrink-0 lg:sticky lg:top-6 space-y-4">
          <div className="bg-surface rounded-xl border border-border/70 shadow-xs p-2.5">
            <div className="flex lg:flex-col items-stretch gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 custom-scrollbar min-w-0">
              {/* Group 1: Główne */}
              <div className="hidden lg:block px-3 pt-1 pb-1 text-[10px] font-bold text-text-faint uppercase tracking-wider">
                Główne
              </div>
              <button
                onClick={() => setSettingsTab("all")}
                className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center justify-between gap-2.5 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap lg:whitespace-normal text-left focus-visible:ring-2 focus-visible:ring-focus-ring ${
                  settingsTab === "all"
                    ? "bg-brand-subtle text-brand border border-brand/20 shadow-xs"
                    : "bg-transparent text-text-muted hover:bg-surface-2 hover:text-text-main border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Settings2 className="w-4 h-4 shrink-0" />
                  <span className="truncate">Wszystkie sekcje</span>
                </div>
              </button>

              <button
                onClick={() => setSettingsTab("profiles")}
                className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center justify-between gap-2.5 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap lg:whitespace-normal text-left focus-visible:ring-2 focus-visible:ring-focus-ring ${
                  settingsTab === "profiles"
                    ? "bg-brand-subtle text-brand border border-brand/20 shadow-xs"
                    : "bg-transparent text-text-muted hover:bg-surface-2 hover:text-text-main border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Users className="w-4 h-4 shrink-0" />
                  <span className="truncate">Profile i PIN</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-2 border border-border/70 text-text-muted">
                  {profiles.length}
                </span>
              </button>

              <button
                onClick={() => setSettingsTab("appearance")}
                className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center justify-between gap-2.5 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap lg:whitespace-normal text-left focus-visible:ring-2 focus-visible:ring-focus-ring ${
                  settingsTab === "appearance"
                    ? "bg-brand-subtle text-brand border border-brand/20 shadow-xs"
                    : "bg-transparent text-text-muted hover:bg-surface-2 hover:text-text-main border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Palette className="w-4 h-4 shrink-0" />
                  <span className="truncate">Wygląd i motyw</span>
                </div>
              </button>

              {/* Group 2: Finanse i Reguły */}
              <div className="hidden lg:block px-3 pt-3 pb-1 text-[10px] font-bold text-text-faint uppercase tracking-wider border-t border-border/40 mt-1">
                Finanse i Automatyzacja
              </div>

              <button
                onClick={() => setSettingsTab("accounts")}
                className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center justify-between gap-2.5 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap lg:whitespace-normal text-left focus-visible:ring-2 focus-visible:ring-focus-ring ${
                  settingsTab === "accounts"
                    ? "bg-brand-subtle text-brand border border-brand/20 shadow-xs"
                    : "bg-transparent text-text-muted hover:bg-surface-2 hover:text-text-main border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Landmark className="w-4 h-4 shrink-0" />
                  <span className="truncate">Konta operacyjne</span>
                </div>
                {activeProfile?.accounts && activeProfile.accounts.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-2 border border-border/70 text-text-muted">
                    {activeProfile.accounts.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setSettingsTab("automation")}
                className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center justify-between gap-2.5 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap lg:whitespace-normal text-left focus-visible:ring-2 focus-visible:ring-focus-ring ${
                  settingsTab === "automation"
                    ? "bg-brand-subtle text-brand border border-brand/20 shadow-xs"
                    : "bg-transparent text-text-muted hover:bg-surface-2 hover:text-text-main border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Cpu className="w-4 h-4 shrink-0" />
                  <span className="truncate">Automatyzacja i AI</span>
                </div>
              </button>

              {/* Group 3: Dane i Bezpieczeństwo */}
              <div className="hidden lg:block px-3 pt-3 pb-1 text-[10px] font-bold text-text-faint uppercase tracking-wider border-t border-border/40 mt-1">
                Dane i Bezpieczeństwo
              </div>

              <button
                onClick={() => setSettingsTab("backup")}
                className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center justify-between gap-2.5 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap lg:whitespace-normal text-left focus-visible:ring-2 focus-visible:ring-focus-ring ${
                  settingsTab === "backup"
                    ? "bg-brand-subtle text-brand border border-brand/20 shadow-xs"
                    : "bg-transparent text-text-muted hover:bg-surface-2 hover:text-text-main border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Cloud className="w-4 h-4 shrink-0" />
                  <span className="truncate">Kopie i Dysk Google</span>
                </div>
                {googleUser && <span className="w-2 h-2 rounded-full bg-success"></span>}
              </button>

              <button
                onClick={() => setSettingsTab("security")}
                className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center justify-between gap-2.5 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap lg:whitespace-normal text-left focus-visible:ring-2 focus-visible:ring-focus-ring ${
                  settingsTab === "security"
                    ? "bg-brand-subtle text-brand border border-brand/20 shadow-xs"
                    : "bg-transparent text-text-muted hover:bg-surface-2 hover:text-text-main border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span className="truncate">Konto i Prywatność</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 min-w-0 space-y-6 w-full">
          {/* SECTION 1: PROFILES */}
          {(settingsTab === "all" || settingsTab === "profiles") && (
            <SettingsProfileSection
              profiles={profiles}
              activeProfileId={activeProfileId}
              onSelectProfile={onSelectProfile}
              onUpdateProfile={onUpdateProfile}
              onDeleteProfile={onDeleteProfile}
              onOpenProfileModal={onOpenProfileModal}
              showToast={showToast}
            />
          )}

          {/* SECTION 2: APPEARANCE */}
          {(settingsTab === "all" || settingsTab === "appearance") && (
            <SettingsAppearanceSection theme={theme} onThemeChange={onThemeChange} />
          )}

          {/* SECTION 3: BANK ACCOUNTS */}
          {activeProfile && (settingsTab === "all" || settingsTab === "accounts") && (
            <SettingsAccountsSection
              accounts={activeProfile.accounts || []}
              onSaveAccounts={onSaveAccounts}
              currency={activeProfile?.currency || "PLN"}
            />
          )}

          {/* SECTION 4: AUTOMATION & LOCAL AI */}
          {(settingsTab === "all" || settingsTab === "automation") && (
            <SettingsAutomationSection
              state={state}
              saveState={saveState}
              transactionRules={transactionRules}
              onSaveTransactionRules={onSaveTransactionRules}
              recurringRules={recurringRules}
              onSaveRecurringRules={onSaveRecurringRules}
              currency={activeProfile?.currency || "PLN"}
              showToast={showToast}
            />
          )}

          {/* SECTION 5: BACKUP & CLOUD */}
          {(settingsTab === "all" || settingsTab === "backup") && (
            <SettingsBackupSection
              state={state}
              activeProfile={activeProfile}
              activeProfileId={activeProfileId}
              unlockedProfileId={unlockedProfileId}
              selectedDate={selectedDate}
              googleUser={googleUser}
              isGoogleLoading={isGoogleLoading}
              googleError={googleError}
              isDriveActionLoading={isDriveActionLoading}
              gdriveFileId={gdriveFileId}
              gdriveLastSynced={gdriveLastSynced}
              isDriveAutoSyncEnabled={isDriveAutoSyncEnabled}
              onConnectGoogle={onConnectGoogle}
              onDisconnectGoogle={onDisconnectGoogle}
              onSyncToDrive={onSyncToDrive}
              onLoadFromDrive={onLoadFromDrive}
              onToggleDriveAutoSync={onToggleDriveAutoSync}
              onImportLocalData={onImportLocalData}
              onExportData={onExportData}
              onResetData={onResetData}
              onOpenPinModal={onOpenPinModal}
              onOpenExportReports={onOpenExportReports}
              showToast={showToast}
            />
          )}

          {/* SECTION 6: SECURITY & PRIVACY */}
          {(settingsTab === "all" || settingsTab === "security" || settingsTab === "profiles") && (
            <SettingsSecuritySection
              state={state}
              saveState={saveState}
              activeProfile={activeProfile}
              unlockedProfileId={unlockedProfileId}
              googleUser={googleUser}
              gdriveFileId={gdriveFileId}
              gdriveLastSynced={gdriveLastSynced}
              isDriveActionLoading={isDriveActionLoading}
              calendarToken={calendarToken}
              onConnectCalendar={onConnectCalendar}
              onConnectGoogle={onConnectGoogle}
              onSyncToDrive={onSyncToDrive}
              onOpenPinModal={onOpenPinModal}
              showToast={showToast}
              showPinCard={settingsTab === "all" || settingsTab === "profiles" || settingsTab === "security"}
              showAccountSecurity={settingsTab === "all" || settingsTab === "security"}
            />
          )}
        </div>
      </div>
    </div>
  );
}
