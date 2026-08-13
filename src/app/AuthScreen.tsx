import React, { useState } from "react";
import { Wallet, Mail, Lock, LogIn, UserPlus, AlertTriangle } from "lucide-react";
import { loginWithEmail, registerWithEmail, googleSignInBasic } from "../firebase";

interface AuthScreenProps {
  onDemoClick: () => void;
}

export function AuthScreen({ onDemoClick }: AuthScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [isDomainError, setIsDomainError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleError = (err: any) => {
    const code = err?.code || "";
    const msg = err?.message || "";

    if (msg.includes("auth/unauthorized-domain") || code === "auth/unauthorized-domain") {
      setIsDomainError(true);
      setError(`Domena ${window.location.hostname} nie jest autoryzowana.`);
    } else if (code === "auth/popup-closed-by-user" || msg.includes("popup-closed-by-user")) {
      setIsDomainError(false);
      setError("Okno logowania Google zostało zamknięte przed ukończeniem autoryzacji.");
    } else if (
      code === "auth/popup-blocked" ||
      code === "auth/cancelled-popup-request" ||
      msg.includes("popup-blocked") ||
      msg.includes("zablokowane przez przeglądarkę")
    ) {
      setIsDomainError(false);
      setError("Okno logowania zostało zablokowane przez przeglądarkę. Rozpoczynamy przekierowanie...");
    } else if (code === "auth/network-request-failed" || msg.includes("network-request-failed") || msg.includes("zablokowane (np. przez rozszerzenie")) {
      setIsDomainError(false);
      setError("Połączenie z usługą autoryzacji Google zostało zablokowane przez AdBlocka lub rozszerzenie prywatności. Wyłącz blokowanie dla tej strony.");
    } else {
      setIsDomainError(false);
      setError(msg || "Błąd uwierzytelniania.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsDomainError(false);
    setLoading(true);
    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setIsDomainError(false);
    setLoading(true);
    try {
      await googleSignInBasic();
    } catch (err: any) {
      handleError(err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-bg-base/95 backdrop-blur-2xl rounded-3xl shadow-sm border border-border p-8 sm:p-10 space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="bg-brand text-text-inverse p-3.5 rounded-2xl shadow-lg">
              <Wallet className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-[34px] font-black text-text-main tracking-tight">saldo</h1>
          <p className="text-text-muted">Twój osobisty asystent finansowy</p>
        </div>

        {error && !isDomainError && (
          <div className="bg-danger-subtle text-danger border border-danger/20 p-3 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        {error && isDomainError && (
          <div className="bg-warning-subtle border border-warning/20 text-warning p-4 rounded-xl text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="font-bold mb-1">Brak autoryzacji domeny</p>
                <p className="mb-2 break-words">
                  Domena <strong className="break-all">{window.location.hostname}</strong> nie jest dopisana do listy autoryzowanych domen w Firebase.
                </p>
                <ol className="list-decimal pl-4 space-y-1 mb-2 text-warning opacity-90">
                  <li>Otwórz Firebase Console</li>
                  <li>Wybierz Authentication &gt; Settings &gt; Authorized domains</li>
                  <li>Dodaj tę domenę</li>
                </ol>
                {window.location.hostname !== 'localhost' && (
                  <button 
                    type="button" 
                    onClick={() => window.open(window.location.href, "_blank")} 
                    className="mt-2 text-text-main hover:text-brand hover:underline font-bold"
                  >
                    Otwórz aplikację w nowej karcie
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Email</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3.5 bg-surface border border-border rounded-xl focus-visible:ring-2 focus-visible:ring-focus-ring transition text-sm font-medium"
                placeholder="twoj@email.com"
              />
              <Mail className="absolute left-4 top-3.5 w-5 h-5 text-text-muted" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Hasło</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3.5 bg-surface border border-border rounded-xl focus-visible:ring-2 focus-visible:ring-focus-ring transition text-sm font-medium"
                placeholder="••••••••"
              />
              <Lock className="absolute left-4 top-3.5 w-5 h-5 text-text-muted" />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-text-inverse py-3.5 rounded-xl font-bold hover:bg-brand-hover transition flex items-center justify-center gap-2 shadow-sm mt-2"
          >
            {loading ? "Przetwarzanie..." : isLogin ? <><LogIn className="w-5 h-5" /> Zaloguj się</> : <><UserPlus className="w-5 h-5" /> Zarejestruj się</>}
          </button>
        </form>

        <div className="text-center text-sm">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-text-muted font-bold hover:text-text-main hover:underline"
          >
            {isLogin ? "Nie masz konta? Zarejestruj się" : "Masz już konto? Zaloguj się"}
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-surface/50 text-text-muted">lub</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-surface border border-border text-text-main py-3.5 rounded-xl font-bold hover:bg-surface-2 transition flex items-center justify-center gap-2 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Zaloguj z Google
          </button>
          
          <button
            type="button"
            onClick={onDemoClick}
            disabled={loading}
            className="w-full bg-surface border border-border text-text-main py-3.5 rounded-xl font-bold hover:bg-surface-2 transition"
          >
            Używaj offline (bez rejestracji)
          </button>
        </div>
      </div>
    </div>
  );
}
