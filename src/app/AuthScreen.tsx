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
    if (err.message && err.message.includes("auth/unauthorized-domain")) {
      setIsDomainError(true);
      setError(`Domena ${window.location.hostname} nie jest autoryzowana.`);
    } else {
      setIsDomainError(false);
      setError(err.message || "Błąd uwierzytelniania.");
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="bg-[#137566] text-white p-3 rounded-2xl shadow-lg">
              <Wallet className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-[34px] font-black text-[#153a35] tracking-tight">saldo</h1>
          <p className="text-gray-500">Twój osobisty asystent finansowy</p>
        </div>

        {error && !isDomainError && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        {error && isDomainError && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Brak autoryzacji domeny</p>
                <p className="mb-2">
                  Domena <strong>{window.location.hostname}</strong> nie jest dopisana do listy autoryzowanych domen w Firebase.
                </p>
                <ol className="list-decimal pl-4 space-y-1 mb-2 text-amber-900 opacity-90">
                  <li>Otwórz Firebase Console</li>
                  <li>Wybierz Authentication &gt; Settings &gt; Authorized domains</li>
                  <li>Dodaj tę domenę</li>
                </ol>
                {window.location.hostname !== 'localhost' && (
                  <button 
                    type="button" 
                    onClick={() => window.open(window.location.href, "_blank")} 
                    className="mt-2 text-[#137566] hover:underline font-medium"
                  >
                    Otwórz aplikację w nowej karcie
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#137566] focus:ring-1 focus:ring-[#137566] transition"
                placeholder="twoj@email.com"
              />
              <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hasło</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#137566] focus:ring-1 focus:ring-[#137566] transition"
                placeholder="••••••••"
              />
              <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#137566] text-white py-3 rounded-xl font-medium hover:bg-[#1a9c88] transition flex items-center justify-center gap-2"
          >
            {loading ? "Przetwarzanie..." : isLogin ? <><LogIn className="w-5 h-5" /> Zaloguj się</> : <><UserPlus className="w-5 h-5" /> Zarejestruj się</>}
          </button>
        </form>

        <div className="text-center text-sm">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-[#137566] font-medium hover:underline"
          >
            {isLogin ? "Nie masz konta? Zarejestruj się" : "Masz już konto? Zaloguj się"}
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">lub</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition flex items-center justify-center gap-2 shadow-sm"
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
            className="w-full bg-emerald-50 text-[#137566] py-3 rounded-xl font-medium hover:bg-emerald-100 transition shadow-sm"
          >
            Używaj offline (bez rejestracji)
          </button>
        </div>
      </div>
    </div>
  );
}
