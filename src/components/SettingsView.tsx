import React, { useState } from "react";
import { User } from "firebase/auth";
import { iconByCategory, expenseCategories, incomeCategories } from "../utils";
import { Profile, RecurringRule, TransactionRule, AppState, BankAccount, SupportedCurrency } from "../types";
import { formatMoney } from "../utils/format";
import { isFirebaseConfigured } from "../firebase";
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
  Trash2,
  Cpu,
  Edit2,
  Users,
  Sliders,
  Palette,
  ArrowRight,
  Settings2,
  Plus,
  KeyRound
} from "lucide-react";
import { generateCsvContent, downloadFile } from "../utils";
import { generateReportPdf } from "../services/pdfGenerator";
import { prepareStateForRemoteSave } from "../services/crypto";

interface SettingsViewProps {
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

  calendarToken?: string | null;
  onConnectCalendar?: () => Promise<void>;
  unlockedProfileId?: string | null;

  // Rules and Automation
  recurringRules: RecurringRule[];
  onSaveRecurringRules: (rules: RecurringRule[]) => void;
  transactionRules: TransactionRule[];
  onSaveTransactionRules: (rules: TransactionRule[]) => void;
  onSaveAccounts: (accounts: BankAccount[]) => void;
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
    <div className="mb-10 pb-10 border-b border-border/30 last:border-b-0 last:pb-0 min-w-0" id="settings-bank-accounts-card">
      <h3 className="text-xl font-black text-text-main tracking-tight mb-2 truncate">Konta operacyjne</h3>
      <p className="text-sm text-text-muted mb-4 leading-relaxed">
        Lista miejsc operacyjnych, do których przypisujesz codzienne wydatki i wpływy. 
        Twój <strong>limit awaryjny</strong> traktuj tu wyłącznie jako bufor bezpieczeństwa – nie są to środki wliczone do budżetu i nie należy ich traktować jako "safe-to-spend".
      </p>
      <form onSubmit={handleAddAccount} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5 p-4 rounded-xl bg-surface border border-border min-w-0">
        <div>
          <label className="block text-sm font-medium text-text-main mb-1 truncate" title="Nazwa konta / portfela">Nazwa konta / portfela</label>
          <input required value={accName} onChange={(e) => setAccName(e.target.value)} placeholder="np. Konto bieżące, Gotówka" className="w-full text-sm rounded-xl border border-border p-2 outline-none focus:border-brand/50 min-w-0" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Opis dodatkowy (opcjonalnie)</label>
          <input value={accBankName} onChange={(e) => setAccBankName(e.target.value)} placeholder="np. nazwa banku" className="w-full text-xs rounded-xl border border-border p-2 outline-none focus:border-emerald-500/50" />
        </div>
        <div className="flex items-center pt-5">
          <label className="flex items-center cursor-pointer">
            <input type="checkbox" checked={accHasLimit} onChange={(e) => setAccHasLimit(e.target.checked)} className="sr-only peer" />
            <div className="w-9 h-5 bg-slate-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-slate-200 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#137566]"></div>
            <span className="ml-2 text-xs font-bold text-text-muted">Bufor awaryjny</span>
          </label>
        </div>
        {accHasLimit && (
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Kwota limitu</label>
            <input type="number" min="0" step="0.01" value={accLimitAmount} onChange={(e) => setAccLimitAmount(parseFloat(e.target.value) || "")} className="w-full text-xs rounded-xl border border-border p-2 outline-none focus:border-emerald-500/50" />
          </div>
        )}
        <div className="flex items-end lg:col-span-1">
          <button type="submit" className="w-full bg-surface border border-border text-emerald-700 font-bold py-2 rounded-xl hover:bg-surface-offset hover:border-emerald-200 active:scale-[0.98] transition-all text-xs shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50">
            + Dodaj konto
          </button>
        </div>
      </form>

      {accounts.length > 0 ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {accounts.map((acc, index) => (
              <div key={acc.id} className="flex items-center justify-between p-3 bg-surface border border-border rounded-xl hover:shadow-sm transition">
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-xs text-text-main">{acc.name}</strong>
                    {index === 0 && <span className="text-[9px] font-bold uppercase tracking-wider bg-surface text-text-muted px-1.5 py-0.5 rounded border border-border">Domyślne</span>}
                  </div>
                  {acc.bankName && <span className="mt-1 inline-block text-[10px] text-text-muted bg-surface px-1.5 py-0.5 rounded">{acc.bankName}</span>}
                  {acc.hasCreditLimit && (
                    <p className="text-[10px] text-emerald-600 font-bold mt-1">Bufor awaryjny: {formatMoney(acc.creditLimit, currency)}</p>
                  )}
                </div>
                <button type="button" onClick={() => handleDeleteAccount(acc.id)} className="text-text-muted hover:text-rose-700 active:scale-95 transition-colors p-1 cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50">
                  &times;
                </button>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-text-muted">💡 Wskazówka: pierwsze konto z listy będzie domyślnie podpowiadane przy wprowadzaniu nowej transakcji.</p>
        </div>
      ) : (
        <p className="text-xs text-text-muted italic">Nie dodałeś jeszcze żadnych kont. Będziesz je wpisywać ręcznie.</p>
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
    <div className="bg-surface rounded-2xl border border-border shadow-lg p-6" id="settings-category-rules-card">
      <h3 className="text-xl font-black text-text-main tracking-tight mb-2 truncate">Automatyzacja kategoryzacji</h3>
      <p className="text-sm text-text-muted mb-4 leading-relaxed">
        Oszczędź czas i zachowaj spójność na liście wydatków. Ustaw słowa kluczowe (np. <em>orlen</em>, <em>netflix</em>), a nowe i importowane transakcje od razu otrzymają właściwą kategorię.
      </p>

      <form onSubmit={handleAddTransactionRule} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 p-4 rounded-xl bg-surface border border-border">
        <div>
          <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Słowo kluczowe (Fraza)</label>
          <input
            type="text"
            value={rulePattern}
            onChange={(e) => setRulePattern(e.target.value)}
            placeholder="np. biedronka, netflix, orlen"
            className="w-full text-xs rounded-xl border border-border p-2 bg-surface outline-none focus:border-emerald-500/50"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Przypisz do kategorii</label>
          <select
            value={ruleCategory}
            onChange={(e) => setRuleCategory(e.target.value)}
            className="w-full text-xs rounded-xl border border-border p-2 bg-surface outline-none focus:border-emerald-500/50"
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
            className="w-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold py-2 px-4 rounded-xl text-xs active:scale-[0.98] transition-all shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
          >
            ＋ Zapisz dopasowanie
          </button>
        </div>
      </form>

      {transactionRules.length === 0 ? (
        <p className="text-xs text-text-muted italic text-center py-4">Brak zapisanych dopasowań. Zdefiniuj własne słowa kluczowe, by przyspieszyć przypisywanie kategorii.</p>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface border-b border-border text-text-muted font-bold">
                <th className="py-2 px-3">Słowo kluczowe</th>
                <th className="py-2 px-3">Kategoria docelowa</th>
                <th className="py-2 px-3 text-right">Akcja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-surface">
              {transactionRules.map((r) => (
                <tr key={r.id} className="hover:bg-surface/50 transition">
                  <td className="py-2.5 px-3 font-mono font-bold text-text-main">{r.pattern}</td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-50">
                      <span>{r.categoryIcon || "✨"}</span>
                      {r.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteTransactionRule(r.id)}
                      className="text-[10px] font-bold text-[#d55e50] hover:underline active:scale-95 transition-all inline-block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50"
                    >
                      Usuń
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
  recurringRules,
  onSaveRecurringRules,
  transactionRules,
  onSaveTransactionRules,
  onSaveAccounts,
  calendarToken,
  onConnectCalendar,
  unlockedProfileId
}: SettingsViewProps) {
  const activeProfile = profiles.find((p) => p.id === activeProfileId);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [filePreview, setFilePreview] = useState<AppState | null>(null);


  // Active profile edit states
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
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
      alert("Proszę podać imię partnera dla profilu wspólnego.");
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
      alert("Proszę uzupełnić nazwę, kwotę i termin pierwszej płatności.");
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
      alert("Proszę wybrać plik w formacie JSON (.json).");
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
          alert("Plik JSON nie zawiera prawidłowej bazy danych aplikacji Saldo.");
        }
      } catch (err) {
        alert("Błąd dekodowania pliku JSON. Upewnij się, że plik nie jest uszkodzony.");
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

  const [settingsTab, setSettingsTab] = useState<"all" | "profiles" | "appearance" | "backup" | "automation">("all");

  return (
    <div className="w-full max-w-7xl mx-auto pb-16" id="settings-view-container">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* SIDEBAR NAVIGATION */}
        <div className="w-full lg:w-64 xl:w-72 shrink-0 lg:sticky lg:top-6 space-y-2">
          <div className="bg-surface rounded-2xl border border-border shadow-lg p-3">
            <div className="flex lg:flex-col items-stretch gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 scrollbar-none min-w-0">
              <button
                onClick={() => setSettingsTab("all")}
                className={`px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-2.5 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap lg:whitespace-normal text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
                  settingsTab === "all"
                    ? "bg-slate-100 text-emerald-700 border border-emerald-200 shadow-sm"
                    : "bg-transparent text-text-muted hover:bg-surface hover:text-text-main lg:border-none border border-border"
                }`}
              >
                <Settings2 className="w-4 h-4 shrink-0" /> <span className="truncate">Wszystkie sekcje</span>
              </button>
              <button
                onClick={() => setSettingsTab("profiles")}
                className={`px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-2.5 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap lg:whitespace-normal text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
                  settingsTab === "profiles"
                    ? "bg-slate-100 text-emerald-700 border border-emerald-200 shadow-sm"
                    : "bg-transparent text-text-muted hover:bg-surface hover:text-text-main lg:border-none border border-border"
                }`}
              >
                <Users className="w-4 h-4 shrink-0" /> <span className="truncate">Profile i PIN ({profiles.length})</span>
              </button>
              <button
                onClick={() => setSettingsTab("appearance")}
                className={`px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-2.5 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap lg:whitespace-normal text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
                  settingsTab === "appearance"
                    ? "bg-slate-100 text-emerald-700 border border-emerald-200 shadow-sm"
                    : "bg-transparent text-text-muted hover:bg-surface hover:text-text-main lg:border-none border border-border"
                }`}
              >
                <Palette className="w-4 h-4 shrink-0" /> <span className="truncate">Motyw i AI</span>
              </button>
              <button
                onClick={() => setSettingsTab("backup")}
                className={`px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-2.5 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap lg:whitespace-normal text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
                  settingsTab === "backup"
                    ? "bg-slate-100 text-emerald-700 border border-emerald-200 shadow-sm"
                    : "bg-transparent text-text-muted hover:bg-surface hover:text-text-main lg:border-none border border-border"
                }`}
              >
                <Cloud className="w-4 h-4 shrink-0" /> <span className="truncate">Chmura i Kopie</span>
              </button>
              <button
                onClick={() => setSettingsTab("automation")}
                className={`px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-2.5 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap lg:whitespace-normal text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
                  settingsTab === "automation"
                    ? "bg-slate-100 text-emerald-700 border border-emerald-200 shadow-sm"
                    : "bg-transparent text-text-muted hover:bg-surface hover:text-text-main lg:border-none border border-border"
                }`}
              >
                <Cpu className="w-4 h-4 shrink-0" /> <span className="truncate">Reguły i Konta</span>
              </button>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 min-w-0 space-y-6 w-full">

      {/* SECTION 1: PROFILES */}
      {(settingsTab === "all" || settingsTab === "profiles") && (
        <div className="bg-surface rounded-2xl border border-border shadow-lg p-6" id="settings-profiles-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-border/30">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-text-main">Zarządzanie profilami budżetu</h3>
              </div>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Każdy profil posiada niezależne transakcje, limity, salda bankowe oraz cele oszczędnościowe.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-500/20 shrink-0 self-start sm:self-auto">
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
                  <div key={p.id} className="col-span-1 sm:col-span-2 bg-surface rounded-2xl border border-emerald-500/50 p-5 shadow-md ring-2 ring-emerald-500/20">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/30">
                      <div className="flex items-center gap-2">
                        <Edit2 className="w-4 h-4 text-emerald-700" />
                        <h4 className="text-sm font-extrabold text-text-main">Edycja profilu: {p.name}</h4>
                      </div>
                      <button onClick={cancelEditingProfile} className="text-text-muted hover:text-text-main p-1 text-lg leading-none active:scale-95 transition-colors">&times;</button>
                    </div>
                    <form onSubmit={handleSaveEditedProfile} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-text-main mb-1">Nazwa profilu</label>
                          <input
                            type="text"
                            value={editProfileData.name}
                            onChange={(e) => setEditProfileData(prev => prev ? { ...prev, name: e.target.value } : null)}
                            className="w-full rounded-xl border border-border p-2.5 outline-none bg-surface focus:bg-surface focus:border-emerald-500/50 text-sm font-medium"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-text-main mb-1">Ikona profilu</label>
                          <details className="group border border-border rounded-xl relative">
                            <summary className="p-2.5 text-xs font-bold text-text-muted cursor-pointer bg-surface hover:bg-surface-2 flex items-center justify-between list-none select-none rounded-xl group-open:rounded-b-none group-open:border-b group-open:border-border">
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
                                    className={`text-xl p-1.5 rounded-xl border transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${editProfileData.avatar === emoji ? 'bg-emerald-50 border-emerald-500/50 shadow-sm' : 'bg-surface border-border/30 hover:bg-surface-2 grayscale hover:grayscale-0'}`}
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
                          className="w-full rounded-xl border border-border p-2.5 outline-none bg-surface focus:bg-surface focus:border-emerald-500/50 text-sm font-medium"
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
                          className="w-full rounded-xl border border-border p-2.5 outline-none bg-surface focus:bg-surface focus:border-emerald-500/50 text-sm font-medium"
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
                            className="w-full rounded-xl border border-border p-2.5 outline-none bg-surface focus:bg-surface focus:border-emerald-500/50 text-sm font-medium"
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
                          className="bg-surface border border-border text-text-muted font-bold py-2.5 px-4 rounded-xl text-xs hover:bg-surface-offset active:scale-[0.98] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                        >
                          Anuluj
                        </button>
                        <button
                          type="submit"
                          disabled={editProfileData.name === p.name && editProfileData.kind === p.kind && editProfileData.partnerName === (p.partnerName || "") && editProfileData.avatar === (p.avatar || "👤") && editProfileData.currency === (p.currency || "PLN")}
                          className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold py-2.5 px-6 rounded-xl text-xs active:scale-[0.98] transition-all shadow-sm disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                        >
                          Zapisz zmiany
                        </button>
                      </div>
                    </form>
                  </div>
                );
              }

              if (isActive) {
                return (
                  <div
                    key={p.id}
                    className="col-span-1 sm:col-span-2 bg-emerald-50 border-emerald-200  rounded-2xl p-5 shadow-md   relative overflow-hidden flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start justify-between gap-3 min-w-0">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-surface  border border-emerald-500/20  shadow-sm flex items-center justify-center font-extrabold text-2xl shrink-0">
                          {p.avatar || "👤"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <strong className="text-base font-extrabold text-text-main truncate">{p.name}</strong>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 shadow-xs">
                              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                              Aktywny
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs font-medium text-text-muted truncate max-w-full">
                              {isShared ? `👪 Wspólny (z ${p.partnerName})` : "👤 Osobisty"}
                            </span>
                            {p.pinHash ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                <Lock className="w-3 h-3 text-amber-700" /> Kod PIN
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-text-muted bg-surface border border-border px-2 py-0.5 rounded-md">
                                Bez PINu
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 bg-surface-2  p-1 rounded-xl border border-border  shadow-xs">
                        <button
                          onClick={(e) => { e.stopPropagation(); startEditingProfile(p); }}
                          className="p-2 text-text-muted hover:text-emerald-700 hover:bg-emerald-50 rounded-xl active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                          title="Edytuj profil"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={onOpenPinModal}
                          className="p-2 text-text-muted hover:text-emerald-700 hover:bg-emerald-50 rounded-xl active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                          title="Zarządzaj kodem PIN"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setProfileToDelete(p.id); }}
                          className="p-2 text-text-muted hover:text-rose-700 hover:bg-rose-50 rounded-xl active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50"
                          title="Usuń profil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-3 border-t border-emerald-500/50/15  text-emerald-700 font-bold">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4 text-emerald-700" /> Aktualnie pracujesz na tym profilu
                      </span>
                      <button
                        onClick={onOpenPinModal}
                        className="text-[11px] hover:underline flex items-center gap-1 text-emerald-700 font-bold cursor-pointer active:scale-95 transition-transform rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                      >
                        {p.pinHash ? "Zmień PIN" : "Ustaw PIN"} <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={p.id}
                  className="bg-surface border border-border/90 hover:border-emerald-200 hover:shadow-md transition-all rounded-2xl p-4 flex flex-col justify-between gap-3 group relative"
                >
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-surface border border-border flex items-center justify-center font-bold text-xl shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                        {p.avatar || "👤"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <strong className="block text-sm font-bold text-text-main truncate">{p.name}</strong>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] font-bold text-text-muted bg-surface px-2 py-0.5 rounded-md">
                            {isShared ? `Wspólny (${p.partnerName})` : "Osobisty"}
                          </span>
                          {p.pinHash && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                              <Lock className="w-3 h-3" /> PIN
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); startEditingProfile(p); }}
                        className="p-1.5 text-text-muted hover:text-emerald-700 hover:bg-emerald-50 rounded-xl active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                        title="Edytuj profil"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setProfileToDelete(p.id); }}
                        className="p-1.5 text-text-muted hover:text-rose-700 hover:bg-rose-50 rounded-xl active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50"
                        title="Usuń profil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectProfile(p.id)}
                    className="w-full py-2 px-3 bg-emerald-50 hover:bg-[#137566] text-emerald-700 hover:text-white font-bold text-xs rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                    id={`btn-select-profile-${p.id}`}
                  >
                    <span>Otwórz ten profil</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            <button
              onClick={onOpenProfileModal}
              id="btn-add-profile-settings"
              className="col-span-1 sm:col-span-2 flex items-center justify-center gap-2.5 p-4 rounded-2xl border-2 border-dashed border-border hover:border-emerald-500/50 hover:bg-emerald-50 text-emerald-700 font-bold text-xs active:scale-[0.98] transition-all cursor-pointer group shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
            >
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl group-hover:scale-110 transition-transform">
                <Plus className="w-4 h-4" />
              </div>
              <span> Utwórz nowy profil budżetu</span>
            </button>
          </div>
        </div>
      )}


      {/* SECTION: THEME SELECTION */}
      {(settingsTab === "all" || settingsTab === "appearance") && (
        <div className="bg-surface rounded-2xl border border-border shadow-lg p-6" id="settings-theme-card">
        <h3 className="text-xl font-black text-text-main tracking-tight mb-2 truncate">Motyw i wygląd aplikacji</h3>
        <p className="text-xs text-text-muted mb-5 leading-relaxed">
          Dostosuj schemat kolorów aplikacji Saldo do swoich preferencji. Wybierz jasny motyw dla pełnej czytelności w dzień, ciemny dla ochrony oczu w nocy, lub pozwól systemowi na automatyczną zmianę.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" id="theme-selectors-grid">
          {/* Light Theme Option */}
          <button
            onClick={() => onThemeChange("light")}
            className={`flex flex-col items-center gap-3 p-4 rounded-xl border text-center active:scale-[0.98] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
              theme === "light"
                ? "bg-emerald-50 border-emerald-500/50 ring-1 ring-emerald-500/30"
                : "bg-surface border-border hover:border-slate-200"
            }`}
            id="btn-set-theme-light"
          >
            <div className={`p-2 rounded-xl ${theme === "light" ? "bg-surface text-emerald-700" : "bg-surface text-text-muted"}`}>
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <strong className="block text-sm text-text-main">Jasny motyw</strong>
              <span className="text-[10px] text-text-muted mt-0.5 block font-medium">Klasyczny i przejrzysty</span>
            </div>
          </button>

          {/* Dark Theme Option */}
          <button
            onClick={() => onThemeChange("dark")}
            className={`flex flex-col items-center gap-3 p-4 rounded-xl border text-center active:scale-[0.98] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
              theme === "dark"
                ? "bg-emerald-50 border-emerald-500/50 ring-1 ring-emerald-500/30"
                : "bg-surface border-border hover:border-slate-200"
            }`}
            id="btn-set-theme-dark"
          >
            <div className={`p-2 rounded-xl ${theme === "dark" ? "bg-surface text-emerald-700" : "bg-surface text-text-muted"}`}>
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <strong className="block text-sm text-text-main">Ciemny motyw</strong>
              <span className="text-[10px] text-text-muted mt-0.5 block font-medium">Komfortowy dla wzroku</span>
            </div>
          </button>

          {/* Auto Theme Option */}
          <button
            onClick={() => onThemeChange("auto")}
            className={`flex flex-col items-center gap-3 p-4 rounded-xl border text-center active:scale-[0.98] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
              theme === "auto"
                ? "bg-emerald-50 border-emerald-500/50 ring-1 ring-emerald-500/30"
                : "bg-surface border-border hover:border-slate-200"
            }`}
            id="btn-set-theme-auto"
          >
            <div className={`p-2 rounded-xl ${theme === "auto" ? "bg-surface text-emerald-700" : "bg-surface text-text-muted"}`}>
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <strong className="block text-sm text-text-main">Automatyczny</strong>
              <span className="text-[10px] text-text-muted mt-0.5 block font-medium">Zależny od pory dnia</span>
            </div>
          </button>
        </div>
      </div>
      )}



      {/* SECTION: AI PROVIDER SETTINGS */}
      {(settingsTab === "all" || settingsTab === "appearance") && (
        <div className="bg-surface rounded-2xl border border-border shadow-lg p-6" id="settings-ai-provider-card">
        <h3 className="text-xl font-black text-text-main tracking-tight mb-2 truncate">Konfiguracja silnika AI</h3>
        <p className="text-xs text-text-muted mb-5 leading-relaxed">
          Wybierz dostawcę inteligencji dla kategoryzacji transakcji, analizy wyciągów oraz asystenta finansowego. Możesz wyłączyć AI, użyć lokalnego modelu (Ollama) lub bezpiecznej chmury.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4" id="ai-mode-selectors-grid">
          {/* None AI Option */}
          <button
            type="button"
            onClick={() => saveState({ ...state, aiMode: "none" })}
            className={`flex flex-col items-center gap-3 p-4 rounded-xl border text-center active:scale-[0.98] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
              (state.aiMode || "none") === "none"
                ? "bg-emerald-50 border-emerald-500/50 ring-1 ring-emerald-500/30"
                : "bg-surface border-border hover:border-slate-200"
            }`}
            id="btn-set-ai-mode-none"
          >
            <div className={`p-2 rounded-xl ${(state.aiMode || "none") === "none" ? "bg-surface text-emerald-700" : "bg-surface text-text-muted"}`}>
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <strong className="block text-sm text-text-main">Brak AI</strong>
              <span className="text-[10px] text-text-muted mt-0.5 block font-medium">Standardowe reguły</span>
            </div>
          </button>

          {/* Local AI Option */}
          <button
            type="button"
            onClick={() => saveState({ ...state, aiMode: "local", localAiEndpoint: state.localAiEndpoint || "http://localhost:11434/api/generate" })}
            className={`flex flex-col items-center gap-3 p-4 rounded-xl border text-center active:scale-[0.98] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
              state.aiMode === "local"
                ? "bg-emerald-50 border-emerald-500/50 ring-1 ring-emerald-500/30"
                : "bg-surface border-border hover:border-slate-200"
            }`}
            id="btn-set-ai-mode-local"
          >
            <div className={`p-2 rounded-xl ${state.aiMode === "local" ? "bg-surface text-emerald-700" : "bg-surface text-text-muted"}`}>
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <strong className="block text-sm text-text-main">Lokalne AI</strong>
              <span className="text-[10px] text-text-muted mt-0.5 block font-medium">Ollama / Serwer lokalny</span>
            </div>
          </button>

          {/* Cloud AI Option (Disabled for now to prevent costs) */}
          <button
            type="button"
            disabled={true}
            className={`flex flex-col items-center gap-3 p-4 rounded-xl border text-center transition cursor-not-allowed opacity-60 bg-surface border-border`}
            id="btn-set-ai-mode-cloud"
          >
            <div className={`p-2 rounded-xl bg-surface text-text-muted`}>
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <strong className="block text-sm text-text-muted line-through">Chmura AI (Gemini)</strong>
              <span className="text-[10px] text-[#d55e50] font-bold mt-1 block uppercase tracking-wider bg-red-100 px-2 py-0.5 rounded-full inline-block">Dostępne w przyszłości</span>
            </div>
          </button>
        </div>

        {/* Local AI Endpoint Configuration when Local mode selected */}
        {state.aiMode === "local" && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 animate-fade-in">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-text-main">Lokalny punkt końcowy (Endpoint):</label>
              <button
                type="button"
                onClick={() => saveState({ ...state, localAiEndpoint: "http://localhost:11434/api/generate" })}
                className="text-[10px] font-extrabold text-emerald-700 hover:underline cursor-pointer active:scale-95 transition-transform rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
              >
                Przywróć domyślny Ollama (11434)
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={state.localAiEndpoint || "http://localhost:11434/api/generate"}
                onChange={(e) => saveState({ ...state, localAiEndpoint: e.target.value })}
                placeholder="http://localhost:11434/api/generate"
                className="flex-1 bg-surface border border-emerald-500/40 rounded-xl p-2.5 text-xs text-text-main outline-none focus:border-emerald-500/50"
                id="input-local-ai-endpoint"
              />
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch("/api/ai/health", {
                      headers: {
                        "x-ai-mode": "local",
                        "x-ai-local-endpoint": state.localAiEndpoint || "http://localhost:11434/api/generate"
                      }
                    });
                    const data = await res.json();
                    if (res.ok) {
                      alert("Połączenie udane! Lokalny serwer AI odpowiada prawidłowo.");
                    } else {
                      alert("Błąd połączenia: " + (data.message || data.error || "Serwer lokalny niedostępny."));
                    }
                  } catch (err: any) {
                    alert("Błąd sieciowy: Nie udało się połączyć z backendem.");
                  }
                }}
                className="px-3 py-2 bg-[#137566] hover:bg-emerald-800 text-white text-xs font-bold rounded-xl active:scale-[0.98] transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                id="btn-test-local-ai"
              >
                Testuj połączenie
              </button>
            </div>
            <p className="text-[10px] text-text-muted leading-relaxed">
              Ze względów bezpieczeństwa zezwalane są wyłącznie połączenia z adresem lokalnym (np. <code className="bg-surface-2 px-1 py-0.5 rounded border text-emerald-700">http://localhost:11434/api/generate</code> lub <code className="bg-surface-2 px-1 py-0.5 rounded border text-emerald-700">127.0.0.1</code>).
            </p>
            
            <details className="group border border-emerald-200 rounded-xl bg-surface overflow-hidden">
              <summary className="p-3 text-xs font-bold text-text-main cursor-pointer hover:bg-emerald-50 flex justify-between items-center list-none select-none">
                Jak uruchomić lokalne AI na swoim komputerze?
                <span className="group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 border-t border-emerald-500/20 text-xs text-text-muted space-y-4">
                <p>Aby korzystać z modelu bezpłatnie i z zachowaniem pełnej prywatności (dane nie opuszczają Twojego komputera), zainstaluj silnik <a href="https://ollama.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline font-medium">Ollama</a>.</p>
                
                <div className="space-y-2">
                  <h4 className="font-bold text-text-main text-[13px] flex items-center gap-1.5">🍎 macOS</h4>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Pobierz instalator dla macOS ze strony <a href="https://ollama.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">ollama.com</a>.</li>
                    <li>Po instalacji otwórz <strong>Terminal</strong> i uruchom model (np. llama3): <br/><code className="bg-surface border px-1.5 py-0.5 rounded inline-block mt-1">ollama run llama3</code></li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-text-main text-[13px] flex items-center gap-1.5">🪟 Windows</h4>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Pobierz instalator Windows ze strony <a href="https://ollama.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">ollama.com</a>.</li>
                    <li>Aby aplikacja Saldo mogła połączyć się z modelem, musisz zezwolić na reguły <strong>CORS</strong>. W tym celu otwórz <strong>Wiersz polecenia (cmd)</strong> lub PowerShell i wpisz poniższe komendy jedna po drugiej:</li>
                  </ol>
                  <div className="bg-surface text-text-main p-2.5 rounded-xl font-mono text-[11px] leading-relaxed mx-2">
                    set OLLAMA_ORIGINS="*"<br/>
                    ollama run llama3
                  </div>
                  <p className="pl-1 italic text-[10px]">Pozostaw otwarte okno terminala podczas korzystania z aplikacji.</p>
                </div>
              </div>
            </details>
          </div>
        )}
      </div>
      )}

      {/* SECTION 2: PIN SECURITY */}
      {activeProfile && (settingsTab === "all" || settingsTab === "profiles") && (
        <div className="bg-surface rounded-2xl border border-border shadow-lg p-6" id="settings-pin-card">
          <h3 className="text-xl font-black text-text-main tracking-tight mb-2 truncate">Zabezpieczenie aktywnego profilu</h3>
          <p className="text-sm text-text-muted mb-4 leading-relaxed">
            Dodaj kod PIN, aby zabezpieczyć swoje poufne transakcje i informacje budżetowe przed nieautoryzowanym wglądem innych użytkowników na tym urządzeniu.
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-border">
            <div>
              <span className="text-xs font-bold text-text-muted block">
                {activeProfile.pinHash ? "🛡️ Twój profil jest obecnie chroniony kodem PIN" : "🔓 Profil nie posiada zabezpieczenia PIN"}
              </span>
              <p className="text-[11px] text-text-muted mt-0.5">
                Każdorazowe otwarcie profilu będzie wymagać wpisania poprawnego kodu.
              </p>
            </div>
            <button
              onClick={onOpenPinModal}
              className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold py-2 px-4 rounded-xl text-xs active:scale-[0.98] transition-all shadow-sm shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
              id="btn-set-profile-pin"
            >
              {activeProfile.pinHash ? "Zmień kod PIN" : "Ustaw kod PIN"}
            </button>
          </div>
        </div>
      )}

      {/* SECTION 3: GOOGLE DRIVE CLOUD INTEGRATION */}
      {(settingsTab === "all" || settingsTab === "backup") && (
        <div className="bg-surface rounded-2xl border border-border shadow-lg p-6" id="settings-google-drive-card">
        <div className="flex items-center gap-2 mb-2">
          <Cloud className="w-5 h-5 text-emerald-700" />
          <h3 className="text-base font-bold text-text-main">Kopia zapasowa w chmurze (Dysk Google)</h3>
        </div>
        <p className="text-xs text-text-muted mb-5 leading-relaxed">
          Podłącz swój osobisty Dysk Google, aby bezpiecznie archiwizować plik bazy danych budżetu (<code className="bg-surface px-1 py-0.5 rounded font-mono text-[11px]">saldo_budget.json</code>). Gwarantuje to pełną kontrolę nad danymi i ochronę przed ich utratą po wyczyszczeniu przeglądarki.
        </p>

        {googleError && (
          <div className="mb-5 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs space-y-2" id="gdrive-auth-error-notice">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <div className="font-bold text-rose-900">Błąd połączenia z kontem Google</div>
            </div>
            {googleError === "auth/popup-closed-by-user" ? (
              <div className="leading-relaxed text-text-muted pl-6 space-y-2">
                <p>
                  <strong>Okno logowania zostało zamknięte</strong> przed ukończeniem autoryzacji.
                </p>
                <p>
                  Jeśli korzystasz z aplikacji wewnątrz ramki podglądu (iframe) w AI Studio, przeglądarka mogła automatycznie zablokować wyskakujące okienko (pop-up) lub zablokować dostęp do plików cookies firm trzecich.
                </p>
                <p className="font-bold text-emerald-700">
                  💡 Aby rozwiązać ten problem:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Kliknij przycisk <strong>"Otwórz w nowej karcie"</strong> w prawym górnym rogu podglądu, aby otworzyć aplikację poza ramką iframe.</li>
                  <li>Upewnij się, że zezwalasz na wyskakujące okienka (pop-ups) w ustawieniach przeglądarki dla tej domeny.</li>
                </ul>
              </div>
            ) : (
              <div className="leading-relaxed text-text-muted pl-6 space-y-2">
                <p>
                  Szczegóły błędu: <code className="bg-rose-100/50 px-1 py-0.5 rounded font-mono text-[11px]">{googleError}</code>.
                </p>
                {googleError?.includes('unauthorized-domain') || googleError?.includes('nie jest autoryzowana') ? (
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 mt-2">
                    <p className="font-bold text-amber-900 mb-1">⚠️ Wymagana konfiguracja w Firebase</p>
                    <p className="text-amber-800 text-xs">
                      Aktualna domena nie jest dodana do autoryzowanych domen w Twoim projekcie Firebase.
                      Aby to naprawić:
                    </p>
                    <ol className="list-decimal pl-5 mt-1 space-y-1 text-amber-800 text-xs font-medium">
                      <li>Wejdź na stronę <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="underline hover:text-amber-700">console.firebase.google.com</a></li>
                      <li>Wybierz swój projekt</li>
                      <li>Przejdź do <strong>Authentication</strong> &gt; <strong>Settings</strong> (Ustawienia) &gt; <strong>Authorized domains</strong> (Autoryzowane domeny)</li>
                      <li>Dodaj domenę: <code className="bg-amber-100 px-1 rounded select-all">{window.location.hostname}</code></li>
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
          <div className="bg-surface border border-border rounded-2xl p-6 text-center space-y-4">
            <p className="text-xs text-text-muted max-w-md mx-auto">
              Aplikacja Saldo nie posiada centralnej bazy danych do przechowywania Twoich finansów. Podłączenie Dysku Google utworzy bezpieczny plik, z którego możesz korzystać na każdym urządzeniu.
            </p>
            <button
              onClick={onConnectGoogle}
              disabled={isGoogleLoading}
              className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold py-3 px-6 rounded-xl text-xs active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 cursor-pointer shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
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
            <details className="group mt-4 border border-border rounded-xl bg-surface overflow-hidden text-left max-w-md mx-auto">
              <summary className="p-3 text-[11px] font-bold text-text-muted cursor-pointer hover:bg-surface flex justify-between items-center list-none select-none">
                <span className="flex items-center gap-1.5"><Info className="w-3.5 h-3.5 text-text-muted" /> Dlaczego potrzebujemy dostępu do Dysku Google?</span>
                <span className="group-open:rotate-180 transition-transform text-text-muted">▼</span>
              </summary>
              <div className="p-4 border-t border-border/30 text-[11px] text-text-muted space-y-3 leading-relaxed">
                <p>
                  Aplikacja Saldo działa w modelu <strong className="text-text-main">Local-First</strong> (dane są na Twoim urządzeniu). 
                  Aby zapewnić Ci kopię zapasową oraz możliwość synchronizacji między urządzeniami (np. telefonem a komputerem), 
                  oferujemy zapis do prywatnego, ukrytego pliku na Twoim koncie Google Drive.
                </p>
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-500/20">
                  <span className="font-bold text-emerald-800 block mb-1">Pełna prywatność:</span>
                  Aplikacja prosi wyłącznie o dostęp typu <code className="bg-surface px-1 py-0.5 rounded border text-emerald-700 text-[10px]">drive.file</code>. 
                  Oznacza to, że ma dostęp <strong>tylko i wyłącznie</strong> do plików, które sama utworzyła. Nie mamy dostępu do Twoich prywatnych zdjęć ani dokumentów!
                </div>
              </div>
            </details>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-emerald-50 border border-emerald-500/20 rounded-xl gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {googleUser.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    referrerPolicy="no-referrer"
                    alt={googleUser.displayName || "Google User"}
                    className="w-10 h-10 rounded-full border border-emerald-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-sm">
                    {getInitials(googleUser.displayName || googleUser.email || "G")}
                  </div>
                )}
                <div>
                  <span className="text-xs font-black text-text-main flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Zalogowano jako: {googleUser.displayName || "Użytkownik Google"}
                  </span>
                  <p className="text-[10px] text-text-muted font-medium">{googleUser.email}</p>
                </div>
              </div>
              <button
                onClick={onDisconnectGoogle}
                className="text-[11px] font-bold text-text-muted hover:text-rose-700 active:scale-95 transition-colors flex items-center gap-1 cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50"
                id="btn-google-drive-disconnect"
              >
                <LogOut className="w-3.5 h-3.5" />
                Odłącz konto
              </button>
            </div>

            {/* Backups Action Stats */}
            <div className="p-4 bg-surface rounded-xl border border-border grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">Nazwa pliku na dysku</span>
                <span className="text-xs font-bold text-text-main font-mono block mt-0.5">saldo_budget.json</span>
                <span className="text-[10px] text-text-muted block mt-1">Status: {gdriveFileId ? "🟢 Plik istnieje" : "⚪ Plik zostanie utworzony przy pierwszym zapisie"}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">Ostatni zapis w chmurze</span>
                <span className="text-xs font-bold text-text-main block mt-0.5">
                  {gdriveLastSynced || "Brak wykonanego zapisu"}
                </span>
                <span className="text-[10px] text-text-muted block mt-1">Dostępny do wczytania</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={onSyncToDrive}
                disabled={isDriveActionLoading}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold py-2.5 px-4 rounded-xl text-xs active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
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
                className="flex-1 inline-flex items-center justify-center gap-2 bg-surface border border-border text-text-muted hover:border-emerald-500/50 hover:text-emerald-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:active:scale-100 disabled:hover:border-border disabled:hover:text-text-muted py-2.5 px-4 rounded-xl text-xs font-bold cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
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
                  <Sparkles className="w-3.5 h-3.5 text-emerald-700 animate-pulse" />
                  Automatyczny zapis (Auto-Sync)
                </strong>
                <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                  Każda zmiana w transakcjach lub celach będzie automatycznie zapisywana na Twoim Dysku Google.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none focus-within:ring-2 focus-within:ring-emerald-500/50 rounded-full">
                <input
                  type="checkbox"
                  checked={isDriveAutoSyncEnabled}
                  onChange={(e) => onToggleDriveAutoSync(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-slate-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#137566]"></div>
              </label>
            </div>
            <p className="text-[10px] text-text-muted italic text-center">
              Uwaga: Ze względów bezpieczeństwa tokeny Google Drive są przechowywane wyłącznie w pamięci RAM. Po odświeżeniu aplikacji wystarczy kliknąć przycisk autoryzacji ponownie.
            </p>
          </div>
        )}
      </div>
      )}


      {/* SECTION: BANK ACCOUNTS */}
      {activeProfile && (settingsTab === "all" || settingsTab === "automation") && (
        <BankAccountsManager accounts={activeProfile.accounts || []} onSaveAccounts={onSaveAccounts} currency={activeProfile?.currency || 'PLN'} />
      )}
      {/* SECTION: AUTOMATED CATEGORY RULES */}
      {(settingsTab === "all" || settingsTab === "automation") && (
      <TransactionRulesManager transactionRules={transactionRules} onSaveTransactionRules={onSaveTransactionRules} />
      )}

      {/* SECTION: RECURRING TRANSACTIONS SCHEDULER */}
      {(settingsTab === "all" || settingsTab === "automation") && (
        <div className="bg-surface rounded-2xl border border-border shadow-lg p-6" id="settings-recurring-rules-card">
        <h3 className="text-xl font-black text-text-main tracking-tight mb-2 truncate">Automatyczne transakcje cykliczne</h3>
        <p className="text-sm text-text-muted mb-4 leading-relaxed">
          Skonfiguruj regularne przychody (np. pensja co miesiąc) lub koszty (np. Netflix, czynsz), aby aplikacja mogła automatycznie generować transakcje we właściwych terminach.
        </p>

        <form onSubmit={handleAddRecurringRule} className="p-4 rounded-xl bg-surface border border-border space-y-3 mb-5">
          <strong className="block text-xs font-bold text-text-muted">Utwórz nową transakcję cykliczną</strong>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Nazwa transakcji</label>
              <input
                type="text"
                value={recName}
                onChange={(e) => setRecName(e.target.value)}
                placeholder="np. Abonament Netflix, Pensja"
                className="w-full text-xs rounded-xl border border-border p-2 bg-surface outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Kwota ({activeProfile?.currency || "PLN"})</label>
              <input
                type="number"
                step="0.01"
                value={recAmount}
                onChange={(e) => setRecAmount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="np. 43.99"
                className="w-full text-xs rounded-xl border border-border p-2 bg-surface outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Typ</label>
              <select
                value={recType}
                onChange={(e) => setRecType(e.target.value as "expense" | "income")}
                className="w-full text-xs rounded-xl border border-border p-2 bg-surface outline-none focus:border-emerald-500/50"
              >
                <option value="expense">Wydatek (Koszt)</option>
                <option value="income">Przychód (Wpływ)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Kategoria</label>
              <select
                value={recCategory}
                onChange={(e) => setRecCategory(e.target.value)}
                className="w-full text-xs rounded-xl border border-border p-2 bg-surface outline-none focus:border-emerald-500/50"
              >
                {expenseCategories.concat(incomeCategories).filter((v, i, a) => a.indexOf(v) === i).map((cat) => (
                  <option key={cat} value={cat}>
                    {iconByCategory[cat] || "✨"} {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Konto / Portfel</label>
              <input
                type="text"
                value={recAccount}
                onChange={(e) => setRecAccount(e.target.value)}
                placeholder="np. Konto główne"
                className="w-full text-xs rounded-xl border border-border p-2 bg-surface outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Częstotliwość</label>
              <select
                value={recFrequency}
                onChange={(e) => setRecFrequency(e.target.value as any)}
                className="w-full text-xs rounded-xl border border-border p-2 bg-surface outline-none focus:border-emerald-500/50"
              >
                <option value="weekly">Co tydzień</option>
                <option value="biweekly">Co dwa tygodnie</option>
                <option value="monthly">Co miesiąc</option>
                <option value="quarterly">Co kwartał</option>
                <option value="yearly">Co rok</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Pierwszy termin płatności</label>
              <input
                type="date"
                value={recNextDate}
                onChange={(e) => setRecNextDate(e.target.value)}
                className="w-full text-xs rounded-xl border border-border p-2 bg-surface outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold py-2.5 px-6 rounded-xl text-xs active:scale-[0.98] transition-all shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
            >
              ＋ Dodaj harmonogram płatności
            </button>
          </div>
        </form>

        {recurringRules.length === 0 ? (
          <p className="text-xs text-text-muted italic text-center py-4">Brak zdefiniowanych transakcji cyklicznych.</p>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-left border-collapse text-xs min-w-[600px]">
                <thead>
                  <tr className="bg-surface border-b border-border text-text-muted font-bold">
                    <th className="py-2 px-3">Nazwa / Kategoria</th>
                    <th className="py-2 px-3">Częstotliwość</th>
                    <th className="py-2 px-3">Najbliższy termin</th>
                    <th className="py-2 px-3">Konto</th>
                    <th className="py-2 px-3 text-right">Kwota</th>
                    <th className="py-2 px-3 text-center">Status</th>
                    <th className="py-2 px-3 text-right">Akcja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-surface">
                  {recurringRules.map((r) => {
                    const freqLabels = {
                      weekly: "Co tydzień",
                      biweekly: "Co 2 tygodnie",
                      monthly: "Co miesiąc",
                      quarterly: "Co kwartał",
                      yearly: "Co rok"
                    };
                    return (
                      <tr key={r.id} className={`hover:bg-surface/50 transition ${!r.isActive ? "opacity-60" : ""}`}>
                        <td className="py-2.5 px-3">
                          <strong className="block text-text-main">{r.name}</strong>
                          <span className="text-[10px] text-text-muted font-medium">
                            {r.categoryIcon} {r.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-text-muted">
                          {freqLabels[r.frequency] || r.frequency}
                        </td>
                        <td className="py-2.5 px-3 text-text-muted font-mono">
                          {r.nextDueDate}
                        </td>
                        <td className="py-2.5 px-3 text-text-muted">
                          {r.account}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-black ${r.type === "income" ? "text-emerald-600" : "text-rose-700"}`}>
                          {r.type === "income" ? "+" : "-"} {r.amount.toFixed(2)} {activeProfile?.currency || "PLN"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleRecurringRule(r.id)}
                            className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold cursor-pointer border active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
                              r.isActive
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-surface border-border text-text-muted"
                            }`}
                          >
                            {r.isActive ? "Aktywny" : "Wstrzymany"}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteRecurringRule(r.id)}
                            className="text-[10px] font-bold text-[#d55e50] hover:underline active:scale-95 transition-all rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50"
                          >
                            Usuń
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
      {(settingsTab === "all" || settingsTab === "automation" || settingsTab === "backup") && (
        <div className="bg-surface rounded-2xl border border-border shadow-lg p-6" id="settings-sync-security-card">
        <h3 className="text-base font-bold text-text-main mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-700" />
          Synchronizacja i bezpieczeństwo
        </h3>
        
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
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800">
                        <CheckCircle className="w-3 h-3" /> Zalogowano
                      </span>
                      <p className="text-[11px] text-text-muted mt-1 truncate">{googleUser.email}</p>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-text-muted">
                        Tryb lokalny
                      </span>
                    </div>
                  )}
                  
                  <div className="mt-3 pt-3 border-t border-border">
                    <h5 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Baza danych (Firestore)</h5>
                    {isFirebaseConfigured ? (
                      googleUser ? (
                        <span className="text-[11px] font-medium text-emerald-600">Aktywna (Synchronizacja w czasie rzeczywistym)</span>
                      ) : (
                        <span className="text-[11px] font-medium text-amber-700">Gotowa (Wymaga logowania)</span>
                      )
                    ) : (
                      <span className="text-[11px] font-medium text-text-muted">Brak konfiguracji</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* AI State */}
            <div className="bg-surface rounded-xl p-4 border border-border/30">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-text-muted shrink-0" />
                <div className="w-full">
                  <h4 className="text-sm font-bold text-text-main flex justify-between items-center">
                    Asystent AI
                    {state.aiMode === "cloud" && (
                      <button
                        onClick={() => saveState({ ...state, aiMode: "none" })}
                        className="text-[10px] font-bold text-rose-700 hover:underline active:scale-95 transition-transform"
                      >
                        Wyłącz w chmurze
                      </button>
                    )}
                  </h4>
                  <div className="mt-1">
                    {state.aiMode === "cloud" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface text-text-muted">
                        AI w chmurze
                      </span>
                    ) : state.aiMode === "local" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800">
                        AI Lokalne
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-text-muted">
                        Brak AI
                      </span>
                    )}
                    <p className="text-[10px] text-text-muted mt-2 leading-relaxed">
                      {state.aiMode === "cloud" ? "Zależnie od funkcji, wybrane anonimowe dane mogą być wysyłane do API LLM w celu analizy." : "Żadne dane nie opuszczają tego urządzenia dla celów sztucznej inteligencji."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Integrations & Security */}
          <div className="space-y-4">
            <div className="bg-surface rounded-xl p-4 border border-border/30">
              <div className="flex items-start gap-3">
                <Database className="w-5 h-5 text-blue-500 shrink-0" />
                <div className="w-full">
                  <h4 className="text-sm font-bold text-text-main">Google Drive</h4>
                  <div className="mt-1 flex items-center justify-between">
                    {gdriveFileId ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        <CheckCircle className="w-3 h-3" /> Połączony
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-text-muted">
                        Niepołączony
                      </span>
                    )}
                    
                    {!gdriveFileId && (
                      <button
                        onClick={onConnectGoogle}
                        disabled={isDriveActionLoading}
                        className="text-[10px] font-bold text-emerald-700 hover:underline disabled:opacity-50 active:scale-95 transition-transform rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                      >
                        Połącz Dysk Google
                      </button>
                    )}
                  </div>
                  
                  {gdriveFileId && (
                    <div className="mt-2 flex justify-between items-center">
                      <p className="text-[10px] text-text-muted">
                        Ostatnia kopia: {gdriveLastSynced ? new Date(gdriveLastSynced).toLocaleString("pl-PL") : "Brak danych o ostatniej synchronizacji"}
                      </p>
                      <button
                        onClick={onSyncToDrive}
                        disabled={isDriveActionLoading}
                        className="text-[10px] font-bold text-emerald-700 hover:underline disabled:opacity-50 active:scale-95 transition-transform rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
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
                <Calendar className="w-5 h-5 text-purple-500 shrink-0" />
                <div className="w-full">
                  <h4 className="text-sm font-bold text-text-main">Google Calendar</h4>
                  <div className="mt-1 flex items-center justify-between">
                    {calendarToken ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                        <CheckCircle className="w-3 h-3" /> Połączony
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-text-muted">
                        Niepołączony
                      </span>
                    )}
                    
                    {!calendarToken && onConnectCalendar && (
                      <button
                        onClick={onConnectCalendar}
                        className="text-[10px] font-bold text-emerald-700 hover:underline active:scale-95 transition-transform rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
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
                <Lock className="w-5 h-5 text-amber-500 shrink-0" />
                <div className="w-full">
                  <h4 className="text-sm font-bold text-text-main">Zabezpieczenie profilu (PIN)</h4>
                  <div className="mt-1 flex justify-between items-center">
                    {activeProfile?.pinHash ? (
                      <>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800">
                          Aktywne
                        </span>
                        {unlockedProfileId !== activeProfile.id ? (
                          <span className="text-[10px] font-bold text-amber-700 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Zablokowany
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                            Odblokowany
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-text-muted">
                        Nieaktywne
                      </span>
                    )}
                    
                    {activeProfile?.pinHash && unlockedProfileId !== activeProfile.id && (
                      <button
                        onClick={onOpenPinModal}
                        className="text-[10px] font-bold text-emerald-700 hover:underline active:scale-95 transition-transform rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                      >
                        Odblokuj profil
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* SECTION 5: LOCAL FILES & RESET */}
      {(settingsTab === "all" || settingsTab === "backup") && (
        <div className="bg-surface rounded-2xl border border-border shadow-lg p-6" id="settings-local-tools-card">
        <h3 className="text-xl font-black text-text-main tracking-tight mb-2 truncate">Lokalna kopia zapasowa i reset</h3>
        <p className="text-sm text-text-muted mb-4 leading-relaxed">
          Zarządzaj lokalnymi kopiami zapasowymi. Możesz zapisać plik JSON z całą bazą danych na dysku komputera/telefonu lub wczytać go bezpośrednio do pamięci urządzenia.
        </p>

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
                document.getElementById("local-backup-file-input")?.click();
              }
            }}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
              dragActive
                ? "border-emerald-500/50 bg-emerald-50"
                : "border-border hover:border-slate-200 bg-surface"
            }`}
            onClick={() => document.getElementById("local-backup-file-input")?.click()}
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
            <p className="text-[10px] text-text-muted mt-1">
              Przeciągnij i upuść plik kopii zapasowej tutaj lub kliknij aby wyszukać na urządzeniu
            </p>
          </div>
        ) : (
          /* File Preview Card before actual restoration - VERY PREMIUM! */
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="text-xs font-black text-amber-800">Podgląd wczytywanego pliku</strong>
                <p className="text-[10px] text-amber-700 mt-0.5">
                  Wczytanie tych danych zastąpi wszystkie obecne profile i ich transakcje. Sprawdź zawartość pliku przed zatwierdzeniem:
                </p>
              </div>
            </div>

            <div className="bg-surface-2 border border-amber-100 rounded-xl p-3 space-y-1.5 min-w-0">
              <div className="flex justify-between text-[11px] text-text-muted">
                <span>Liczba profili w kopii:</span>
                <strong className="text-text-muted">{filePreview.profiles?.length || 0}</strong>
              </div>
              <div className="flex justify-between text-[11px] text-text-muted">
                <span>Dostępne profile:</span>
                <strong className="text-emerald-700 truncate max-w-[180px]">
                  {filePreview.profiles?.map((p) => p.name).join(", ") || "Brak"}
                </strong>
              </div>
              <div className="flex justify-between text-[11px] text-text-muted">
                <span>Łączna liczba wpisów transakcji:</span>
                <strong className="text-text-muted">
                  {filePreview.profiles?.reduce((acc: number, p) => acc + (p.transactions?.length || 0), 0) || 0}
                </strong>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={confirmLocalImport}
                className="flex-1 bg-amber-600 text-white font-bold py-2 rounded-xl text-xs hover:bg-amber-700 active:scale-[0.98] transition-all cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
              >
                ✓ Nadpisz dane i przywróć
              </button>
              <button
                onClick={() => setFilePreview(null)}
                className="px-4 bg-surface border border-border text-text-muted hover:text-text-main rounded-xl text-sm font-medium active:scale-[0.98] transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
              >
                Anuluj
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-xl p-4">
            <h4 className="text-sm font-bold text-text-main mb-3">Eksport danych aktywnego profilu</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => {
                  if (activeProfile && activeProfile.transactions) {
                    const csv = generateCsvContent(activeProfile.transactions);
                    downloadFile(csv, `saldo-${activeProfile.name}-transakcje.csv`, "text/csv;charset=utf-8;");
                  }
                }}
                className="bg-surface border border-border text-text-muted hover:border-emerald-500/50 hover:text-emerald-700 active:scale-[0.98] transition-all py-2 px-3 rounded-xl text-xs font-bold shadow-sm cursor-pointer flex items-center gap-2 justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
              >
                📊 Pobierz CSV
              </button>
              <button
                onClick={() => {
                  if (activeProfile) {
                    const now = new Date();
                    generateReportPdf(activeProfile, now.getFullYear(), now.getMonth(), activeProfile.currency || "PLN");
                  }
                }}
                className="bg-surface border border-border text-text-muted hover:border-emerald-500/50 hover:text-emerald-700 active:scale-[0.98] transition-all py-2 px-3 rounded-xl text-xs font-bold shadow-sm cursor-pointer flex items-center gap-2 justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
              >
                📄 Pobierz raport PDF
              </button>
            </div>
          </div>
          
          <div className="bg-surface border border-border rounded-xl p-4">
            <h4 className="text-sm font-bold text-text-main mb-3">Kopia zapasowa systemu</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={async () => {
                  const safeState = await prepareStateForRemoteSave(state);
                  const json = JSON.stringify(safeState, null, 2);
                  downloadFile(json, `saldo-kopia-zaszyfrowana.json`, "application/json");
                }}
                className="bg-surface border border-border text-text-muted hover:border-emerald-500/50 hover:text-emerald-700 active:scale-[0.98] transition-all py-2 px-3 rounded-xl text-xs font-bold shadow-sm cursor-pointer flex items-center gap-2 justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
              >
                🔒 Eksport zaszyfrowanej kopii
              </button>
              <button
                onClick={() => {
                  if (activeProfile?.pinHash && activeProfileId !== unlockedProfileId) {
                    onOpenPinModal();
                    return;
                  }
                  if (window.confirm("Ten plik będzie zawierał czytelne dane finansowe. Zapisz go w bezpiecznym miejscu.")) {
                    const json = JSON.stringify(state, null, 2);
                    downloadFile(json, `saldo-kopia-czytelna.json`, "application/json");
                  }
                }}
                className="bg-surface border border-border text-text-muted hover:border-emerald-500/50 hover:text-emerald-700 active:scale-[0.98] transition-all py-2 px-3 rounded-xl text-xs font-bold shadow-sm cursor-pointer flex items-center gap-2 justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
              >
                🔓 Eksport czytelnych danych
              </button>
            </div>
          </div>

          <button
            onClick={onResetData}
            className="w-full bg-rose-50 text-[#d55e50] border border-rose-100 hover:bg-rose-100 hover:border-rose-200 active:scale-[0.98] transition-all py-3 rounded-xl text-xs font-bold shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50"
            id="btn-reset-db-data"
          >
            ⚠️ Przywróć stan początkowy (Usuń wszystko)
          </button>
        </div>
      </div>
      )}
        </div>
      </div>

      {profileToDelete && (
        <div className="fixed inset-0 bg-black/60  z-[999] flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-6 shadow-xl border border-border/30 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
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
                className="flex-1 bg-surface hover:bg-surface-2 text-text-muted font-bold py-3 rounded-xl active:scale-[0.98] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
              >
                Anuluj
              </button>
              <button
                onClick={() => {
                  onDeleteProfile(profileToDelete);
                  setProfileToDelete(null);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-sm active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50"
              >
                Usuń profil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
