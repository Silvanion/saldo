// Polityka biometrii/przechowywania sekretów (audyt SEC-07).
//
// Na Windows Electron nie ma API monitu Windows Hello, więc PIN profilu odszyfrowywany samym DPAPI
// wracałby do renderera bez żadnego pytania — dostępny dla każdego kodu w oknie aplikacji. Dlatego
// PIN profilu jest przechowywany wyłącznie na macOS (z Touch ID). Te same handlery IPC obsługują
// jednak także klucze API AI (SecurityVault, prefiks poniżej) — one muszą dalej działać na każdej platformie.

const VAULT_PREFIX = "saldo_vault_sec_";

function isVaultKey(id) {
  return typeof id === "string" && id.startsWith(VAULT_PREFIX);
}

function canStoreProfilePin(platform) {
  return platform === "darwin";
}

function isBiometricsAvailable({ platform, canPromptTouchID, encryptionAvailable }) {
  return platform === "darwin" && Boolean(canPromptTouchID) && Boolean(encryptionAvailable);
}

// Zwraca dane bez zapisanych PIN-ów profili na platformach, które ich nie obsługują.
function purgeUnsupportedProfilePins(platform, data) {
  if (canStoreProfilePin(platform)) return data;
  const kept = {};
  for (const [id, value] of Object.entries(data || {})) {
    if (isVaultKey(id)) kept[id] = value;
  }
  return kept;
}

module.exports = { VAULT_PREFIX, isVaultKey, canStoreProfilePin, isBiometricsAvailable, purgeUnsupportedProfilePins };
