import React, { useState } from "react";
import type { User } from "firebase/auth";
import { motion } from "motion/react";
import {
  Cloud,
  Database,
  Lock,
  ShieldCheck,
  Users,
  Palette,
  Landmark,
  Cpu,
  Settings2,
  FileJson
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
  SettingsSecuritySection,
  SettingsGoogleHubSection
} from "./settings";
import { DriveIntegrityReport } from "../hooks/useDriveSync";
import { ModernAvatar } from "./avatar/ModernAvatar";

export { BankAccountsManager, TransactionRulesManager, RECOMMENDED_AI_MODELS };
export type { RecommendedAiModel } from "./settings";

export type SettingsTab =
  | "cloud"
  | "profiles"
  | "accounts"
  | "automation"
  | "backup"
  | "security"
  | "appearance"
  | "all";

export interface SettingsViewProps {
  initialTab?: SettingsTab;
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

  // Google integration props
  googleUser: User | null;
  isGoogleLoading: boolean;
  googleError?: string | null;
  isDriveActionLoading: boolean;
  gdriveFileId: string | null;
  gdriveLastSynced: string | null;
  isDriveAutoSyncEnabled: boolean;
  autoSyncStatus?: "idle" | "saving" | "synced" | "error";
  driveIntegrityReport?: DriveIntegrityReport | null;
  onCheckIntegrity?: () => Promise<any>;
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
  onOpenDataAuditor?: () => void;
}

export function SettingsView({
  initialTab,
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
  autoSyncStatus,
  driveIntegrityReport,
  onCheckIntegrity,
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
  onOpenExportReports,
  onOpenDataAuditor
}: SettingsViewProps) {
  const activeProfile = profiles.find((p) => p.id === activeProfileId);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>(initialTab || "cloud");

  return (
    <div className="w-full max-w-7xl mx-auto pb-24 space-y-6" id="settings-view-container">
      {/* HEADER CONTEXT STRIP */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-4 sm:p-5 rounded-2xl border border-border/70 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
              <Settings2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-main tracking-tight">Ustawienia Saldo</h2>
              <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                Konfiguracja chmury Google, profili domowych, kont bankowych i bezpieczeństwa
              </p>
            </div>
          </div>
        </div>

        {/* Quick Context Badges */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {activeProfile && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-2 border border-border/70 text-xs shadow-xs">
              <ModernAvatar iconId={activeProfile.avatar} colorId={activeProfile.color} size="sm" />
              <span className="font-bold text-text-main">{activeProfile.name}</span>
              <span className="text-text-muted text-[11px]">({activeProfile.currency || "PLN"})</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-2 border border-border/70 text-xs font-medium shadow-xs">
            <Database className="w-3.5 h-3.5 text-brand" />
            <span>Local-First</span>
            {googleUser && (
              <span className="inline-flex items-center gap-1 text-success font-bold ml-1">
                • <Cloud className="w-3 h-3" /> Chmura
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-2 border border-border/70 text-xs font-medium shadow-xs">
            {activeProfile?.pinHash ? (
              <span className="text-brand flex items-center gap-1 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" /> PIN aktywny
              </span>
            ) : (
              <span className="text-text-muted flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Bez PIN
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* SIDEBAR NAVIGATION */}
        <div className="w-full lg:w-64 xl:w-72 shrink-0 lg:sticky lg:top-6 space-y-4">
          <div className="bg-surface rounded-2xl border border-border/70 shadow-xs p-2.5">
            <div className="flex lg:flex-col items-stretch gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 custom-scrollbar min-w-0">
              
              {/* GROUP 1: CHMURA & PROFILE */}
              <div className="hidden lg:block px-3 pt-1 pb-1 text-[10px] font-bold text-text-faint uppercase tracking-wider">
                Chmura i Profile
              </div>

              <button
                onClick={() => setSettingsTab("cloud")}
                className={`relative px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between gap-2.5 transition-colors cursor-pointer whitespace-nowrap lg:whitespace-normal text-left min-h-[44px] focus-visible:ring-2 focus-visible:ring-focus-ring ${
                  settingsTab === "cloud"
                    ? "text-brand"
                    : "text-text-muted hover:bg-surface-2 hover:text-text-main"
                }`}
                id="btn-settings-tab-cloud"
              >
                {settingsTab === "cloud" && (
                  <motion.span
                    layoutId="activeSettingsTabPill"
                    className="absolute inset-0 rounded-xl bg-brand-subtle border border-brand/20 shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <div className="relative z-10 flex items-center gap-2.5 truncate">
                  <Cloud className="w-4 h-4 shrink-0" />
                  <span className="truncate">Usługi Google & Chmura</span>
                </div>
                <div className="relative z-10">
                  {googleUser ? (
                    <span className="w-2 h-2 rounded-full bg-success inline-block shrink-0" title="Połączono z Google" />
                  ) : (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-2 border border-border/70 text-text-muted">
                      Lokalne
                    </span>
                  )}
                </div>
              </button>

              <button
                onClick={() => setSettingsTab("profiles")}
                className={`relative px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between gap-2.5 transition-colors cursor-pointer whitespace-nowrap lg:whitespace-normal text-left min-h-[44px] focus-visible:ring-2 focus-visible:ring-focus-ring ${
                  settingsTab === "profiles"
                    ? "text-brand"
                    : "text-text-muted hover:bg-surface-2 hover:text-text-main"
                }`}
                id="btn-settings-tab-profiles"
              >
                {settingsTab === "profiles" && (
                  <motion.span
                    layoutId="activeSettingsTabPill"
                    className="absolute inset-0 rounded-xl bg-brand-subtle border border-brand/20 shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <div className="relative z-10 flex items-center gap-2.5 truncate">
                  <Users className="w-4 h-4 shrink-0" />
                  <span className="truncate">Profile & Blokada PIN</span>
                </div>
                <span className="relative z-10 text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-2 border border-border/70 text-text-muted">
                  {profiles.length}
                </span>
              </button>

              {/* GROUP 2: FINANSE & AUTOMATYZACJA */}
              <div className="hidden lg:block px-3 pt-3 pb-1 text-[10px] font-bold text-text-faint uppercase tracking-wider border-t border-border/40 mt-1">
                Finanse i Narzędzia
              </div>

              <button
                onClick={() => setSettingsTab("accounts")}
                className={`relative px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between gap-2.5 transition-colors cursor-pointer whitespace-nowrap lg:whitespace-normal text-left min-h-[44px] focus-visible:ring-2 focus-visible:ring-focus-ring ${
                  settingsTab === "accounts"
                    ? "text-brand"
                    : "text-text-muted hover:bg-surface-2 hover:text-text-main"
                }`}
                id="btn-settings-tab-accounts"
              >
                {settingsTab === "accounts" && (
                  <motion.span
                    layoutId="activeSettingsTabPill"
                    className="absolute inset-0 rounded-xl bg-brand-subtle border border-brand/20 shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <div className="relative z-10 flex items-center gap-2.5 truncate">
                  <Landmark className="w-4 h-4 shrink-0" />
                  <span className="truncate">Konta bankowe</span>
                </div>
                {activeProfile?.accounts && activeProfile.accounts.length > 0 && (
                  <span className="relative z-10 text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-2 border border-border/70 text-text-muted">
                    {activeProfile.accounts.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setSettingsTab("automation")}
                className={`relative px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between gap-2.5 transition-colors cursor-pointer whitespace-nowrap lg:whitespace-normal text-left min-h-[44px] focus-visible:ring-2 focus-visible:ring-focus-ring ${
                  settingsTab === "automation"
                    ? "text-brand"
                    : "text-text-muted hover:bg-surface-2 hover:text-text-main"
                }`}
                id="btn-settings-tab-automation"
              >
                {settingsTab === "automation" && (
                  <motion.span
                    layoutId="activeSettingsTabPill"
                    className="absolute inset-0 rounded-xl bg-brand-subtle border border-brand/20 shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <div className="relative z-10 flex items-center gap-2.5 truncate">
                  <Cpu className="w-4 h-4 shrink-0" />
                  <span className="truncate">Automatyzacja & AI</span>
                </div>
              </button>

              <button
                onClick={() => setSettingsTab("backup")}
                className={`relative px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between gap-2.5 transition-colors cursor-pointer whitespace-nowrap lg:whitespace-normal text-left min-h-[44px] focus-visible:ring-2 focus-visible:ring-focus-ring ${
                  settingsTab === "backup"
                    ? "text-brand"
                    : "text-text-muted hover:bg-surface-2 hover:text-text-main"
                }`}
                id="btn-settings-tab-backup"
              >
                {settingsTab === "backup" && (
                  <motion.span
                    layoutId="activeSettingsTabPill"
                    className="absolute inset-0 rounded-xl bg-brand-subtle border border-brand/20 shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <div className="relative z-10 flex items-center gap-2.5 truncate">
                  <FileJson className="w-4 h-4 shrink-0" />
                  <span className="truncate">Kopie & Raporty</span>
                </div>
              </button>

              {/* GROUP 3: SYSTEM & BEZPIECZEŃSTWO */}
              <div className="hidden lg:block px-3 pt-3 pb-1 text-[10px] font-bold text-text-faint uppercase tracking-wider border-t border-border/40 mt-1">
                System i Preferencje
              </div>

              <button
                onClick={() => setSettingsTab("appearance")}
                className={`relative px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between gap-2.5 transition-colors cursor-pointer whitespace-nowrap lg:whitespace-normal text-left min-h-[44px] focus-visible:ring-2 focus-visible:ring-focus-ring ${
                  settingsTab === "appearance"
                    ? "text-brand"
                    : "text-text-muted hover:bg-surface-2 hover:text-text-main"
                }`}
                id="btn-settings-tab-appearance"
              >
                {settingsTab === "appearance" && (
                  <motion.span
                    layoutId="activeSettingsTabPill"
                    className="absolute inset-0 rounded-xl bg-brand-subtle border border-brand/20 shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <div className="relative z-10 flex items-center gap-2.5 truncate">
                  <Palette className="w-4 h-4 shrink-0" />
                  <span className="truncate">Wygląd & Motyw</span>
                </div>
              </button>

              <button
                onClick={() => setSettingsTab("security")}
                className={`relative px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between gap-2.5 transition-colors cursor-pointer whitespace-nowrap lg:whitespace-normal text-left min-h-[44px] focus-visible:ring-2 focus-visible:ring-focus-ring ${
                  settingsTab === "security"
                    ? "text-brand"
                    : "text-text-muted hover:bg-surface-2 hover:text-text-main"
                }`}
                id="btn-settings-tab-security"
              >
                {settingsTab === "security" && (
                  <motion.span
                    layoutId="activeSettingsTabPill"
                    className="absolute inset-0 rounded-xl bg-brand-subtle border border-brand/20 shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <div className="relative z-10 flex items-center gap-2.5 truncate">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span className="truncate">Konto & Hasło</span>
                </div>
              </button>

              <button
                onClick={() => setSettingsTab("all")}
                className={`relative px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between gap-2.5 transition-colors cursor-pointer whitespace-nowrap lg:whitespace-normal text-left min-h-[44px] focus-visible:ring-2 focus-visible:ring-focus-ring ${
                  settingsTab === "all"
                    ? "text-brand"
                    : "text-text-muted hover:bg-surface-2 hover:text-text-main"
                }`}
                id="btn-settings-tab-all"
              >
                {settingsTab === "all" && (
                  <motion.span
                    layoutId="activeSettingsTabPill"
                    className="absolute inset-0 rounded-xl bg-brand-subtle border border-brand/20 shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <div className="relative z-10 flex items-center gap-2.5 truncate">
                  <Settings2 className="w-4 h-4 shrink-0" />
                  <span className="truncate">Wszystkie sekcje</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 min-w-0 space-y-6 w-full">
          {/* TAB 1: GOOGLE HUB (CLOUD) */}
          {(settingsTab === "all" || settingsTab === "cloud") && (
            <SettingsGoogleHubSection
              googleUser={googleUser}
              isGoogleLoading={isGoogleLoading}
              googleError={googleError}
              isDriveActionLoading={isDriveActionLoading}
              gdriveFileId={gdriveFileId}
              gdriveLastSynced={gdriveLastSynced}
              isDriveAutoSyncEnabled={isDriveAutoSyncEnabled}
              autoSyncStatus={autoSyncStatus}
              driveIntegrityReport={driveIntegrityReport}
              calendarToken={calendarToken}
              onConnectGoogle={onConnectGoogle}
              onDisconnectGoogle={onDisconnectGoogle}
              onConnectCalendar={onConnectCalendar}
              onSyncToDrive={onSyncToDrive}
              onLoadFromDrive={onLoadFromDrive}
              onToggleDriveAutoSync={onToggleDriveAutoSync}
              onCheckIntegrity={onCheckIntegrity}
              showToast={showToast}
            />
          )}

          {/* TAB 2: PROFILES */}
          {(settingsTab === "all" || settingsTab === "profiles") && (
            <>
              <SettingsProfileSection
                profiles={profiles}
                activeProfileId={activeProfileId}
                onSelectProfile={onSelectProfile}
                onUpdateProfile={onUpdateProfile}
                onDeleteProfile={onDeleteProfile}
                onOpenProfileModal={onOpenProfileModal}
                showToast={showToast}
              />
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
                showPinCard={true}
                showAccountSecurity={false}
              />
            </>
          )}

          {/* TAB 3: ACCOUNTS */}
          {activeProfile && (settingsTab === "all" || settingsTab === "accounts") && (
            <SettingsAccountsSection
              accounts={activeProfile.accounts || []}
              onSaveAccounts={onSaveAccounts}
              currency={activeProfile?.currency || "PLN"}
            />
          )}

          {/* TAB 4: AUTOMATION & AI */}
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

          {/* TAB 5: BACKUP & REPORTS */}
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
              onOpenDataAuditor={onOpenDataAuditor}
              showToast={showToast}
            />
          )}

          {/* TAB 6: APPEARANCE */}
          {(settingsTab === "all" || settingsTab === "appearance") && (
            <SettingsAppearanceSection theme={theme} onThemeChange={onThemeChange} />
          )}

          {/* TAB 7: SECURITY & ACCOUNT */}
          {(settingsTab === "all" || settingsTab === "security") && (
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
              showPinCard={false}
              showAccountSecurity={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}
