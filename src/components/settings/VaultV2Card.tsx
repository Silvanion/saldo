import React, { useState, useEffect, useCallback } from "react";
import {
  KeyRound,
  ShieldCheck,
  Lock,
  Unlock,
  Key,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Eye,
  EyeOff,
  Sparkles
} from "lucide-react";
import {
  vaultExists,
  isVaultUnlocked,
  lockVault,
  createVault,
  unlockVault,
  changeVaultPassword,
  unlockVaultWithRecovery
} from "../../services/vaultV2";
import { MIN_PASSWORD_LENGTH } from "../../services/cryptoV2";

export interface VaultV2CardProps {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export function VaultV2Card({ showToast }: VaultV2CardProps) {
  const [hasVault, setHasVault] = useState<boolean>(false);
  const [unlocked, setUnlocked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Dialog states
  const [dialogMode, setDialogMode] = useState<"none" | "create" | "unlock" | "change" | "recover">("none");
  const [passwordInput, setPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [oldPasswordInput, setOldPasswordInput] = useState("");
  const [recoveryKeyInput, setRecoveryKeyInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Recovery Key display after creation
  const [generatedRecoveryKey, setGeneratedRecoveryKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [confirmedSavedKey, setConfirmedSavedKey] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const exists = await vaultExists();
      setHasVault(exists);
      setUnlocked(isVaultUnlocked());
    } catch (err) {
      console.warn("Failed to check vault status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const resetForm = () => {
    setPasswordInput("");
    setConfirmPasswordInput("");
    setOldPasswordInput("");
    setRecoveryKeyInput("");
    setShowPassword(false);
    setErrorMsg("");
    setActionLoading(false);
  };

  const closeDialog = () => {
    setDialogMode("none");
    resetForm();
  };

  // --- Handlers ---

  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (passwordInput.length < MIN_PASSWORD_LENGTH) {
      setErrorMsg(`Hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków.`);
      return;
    }
    if (passwordInput !== confirmPasswordInput) {
      setErrorMsg("Hasła nie są identyczne.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await createVault(passwordInput);
      setGeneratedRecoveryKey(res.recoveryKey);
      setConfirmedSavedKey(false);
      setCopiedKey(false);
      showToast("Skarbiec v2 został pomyślnie utworzony!", "success");
      await refreshStatus();
    } catch (err: any) {
      setErrorMsg(err?.message || "Wystąpił błąd podczas tworzenia skarbca.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlockVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!passwordInput) {
      setErrorMsg("Wprowadź hasło główne.");
      return;
    }

    setActionLoading(true);
    try {
      await unlockVault(passwordInput);
      showToast("Skarbiec został odblokowany.", "success");
      closeDialog();
      await refreshStatus();
    } catch (err: any) {
      setErrorMsg(err?.message || "Nieprawidłowe hasło główne.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!oldPasswordInput) {
      setErrorMsg("Wprowadź aktualne hasło główne.");
      return;
    }
    if (passwordInput.length < MIN_PASSWORD_LENGTH) {
      setErrorMsg(`Nowe hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków.`);
      return;
    }
    if (passwordInput !== confirmPasswordInput) {
      setErrorMsg("Nowe hasła nie są identyczne.");
      return;
    }

    setActionLoading(true);
    try {
      await changeVaultPassword(oldPasswordInput, passwordInput);
      showToast("Hasło główne zostało zmienione. Klucz DEK został przepakowany.", "success");
      closeDialog();
      await refreshStatus();
    } catch (err: any) {
      setErrorMsg(err?.message || "Wystąpił błąd podczas zmiany hasła.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecoverVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!recoveryKeyInput.trim()) {
      setErrorMsg("Wprowadź 26-znakowy klucz odzyskiwania.");
      return;
    }
    if (passwordInput.length < MIN_PASSWORD_LENGTH) {
      setErrorMsg(`Nowe hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków.`);
      return;
    }
    if (passwordInput !== confirmPasswordInput) {
      setErrorMsg("Nowe hasła nie są identyczne.");
      return;
    }

    setActionLoading(true);
    try {
      await unlockVaultWithRecovery(recoveryKeyInput.trim(), passwordInput);
      showToast("Skarbiec został pomyślnie odzyskany nowym hasłem!", "success");
      closeDialog();
      await refreshStatus();
    } catch (err: any) {
      setErrorMsg(err?.message || "Nieprawidłowy klucz odzyskiwania.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLockVault = () => {
    lockVault();
    setUnlocked(false);
    showToast("Skarbiec został zablokowany. Klucz sesji usunięty z pamięci.", "info");
  };

  const handleCopyRecoveryKey = async () => {
    if (!generatedRecoveryKey) return;
    try {
      await navigator.clipboard.writeText(generatedRecoveryKey);
      setCopiedKey(true);
      showToast("Klucz odzyskiwania skopiowany do schowka.", "success");
      setTimeout(() => setCopiedKey(false), 3000);
    } catch {
      showToast("Nie udało się skopiować klucza do schowka.", "error");
    }
  };

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border/70 p-5 animate-pulse">
        <div className="h-4 bg-surface-hover rounded w-1/3 mb-2" />
        <div className="h-3 bg-surface-hover rounded w-2/3" />
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl border border-border/70 shadow-xs p-5 sm:p-6" id="settings-vault-v2-card">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-text-main">
                Skarbiec v2 • Hasło Główne (Zero-Knowledge)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20">
                SEC-02
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
              Architektura DEK/KEK 256-bit AES z PBKDF2 (600 000 iteracji) oraz jednorazowym kluczem odzyskiwania.
            </p>
          </div>
        </div>
      </div>

      {/* Vault Status Box */}
      {!hasVault ? (
        <div className="p-4 rounded-xl bg-surface-2/60 border border-border/70 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />
            <div className="text-xs text-text-muted leading-relaxed">
              <strong className="text-text-main block mb-0.5">
                Skarbiec nie został jeszcze aktywowany
              </strong>
              Twój profil korzysta obecnie z zabezpieczenia PIN (v1). Aktywacja Skarbca v2 generuje
              losowy klucz szyfrowania danych (DEK 256-bit AES), który jest bezpiecznie opakowany Twoim
              hasłem głównym. Żadne dane nie są dostępne bez hasła ani klucza odzyskiwania.
            </div>
          </div>

          <div className="pt-1 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setGeneratedRecoveryKey(null);
                setDialogMode("create");
              }}
              className="bg-brand hover:bg-brand-dark text-white font-bold py-2.5 px-4 rounded-xl text-xs active:scale-[0.98] transition-all shadow-xs shrink-0 cursor-pointer flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-focus-ring"
              id="btn-activate-vault-v2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Aktywuj Skarbiec v2 i Hasło Główne</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface-2/60 border border-border/70">
            <div>
              <span className="text-xs font-bold text-text-main flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Skarbiec v2 jest aktywny (AES-GCM-256)</span>
              </span>
              <p className="text-xs text-text-muted mt-0.5">
                Stan sesji:{" "}
                <strong className={unlocked ? "text-emerald-500" : "text-amber-500"}>
                  {unlocked ? "Odblokowany (klucz w pamięci)" : "Zablokowany"}
                </strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {unlocked ? (
                <button
                  type="button"
                  onClick={handleLockVault}
                  className="bg-surface border border-border/70 text-text-main hover:bg-surface-hover font-bold py-2 px-3 rounded-xl text-xs active:scale-[0.98] transition-all shadow-xs cursor-pointer flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Zablokuj sesję</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setDialogMode("unlock");
                  }}
                  className="bg-brand hover:bg-brand-dark text-white font-bold py-2 px-3.5 rounded-xl text-xs active:scale-[0.98] transition-all shadow-xs cursor-pointer flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Odblokuj hasłem</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setDialogMode("change");
                }}
                className="bg-surface border border-border/70 text-text-main hover:bg-surface-hover font-bold py-2 px-3 rounded-xl text-xs active:scale-[0.98] transition-all shadow-xs cursor-pointer flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <Key className="w-3.5 h-3.5 text-brand" />
                <span>Zmień hasło</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setDialogMode("recover");
                }}
                className="bg-surface border border-border/70 text-text-muted hover:text-text-main font-bold py-2 px-3 rounded-xl text-xs active:scale-[0.98] transition-all shadow-xs cursor-pointer flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Odzyskaj kluczem</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG 1: TWORZENIE SKARBCZA */}
      {dialogMode === "create" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-border/70 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {!generatedRecoveryKey ? (
              <form onSubmit={handleCreateVault} className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center shrink-0">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-main">
                      Aktywacja Skarbca v2 • Nowe Hasło Główne
                    </h3>
                    <p className="text-[11px] text-text-muted">
                      Hasło musi mieć co najmniej 12 znaków.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                  <strong>Ważne:</strong> Saldo działa w modelu zero-knowledge. Nikt poza Tobą nie zna tego hasła. Po utworzeniu otrzymasz jednorazowy klucz odzyskiwania.
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-danger-subtle text-danger text-xs border border-danger/20 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-text-main mb-1">
                    Hasło główne (min. 12 znaków)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-xl border border-border p-2.5 pr-10 bg-surface text-sm font-medium focus-visible:ring-2 focus-visible:ring-focus-ring"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-main mb-1">
                    Powtórz hasło główne
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-border p-2.5 bg-surface text-sm font-medium focus-visible:ring-2 focus-visible:ring-focus-ring"
                    required
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={closeDialog}
                    disabled={actionLoading}
                    className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main rounded-xl border border-border"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 text-xs font-bold text-white bg-brand hover:bg-brand-dark rounded-xl shadow-xs disabled:opacity-50"
                  >
                    {actionLoading ? "Generowanie kluczy..." : "Utwórz Skarbiec v2"}
                  </button>
                </div>
              </form>
            ) : (
              /* EKRAN JEDNORAZOWEGO KLUCZA ODZYSKIWANIA */
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-main">
                      Twój Jednorazowy Klucz Odzyskiwania
                    </h3>
                    <p className="text-[11px] text-text-muted">
                      Zapisz go w bezpiecznym miejscu (kartka, menedżer haseł).
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface-2 border border-border/80 text-center space-y-2">
                  <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                    Klucz odzyskiwania (26 znaków Crockford Base32)
                  </span>
                  <div className="font-mono text-base sm:text-lg font-bold text-brand tracking-widest break-all select-all">
                    {generatedRecoveryKey}
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleCopyRecoveryKey}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-xs font-bold hover:bg-surface-hover"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKey ? "Skopiowano!" : "Skopiuj klucz do schowka"}</span>
                  </button>
                </div>

                <div className="p-3 bg-danger-subtle border border-danger/20 rounded-xl text-xs text-danger leading-relaxed">
                  <strong>Ostrzeżenie:</strong> Ten klucz nie będzie już nigdy więcej wyświetlony. Jeśli zapomnisz hasła i nie będziesz posiadać tego klucza, dane profilu będą bezpowrotnie utracone.
                </div>

                <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmedSavedKey}
                    onChange={(e) => setConfirmedSavedKey(e.target.checked)}
                    className="mt-0.5 rounded border-border text-brand focus:ring-brand"
                  />
                  <span className="text-xs text-text-main font-semibold">
                    Zapisałem klucz odzyskiwania w bezpiecznym miejscu poza urządzeniem.
                  </span>
                </label>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={!confirmedSavedKey}
                    onClick={closeDialog}
                    className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-brand hover:bg-brand-dark rounded-xl shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Dokończ i zamknij
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DIALOG 2: ODBLOKOWANIE SKARBCA */}
      {dialogMode === "unlock" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <form onSubmit={handleUnlockVault} className="bg-surface border border-border/70 w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center shrink-0">
                <Unlock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-main">
                  Odblokuj Skarbiec v2
                </h3>
                <p className="text-[11px] text-text-muted">
                  Wprowadź hasło główne, aby odszyfrować klucz sesji DEK.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-danger-subtle text-danger text-xs border border-danger/20 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-text-main mb-1">
                Hasło główne
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-border p-2.5 pr-10 bg-surface text-sm font-medium focus-visible:ring-2 focus-visible:ring-focus-ring"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setDialogMode("recover");
                }}
                className="text-xs text-brand hover:underline font-semibold"
              >
                Zapomniałeś hasła?
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main rounded-xl border border-border"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-brand hover:bg-brand-dark rounded-xl shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? "Odblokowywanie..." : "Odblokuj"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* DIALOG 3: ZMIANA HASŁA GŁÓWNEGO */}
      {dialogMode === "change" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <form onSubmit={handleChangePassword} className="bg-surface border border-border/70 w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center shrink-0">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-main">
                  Zmień Hasło Główne Skarbca
                </h3>
                <p className="text-[11px] text-text-muted">
                  Klucz DEK zostanie przepakowany bez konieczności ponownego szyfrowania danych.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-danger-subtle text-danger text-xs border border-danger/20 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-text-main mb-1">
                Aktualne hasło główne
              </label>
              <input
                type="password"
                value={oldPasswordInput}
                onChange={(e) => setOldPasswordInput(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-border p-2.5 bg-surface text-sm font-medium focus-visible:ring-2 focus-visible:ring-focus-ring"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-main mb-1">
                Nowe hasło główne (min. 12 znaków)
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-border p-2.5 bg-surface text-sm font-medium focus-visible:ring-2 focus-visible:ring-focus-ring"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-main mb-1">
                Powtórz nowe hasło główne
              </label>
              <input
                type="password"
                value={confirmPasswordInput}
                onChange={(e) => setConfirmPasswordInput(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-border p-2.5 bg-surface text-sm font-medium focus-visible:ring-2 focus-visible:ring-focus-ring"
                required
              />
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={closeDialog}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main rounded-xl border border-border"
              >
                Anuluj
              </button>
              <button
                type="submit"
                id="btn-submit-change-password"
                disabled={actionLoading}
                className="px-5 py-2 text-xs font-bold text-white bg-brand hover:bg-brand-dark rounded-xl shadow-xs disabled:opacity-50"
              >
                {actionLoading ? "Zapisywanie..." : "Zapisz nowe hasło"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DIALOG 4: ODZYSKIWANIE DOSTĘPU KLUCZEM */}
      {dialogMode === "recover" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <form onSubmit={handleRecoverVault} className="bg-surface border border-border/70 w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center shrink-0">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-main">
                  Odzyskiwanie Skarbca Kluczem Awaryjnym
                </h3>
                <p className="text-[11px] text-text-muted">
                  Wprowadź 26-znakowy klucz odzyskiwania oraz ustaw nowe hasło.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-danger-subtle text-danger text-xs border border-danger/20 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-text-main mb-1">
                Klucz odzyskiwania (np. ABCD-EFGH-...)
              </label>
              <input
                type="text"
                value={recoveryKeyInput}
                onChange={(e) => setRecoveryKeyInput(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXXXX"
                className="w-full font-mono rounded-xl border border-border p-2.5 bg-surface text-sm font-semibold tracking-wider focus-visible:ring-2 focus-visible:ring-focus-ring"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-main mb-1">
                Nowe hasło główne (min. 12 znaków)
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-border p-2.5 bg-surface text-sm font-medium focus-visible:ring-2 focus-visible:ring-focus-ring"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-main mb-1">
                Powtórz nowe hasło główne
              </label>
              <input
                type="password"
                value={confirmPasswordInput}
                onChange={(e) => setConfirmPasswordInput(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-border p-2.5 bg-surface text-sm font-medium focus-visible:ring-2 focus-visible:ring-focus-ring"
                required
              />
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={closeDialog}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main rounded-xl border border-border"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 text-xs font-bold text-white bg-brand hover:bg-brand-dark rounded-xl shadow-xs disabled:opacity-50"
              >
                {actionLoading ? "Weryfikacja..." : "Odzyskaj i ustaw nowe hasło"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
