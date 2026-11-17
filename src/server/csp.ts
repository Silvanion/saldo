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
    // Kursy walut (src/services/currencyService.ts)
    "https://api.nbp.pl",
    // Sprawdzanie/pobieranie aktualizacji (UpdateManager/UpdateToast) — tylko aplikacja desktopowa.
    ...(isElectron ? ["https://api.github.com", "https://github.com", "https://objects.githubusercontent.com"] : [])
  ];
}
