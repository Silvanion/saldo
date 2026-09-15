import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Fingerprint,
  Lock,
  Plus,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Delete,
  ArrowLeft,
  KeyRound,
  ShieldAlert
} from "lucide-react";
import { Profile } from "../../types";
import { AuthService } from "../../services/authService";
import { ModernAvatar } from "../avatar/ModernAvatar";

interface ProfileSelectionScreenProps {
  profiles: Profile[];
  onSelectProfile?: (profile: Profile) => void;
  onUnlockSuccess: (profile: Profile, pin?: string) => void;
  onStartOnboarding: () => void;
  onEnterDemo: () => void;
  isBiometricsSupported?: boolean;
}

export const ProfileSelectionScreen: React.FC<ProfileSelectionScreenProps> = ({
  profiles,
  onUnlockSuccess,
  onStartOnboarding,
  onEnterDemo,
  isBiometricsSupported = true
}) => {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [pinInput, setPinInput] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  // Sprawdzanie i odliczanie blokady czasowej anti-bruteforce
  useEffect(() => {
    if (!selectedProfile?.lockedUntil) {
      setLockoutSeconds(0);
      return;
    }
    const updateCountdown = () => {
      const remaining = Math.ceil(
        (new Date(selectedProfile.lockedUntil!).getTime() - Date.now()) / 1000
      );
      if (remaining <= 0) {
        setLockoutSeconds(0);
        setErrorMessage(null);
      } else {
        setLockoutSeconds(remaining);
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [selectedProfile]);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleProfileClick = async (profile: Profile) => {
    setErrorMessage(null);
    setPinInput("");

    // Jeśli profil jest bez hasła (np. demo lub niezabezpieczony)
    if (!profile.pinHash && !profile.hasBiometrics && !profile.passkeyCredentialId) {
      onUnlockSuccess(profile);
      return;
    }

    setSelectedProfile(profile);

    // Jeśli profil ma włączoną biometrię / Passkey i nie jest zablokowany, wywołaj od razu
    const isLocked = profile.lockedUntil && new Date(profile.lockedUntil).getTime() > Date.now();
    if ((profile.hasBiometrics || profile.passkeyCredentialId) && !isLocked) {
      handleBiometricAuth(profile);
    }
  };

  const handleBiometricAuth = async (profile: Profile) => {
    if (lockoutSeconds > 0) return;
    setIsAuthenticating(true);
    setErrorMessage(null);
    try {
      const result = await AuthService.authenticateBiometrics(profile.id, `Odblokuj profil: ${profile.name}`);
      if (result.success) {
        onUnlockSuccess(profile);
      } else if (result.error) {
        setErrorMessage(result.error);
        triggerShake();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Błąd weryfikacji biometrycznej.");
      triggerShake();
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handlePinSubmit = async (pinToVerify: string) => {
    if (!selectedProfile || lockoutSeconds > 0) return;
    setIsAuthenticating(true);
    setErrorMessage(null);

    try {
      const result = await AuthService.verifyPin(pinToVerify, selectedProfile);
      if (result.isValid) {
        onUnlockSuccess({
          ...selectedProfile,
          failedAttempts: 0,
          lockedUntil: null
        }, pinToVerify);
      } else {
        // Aktualizacja lokalnego stanu profilu o nowe próby
        setSelectedProfile(prev => prev ? {
          ...prev,
          failedAttempts: result.failedAttempts,
          lockedUntil: result.lockedUntil
        } : null);

        setErrorMessage(result.errorMessage || "Nieprawidłowy kod PIN.");
        triggerShake();
        setPinInput("");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Wystąpił błąd weryfikacji PIN.");
      triggerShake();
      setPinInput("");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleKeyPress = (num: string) => {
    if (lockoutSeconds > 0 || isAuthenticating) return;
    if (pinInput.length < 8) {
      const nextPin = pinInput + num;
      setPinInput(nextPin);
      if (nextPin.length >= 4 && selectedProfile?.pinHash) {
        // Automatyczna próba weryfikacji jeśli długość osiągnęła typową długość PIN (np. 4)
        if (nextPin.length === 4) {
          handlePinSubmit(nextPin);
        }
      }
    }
  };

  const handleDeleteDigit = () => {
    if (lockoutSeconds > 0 || isAuthenticating) return;
    setPinInput(prev => prev.slice(0, -1));
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-main flex flex-col justify-center items-center p-4 sm:p-6 md:p-8 relative overflow-hidden">
      {/* Tło ozdobne z delikatnymi gradientami */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand/10 rounded-full blur-3xl pointer-events-none" />

      <AnimatePresence mode="wait">
        {!selectedProfile ? (
          /* ========================================================================= */
          /* WIDOK SIATKI PROFILI (PROFILE GRID VIEW)                                   */
          /* ========================================================================= */
          <motion.div
            key="profile-grid"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-4xl flex flex-col items-center z-10"
          >
            {/* Nagłówek */}
            <div className="text-center mb-8 sm:mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border/80 text-xs font-semibold text-text-muted mb-4 shadow-xs">
                <ShieldCheck className="w-4 h-4 text-brand" />
                Zero-Knowledge Vault • Bezpieczny Magazyn
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-main mb-2">
                Kto dzisiaj zarządza budżetem?
              </h1>
              <p className="text-sm sm:text-base text-text-muted max-w-md mx-auto">
                Wybierz profil, aby odblokować swoje finanse za pomocą Touch ID, Passkey lub kodu PIN.
              </p>
            </div>

            {/* Siatka profili */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 w-full mb-8">
              {profiles.map(profile => {
                const isLocked = profile.lockedUntil && new Date(profile.lockedUntil).getTime() > Date.now();
                return (
                  <motion.button
                    key={profile.id}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleProfileClick(profile)}
                    className={`relative p-6 rounded-2xl border text-left flex flex-col justify-between transition-all group cursor-pointer ${
                      isLocked
                        ? "bg-danger/5 border-danger/30 hover:border-danger/50"
                        : "bg-surface border-border/80 hover:border-brand/50 hover:shadow-md"
                    }`}
                  >
                    {/* Górna belka profilu */}
                    <div className="flex items-center justify-between mb-4">
                      <ModernAvatar iconId={profile.avatar} colorId={profile.color} size="lg" className="shadow-inner group-hover:scale-105 transition-transform" />
                      <div className="flex items-center gap-1.5">
                        {profile.is_demo ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            Demo
                          </span>
                        ) : profile.pinHash ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Zabezpieczony
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-surface-2 text-text-muted border border-border">
                            Otwarty
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Nazwa profilu */}
                    <div>
                      <h3 className="font-bold text-lg text-text-main group-hover:text-brand transition-colors">
                        {profile.name}
                      </h3>
                      <p className="text-xs text-text-muted mt-0.5">
                        {profile.kind === "shared" ? "Profil Wspólny (z partnerem)" : "Profil Osobisty"}
                      </p>
                    </div>

                    {/* Wskaźnik biometrii / blokady na dole karty */}
                    <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-text-muted">
                      <div className="flex items-center gap-1">
                        {profile.hasBiometrics || profile.passkeyCredentialId ? (
                          <span className="flex items-center gap-1 text-brand font-medium">
                            <Fingerprint className="w-3.5 h-3.5" /> Biometria / Passkey
                          </span>
                        ) : profile.pinHash ? (
                          <span className="flex items-center gap-1 text-text-muted">
                            <KeyRound className="w-3.5 h-3.5" /> Kod PIN
                          </span>
                        ) : (
                          <span>Bez hasła</span>
                        )}
                      </div>
                      {isLocked && (
                        <span className="text-danger flex items-center gap-1 font-bold">
                          <ShieldAlert className="w-3.5 h-3.5" /> Zablokowany
                        </span>
                      )}
                    </div>
                  </motion.button>
                );
              })}

              {/* Karta Nowy Profil */}
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={onStartOnboarding}
                className="p-6 rounded-2xl border-2 border-dashed border-border/80 hover:border-brand/60 bg-surface/40 hover:bg-surface text-center flex flex-col items-center justify-center min-h-[160px] transition-all group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-brand/10 text-brand flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="font-bold text-sm text-text-main group-hover:text-brand transition-colors">
                  Utwórz nowy profil
                </span>
                <span className="text-xs text-text-muted mt-1">
                  Kreator z biometrią i Passkey
                </span>
              </motion.button>
            </div>

            {/* Dolny przycisk szybkiego startu / trybu demo */}
            <div className="flex items-center gap-3">
              <button
                onClick={onEnterDemo}
                className="px-5 py-2.5 rounded-xl bg-surface border border-border/80 hover:border-brand/40 text-xs font-bold text-text-muted hover:text-text-main transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                Uruchom w trybie demonstracyjnym (Gość)
              </button>
            </div>
          </motion.div>
        ) : (
          /* ========================================================================= */
          /* WIDOK ODBLOKOWYWANIA (PIN KEYPAD & BIOMETRIC PROMPT VIEW)                 */
          /* ========================================================================= */
          <motion.div
            key="pin-view"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-sm flex flex-col items-center z-10"
          >
            {/* Przycisk powrotu */}
            <div className="w-full flex justify-start mb-4">
              <button
                onClick={() => {
                  setSelectedProfile(null);
                  setPinInput("");
                  setErrorMessage(null);
                }}
                className="p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-surface transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Wróć do wyboru profili
              </button>
            </div>

            {/* Karta Autoryzacji */}
            <motion.div
              animate={isShaking ? { x: [-12, 12, -8, 8, -4, 4, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="w-full bg-surface border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col items-center"
            >
              {/* Awatar i nazwa */}
              <ModernAvatar iconId={selectedProfile.avatar} colorId={selectedProfile.color} size="lg" className="shadow-inner mb-3" />
              <h2 className="text-xl font-extrabold text-text-main text-center">
                {selectedProfile.name}
              </h2>
              <p className="text-xs text-text-muted text-center mt-1">
                Wprowadź kod PIN lub użyj biometrii
              </p>

              {/* Wyświetlacz kropek PIN */}
              <div className="flex gap-3 my-6">
                {[0, 1, 2, 3].map(idx => (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${
                      pinInput.length > idx
                        ? "bg-brand scale-110 shadow-xs"
                        : "bg-surface-2 border border-border"
                    }`}
                  />
                ))}
              </div>

              {/* Komunikat o błędzie lub odliczaniu blokady */}
              {lockoutSeconds > 0 ? (
                <div className="mb-4 px-3 py-2 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs text-center font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Profil zablokowany. Poczekaj {lockoutSeconds}s...
                </div>
              ) : errorMessage ? (
                <div className="mb-4 text-danger text-xs font-bold text-center">
                  {errorMessage}
                </div>
              ) : null}

              {/* Klawiatura numeryczna PIN */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] mb-4">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(digit => (
                  <button
                    key={digit}
                    onClick={() => handleKeyPress(digit)}
                    disabled={lockoutSeconds > 0 || isAuthenticating}
                    className="h-14 rounded-2xl bg-surface-2 hover:bg-surface-offset active:scale-95 text-lg font-bold text-text-main transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                  >
                    {digit}
                  </button>
                ))}

                {/* Lewy dolny przycisk: Biometria / Touch ID / Passkey */}
                <button
                  onClick={() => handleBiometricAuth(selectedProfile)}
                  disabled={lockoutSeconds > 0 || isAuthenticating || !isBiometricsSupported}
                  title="Autoryzacja Biometryczna (Touch ID / Windows Hello / Passkey)"
                  className="h-14 rounded-2xl bg-brand/10 hover:bg-brand/20 text-brand active:scale-95 transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Fingerprint className="w-6 h-6" />
                </button>

                {/* Cyfra 0 */}
                <button
                  onClick={() => handleKeyPress("0")}
                  disabled={lockoutSeconds > 0 || isAuthenticating}
                  className="h-14 rounded-2xl bg-surface-2 hover:bg-surface-offset active:scale-95 text-lg font-bold text-text-main transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                >
                  0
                </button>

                {/* Prawy dolny przycisk: Kasowanie */}
                <button
                  onClick={handleDeleteDigit}
                  disabled={lockoutSeconds > 0 || isAuthenticating || pinInput.length === 0}
                  title="Usuń ostatnią cyfrę"
                  className="h-14 rounded-2xl bg-surface-2 hover:bg-surface-offset active:scale-95 text-text-muted hover:text-text-main transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>

              {/* Ręczny przycisk zatwierdzenia jeśli PIN ma inną długość */}
              {pinInput.length >= 4 && (
                <button
                  onClick={() => handlePinSubmit(pinInput)}
                  disabled={lockoutSeconds > 0 || isAuthenticating}
                  className="w-full mt-2 py-3 rounded-xl bg-brand hover:bg-brand-hover text-text-inverse font-bold text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isAuthenticating ? "Weryfikacja..." : "Zatwierdź PIN"}
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
