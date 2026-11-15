/**
 * Jedno źródło prawdy dla listy hostów w CSP `connect-src`.
 * Używane przez server.ts (helmet) i pilnowane testem względem firebase.json
 * (src/server/csp.test.ts) — wcześniej obie kopie rozjechały się, a CSP wyłączony
 * w trybie dev ukrywał brakujące hosty (np. api.anthropic.com).
 */
export function getConnectSrc(isElectron: boolean): string[] {
  return [
    "'self'",
    "https://apis.google.com",
    "https://*.googleapis.com",
    "https://securetoken.googleapis.com",
    "https://firestore.googleapis.com",
    "https://identitytoolkit.googleapis.com",
    // Doradca AI z własnym kluczem (BYOK) woła Claude bezpośrednio z renderera
    // (src/services/ai/providers/anthropicProvider.ts). Gemini jest pokryte przez *.googleapis.com.
    "https://api.anthropic.com",
    // Kursy walut (src/services/currencyService.ts)
    "https://api.nbp.pl",
    // Lokalny model AI (Ollama) wołany z przeglądarki (src/services/localAi.ts)
    "http://localhost:11434",
    "http://127.0.0.1:11434",
    // Sprawdzanie/pobieranie aktualizacji (UpdateManager/UpdateToast) — tylko aplikacja desktopowa.
    ...(isElectron ? ["https://api.github.com", "https://github.com", "https://objects.githubusercontent.com"] : [])
  ];
}
