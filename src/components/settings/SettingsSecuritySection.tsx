import React, { useState, useEffect } from "react";
import type { User } from "firebase/auth";
import {
  ShieldCheck,
  Shield,
  Lock,
  Cloud,
  CheckCircle,
  Database,
  Calendar,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
  UserX,
  LogOut,
  Trash2,
  Fingerprint
} from "lucide-react";
import { AppState, Profile } from "../../types";
import { hashPin } from "../../utils";
import { isFirebaseConfigured, changePassword, changeEmail, logout, deleteOwnAccount } from "../../firebase";
import { clearState } from "../../services/localDb";
import { activeKeys } from "../../services/crypto";
import { ConfirmModal } from "../ConfirmModal";

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

interface SettingsSecuritySectionProps {
  state: AppState;
  saveState: (s: AppState) => Promise<void>;
  activeProfile?: Profile;
  unlockedProfileId?: string | null;
  googleUser: User | null;
  gdriveFileId: string | null;
  gdriveLastSynced: string | null;
  isDriveActionLoading: boolean;
  calendarToken?: string | null;
  onConnectCalendar?: () => Promise<void>;
  onConnectGoogle: () => Promise<void>;
  onSyncToDrive: () => Promise<void>;
  onOpenPinModal: () => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  showPinCard?: boolean;
  showAccountSecurity?: boolean;
}

export function SettingsSecuritySection({
  state,
  saveState,
  activeProfile,
  unlockedProfileId,
  googleUser,
  gdriveFileId,
  gdriveLastSynced,
  isDriveActionLoading,
  calendarToken,
  onConnectCalendar,
  onConnectGoogle,
  onSyncToDrive,
  onOpenPinModal,
  showToast,
  showPinCard = true,
  showAccountSecurity = true
}: SettingsSecuritySectionProps) {
  // Biometrics Touch ID states
  const [biometricsStatus, setBiometricsStatus] = useState<{ available: boolean; isEnrolledForProfile: boolean }>({
    available: false,
    isEnrolledForProfile: false
  });
  const [isEnrollingBiometrics, setIsEnrollingBiometrics] = useState(false);
  const [enrollPinInput, setEnrollPinInput] = useState("");
  const [enrollPinError, setEnrollPinError] = useState("");
  const [isEnrollingLoading, setIsEnrollingLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.electronAPI?.checkBiometricsStatus && activeProfile?.id) {
      window.electronAPI.checkBiometricsStatus(activeProfile.id).then((status) => {
        if (status) setBiometricsStatus(status);
      }).catch(() => {});
    }
  }, [activeProfile?.id]);

  const handleEnrollBiometrics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile || !window.electronAPI?.saveBiometricsPin) return;
    setEnrollPinError("");
    setIsEnrollingLoading(true);

    try {
      const salt = activeProfile.salt || activeProfile.id;
      const hashed = await hashPin(enrollPinInput, salt);
      if (hashed !== activeProfile.pinHash) {
        setEnrollPinError("Nieprawidłowy kod PIN. Podaj aktualny kod tego profilu.");
        setIsEnrollingLoading(false);
        return;
      }

      const res = await window.electronAPI.saveBiometricsPin(activeProfile.id, enrollPinInput);
      if (res.success) {
        setBiometricsStatus(prev => ({ ...prev, isEnrolledForProfile: true }));
        setIsEnrollingBiometrics(false);
        setEnrollPinInput("");
        showToast("Włączono Touch ID dla profilu!", "success");
      } else {
        setEnrollPinError(res.error || "Błąd zapisu danych biometrycznych.");
      }
    } catch (err: any) {
      setEnrollPinError(err?.message || "Błąd weryfikacji PIN.");
    } finally {
      setIsEnrollingLoading(false);
    }
  };

  const handleDisableBiometrics = async () => {
    if (!activeProfile || !window.electronAPI?.removeBiometricsPin) return;
    try {
      await window.electronAPI.removeBiometricsPin(activeProfile.id);
      setBiometricsStatus(prev => ({ ...prev, isEnrolledForProfile: false }));
      showToast("Wyłączono logowanie Touch ID.", "info");
    } catch {
      showToast("Nie udało się wyłączyć Touch ID.", "error");
    }
  };

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

  // Device reset and cloud deletion states
  const [showDeviceResetConfirm, setShowDeviceResetConfirm] = useState(false);
  const [showCloudDeleteModal, setShowCloudDeleteModal] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState("");
  const [deleteAccountPhrase, setDeleteAccountPhrase] = useState("");
  const [deleteAccountError, setDeleteAccountError] = useState("");
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [showDeletePwd, setShowDeletePwd] = useState(false);

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
    <div className="space-y-6">
      {/* SECTION: PIN SECURITY */}
      {showPinCard && activeProfile && (
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

          {/* Biometrics / Touch ID Card */}
          {activeProfile.pinHash && biometricsStatus.available && (
            <div className="mt-4 pt-4 border-t border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-text-main flex items-center gap-1.5">
                    <Fingerprint className="w-4 h-4 text-brand" />
                    <span>Logowanie biometryczne (Touch ID)</span>
                  </span>
                  <p className="text-xs text-text-muted mt-0.5">
                    {biometricsStatus.isEnrolledForProfile
                      ? "Touch ID jest aktywne. Możesz odblokowywać ten profil odciskiem palca."
                      : "Możesz odblokowywać ten profil za pomocą Touch ID na tym urządzeniu."}
                  </p>
                </div>
                <div>
                  {biometricsStatus.isEnrolledForProfile ? (
                    <button
                      type="button"
                      onClick={handleDisableBiometrics}
                      className="bg-surface border border-danger/30 text-danger hover:bg-danger-subtle font-bold py-2 px-3.5 rounded-xl text-xs active:scale-[0.98] transition-all shadow-xs shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                      id="btn-disable-biometrics"
                    >
                      Wyłącz Touch ID
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEnrollingBiometrics(prev => !prev);
                        setEnrollPinError("");
                      }}
                      className="bg-surface border border-border/70 text-brand hover:bg-brand-subtle font-bold py-2 px-3.5 rounded-xl text-xs active:scale-[0.98] transition-all shadow-xs shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                      id="btn-enable-biometrics"
                    >
                      {isEnrollingBiometrics ? "Anuluj" : "Włącz Touch ID"}
                    </button>
                  )}
                </div>
              </div>

              {isEnrollingBiometrics && !biometricsStatus.isEnrolledForProfile && (
                <form onSubmit={handleEnrollBiometrics} className="mt-4 p-4 rounded-xl bg-surface-2 border border-border/70 space-y-3">
                  <p className="text-xs text-text-muted">
                    Wpisz swój obecny kod PIN, aby bezpiecznie powiązać profil z Touch ID (zapis w bezpiecznym magazynie macOS):
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]{4,8}"
                      placeholder="Aktualny PIN"
                      value={enrollPinInput}
                      onChange={(e) => setEnrollPinInput(e.target.value)}
                      required
                      className="w-full sm:w-48 px-3 py-2 text-sm rounded-xl border border-border bg-surface text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring"
                      id="input-enroll-pin"
                    />
                    <button
                      type="submit"
                      disabled={isEnrollingLoading || !enrollPinInput}
                      className="px-4 py-2 bg-brand text-text-inverse font-bold text-xs rounded-xl hover:bg-brand-hover active:scale-[0.98] transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      id="btn-submit-enroll-pin"
                    >
                      {isEnrollingLoading ? "Zapisywanie..." : "Potwierdź i włącz"}
                    </button>
                  </div>
                  {enrollPinError && (
                    <p className="text-xs text-danger font-semibold">{enrollPinError}</p>
                  )}
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* SECTION: SYNC & SECURITY */}
      {showAccountSecurity && (
        <>
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

          {/* Security & PIN */}
          <div className="space-y-4">

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

                  {activeProfile?.pinHash && (
                    <div className="mt-3 pt-3 border-t border-border/30">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-text-muted">Auto-lock po bezczynności</span>
                        <select
                          value={state.autoLockMinutes !== undefined ? state.autoLockMinutes : 5}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            void saveState({ ...state, autoLockMinutes: val });
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
                            aria-label={showEmailPwd ? "Ukryj hasło" : "Pokaż hasło"}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
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
                            aria-label={showPwds ? "Ukryj hasło" : "Pokaż hasło"}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
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

      {/* SECTION: PRIVACY & DEVICE MANAGEMENT */}
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
      </>
      )}

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
                  void handleLocalDeviceReset();
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
                      aria-label={showDeletePwd ? "Ukryj hasło" : "Pokaż hasło"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
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
