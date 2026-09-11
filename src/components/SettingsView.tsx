import React, { useState } from "react";
import type { User } from "firebase/auth";
import { iconByCategory, expenseCategories, incomeCategories, getMonthName } from "../utils";
import { Profile, RecurringRule, TransactionRule, AppState, BankAccount, SupportedCurrency } from "../types";
import { formatMoney } from "../utils/format";
import { isFirebaseConfigured, changePassword, changeEmail, logout, deleteOwnAccount } from "../firebase";
import {
  DEFAULT_LOCAL_AI_ENDPOINT,
  DEFAULT_LOCAL_AI_MODEL,
  resolveLocalAiConfig,
  checkLocalAiHealth,
  isLocalAiLikelyUnsupported
} from "../services/localAi";
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  LogOut,
  Check,
  RefreshCw,
  Upload,
  AlertTriangle,
  FileJson,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  Info,
  Sparkles,
  Sun,
  Moon,
  Monitor,
  Database,
  Calendar,
  Lock,
  Shield,
  ShieldCheck,
  Trash2,
  Cpu,
  Edit2,
  Users,
  Sliders,
  Palette,
  ArrowRight,
  ChevronDown,
  Settings2,
  Plus,
  KeyRound,
  Mail,
  UserX,
  Eye,
  EyeOff,
  X,
  Landmark
} from "lucide-react";
import { generateCsvContent, downloadFile } from "../utils";
import { prepareStateForRemoteSave, activeKeys } from "../services/crypto";
import { clearState } from "../services/localDb";
import { ConfirmModal } from "./ConfirmModal";

function getPasswordStrength(password: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (!password || password.length < 6) return { level: 0, label: "Za krótkie (min. 6 znaków)", color: "bg-border" };
  const hasMinLength = password.length >= 8;
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (hasMinLength && hasDigit && hasSpecial) return { level: 3, label: "Silne hasło", color: "bg-success" };
  if (hasMinLength && hasDigit) return { level: 2, label: "Średnie hasło", color: "bg-warning" };
  if (password.length >= 6) return { level: 1, label: "Słabe hasło", color: "bg-danger" };
  return { level: 0, label: "Za krótkie", color: "bg-border" };
}

function getLocalAiRecommendation(): { primary: string; alternatives: string[]; reason: string } {
  const browser = navigator as Navigator & {
    deviceMemory?: number;
    userAgentData?: { architecture?: string };
  };
  const cores = navigator.hardwareConcurrency || 4;
  const memory = browser.deviceMemory || 8;
  const architecture = `${browser.userAgentData?.architecture || ""} ${navigator.platform || ""} ${navigator.userAgent}`.toLowerCase();
  const appleSilicon = architecture.includes("arm") && architecture.includes("mac");

  if (memory <= 4 || cores <= 4) {
    return {
      primary: "qwen3:1.7b",
      alternatives: ["gemma3:1b", "llama3.2:1b"],
      reason: "Lekki wariant dla urządzeń z mniejszą pamięcią lub mniejszą liczbą rdzeni."
    };
  }
  if (memory >= 16 || cores >= 10) {
    return {
      primary: appleSilicon ? "qwen3:8b" : "gemma3:12b",
      alternatives: ["qwen3:8b", "gemma3:4b"],
      reason: appleSilicon
        ? "Apple Silicon zwykle dobrze radzi sobie z lokalnymi modelami 8B."
        : "Mocniejsze urządzenie może użyć większego modelu dla lepszej jakości odpowiedzi."
    };
  }
  return {
    primary: "qwen3:4b",
    alternatives: ["gemma3:4b", "llama3.2:3b"],
    reason: "Dobry kompromis jakości, szybkości i zużycia pamięci."
  };
}

interface SettingsViewProps {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  state: AppState;
  saveState: (s: AppState) => Promise<void>;
  profiles: Profile[];
  activeProfileId: string | null;
  onSelectProfile: (profileId: string) => void;
  onUpdateProfile: (profileId: string, data: { name: string; kind: "personal" | "shared"; partnerName: string; avatar: string; currency: SupportedCurrency }) => void;
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

export function BankAccountsManager({
  accounts,
  onSaveAccounts,
  currency
}: {
  accounts: BankAccount[];
  onSaveAccounts: (accounts: BankAccount[]) => void;
  currency: string;
}) {
  const [accName, setAccName] = useState("");
  const [accBankName, setAccBankName] = useState("");
  const [accHasLimit, setAccHasLimit] = useState(false);
  const [accLimitAmount, setAccLimitAmount] = useState<number | "">("");

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) return;
    const newAcc: BankAccount = {
      id: "acc-" + Date.now(),
      name: accName.trim(),
      bankName: accBankName.trim(),
      hasCreditLimit: accHasLimit,
      creditLimit: accHasLimit && typeof accLimitAmount === "number" ? accLimitAmount : 0
    };
    onSaveAccounts([...accounts, newAcc]);
    setAccName("");
    setAccBankName("");
    setAccHasLimit(false);
    setAccLimitAmount("");
  };

  const handleDeleteAccount = (id: string) => {
    onSaveAccounts(accounts.filter((a) => a.id !== id));
  };

  return (
    <div className="bg-surface rounded-xl border border-border/70 shadow-xs p-5 sm:p-6 min-w-0" id="settings-bank-accounts-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-border/40">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-main">Konta operacyjne</h3>
            <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
              Miejsca operacyjne przypisane do wydatków i wpływów z buforem awaryjnym (poza "safe-to-spend").
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-subtle text-brand border border-brand/20 shrink-0 self-start sm:self-auto">
          {accounts.length} {accounts.length === 1 ? "konto" : "kont"}
        </span>
      </div>

      <form onSubmit={handleAddAccount} className="space-y-3 mb-5 p-4 sm:p-5 rounded-xl bg-surface-2/60 border border-border/70 min-w-0 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Nazwa konta / portfela *</label>
            <input required value={accName} onChange={(e) => setAccName(e.target.value)} placeholder="np. Konto bieżące, Gotówka" className="w-full bg-surface text-xs rounded-lg border border-border/70 p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring min-w-0 shadow-xs" />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Opis dodatkowy (opcjonalnie)</label>
            <input value={accBankName} onChange={(e) => setAccBankName(e.target.value)} placeholder="np. nazwa banku" className="w-full bg-surface text-xs rounded-lg border border-border/70 p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs" />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center cursor-pointer select-none">
              <input type="checkbox" checked={accHasLimit} onChange={(e) => setAccHasLimit(e.target.checked)} className="sr-only peer" />
              <div className="w-9 h-5 bg-surface-offset peer-focus-visible:ring-2 peer-focus-visible:ring-focus-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
              <span className="ml-2 text-xs font-bold text-text-muted">Bufor awaryjny</span>
            </label>
            {accHasLimit && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-text-muted uppercase">Limit:</span>
                <input type="number" min="0" step="0.01" value={accLimitAmount} onChange={(e) => setAccLimitAmount(parseFloat(e.target.value) || "")} placeholder="0.00" className="w-28 bg-surface text-xs rounded-lg border border-border/70 p-2 focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums shadow-xs" />
              </div>
            )}
          </div>
          <button type="submit" className="px-5 py-2 bg-surface border border-border/70 text-brand hover:border-brand/30 hover:bg-surface-offset font-bold rounded-lg active:scale-[0.98] transition-all text-xs shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring ml-auto">
            + Dodaj konto
          </button>
        </div>
      </form>

      {accounts.length > 0 ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {accounts.map((acc, index) => (
              <div key={acc.id} className="flex items-center justify-between p-3.5 bg-surface border border-border/70 rounded-xl hover:border-brand/30 transition shadow-xs">
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-xs text-text-main font-bold truncate">{acc.name}</strong>
                    {index === 0 && <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-subtle text-brand border border-brand/20 px-2 py-0.5 rounded shadow-xs">Domyślne</span>}
                  </div>
                  {acc.bankName && <span className="mt-1 inline-block text-xs text-text-muted bg-surface-2 border border-border/70 px-2 py-0.5 rounded shadow-xs">{acc.bankName}</span>}
                  {acc.hasCreditLimit && (
                    <p className="text-xs text-brand font-bold mt-1 tabular-nums">Bufor awaryjny: {formatMoney(acc.creditLimit, currency)}</p>
                  )}
                </div>
                <button type="button" onClick={() => handleDeleteAccount(acc.id)} aria-label={`Usuń konto bankowe ${acc.name}`} className="text-text-muted hover:text-danger hover:bg-danger-subtle active:scale-95 transition-colors p-1.5 cursor-pointer rounded-lg focus-visible:ring-2 focus-visible:ring-focus-ring shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="p-3 rounded-lg bg-surface-2/60 border border-border/70 text-xs text-text-muted flex items-center gap-2">
            <Info className="w-4 h-4 text-brand shrink-0" />
            <span><strong>Wskazówka:</strong> pierwsze konto z listy będzie domyślnie podpowiadane przy wprowadzaniu nowej transakcji.</span>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-surface-2/30 rounded-xl border border-dashed border-border/70 text-center flex flex-col items-center justify-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center text-text-muted border border-border/70">
            <Landmark className="w-5 h-5" />
          </div>
          <p className="text-xs text-text-main font-bold">Brak kont operacyjnych</p>
          <p className="text-[11px] text-text-muted max-w-sm">Nie dodałeś jeszcze żadnych kont. Będziesz je wpisywać ręcznie przy dodawaniu wydatków.</p>
        </div>
      )}
    </div>
  );
}

export function TransactionRulesManager({
  transactionRules,
  onSaveTransactionRules
}: {
  transactionRules: TransactionRule[];
  onSaveTransactionRules: (rules: TransactionRule[]) => void;
}) {
  const [rulePattern, setRulePattern] = useState("");
  const [ruleCategory, setRuleCategory] = useState("Żywność");

  const handleAddTransactionRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rulePattern.trim()) return;
    const newRule: TransactionRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      pattern: rulePattern.trim(),
      category: ruleCategory,
      categoryIcon: iconByCategory[ruleCategory] || "✨"
    };
    onSaveTransactionRules([...transactionRules, newRule]);
    setRulePattern("");
  };

  const handleDeleteTransactionRule = (id: string) => {
    onSaveTransactionRules(transactionRules.filter((r) => r.id !== id));
  };

  return (
    <div className="bg-surface rounded-xl border border-border/70 shadow-xs p-5 sm:p-6" id="settings-category-rules-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-border/40">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-main">Automatyzacja kategoryzacji</h3>
            <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
              Słowa kluczowe automatycznie przypisujące kategorie do nowych i importowanych transakcji.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-subtle text-brand border border-brand/20 shrink-0 self-start sm:self-auto">
          {transactionRules.length} {transactionRules.length === 1 ? "reguła" : "reguł"}
        </span>
      </div>

      <form onSubmit={handleAddTransactionRule} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 p-4 rounded-xl bg-surface-2/60 border border-border/70 shadow-xs">
        <div>
          <label className="block text-xs font-bold text-text-muted uppercase mb-1">Słowo kluczowe (Fraza)</label>
          <input
            type="text"
            value={rulePattern}
            onChange={(e) => setRulePattern(e.target.value)}
            placeholder="np. biedronka, netflix, orlen"
            className="w-full text-xs rounded-lg border border-border/70 p-2.5 bg-surface focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-text-muted uppercase mb-1">Przypisz do kategorii</label>
          <select
            value={ruleCategory}
            onChange={(e) => setRuleCategory(e.target.value)}
            className="w-full text-xs rounded-lg border border-border/70 p-2.5 bg-surface focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs cursor-pointer"
          >
            {expenseCategories.concat(incomeCategories).filter((v, i, a) => a.indexOf(v) === i).map((cat) => (
              <option key={cat} value={cat}>
                {iconByCategory[cat] || "✨"} {cat}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full bg-brand-subtle text-brand border border-brand/20 hover:bg-brand-subtle font-bold py-2.5 px-4 rounded-lg text-xs active:scale-[0.98] transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            ＋ Zapisz dopasowanie
          </button>
        </div>
      </form>

      {transactionRules.length === 0 ? (
        <div className="p-8 bg-surface-2/30 rounded-xl border border-dashed border-border/70 text-center flex flex-col items-center justify-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center text-text-muted border border-border/70">
            <Sliders className="w-5 h-5" />
          </div>
          <p className="text-xs text-text-main font-bold">Brak zapisanych dopasowań</p>
          <p className="text-[11px] text-text-muted max-w-sm">Zdefiniuj własne słowa kluczowe, by automatycznie przypisywać kategorie wydatków.</p>
        </div>
      ) : (
        <div className="border border-border/70 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-surface-2 border-b border-border/70 text-text-muted font-bold">
                <th className="py-2.5 px-3">Słowo kluczowe</th>
                <th className="py-2.5 px-3">Kategoria docelowa</th>
                <th className="py-2.5 px-3 text-right">Akcja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70 bg-surface">
              {transactionRules.map((r) => (
                <tr key={r.id} className="hover:bg-surface-2/50 transition">
                  <td className="py-2.5 px-3 font-mono font-bold text-text-main">{r.pattern}</td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center gap-1 bg-brand-subtle text-brand px-2 py-0.5 rounded-full text-xs font-bold border border-brand/20 shadow-xs">
                      <span>{r.categoryIcon || "✨"}</span>
                      {r.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteTransactionRule(r.id)}
                      aria-label={`Usuń regułę dla ${r.pattern}`}
                      className="text-text-muted hover:text-danger hover:bg-danger-subtle p-1.5 rounded-lg active:scale-95 transition-colors cursor-pointer inline-flex items-center justify-center focus-visible:ring-2 focus-visible:ring-focus-ring"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
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
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [filePreview, setFilePreview] = useState<AppState | null>(null);
  const [localAiModels, setLocalAiModels] = useState<Array<{ name: string; size?: number; vision?: boolean }>>([]);
  const [isLocalAiChecking, setIsLocalAiChecking] = useState(false);
  const [localAiVisionAvailable, setLocalAiVisionAvailable] = useState<boolean | null>(null);
  const [isLocalAiPulling, setIsLocalAiPulling] = useState(false);
  const [localAiPullProgress, setLocalAiPullProgress] = useState<{ status: string; completed: number; total: number } | null>(null);
  const localAiPullController = React.useRef<AbortController | null>(null);
  const localAiRecommendation = getLocalAiRecommendation();

  const targetPdfDate = selectedDate || (() => {
    if (activeProfile?.transactions && activeProfile.transactions.length > 0) {
      const sorted = [...activeProfile.transactions].sort((a, b) => (b.isoDate || "").localeCompare(a.isoDate || ""));
      if (sorted[0]?.isoDate) {
        return new Date(`${sorted[0].isoDate}T12:00:00`);
      }
    }
    return new Date();
  })();

  const pdfYear = targetPdfDate.getFullYear();
  const pdfMonthIdx = targetPdfDate.getMonth();
  const pdfMonthLabel = getMonthName(pdfMonthIdx);


  // Active profile edit states
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  
  // Password change states
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [showPwds, setShowPwds] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  
  // Email change states
  const [emailCurrentPwd, setEmailCurrentPwd] = useState("");
  const [emailNew, setEmailNew] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [showEmailPwd, setShowEmailPwd] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const hasPasswordProvider = googleUser?.providerData?.some(p => p.providerId === 'password');
  
  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");
    
    if (pwdNew !== pwdConfirm) {
      setPwdError("Nowe hasła nie są identyczne.");
      return;
    }
    if (pwdCurrent === pwdNew) {
      setPwdError("Nowe hasło musi być inne niż obecne.");
      return;
    }
    const strength = getPasswordStrength(pwdNew);
    if (strength.level < 3) {
      setPwdError("Nowe hasło jest zbyt słabe (wymagane min. 8 znaków, cyfra i znak specjalny).");
      return;
    }
    
    setPwdLoading(true);
    try {
      await changePassword(pwdCurrent, pwdNew);
      setPwdSuccess("Hasło zostało pomyślnie zmienione.");
      setPwdCurrent("");
      setPwdNew("");
      setPwdConfirm("");
    } catch (err: any) {
      setPwdError(err.message || "Wystąpił błąd podczas zmiany hasła.");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleEmailChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    setEmailSuccess("");
    
    if (emailNew !== emailConfirm) {
      setEmailError("Nowe adresy email nie są identyczne.");
      return;
    }
    
    setEmailLoading(true);
    try {
      await changeEmail(emailCurrentPwd, emailNew);
      setEmailSuccess("Na nowy adres email została wysłana wiadomość weryfikacyjna. Kliknij link w wiadomości, aby potwierdzić zmianę.");
      setEmailCurrentPwd("");
      setEmailNew("");
      setEmailConfirm("");
    } catch (err: any) {
      setEmailError(err.message || "Wystąpił błąd podczas zmiany adresu email.");
    } finally {
      setEmailLoading(false);
    }
  };

  const [editProfileData, setEditProfileData] = useState<{
    name: string;
    kind: "personal" | "shared";
    partnerName: string;
    avatar: string;
    currency: SupportedCurrency;
  } | null>(null);

  const startEditingProfile = (profile: Profile) => {
    setEditingProfileId(profile.id);
    setEditProfileData({
      name: profile.name,
      kind: profile.kind,
      partnerName: profile.partnerName || "",
      avatar: profile.avatar || "👤",
      currency: profile.currency || "PLN",
    });
  };

  const cancelEditingProfile = () => {
    setEditingProfileId(null);
    setEditProfileData(null);
  };

  const handleSaveEditedProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfileId || !editProfileData) return;
    if (!editProfileData.name.trim()) return;
    if (editProfileData.kind === "shared" && !editProfileData.partnerName.trim()) {
      showToast("Proszę podać imię partnera dla profilu wspólnego.", "error");
      return;
    }
    
    onUpdateProfile(editingProfileId, {
      name: editProfileData.name.trim(),
      kind: editProfileData.kind,
      partnerName: editProfileData.kind === "shared" ? editProfileData.partnerName.trim() : "",
      avatar: editProfileData.avatar,
      currency: editProfileData.currency,
    });
    setEditingProfileId(null);
    setEditProfileData(null);
  };

  const [profileToDelete, setProfileToDelete] = useState<string | null>(null);

  // Form states for Recurring Rules
  const [recName, setRecName] = useState("");
  const [recAmount, setRecAmount] = useState<number | "">("");
  const [recType, setRecType] = useState<"expense" | "income">("expense");
  const [recCategory, setRecCategory] = useState("Żywność");
  const [recAccount, setRecAccount] = useState("Konto główne");
  const [recFrequency, setRecFrequency] = useState<"weekly" | "biweekly" | "monthly" | "quarterly" | "yearly">("monthly");
  const [recNextDate, setRecNextDate] = useState("");



  const handleAddRecurringRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recName.trim() || !recAmount || !recNextDate) {
      showToast("Proszę uzupełnić nazwę, kwotę i termin pierwszej płatności.", "error");
      return;
    }
    const newRule: RecurringRule = {
      id: `rec-rule-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: recName.trim(),
      amount: Number(recAmount),
      type: recType,
      category: recCategory,
      categoryIcon: iconByCategory[recCategory] || "✨",
      account: recAccount.trim(),
      frequency: recFrequency,
      nextDueDate: recNextDate,
      isActive: true,
      currency: activeProfile?.currency || "PLN"
    };
    onSaveRecurringRules([...recurringRules, newRule]);
    setRecName("");
    setRecAmount("");
    setRecNextDate("");
  };

  const handleDeleteRecurringRule = (id: string) => {
    onSaveRecurringRules(recurringRules.filter((r) => r.id !== id));
  };

  const handleToggleRecurringRule = (id: string) => {
    onSaveRecurringRules(
      recurringRules.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  };

  const getInitials = (name: string) => {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "SP";
  };

  // Drag-and-drop handlers for local file restoration
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith(".json")) {
      showToast("Proszę wybrać plik w formacie JSON (.json).", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed && Array.isArray(parsed.profiles)) {
          setFilePreview(parsed);
        } else {
          showToast("Plik JSON nie zawiera prawidłowej bazy danych aplikacji Saldo.", "error");
        }
      } catch (err) {
        showToast("Błąd dekodowania pliku JSON. Upewnij się, że plik nie jest uszkodzony.", "error");
      }
    };
    reader.readAsText(file);
  };

  const confirmLocalImport = () => {
    if (filePreview) {
      onImportLocalData(filePreview);
      setFilePreview(null);
    }
  };

  const [settingsTab, setSettingsTab] = useState<"all" | "profiles" | "appearance" | "accounts" | "automation" | "backup" | "security">("all");
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [showDeviceResetConfirm, setShowDeviceResetConfirm] = useState(false);
  const [isTestingLocalAi, setIsTestingLocalAi] = useState(false);

  // Cloud account deletion states
  const [showCloudDeleteModal, setShowCloudDeleteModal] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState("");
  const [deleteAccountPhrase, setDeleteAccountPhrase] = useState("");
  const [deleteAccountError, setDeleteAccountError] = useState("");
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [showDeletePwd, setShowDeletePwd] = useState(false);

  const handleLogoutOnly = async () => {
    try {
      await logout();
      window.location.reload();
    } catch (e: any) {
      showToast(e.message || "Błąd podczas wylogowywania", "error");
    }
  };

  const handleLocalDeviceReset = async () => {
    try {
      await clearState();
      Object.keys(activeKeys).forEach((k) => delete activeKeys[k]);
      await logout();
      window.location.reload();
    } catch (e: any) {
      showToast(e.message || "Błąd podczas czyszczenia danych urządzenia", "error");
    }
  };

  const handleDeleteOwnAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteAccountPhrase.trim() !== "USUŃ KONTO") {
      setDeleteAccountError('Wpisz dokładnie frazę "USUŃ KONTO", aby potwierdzić.');
      return;
    }
    if (hasPasswordProvider && !deleteAccountPassword) {
      setDeleteAccountError("Wprowadź aktualne hasło do konta.");
      return;
    }

    setDeleteAccountLoading(true);
    setDeleteAccountError("");

    try {
      await deleteOwnAccount(deleteAccountPassword);
      await clearState();
      Object.keys(activeKeys).forEach((k) => delete activeKeys[k]);
      showToast("Twoje konto i dane w chmurze zostały trwale usunięte.", "success");
      setShowCloudDeleteModal(false);
      window.location.reload();
    } catch (err: any) {
      setDeleteAccountError(err.message || "Wystąpił błąd podczas usuwania konta.");
    } finally {
      setDeleteAccountLoading(false);
    }
  };

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
                {googleUser && (
                  <span className="w-2 h-2 rounded-full bg-success"></span>
                )}
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
        <div className="bg-surface rounded-xl border border-border/70 shadow-xs p-5 sm:p-6" id="settings-profiles-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-border/40">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-main">Zarządzanie profilami budżetu</h3>
                <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                  Każdy profil posiada niezależne transakcje, limity, salda bankowe oraz cele oszczędnościowe.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-subtle text-brand border border-brand/20 shrink-0 self-start sm:self-auto">
              {profiles.length} {profiles.length === 1 ? "profil" : profiles.length < 5 ? "profile" : "profili"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5" id="profiles-grid">
            {profiles.map((p) => {
              const isActive = p.id === activeProfileId;
              const isShared = p.kind === "shared";
              const isEditing = editingProfileId === p.id;
              
              if (isEditing && editProfileData) {
                return (
                  <div key={p.id} className="col-span-1 sm:col-span-2 bg-surface rounded-2xl border border-brand/20 p-5 shadow-md ring-2 ring-brand/20">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/30">
                      <div className="flex items-center gap-2">
                        <Edit2 className="w-4 h-4 text-brand" />
                        <h4 className="text-sm font-extrabold text-text-main">Edycja profilu: {p.name}</h4>
                      </div>
                      <button onClick={cancelEditingProfile} className="text-text-muted hover:text-text-main p-1.5 rounded-xl hover:bg-surface-2 active:scale-95 transition-colors cursor-pointer" aria-label="Zamknij edycję">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <form onSubmit={handleSaveEditedProfile} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-text-main mb-1">Nazwa profilu</label>
                          <input
                            type="text"
                            value={editProfileData.name}
                            onChange={(e) => setEditProfileData(prev => prev ? { ...prev, name: e.target.value } : null)}
                            className="w-full rounded-xl border border-border p-2.5 bg-surface focus:bg-surface focus-visible:ring-2 focus-visible:ring-focus-ring text-sm font-medium"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-text-main mb-1">Ikona profilu</label>
                          <details className="group border border-border rounded-xl relative">
                            <summary className="p-2.5 text-xs font-bold text-text-muted cursor-pointer bg-surface hover:bg-surface-2 flex items-center justify-between list-none select-none rounded-xl group-open:rounded-b-none group-open:border-b group-open:border-border focus-visible:ring-2 focus-visible:ring-focus-ring">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-xl leading-none">{editProfileData.avatar}</span>
                                <span>Zmień ikonę</span>
                              </div>
                              <span className="group-open:rotate-180 transition-transform mr-2 text-text-muted">▼</span>
                            </summary>
                            <div className="p-3 border-t border-border bg-surface absolute w-full z-10 shadow-lg rounded-b-xl">
                              <div className="grid grid-cols-6 gap-2">
                                {["👤", "👨‍💻", "👩‍💻", "🏠", "💼", "💰", "💎", "🌟", "✨", "🚀", "🐶", "🐱"].map(emoji => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => {
                                      setEditProfileData(prev => prev ? { ...prev, avatar: emoji } : null);
                                      if (document.activeElement instanceof HTMLElement) {
                                        document.activeElement.blur();
                                      }
                                    }}
                                    className={`text-xl p-1.5 rounded-xl border transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-focus-ring ${editProfileData.avatar === emoji ? 'bg-brand-subtle border-brand/20 shadow-sm' : 'bg-surface border-border/30 hover:bg-surface-2 grayscale hover:grayscale-0'}`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </details>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-text-main mb-1">Rodzaj profilu</label>
                        <select
                          value={editProfileData.kind}
                          onChange={(e) => setEditProfileData(prev => prev ? { ...prev, kind: e.target.value as "personal" | "shared" } : null)}
                          className="w-full rounded-xl border border-border p-2.5 bg-surface focus:bg-surface focus-visible:ring-2 focus-visible:ring-focus-ring text-sm font-medium"
                        >
                          <option value="personal">👤 Osobisty (budżet prywatny)</option>
                          <option value="shared">👪 Wspólny (budżet domowy / z partnerem)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-text-main mb-1">Waluta bazowa</label>
                        <select
                          value={editProfileData.currency}
                          onChange={(e) => setEditProfileData(prev => prev ? { ...prev, currency: e.target.value as SupportedCurrency } : null)}
                          className="w-full rounded-xl border border-border p-2.5 bg-surface focus:bg-surface focus-visible:ring-2 focus-visible:ring-focus-ring text-sm font-medium"
                        >
                          <option value="PLN">PLN (Polski Złoty)</option>
                          <option value="EUR">EUR (Euro)</option>
                          <option value="USD">USD (Dolar amerykański)</option>
                          <option value="GBP">GBP (Funt brytyjski)</option>
                        </select>
                      </div>

                      {editProfileData.kind === "shared" && (
                        <div>
                          <label className="block text-xs font-bold text-text-main mb-1">Imię partnera/współdzielącego</label>
                          <input
                            type="text"
                            value={editProfileData.partnerName}
                            onChange={(e) => setEditProfileData(prev => prev ? { ...prev, partnerName: e.target.value } : null)}
                            className="w-full rounded-xl border border-border p-2.5 bg-surface focus:bg-surface focus-visible:ring-2 focus-visible:ring-focus-ring text-sm font-medium"
                            placeholder="np. Anna"
                            required
                            pattern=".*\S+.*"
                            title="Imię partnera nie może składać się z samych spacji"
                          />
                        </div>
                      )}
                      
                      <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
                        <button
                          type="button"
                          onClick={cancelEditingProfile}
                          className="bg-surface border border-border text-text-muted font-bold py-2.5 px-4 rounded-xl text-xs hover:bg-surface-offset active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                        >
                          Anuluj
                        </button>
                        <button
                          type="submit"
                          disabled={editProfileData.name === p.name && editProfileData.kind === p.kind && editProfileData.partnerName === (p.partnerName || "") && editProfileData.avatar === (p.avatar || "👤") && editProfileData.currency === (p.currency || "PLN")}
                          className="bg-brand-subtle text-brand border border-brand/20 hover:bg-brand-subtle font-bold py-2.5 px-6 rounded-xl text-xs active:scale-[0.98] transition-all shadow-sm disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                        >
                          Zapisz zmiany
                        </button>
                      </div>
                    </form>
                  </div>
                );
              }

              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    isActive
                      ? "bg-brand-subtle/30 border-brand/30 ring-1 ring-brand/20 shadow-xs"
                      : "bg-surface border-border/70 hover:border-brand/30 hover:bg-surface-2"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center border border-border/70 shadow-xs">
                        {p.avatar || "👤"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-bold text-text-main">{p.name}</strong>
                          {isActive && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-brand text-text-inverse px-1.5 py-0.5 rounded shadow-xs">
                              Aktywny
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-text-muted mt-0.5 block">
                          {isShared ? `Wspólny z: ${p.partnerName || "Partner"}` : "Profil osobisty"} • {p.currency || "PLN"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditingProfile(p)}
                        className="text-text-muted hover:text-text-main p-1.5 rounded-lg hover:bg-surface-2 active:scale-95 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                        title="Edytuj profil"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setProfileToDelete(p.id)}
                        disabled={profiles.length <= 1}
                        className="text-text-muted hover:text-danger p-1.5 rounded-lg hover:bg-danger-subtle active:scale-95 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                        title={profiles.length <= 1 ? "Nie możesz usunąć jedynego profilu" : "Usuń profil"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {!isActive && (
                    <button
                      onClick={() => onSelectProfile(p.id)}
                      className="w-full py-2 px-3 bg-brand hover:bg-brand-hover text-text-inverse font-bold text-xs rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs mt-1 focus-visible:ring-2 focus-visible:ring-focus-ring"
                      id={`btn-select-profile-${p.id}`}
                    >
                      <span>Otwórz ten profil</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}

            <button
              onClick={onOpenProfileModal}
              id="btn-add-profile-settings"
              className="col-span-1 sm:col-span-2 flex items-center justify-center gap-2.5 p-4 rounded-xl border border-dashed border-border/70 hover:border-brand/40 hover:bg-brand-subtle/40 text-text-main font-bold text-xs active:scale-[0.98] transition-all cursor-pointer group shadow-xs focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <div className="p-2 bg-brand-subtle text-brand rounded-lg group-hover:scale-110 transition-transform">
                <Plus className="w-4 h-4" />
              </div>
              <span> Utwórz nowy profil budżetu</span>
            </button>
          </div>
        </div>
      )}


      {/* SECTION: THEME SELECTION */}
      {(settingsTab === "all" || settingsTab === "appearance") && (
        <div className="bg-surface rounded-xl border border-border/70 shadow-xs p-5 sm:p-6" id="settings-theme-card">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/40">
            <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-main">Motyw i wygląd aplikacji</h3>
              <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                Dostosuj schemat kolorów aplikacji Saldo do swoich preferencji lub pory dnia.
              </p>
            </div>
          </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" id="theme-selectors-grid">
          {/* Light Theme Option */}
          <button
            onClick={() => onThemeChange("light")}
            className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border text-center active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs ${
              theme === "light"
                ? "bg-brand-subtle/50 border-brand/30 ring-1 ring-brand/20 shadow-xs"
                : "bg-surface border-border hover:bg-surface-2 hover:border-border"
            }`}
            id="btn-set-theme-light"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs ${theme === "light" ? "bg-brand-subtle text-brand border-brand/20" : "bg-surface-2 text-text-muted border-border"}`}>
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <strong className="block text-sm text-text-main font-bold">Jasny motyw</strong>
              <span className="text-xs text-text-muted mt-0.5 block font-medium">Klasyczny i przejrzysty</span>
            </div>
          </button>

          {/* Dark Theme Option */}
          <button
            onClick={() => onThemeChange("dark")}
            className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border text-center active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs ${
              theme === "dark"
                ? "bg-brand-subtle/50 border-brand/30 ring-1 ring-brand/20 shadow-xs"
                : "bg-surface border-border hover:bg-surface-2 hover:border-border"
            }`}
            id="btn-set-theme-dark"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs ${theme === "dark" ? "bg-brand-subtle text-brand border-brand/20" : "bg-surface-2 text-text-muted border-border"}`}>
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <strong className="block text-sm text-text-main font-bold">Ciemny motyw</strong>
              <span className="text-xs text-text-muted mt-0.5 block font-medium">Komfortowy dla wzroku</span>
            </div>
          </button>

          {/* Auto Theme Option */}
          <button
            onClick={() => onThemeChange("auto")}
            className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border text-center active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs ${
              theme === "auto"
                ? "bg-brand-subtle/50 border-brand/30 ring-1 ring-brand/20 shadow-xs"
                : "bg-surface border-border hover:bg-surface-2 hover:border-border"
            }`}
            id="btn-set-theme-auto"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs ${theme === "auto" ? "bg-brand-subtle text-brand border-brand/20" : "bg-surface-2 text-text-muted border-border"}`}>
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <strong className="block text-sm text-text-main font-bold">Automatyczny</strong>
              <span className="text-xs text-text-muted mt-0.5 block font-medium">Zależny od pory dnia</span>
            </div>
          </button>
        </div>
      </div>
      )}

      {/* SECTION 2: PIN SECURITY */}
      {activeProfile && (settingsTab === "all" || settingsTab === "profiles" || settingsTab === "security") && (
        <div className="bg-surface rounded-xl border border-border/70 shadow-xs p-5 sm:p-6" id="settings-pin-card">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/40">
            <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-main">Zabezpieczenie aktywnego profilu (PIN)</h3>
              <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                Dodaj kod PIN, aby zabezpieczyć swoje transakcje i budżet przed nieautoryzowanym wglądem.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface-2/60 border border-border/70">
            <div>
              <span className="text-xs font-bold text-text-main flex items-center gap-1.5">
                {activeProfile.pinHash ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-brand" />
                    <span>Twój profil jest obecnie chroniony kodem PIN</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-text-muted" />
                    <span>Profil nie posiada zabezpieczenia PIN</span>
                  </>
                )}
              </span>
              <p className="text-xs text-text-muted mt-0.5">
                Każdorazowe otwarcie profilu będzie wymagać wpisania poprawnego kodu.
              </p>
            </div>
            <button
              onClick={onOpenPinModal}
              className="bg-surface border border-border/70 text-brand hover:bg-brand-subtle hover:border-brand/20 font-bold py-2 px-4 rounded-xl text-xs active:scale-[0.98] transition-all shadow-xs shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
              id="btn-set-profile-pin"
            >
              {activeProfile.pinHash ? "Zmień kod PIN" : "Ustaw kod PIN"}
            </button>
          </div>
        </div>
      )}

      {/* SECTION 3: GOOGLE DRIVE CLOUD INTEGRATION */}
      {(settingsTab === "all" || settingsTab === "backup") && (
        <div className="bg-surface rounded-xl border border-border/70 shadow-xs p-5 sm:p-6" id="settings-google-drive-card">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/40">
            <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-main">Kopia zapasowa w chmurze (Dysk Google)</h3>
              <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                Bezpieczna archiwizacja pliku bazy danych budżetu (<code className="bg-surface-2 px-1 py-0.5 rounded border border-border/70 text-text-main font-mono text-xs">saldo_budget.json</code>) na Twoim prywatnym Dysku. Gwarantuje to pełną kontrolę nad danymi i ochronę przed ich utratą po wyczyszczeniu przeglądarki.
              </p>
            </div>
          </div>

        {googleError && (
          <div className="mb-5 p-4 bg-danger-subtle border border-danger/20 rounded-xl text-danger text-xs space-y-2" id="gdrive-auth-error-notice">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <div className="font-bold text-danger">Błąd połączenia z kontem Google</div>
            </div>
            {googleError === "auth/popup-closed-by-user" ? (
              <div className="leading-relaxed text-text-muted pl-6 space-y-2">
                <p>
                  <strong>Okno logowania zostało zamknięte</strong> przed ukończeniem autoryzacji.
                </p>
                <p>
                  Jeśli korzystasz z aplikacji wewnątrz ramki podglądu (iframe) w AI Studio, przeglądarka mogła automatycznie zablokować wyskakujące okienko (pop-up) lub zablokować dostęp do plików cookies firm trzecich.
                </p>
                <p className="font-bold text-brand flex items-center gap-1.5">
                  <Info className="w-4 h-4" /> Aby rozwiązać ten problem:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Kliknij przycisk <strong>"Otwórz w nowej karcie"</strong> w prawym górnym rogu podglądu, aby otworzyć aplikację poza ramką iframe.</li>
                  <li>Upewnij się, że zezwalasz na wyskakujące okienka (pop-ups) w ustawieniach przeglądarki dla tej domeny.</li>
                </ul>
              </div>
            ) : (
              <div className="leading-relaxed text-text-muted pl-6 space-y-2">
                <p>
                  Szczegóły błędu: <code className="bg-danger-subtle border border-danger/20 text-danger px-1 py-0.5 rounded font-mono text-xs">{googleError}</code>.
                </p>
                {googleError?.includes('unauthorized-domain') || googleError?.includes('nie jest autoryzowana') ? (
                  <div className="bg-warning-subtle p-3 rounded-xl border border-warning/20 mt-2">
                    <p className="font-bold text-warning mb-1 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Wymagana konfiguracja w Firebase</p>
                    <p className="text-warning text-xs">
                      Aktualna domena nie jest dodana do autoryzowanych domen w Twoim projekcie Firebase.
                      Aby to naprawić:
                    </p>
                    <ol className="list-decimal pl-5 mt-1 space-y-1 text-warning text-xs font-medium">
                      <li>Wejdź na stronę <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="underline hover:text-warning">console.firebase.google.com</a></li>
                      <li>Wybierz swój projekt</li>
                      <li>Przejdź do <strong>Authentication</strong> &gt; <strong>Settings</strong> (Ustawienia) &gt; <strong>Authorized domains</strong> (Autoryzowane domeny)</li>
                      <li>Dodaj domenę: <code className="bg-warning-subtle border border-warning/20 text-text-main px-1 rounded select-all">{window.location.hostname}</code></li>
                    </ol>
                  </div>
                ) : (
                  <p>Zalecamy otwarcie aplikacji w nowej karcie podglądu, aby uniknąć ograniczeń związanych z ramką (iframe).</p>
                )}
              </div>
            )}
          </div>
        )}

        {!googleUser ? (
          <div className="bg-surface border border-border/70 rounded-xl p-6 text-center space-y-4 shadow-xs">
            <p className="text-xs text-text-muted max-w-md mx-auto">
              Aplikacja Saldo nie posiada centralnej bazy danych do przechowywania Twoich finansów. Podłączenie Dysku Google utworzy bezpieczny plik, z którego możesz korzystać na każdym urządzeniu.
            </p>
            <button
              onClick={onConnectGoogle}
              disabled={isGoogleLoading}
              className="inline-flex items-center gap-2 bg-brand text-text-inverse border border-brand hover:bg-brand-hover font-bold py-3 px-6 rounded-xl text-xs active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 cursor-pointer shadow-md focus-visible:ring-2 focus-visible:ring-focus-ring"
              id="btn-google-drive-connect"
            >
              {isGoogleLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.41 0-6.173-2.763-6.173-6.174 0-3.41 2.763-6.173 6.173-6.173 1.48 0 2.83.52 3.9 1.383l3.153-3.152C18.99 1.943 15.82 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c5.786 0 10.74-4.14 10.74-11.24 0-.648-.06-1.285-.16-1.955H12.24z"/>
                </svg>
              )}
              <span>Połącz z kontem Google Drive</span>
            </button>
            <details className="group mt-4 border border-border rounded-xl bg-surface overflow-hidden text-left max-w-md mx-auto shadow-xs">
              <summary className="p-3 text-xs font-bold text-text-muted cursor-pointer hover:bg-surface-2 flex justify-between items-center list-none select-none">
                <span className="flex items-center gap-1.5"><Info className="w-3.5 h-3.5 text-text-muted shrink-0" /> Dlaczego potrzebujemy dostępu do Dysku Google?</span>
                <ChevronDown className="w-4 h-4 text-text-muted group-open:rotate-180 transition-transform shrink-0" />
              </summary>
              <div className="p-4 border-t border-border/30 text-xs text-text-muted space-y-3 leading-relaxed">
                <p>
                  Aplikacja Saldo działa w modelu <strong className="text-text-main">Local-First</strong> (dane są na Twoim urządzeniu). 
                  Aby zapewnić Ci kopię zapasową oraz możliwość synchronizacji między urządzeniami (np. telefonem a komputerem), 
                  oferujemy zapis do prywatnego, ukrytego pliku na Twoim koncie Google Drive.
                </p>
                <div className="bg-brand-subtle p-3 rounded-xl border border-brand/20">
                  <span className="font-bold text-brand block mb-1">Pełna prywatność:</span>
                  Aplikacja prosi wyłącznie o dostęp typu <code className="bg-surface px-1 py-0.5 rounded border border-border text-brand text-xs">drive.file</code>.
                  Oznacza to, że ma dostęp <strong>tylko i wyłącznie</strong> do plików, które sama utworzyła. Nie mamy dostępu do Twoich prywatnych zdjęć ani dokumentów!
                </div>
              </div>
            </details>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-brand-subtle border border-brand/20 rounded-xl gap-4 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                {googleUser.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    referrerPolicy="no-referrer"
                    alt={googleUser.displayName || "Google User"}
                    className="w-10 h-10 rounded-full border border-brand/20"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-brand-subtle text-brand flex items-center justify-center font-bold text-sm">
                    {getInitials(googleUser.displayName || googleUser.email || "G")}
                  </div>
                )}
                <div>
                  <span className="text-xs font-black text-text-main flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-brand" />
                    Zalogowano jako: {googleUser.displayName || "Użytkownik Google"}
                  </span>
                  <p className="text-xs text-text-muted font-medium">{googleUser.email}</p>
                </div>
              </div>
              <button
                onClick={onDisconnectGoogle}
                className="text-xs font-bold text-text-muted hover:text-danger hover:bg-danger-subtle p-2 rounded-xl active:scale-95 transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring shrink-0"
                id="btn-google-drive-disconnect"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Odłącz konto</span>
              </button>
            </div>

            {/* Backups Action Stats */}
            <div className="p-4 bg-surface rounded-xl border border-border grid grid-cols-1 md:grid-cols-2 gap-4 shadow-xs">
              <div>
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">Nazwa pliku na dysku</span>
                <span className="text-xs font-bold text-text-main font-mono block mt-0.5">saldo_budget.json</span>
                <span className="text-xs text-text-muted flex items-center gap-1.5 mt-1">
                  Status:
                  {gdriveFileId ? (
                    <span className="inline-flex items-center gap-1 text-brand font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand" /> Plik istnieje
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-text-faint font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-text-muted" /> Plik zostanie utworzony przy pierwszym zapisie
                    </span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">Ostatni zapis w chmurze</span>
                <span className="text-xs font-bold text-text-main block mt-0.5 tabular-nums">
                  {gdriveLastSynced || "Brak wykonanego zapisu"}
                </span>
                <span className="text-xs text-text-muted block mt-1">Dostępny do wczytania</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={onSyncToDrive}
                disabled={isDriveActionLoading}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-brand text-text-inverse border border-brand hover:bg-brand-hover font-bold py-2.5 px-4 rounded-xl text-xs active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 cursor-pointer shadow-sm focus-visible:ring-2 focus-visible:ring-focus-ring"
                id="btn-google-drive-upload"
              >
                {isDriveActionLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CloudUpload className="w-3.5 h-3.5" />
                )}
                <span>Zapisz teraz kopie na Dysk</span>
              </button>
              <button
                onClick={onLoadFromDrive}
                disabled={isDriveActionLoading || !gdriveFileId}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-surface border border-border text-text-main hover:bg-surface-2 hover:border-brand/20 hover:text-brand active:scale-[0.98] transition-all disabled:opacity-40 disabled:active:scale-100 disabled:hover:border-border disabled:hover:text-text-main py-2.5 px-4 rounded-xl text-xs font-bold cursor-pointer shadow-sm focus-visible:ring-2 focus-visible:ring-focus-ring"
                id="btn-google-drive-download"
              >
                {isDriveActionLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CloudDownload className="w-3.5 h-3.5" />
                )}
                <span>Wczytaj kopie z Dysku Google</span>
              </button>
            </div>

            {/* AutoSync Switch toggle */}
            <div className="flex items-center justify-between p-4 bg-surface/50 border border-border rounded-xl">
              <div className="pr-4">
                <strong className="text-xs font-bold text-text-main flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-brand animate-pulse" />
                  Automatyczny zapis (Auto-Sync)
                </strong>
                <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                  Każda zmiana w transakcjach lub celach będzie automatycznie zapisywana na Twoim Dysku Google.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none focus-within:ring-2 focus-within:ring-focus-ring rounded-full">
                <input
                  type="checkbox"
                  checked={isDriveAutoSyncEnabled}
                  onChange={(e) => onToggleDriveAutoSync(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-offset rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-focus-ring"></div>
              </label>
            </div>
            <p className="text-xs text-text-muted italic text-center">
              Uwaga: Ze względów bezpieczeństwa tokeny Google Drive są przechowywane wyłącznie w pamięci RAM. Po odświeżeniu aplikacji wystarczy kliknąć przycisk autoryzacji ponownie.
            </p>
          </div>
        )}
      </div>
      )}


      {/* SECTION: BANK ACCOUNTS */}
      {activeProfile && (settingsTab === "all" || settingsTab === "accounts") && (
        <BankAccountsManager accounts={activeProfile.accounts || []} onSaveAccounts={onSaveAccounts} currency={activeProfile?.currency || 'PLN'} />
      )}
      {/* SECTION: AUTOMATED CATEGORY RULES */}
      {(settingsTab === "all" || settingsTab === "automation") && (
      <TransactionRulesManager transactionRules={transactionRules} onSaveTransactionRules={onSaveTransactionRules} />
      )}

      {/* SECTION: LOCAL AI (Ollama) */}
      {(settingsTab === "all" || settingsTab === "automation") && (
        <div className="bg-surface rounded-2xl border border-border/70 shadow-xs p-5 sm:p-6" id="settings-local-ai-card">
          <div className="flex items-start sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-border/60">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0">
                <Cpu className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-text-main tracking-tight truncate">
                    Lokalne AI (Ollama)
                  </h3>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    state.aiMode === "local" 
                      ? "bg-brand-subtle text-brand border-brand/20" 
                      : "bg-surface-2 text-text-muted border-border"
                  }`}>
                    {state.aiMode === "local" ? "Aktywne" : "Wyłączone"}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  Prywatne rozpoznawanie transakcji i kategoryzacja bez wysyłania danych do chmury
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={state.aiMode === "local"}
              onClick={() =>
                saveState({
                  ...state,
                  aiMode: state.aiMode === "local" ? "none" : "local",
                  localAiEndpoint: state.localAiEndpoint || DEFAULT_LOCAL_AI_ENDPOINT,
                  localAiModel: state.localAiModel || DEFAULT_LOCAL_AI_MODEL
                })
              }
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring ${
                state.aiMode === "local" ? "bg-brand" : "bg-surface-2 border border-border"
              }`}
              id="toggle-local-ai"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  state.aiMode === "local" ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-text-muted mb-4 leading-relaxed">
            Sugestie kategorii dla nierozpoznanych transakcji i rozpoznawanie wklejonego tekstu wyciągu przez model
            uruchomiony na Twoim komputerze (Ollama). Nic nie opuszcza urządzenia — przeglądarka łączy się
            bezpośrednio z <code className="bg-surface-2 px-1.5 py-0.5 rounded border border-border text-brand font-mono text-[11px]">localhost</code>.
            Wynik zawsze trafia do podglądu przed importem — nic nie zapisuje się automatycznie.
          </p>

          <div className="mb-4 rounded-xl border border-border/70 bg-surface-2/50 p-3">
            <div className="mb-2 text-xs font-bold text-text-main">Tryb modułu AI</div>
            <div className="flex flex-wrap gap-2">
              {([
                ["none", "Wyłączone"],
                ["local", "Lokalne (Ollama)"],
                ["cloud", "Chmurowe (Gemini)"]
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  disabled={mode === "cloud" && !googleUser}
                  onClick={() => saveState({
                    ...state,
                    aiMode: mode,
                    ...(mode === "local"
                      ? {
                          localAiEndpoint: state.localAiEndpoint || DEFAULT_LOCAL_AI_ENDPOINT,
                          localAiModel: state.localAiModel || DEFAULT_LOCAL_AI_MODEL
                        }
                      : {})
                  })}
                  className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                    state.aiMode === mode
                      ? "border-brand/30 bg-brand-subtle text-brand"
                      : "border-border bg-surface text-text-muted hover:bg-surface-2"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {label}
                </button>
              ))}
            </div>
            {!googleUser && <p className="mt-2 text-[11px] text-text-muted">Tryb chmurowy wymaga zalogowania przez Google.</p>}
          </div>

          {isLocalAiLikelyUnsupported() && (
            <div className="mb-4 p-3.5 bg-warning-subtle border border-warning/20 rounded-xl flex items-start gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <p className="text-text-main">
                Safari blokuje połączenia do <code className="bg-surface px-1 py-0.5 rounded border border-border">localhost</code> ze
                stron HTTPS (znany błąd WebKit). Użyj Chrome lub Firefox, aby korzystać z lokalnego AI w tej aplikacji.
              </p>
            </div>
          )}

          {state.aiMode === "local" && (
            <div className="p-4 bg-brand-subtle border border-brand/20 rounded-xl space-y-3 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-main" htmlFor="input-local-ai-endpoint">
                    Endpoint
                  </label>
                  <input
                    id="input-local-ai-endpoint"
                    type="text"
                    value={state.localAiEndpoint || DEFAULT_LOCAL_AI_ENDPOINT}
                    onChange={(e) => saveState({ ...state, localAiEndpoint: e.target.value })}
                    placeholder={DEFAULT_LOCAL_AI_ENDPOINT}
                    className="w-full bg-surface border border-border rounded-xl p-2.5 text-xs text-text-main font-mono focus-visible:ring-2 focus-visible:ring-focus-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-main" htmlFor="input-local-ai-model">
                    Model
                  </label>
                  <input
                    id="input-local-ai-model"
                    type="text"
                    value={state.localAiModel || DEFAULT_LOCAL_AI_MODEL}
                    onChange={(e) => saveState({ ...state, localAiModel: e.target.value })}
                    placeholder={DEFAULT_LOCAL_AI_MODEL}
                    className="w-full bg-surface border border-border rounded-xl p-2.5 text-xs text-text-main font-mono focus-visible:ring-2 focus-visible:ring-focus-ring"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={isTestingLocalAi}
                onClick={async () => {
                  setIsTestingLocalAi(true);
                  try {
                    const result = await checkLocalAiHealth(resolveLocalAiConfig(state));
                    if (result.ok) {
                      showToast("Połączenie udane! Lokalny model odpowiada prawidłowo.", "success");
                    } else {
                      showToast(result.reason || "Nie udało się połączyć z lokalnym AI.", "error");
                    }
                  } finally {
                    setIsTestingLocalAi(false);
                  }
                }}
                className="px-3 py-2 bg-brand hover:bg-brand-hover text-text-inverse text-xs font-bold rounded-xl active:scale-[0.98] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-focus-ring"
                id="btn-test-local-ai"
              >
                {isTestingLocalAi ? "Testowanie..." : "Testuj połączenie"}
              </button>

              <p className="text-xs text-text-muted leading-relaxed">
                Wymaga zainstalowanej i uruchomionej <a href="https://ollama.com/" target="_blank" rel="noopener noreferrer" className="text-brand underline font-medium">Ollama</a> z
                pobranym modelem: <code className="bg-surface-2 px-1 py-0.5 rounded border border-border text-brand">ollama pull {state.localAiModel || DEFAULT_LOCAL_AI_MODEL}</code>.
                Ze względów bezpieczeństwa dozwolone są wyłącznie adresy lokalne.
              </p>
            </div>
          )}
        </div>
      )}

      {/* SECTION: RECURRING TRANSACTIONS SCHEDULER */}
      {(settingsTab === "all" || settingsTab === "automation") && (
        <div className="bg-surface rounded-2xl border border-border/70 shadow-xs p-5 sm:p-6" id="settings-recurring-rules-card">
          <div className="flex items-start sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-border/60">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-text-main tracking-tight truncate">
                    Automatyczne transakcje cykliczne
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-2 text-text-muted border border-border">
                    {recurringRules.length}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  Automatyczne rejestrowanie stałych wpływów (np. pensja) oraz opłat abonamentowych
                </p>
              </div>
            </div>
          </div>

        <form onSubmit={handleAddRecurringRule} className="p-4 rounded-xl bg-surface-2/60 border border-border/80 space-y-3 mb-5 shadow-xs">
          <strong className="block text-xs font-bold text-text-muted">Utwórz nową transakcję cykliczną</strong>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">Nazwa transakcji</label>
              <input
                type="text"
                value={recName}
                onChange={(e) => setRecName(e.target.value)}
                placeholder="np. Abonament Netflix, Pensja"
                className="w-full bg-surface text-xs rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">Kwota ({activeProfile?.currency || "PLN"})</label>
              <input
                type="number"
                step="0.01"
                value={recAmount}
                onChange={(e) => setRecAmount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="np. 43.99"
                className="w-full bg-surface text-xs rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">Typ</label>
              <select
                value={recType}
                onChange={(e) => setRecType(e.target.value as "expense" | "income")}
                className="w-full bg-surface text-xs rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs"
              >
                <option value="expense">Wydatek (Koszt)</option>
                <option value="income">Przychód (Wpływ)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">Kategoria</label>
              <select
                value={recCategory}
                onChange={(e) => setRecCategory(e.target.value)}
                className="w-full bg-surface text-xs rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs"
              >
                {expenseCategories.concat(incomeCategories).filter((v, i, a) => a.indexOf(v) === i).map((cat) => (
                  <option key={cat} value={cat}>
                    {iconByCategory[cat] || "✨"} {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">Konto / Portfel</label>
              <input
                type="text"
                value={recAccount}
                onChange={(e) => setRecAccount(e.target.value)}
                placeholder="np. Konto główne"
                className="w-full bg-surface text-xs rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">Częstotliwość</label>
              <select
                value={recFrequency}
                onChange={(e) => setRecFrequency(e.target.value as any)}
                className="w-full bg-surface text-xs rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs"
              >
                <option value="weekly">Co tydzień</option>
                <option value="biweekly">Co dwa tygodnie</option>
                <option value="monthly">Co miesiąc</option>
                <option value="quarterly">Co kwartał</option>
                <option value="yearly">Co rok</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">Pierwszy termin płatności</label>
              <input
                type="date"
                value={recNextDate}
                onChange={(e) => setRecNextDate(e.target.value)}
                className="w-full bg-surface text-xs rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums shadow-xs"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-brand text-text-inverse hover:bg-brand-hover font-bold py-2.5 px-6 rounded-xl text-xs active:scale-[0.98] transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              ＋ Dodaj harmonogram płatności
            </button>
          </div>
        </form>

        {recurringRules.length === 0 ? (
          <div className="p-8 bg-bg-base/30 rounded-xl border border-dashed border-border text-center">
            <p className="text-xs text-text-main font-bold">Brak zdefiniowanych transakcji cyklicznych</p>
            <p className="text-[11px] text-text-faint mt-0.5">Dodaj stałe koszty lub wpływy (np. abonamenty, pensję), by automatyzować budżet.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead>
                  <tr className="bg-surface-2 border-b border-border text-text-muted font-bold">
                    <th className="py-2.5 px-3">Nazwa / Kategoria</th>
                    <th className="py-2.5 px-3">Częstotliwość</th>
                    <th className="py-2.5 px-3">Najbliższy termin</th>
                    <th className="py-2.5 px-3">Konto</th>
                    <th className="py-2.5 px-3 text-right">Kwota</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Akcja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {recurringRules.map((r) => {
                    const freqLabels = {
                      weekly: "Co tydzień",
                      biweekly: "Co 2 tygodnie",
                      monthly: "Co miesiąc",
                      quarterly: "Co kwartał",
                      yearly: "Co rok"
                    };
                    return (
                      <tr key={r.id} className={`hover:bg-surface-2/50 transition ${!r.isActive ? "opacity-60" : ""}`}>
                        <td className="py-2.5 px-3">
                          <strong className="block text-text-main">{r.name}</strong>
                          <span className="text-xs text-text-muted font-medium">
                            {r.categoryIcon} {r.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-text-muted">
                          {freqLabels[r.frequency] || r.frequency}
                        </td>
                        <td className="py-2.5 px-3 text-text-muted tabular-nums">
                          {r.nextDueDate}
                        </td>
                        <td className="py-2.5 px-3 text-text-muted">
                          {r.account}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-black tabular-nums ${r.type === "income" ? "text-brand" : "text-danger"}`}>
                          {r.type === "income" ? "+" : "-"} {r.amount.toFixed(2)} {activeProfile?.currency || "PLN"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleRecurringRule(r.id)}
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-extrabold cursor-pointer border active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs ${
                              r.isActive
                                ? "bg-brand-subtle border-brand/20 text-brand"
                                : "bg-surface-2 border-border text-text-muted"
                            }`}
                          >
                            {r.isActive ? "Aktywny" : "Wstrzymany"}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteRecurringRule(r.id)}
                            aria-label={`Usuń regułę cykliczną ${r.name}`}
                            className="text-text-muted hover:text-danger hover:bg-danger-subtle p-1.5 rounded-xl active:scale-95 transition-colors cursor-pointer inline-flex items-center justify-center focus-visible:ring-2 focus-visible:ring-focus-ring"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      )}

      {/* SECTION 4: SYNC & SECURITY */}
      {(settingsTab === "all" || settingsTab === "security" || settingsTab === "backup") && (
        <div className="bg-surface rounded-2xl border border-border/70 shadow-xs p-5 sm:p-6" id="settings-sync-security-card">
          <div className="flex items-start sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-border/60">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-text-main tracking-tight truncate">
                  Synchronizacja i bezpieczeństwo
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Stan integracji chmurowych, autoryzacja konta i zabezpieczenia sesji
                </p>
              </div>
            </div>
          </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Account & Firestore */}
          <div className="space-y-4">
            <div className="bg-surface rounded-xl p-4 border border-border/30">
              <div className="flex items-start gap-3">
                <Cloud className="w-5 h-5 text-text-muted shrink-0" />
                <div className="w-full">
                  <h4 className="text-sm font-bold text-text-main">Konto chmurowe</h4>
                  {googleUser ? (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-brand-subtle text-brand">
                        <CheckCircle className="w-3 h-3" /> Zalogowano
                      </span>
                      <p className="text-xs text-text-muted mt-1 truncate">{googleUser.email}</p>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-surface-2 text-text-muted">
                        Tryb lokalny
                      </span>
                    </div>
                  )}
                  
                  <div className="mt-3 pt-3 border-t border-border">
                    <h5 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Baza danych (Firestore)</h5>
                    {isFirebaseConfigured ? (
                      googleUser ? (
                        <span className="text-xs font-medium text-brand">Aktywna (Synchronizacja w czasie rzeczywistym)</span>
                      ) : (
                        <span className="text-xs font-medium text-warning">Gotowa (Wymaga logowania)</span>
                      )
                    ) : (
                      <span className="text-xs font-medium text-text-muted">Brak konfiguracji</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Integrations & Security */}
          <div className="space-y-4">
            <div className="bg-surface rounded-xl p-4 border border-border/30">
              <div className="flex items-start gap-3">
                <Database className="w-5 h-5 text-text-muted shrink-0" />
                <div className="w-full">
                  <h4 className="text-sm font-bold text-text-main">Google Drive</h4>
                  <div className="mt-1 flex items-center justify-between">
                    {gdriveFileId ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-brand-subtle text-brand">
                        <CheckCircle className="w-3 h-3" /> Połączony
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-surface-2 text-text-muted">
                        Niepołączony
                      </span>
                    )}
                    
                    {!gdriveFileId && (
                      <button
                        onClick={onConnectGoogle}
                        disabled={isDriveActionLoading}
                        className="text-xs font-bold text-brand hover:underline disabled:opacity-50 active:scale-95 transition-transform rounded focus-visible:ring-2 focus-visible:ring-focus-ring"
                      >
                        Połącz Dysk Google
                      </button>
                    )}
                  </div>
                  
                  {gdriveFileId && (
                    <div className="mt-2 flex justify-between items-center">
                      <p className="text-xs text-text-muted">
                        Ostatnia kopia: {gdriveLastSynced ? new Date(gdriveLastSynced).toLocaleString("pl-PL") : "Brak danych o ostatniej synchronizacji"}
                      </p>
                      <button
                        onClick={onSyncToDrive}
                        disabled={isDriveActionLoading}
                        className="text-xs font-bold text-brand hover:underline disabled:opacity-50 active:scale-95 transition-transform rounded focus-visible:ring-2 focus-visible:ring-focus-ring"
                      >
                        Wykonaj kopię teraz
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-xl p-4 border border-border/30">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-text-muted shrink-0" />
                <div className="w-full">
                  <h4 className="text-sm font-bold text-text-main">Google Calendar</h4>
                  <div className="mt-1 flex items-center justify-between">
                    {calendarToken ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-brand-subtle text-brand">
                        <CheckCircle className="w-3 h-3" /> Połączony
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-surface-2 text-text-muted">
                        Niepołączony
                      </span>
                    )}
                    
                    {!calendarToken && onConnectCalendar && (
                      <button
                        onClick={onConnectCalendar}
                        className="text-xs font-bold text-brand hover:underline active:scale-95 transition-transform rounded focus-visible:ring-2 focus-visible:ring-focus-ring"
                      >
                        Połącz Kalendarz Google
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-xl p-4 border border-border/30">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-text-muted shrink-0" />
                <div className="w-full">
                  <h4 className="text-sm font-bold text-text-main">Zabezpieczenie profilu (PIN)</h4>
                  <div className="mt-1 flex justify-between items-center">
                    {activeProfile?.pinHash ? (
                      <>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-brand-subtle text-brand">
                          Aktywne
                        </span>
                        {unlockedProfileId !== activeProfile.id ? (
                          <span className="text-xs font-bold text-warning flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Zablokowany
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-brand flex items-center gap-1">
                            Odblokowany
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-surface-2 text-text-muted">
                        Nieaktywne
                      </span>
                    )}
                    
                    {activeProfile?.pinHash && unlockedProfileId !== activeProfile.id && (
                      <button
                        onClick={onOpenPinModal}
                        className="text-xs font-bold text-brand hover:underline active:scale-95 transition-transform rounded focus-visible:ring-2 focus-visible:ring-focus-ring"
                      >
                        Odblokuj profil
                      </button>
                    )}
                  </div>

                  {/* Auto-lock selector — only visible when PIN is active */}
                  {activeProfile?.pinHash && (
                    <div className="mt-3 pt-3 border-t border-border/30">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-text-muted">Auto-lock po bezczynności</span>
                        <select
                          value={state.autoLockMinutes !== undefined ? state.autoLockMinutes : 5}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            saveState({ ...state, autoLockMinutes: val });
                          }}
                          className="text-xs font-bold bg-surface border border-border rounded-lg px-2 py-1.5 text-text-main cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                          id="select-auto-lock-timeout"
                        >
                          <option value={1}>1 min</option>
                          <option value={5}>5 min</option>
                          <option value={15}>15 min</option>
                          <option value={30}>30 min</option>
                          <option value={0}>Nigdy</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Zmiana adresu email */}
            <div className="bg-surface rounded-xl p-4 border border-border/30">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-text-muted shrink-0" />
                <div className="w-full">
                  <h4 className="text-sm font-bold text-text-main">Zmiana adresu email</h4>
                  
                  {googleUser && !hasPasswordProvider ? (
                    <div className="mt-2 p-3 bg-surface-2 rounded-lg border border-border/50">
                      <p className="text-xs text-text-muted">
                        Twoje konto jest połączone wyłącznie przez Google. Adresem email zarządzasz bezpośrednio na koncie Google.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleEmailChangeSubmit} className="mt-3 space-y-3">
                      <p className="text-xs text-text-muted mb-3">Zmień powiązany adres email dla tego konta.</p>
                      
                      {emailSuccess && (
                        <div className="p-3 bg-success-subtle text-success border border-success/20 rounded-lg text-xs font-bold flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 shrink-0" />
                          {emailSuccess}
                        </div>
                      )}
                      
                      {emailError && (
                        <div className="p-3 bg-danger-subtle text-danger border border-danger/20 rounded-lg text-xs font-bold flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          {emailError}
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="relative">
                          <input
                            type={showEmailPwd ? "text" : "password"}
                            required
                            placeholder="Obecne hasło"
                            value={emailCurrentPwd}
                            onChange={(e) => setEmailCurrentPwd(e.target.value)}
                            disabled={emailLoading}
                            className="w-full text-xs rounded-xl border border-border p-2.5 pr-10 bg-surface focus-visible:ring-2 focus-visible:ring-focus-ring"
                          />
                          <button
                            type="button"
                            onClick={() => setShowEmailPwd(!showEmailPwd)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
                          >
                            {showEmailPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        
                        <div className="relative">
                          <input
                            type="email"
                            required
                            placeholder="Nowy adres email"
                            value={emailNew}
                            onChange={(e) => setEmailNew(e.target.value)}
                            disabled={emailLoading}
                            className="w-full text-xs rounded-xl border border-border p-2.5 bg-surface focus-visible:ring-2 focus-visible:ring-focus-ring"
                          />
                        </div>
                        
                        <div className="relative">
                          <input
                            type="email"
                            required
                            placeholder="Potwierdź nowy adres email"
                            value={emailConfirm}
                            onChange={(e) => setEmailConfirm(e.target.value)}
                            disabled={emailLoading}
                            className="w-full text-xs rounded-xl border border-border p-2.5 bg-surface focus-visible:ring-2 focus-visible:ring-focus-ring"
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          disabled={emailLoading || !emailCurrentPwd || !emailNew || !emailConfirm || emailNew !== emailConfirm}
                          className="bg-brand text-text-inverse px-4 py-2 rounded-xl text-xs font-bold hover:bg-brand-hover active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs"
                        >
                          {emailLoading ? "Wysyłanie linku..." : "Zmień adres email"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>

            {/* Zmiana hasła konta */}
            <div className="bg-surface rounded-xl p-4 border border-border/30">
              <div className="flex items-start gap-3">
                <KeyRound className="w-5 h-5 text-text-muted shrink-0" />
                <div className="w-full">
                  <h4 className="text-sm font-bold text-text-main">Zmiana hasła konta</h4>
                  
                  {googleUser && !hasPasswordProvider ? (
                    <div className="mt-2 p-3 bg-surface-2 rounded-lg border border-border/50">
                      <p className="text-xs text-text-muted">
                        Twoje konto jest połączone wyłącznie przez Google. Hasłem zarządzasz bezpośrednio na koncie Google.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handlePasswordChangeSubmit} className="mt-3 space-y-3">
                      <p className="text-xs text-text-muted mb-3">Zmień hasło dostępowe do konta (email/hasło).</p>
                      
                      {pwdSuccess && (
                        <div className="p-3 bg-success-subtle text-success border border-success/20 rounded-lg text-xs font-bold flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 shrink-0" />
                          {pwdSuccess}
                        </div>
                      )}
                      
                      {pwdError && (
                        <div className="p-3 bg-danger-subtle text-danger border border-danger/20 rounded-lg text-xs font-bold flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          {pwdError}
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="relative">
                          <input
                            type={showPwds ? "text" : "password"}
                            required
                            placeholder="Obecne hasło"
                            value={pwdCurrent}
                            onChange={(e) => setPwdCurrent(e.target.value)}
                            disabled={pwdLoading}
                            className="w-full text-xs rounded-xl border border-border p-2.5 pr-10 bg-surface focus-visible:ring-2 focus-visible:ring-focus-ring"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPwds(!showPwds)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
                          >
                            {showPwds ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        
                        <div className="relative">
                          <input
                            type={showPwds ? "text" : "password"}
                            required
                            placeholder="Nowe hasło"
                            value={pwdNew}
                            onChange={(e) => setPwdNew(e.target.value)}
                            disabled={pwdLoading}
                            className="w-full text-xs rounded-xl border border-border p-2.5 pr-10 bg-surface focus-visible:ring-2 focus-visible:ring-focus-ring"
                          />
                        </div>
                        
                        {pwdNew.length > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${getPasswordStrength(pwdNew).color}`}
                                style={{ width: `${(getPasswordStrength(pwdNew).level / 3) * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-text-muted min-w-[120px] text-right">
                              {getPasswordStrength(pwdNew).label}
                            </span>
                          </div>
                        )}
                        
                        <div className="relative">
                          <input
                            type={showPwds ? "text" : "password"}
                            required
                            placeholder="Potwierdź nowe hasło"
                            value={pwdConfirm}
                            onChange={(e) => setPwdConfirm(e.target.value)}
                            disabled={pwdLoading}
                            className="w-full text-xs rounded-xl border border-border p-2.5 pr-10 bg-surface focus-visible:ring-2 focus-visible:ring-focus-ring"
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          disabled={pwdLoading || !pwdCurrent || !pwdNew || !pwdConfirm || pwdNew !== pwdConfirm || getPasswordStrength(pwdNew).level < 3}
                          className="bg-brand text-text-inverse px-4 py-2 rounded-xl text-xs font-bold hover:bg-brand-hover active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs"
                        >
                          {pwdLoading ? "Aktualizowanie..." : "Zmień hasło"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* SECTION 5: LOCAL FILES & RESET */}
      {(settingsTab === "all" || settingsTab === "backup") && (
        <div className="bg-surface rounded-2xl border border-border/70 shadow-xs p-5 sm:p-6" id="settings-local-tools-card">
          <div className="flex items-start sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-border/60">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0">
                <FileJson className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-text-main tracking-tight truncate">
                  Lokalna kopia zapasowa i reset
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Eksport bazy danych, import z pliku JSON oraz generowanie raportów CSV i PDF
                </p>
              </div>
            </div>
          </div>

        {/* Drag and Drop Zone */}
        {!filePreview ? (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                document.getElementById("local-backup-file-input")?.click();
              }
            }}
            onClick={() => document.getElementById("local-backup-file-input")?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer mb-4 focus-visible:ring-2 focus-visible:ring-focus-ring ${
              dragActive
                ? "border-brand bg-brand-subtle"
                : "border-border hover:border-border/80 bg-surface"
            }`}
          >
            <input
              id="local-backup-file-input"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
            <Upload className="w-6 h-6 text-text-muted mx-auto mb-2" />
            <span className="text-xs font-black text-text-main block">Wczytaj kopię z pliku JSON</span>
            <p className="text-xs text-text-muted mt-1">
              Przeciągnij i upuść plik kopii zapasowej tutaj lub kliknij aby wyszukać na urządzeniu
            </p>
          </div>
        ) : (
          /* File Preview Card before actual restoration - VERY PREMIUM! */
          <div className="bg-warning-subtle border border-warning/20 rounded-xl p-5 mb-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div>
                <strong className="text-xs font-black text-warning">Podgląd wczytywanego pliku</strong>
                <p className="text-xs text-warning mt-0.5">
                  Wczytanie tych danych zastąpi wszystkie obecne profile i ich transakcje. Sprawdź zawartość pliku przed zatwierdzeniem:
                </p>
              </div>
            </div>

            <div className="bg-surface-2 border border-warning/20 rounded-xl p-3 space-y-1.5 min-w-0">
              <div className="flex justify-between text-xs text-text-muted">
                <span>Liczba profili w kopii:</span>
                <strong className="text-text-muted tabular-nums">{filePreview.profiles?.length || 0}</strong>
              </div>
              <div className="flex justify-between text-xs text-text-muted">
                <span>Dostępne profile:</span>
                <strong className="text-brand truncate max-w-[180px]">
                  {filePreview.profiles?.map((p) => p.name).join(", ") || "Brak"}
                </strong>
              </div>
              <div className="flex justify-between text-xs text-text-muted">
                <span>Łączna liczba wpisów transakcji:</span>
                <strong className="text-text-muted tabular-nums">
                  {filePreview.profiles?.reduce((acc: number, p) => acc + (p.transactions?.length || 0), 0) || 0}
                </strong>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={confirmLocalImport}
                className="flex-1 bg-warning text-text-inverse font-bold py-2.5 rounded-xl text-xs hover:bg-warning/90 active:scale-[0.98] transition-all cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                ✓ Nadpisz dane i przywróć
              </button>
              <button
                onClick={() => setFilePreview(null)}
                className="px-4 bg-surface border border-border text-text-muted hover:text-text-main rounded-xl text-xs font-medium active:scale-[0.98] transition-all cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Anuluj
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-text-main">Eksport danych i raporty</h4>
              {onOpenExportReports && (
                <button
                  type="button"
                  onClick={() => onOpenExportReports()}
                  className="text-xs text-brand font-bold hover:underline flex items-center gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Centrum raportów</span>
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => {
                  if (onOpenExportReports) {
                    onOpenExportReports("csv");
                    return;
                  }
                  if (activeProfile && activeProfile.transactions) {
                    const csv = generateCsvContent(activeProfile.transactions);
                    downloadFile(csv, `saldo-${activeProfile.name}-transakcje.csv`, "text/csv;charset=utf-8;");
                  }
                }}
                className="bg-surface border border-border text-text-muted hover:border-brand/50 hover:text-brand active:scale-[0.98] transition-all py-2.5 px-3 rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2 justify-center focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <FileSpreadsheet className="w-4 h-4 text-brand" />
                <span>Pobierz CSV</span>
              </button>
              <div className="flex flex-col gap-1">
                <button
                  onClick={async () => {
                    if (onOpenExportReports) {
                      onOpenExportReports("pdf");
                      return;
                    }
                    if (activeProfile) {
                      try {
                        const { generateReportPdf } = await import("../services/pdfGenerator");
                        generateReportPdf(activeProfile, pdfYear, pdfMonthIdx, activeProfile.currency || "PLN");
                      } catch (error) {
                        console.error("Błąd podczas generowania raportu PDF:", error);
                        showToast("Nie udało się wygenerować raportu PDF. Spróbuj ponownie.", "error");
                      }
                    }
                  }}
                  className="w-full bg-surface border border-border text-text-muted hover:border-brand/50 hover:text-brand active:scale-[0.98] transition-all py-2.5 px-3 rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2 justify-center focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  <FileText className="w-4 h-4 text-brand" />
                  <span>Pobierz raport PDF</span>
                </button>
                <span className="text-xs text-text-muted text-center font-medium">
                  Raport za: <strong className="text-text-main">{pdfMonthLabel} {pdfYear}</strong>
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-surface border border-border rounded-xl p-4 shadow-xs">
            <h4 className="text-sm font-bold text-text-main mb-3">Kopia zapasowa systemu</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={async () => {
                  const safeState = await prepareStateForRemoteSave(state);
                  const json = JSON.stringify(safeState, null, 2);
                  downloadFile(json, `saldo-kopia-zaszyfrowana.json`, "application/json");
                }}
                className="bg-surface border border-border text-text-muted hover:border-brand/50 hover:text-brand active:scale-[0.98] transition-all py-2.5 px-3 rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2 justify-center focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <Lock className="w-4 h-4 text-brand" />
                <span>Eksport zaszyfrowanej kopii</span>
              </button>
              <button
                onClick={() => {
                  if (activeProfile?.pinHash && activeProfileId !== unlockedProfileId) {
                    onOpenPinModal();
                    return;
                  }
                  setShowExportConfirm(true);
                }}
                className="bg-surface border border-border text-text-muted hover:border-brand/50 hover:text-brand active:scale-[0.98] transition-all py-2.5 px-3 rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2 justify-center focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <FileJson className="w-4 h-4 text-brand" />
                <span>Eksport czytelnych danych</span>
              </button>
            </div>
          </div>

          <button
            onClick={onResetData}
            className="w-full bg-danger-subtle text-danger border border-danger/20 hover:bg-danger/10 hover:border-danger/30 active:scale-[0.98] transition-all py-3 rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-focus-ring"
            id="btn-reset-db-data"
          >
            <AlertTriangle className="w-4 h-4 text-danger" />
            <span>Przywróć stan początkowy (Usuń wszystko)</span>
          </button>
        </div>
      </div>
      )}

      {/* SECTION 6: PRIVACY & DEVICE MANAGEMENT */}
      {(settingsTab === "all" || settingsTab === "security") && (
        <div className="bg-surface rounded-2xl border border-border/70 shadow-xs p-5 sm:p-6" id="settings-privacy-card">
          <div className="flex items-start sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-border/60">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-danger-subtle text-danger border border-danger/20 flex items-center justify-center shrink-0">
                <UserX className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-text-main tracking-tight truncate">
                  Prywatność i zarządzanie urządzeniem
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Bezpieczne czyszczenie lokalnej pamięci podręcznej i zarządzanie sesjami
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {googleUser && (
              <div className="bg-surface border border-border rounded-xl p-4 shadow-xs">
                <h4 className="text-sm font-bold text-text-main mb-1">Konto w chmurze</h4>
                <p className="text-xs text-text-muted mb-3">Zakończ sesję na tym urządzeniu. Twoje dane w chmurze pozostaną nienaruszone, ale aplikacja wyloguje się lokalnie.</p>
                <button
                  onClick={handleLogoutOnly}
                  className="bg-surface border border-border text-text-muted hover:border-text-main hover:text-text-main active:scale-[0.98] transition-all py-2.5 px-4 rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-focus-ring w-full sm:w-auto justify-center"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Wyloguj z konta Google / chmury na tym urządzeniu</span>
                </button>
              </div>
            )}

            <div className="bg-danger-subtle/50 border border-danger/20 rounded-xl p-4 shadow-xs">
              <h4 className="text-sm font-bold text-danger mb-1">Zresetuj Saldo na tym urządzeniu</h4>
              <p className="text-xs text-danger/80 mb-3">
                Ta akcja bezpiecznie wyczyści całą lokalną bazę danych w tej przeglądarce, usunie zapisane klucze z pamięci oraz wyloguje Cię z sesji. 
                Dane zapisane wcześniej w chmurze pozostaną bezpieczne, jednak to urządzenie zostanie wyzerowane.
              </p>
              <button
                onClick={() => setShowDeviceResetConfirm(true)}
                className="bg-danger-subtle text-danger border border-danger/30 hover:bg-danger/10 active:scale-[0.98] transition-all py-2.5 px-4 rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-focus-ring w-full sm:w-auto justify-center"
              >
                <Trash2 className="w-4 h-4" />
                <span>Zresetuj urządzenie / Wyczyść dane lokalne</span>
              </button>
            </div>

            {/* Usuń konto i dane w chmurze */}
            {googleUser ? (
              <div className="bg-danger-subtle border border-danger/30 rounded-xl p-4 shadow-xs">
                <h4 className="text-sm font-bold text-danger mb-1 flex items-center gap-2">
                  <UserX className="w-4 h-4 text-danger shrink-0" />
                  Usuń konto i dane w chmurze (RODO / GDPR)
                </h4>
                <p className="text-xs text-danger/90 mb-3 leading-relaxed">
                  Ta operacja <strong>trwale usunie Twoje konto logowania</strong> oraz wszystkie powiązane z nim dane z bazy danych w chmurze. 
                  Nie dotyczy to tylko tego urządzenia — tracisz bezpowrotnie dostęp do kopii chmurowych. Operacji tej <strong>nie można cofnąć</strong>.
                </p>

                {hasPasswordProvider ? (
                  <button
                    onClick={() => {
                      setDeleteAccountError("");
                      setDeleteAccountPassword("");
                      setDeleteAccountPhrase("");
                      setShowCloudDeleteModal(true);
                    }}
                    className="bg-danger text-text-inverse hover:bg-danger/90 active:scale-[0.98] transition-all py-2.5 px-4 rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-focus-ring w-full sm:w-auto justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Usuń konto i wszystkie dane w chmurze</span>
                  </button>
                ) : (
                  <div className="p-3 bg-surface-2 rounded-lg border border-border/50">
                    <p className="text-xs text-text-muted">
                      Twoje konto jest połączone wyłącznie przez logowanie Google. Aby usunąć powiązanie, odepnij aplikację w ustawieniach konta Google lub skorzystaj z lokalnego resetu urządzenia powyżej.
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
        </div>
      </div>

      {profileToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-6 shadow-xl border border-border/30 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-danger-subtle text-danger flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-text-main mb-2">Usuwanie profilu</h3>
            <p className="text-sm text-text-muted mb-6">
              Czy na pewno chcesz usunąć ten profil? <strong>Wszystkie transakcje, cele i płatności zostaną bezpowrotnie usunięte.</strong>
              Ta operacja jest nieodwracalna.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setProfileToDelete(null)}
                className="flex-1 bg-surface hover:bg-surface-2 border border-border text-text-muted font-bold py-3 rounded-xl active:scale-[0.98] transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Anuluj
              </button>
              <button
                onClick={() => {
                  onDeleteProfile(profileToDelete);
                  setProfileToDelete(null);
                }}
                className="flex-1 bg-danger hover:bg-danger/90 text-text-inverse font-bold py-3 rounded-xl shadow-sm active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Usuń profil
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showExportConfirm}
        onClose={() => setShowExportConfirm(false)}
        payload={
          showExportConfirm
            ? {
                title: "Potwierdź eksport danych",
                message: "Ten plik będzie zawierał czytelne dane finansowe. Zapisz go w bezpiecznym miejscu.",
                confirmLabel: "Eksportuj",
                cancelLabel: "Anuluj",
                tone: "warning",
                onConfirm: () => {
                  const json = JSON.stringify(state, null, 2);
                  downloadFile(json, `saldo-kopia-czytelna.json`, "application/json");
                  if (onExportData) {
                    onExportData();
                  }
                }
              }
            : null
        }
      />

      <ConfirmModal
        isOpen={showDeviceResetConfirm}
        onClose={() => setShowDeviceResetConfirm(false)}
        payload={
          showDeviceResetConfirm
            ? {
                title: "Zresetować Saldo na tym urządzeniu?",
                message: "UWAGA: Ta akcja usunie CAŁĄ lokalną bazę danych z tej przeglądarki, wyczyści pamięć podręczną i klucze. Wszelkie niezapisane dane zostaną bezpowrotnie utracone. Dane na serwerze nie zostaną naruszone.",
                confirmLabel: "Zresetuj to urządzenie",
                cancelLabel: "Anuluj",
                tone: "danger",
                onConfirm: () => {
                  setShowDeviceResetConfirm(false);
                  handleLocalDeviceReset();
                }
              }
            : null
        }
      />

      {showCloudDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface rounded-2xl max-w-md w-full p-6 shadow-xl border border-danger/30 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-danger-subtle text-danger flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-text-main mb-2">Trwałe usunięcie konta i danych</h3>
            <p className="text-xs text-text-muted mb-4 leading-relaxed">
              Ta operacja jest <strong className="text-danger">całkowicie nieodwracalna</strong>. Trwale usunie Twój profil chmurowy,
              wszystkie zsynchronizowane bazy danych powiązane z tym kontem oraz usunie konto uwierzytelniania.
            </p>

            {deleteAccountError && (
              <div className="p-3 mb-4 bg-danger-subtle text-danger border border-danger/20 rounded-lg text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{deleteAccountError}</span>
              </div>
            )}

            <form onSubmit={handleDeleteOwnAccount} className="space-y-4">
              {hasPasswordProvider && (
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1">
                    Aktualne hasło do konta:
                  </label>
                  <div className="relative">
                    <input
                      type={showDeletePwd ? "text" : "password"}
                      required
                      placeholder="Wprowadź hasło"
                      value={deleteAccountPassword}
                      onChange={(e) => setDeleteAccountPassword(e.target.value)}
                      disabled={deleteAccountLoading}
                      className="w-full text-xs rounded-xl border border-border p-2.5 pr-10 bg-surface focus-visible:ring-2 focus-visible:ring-focus-ring"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDeletePwd(!showDeletePwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
                    >
                      {showDeletePwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-text-main mb-1">
                  Wpisz <span className="font-mono text-danger font-black">USUŃ KONTO</span> aby potwierdzić:
                </label>
                <input
                  type="text"
                  required
                  placeholder="USUŃ KONTO"
                  value={deleteAccountPhrase}
                  onChange={(e) => setDeleteAccountPhrase(e.target.value)}
                  disabled={deleteAccountLoading}
                  className="w-full text-xs rounded-xl border border-danger/40 p-2.5 bg-surface focus-visible:ring-2 focus-visible:ring-danger text-danger font-bold tracking-wider"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={deleteAccountLoading}
                  onClick={() => {
                    setShowCloudDeleteModal(false);
                    setDeleteAccountPassword("");
                    setDeleteAccountPhrase("");
                    setDeleteAccountError("");
                  }}
                  className="flex-1 bg-surface hover:bg-surface-2 border border-border text-text-muted font-bold py-2.5 rounded-xl text-xs active:scale-[0.98] transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-50"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={
                    deleteAccountLoading ||
                    deleteAccountPhrase.trim() !== "USUŃ KONTO" ||
                    (hasPasswordProvider && !deleteAccountPassword)
                  }
                  className="flex-1 bg-danger hover:bg-danger/90 text-text-inverse font-bold py-2.5 rounded-xl text-xs shadow-sm active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-50 cursor-pointer"
                >
                  {deleteAccountLoading ? "Usuwanie..." : "Trwale usuń konto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
