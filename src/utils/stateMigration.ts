import { AppState, Profile, RecurringRule, TransactionRule } from "../types";
import { getLocalDateIso } from "../utils";

export const CURRENT_SCHEMA_VERSION = 1;

// Helper to validate and migrate state safely
interface RawRule {
  id: string;
  profileId?: string;
  [key: string]: unknown;
}

function isRuleLike(val: unknown): val is RawRule {
  return (
    typeof val === "object" &&
    val !== null &&
    "id" in val &&
    typeof (val as { id: unknown }).id === "string" &&
    (val as { id: string }).id.trim() !== ""
  );
}

function normalizeRecurringRule(raw: RawRule, defaultCurrency: import("../types").SupportedCurrency): RecurringRule {
  const obj = raw as Record<string, unknown>;
  const freq = String(obj.frequency || "monthly");
  const validFreq: RecurringRule["frequency"] = ["weekly", "biweekly", "monthly", "quarterly", "yearly"].includes(freq)
    ? (freq as RecurringRule["frequency"])
    : "monthly";

  const ruleType = obj.type === "income" ? "income" : "expense";

  const rawDueDate = typeof obj.nextDueDate === "string" ? obj.nextDueDate.trim() : "";
  const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDueDate);
  const nextDueDate = isValidDate ? rawDueDate : getLocalDateIso();

  return {
    id: String(obj.id),
    name: String(obj.name || "Reguła cykliczna"),
    amount: typeof obj.amount === "number" && !isNaN(obj.amount) ? obj.amount : Number(obj.amount) || 0,
    type: ruleType,
    category: String(obj.category || "Inne"),
    ...(typeof obj.categoryIcon === "string" ? { categoryIcon: obj.categoryIcon } : {}),
    account: String(obj.account || "Konto główne"),
    frequency: validFreq,
    nextDueDate,
    ...(typeof obj.lastGeneratedDate === "string" ? { lastGeneratedDate: obj.lastGeneratedDate } : {}),
    ...(Array.isArray(obj.tags) ? { tags: obj.tags.map(String) } : {}),
    isActive: typeof obj.isActive === "boolean" ? obj.isActive : true,
    ...(obj.paidBy === "me" || obj.paidBy === "partner" || obj.paidBy === "joint" ? { paidBy: obj.paidBy } : {}),
    ...(obj.splitMode === "none" || obj.splitMode === "equal" ? { splitMode: obj.splitMode } : {}),
    currency: (typeof obj.currency === "string" ? obj.currency : defaultCurrency) as import("../types").SupportedCurrency
  };
}

function normalizeTransactionRule(raw: RawRule): TransactionRule {
  const obj = raw as Record<string, unknown>;
  return {
    id: String(obj.id),
    pattern: String(obj.pattern || ""),
    category: String(obj.category || "Inne"),
    ...(typeof obj.categoryIcon === "string" ? { categoryIcon: obj.categoryIcon } : {}),
    ...(typeof obj.profileId === "string" && obj.profileId.trim() !== "" ? { profileId: obj.profileId } : {})
  };
}

function findTargetProfile(
  ruleProfileId: string | undefined,
  originalActiveProfileId: string | null,
  profiles: Profile[]
): Profile | null {
  // 1. If rule explicitly specified profileId
  if (ruleProfileId) {
    return profiles.find((p) => p.id === ruleProfileId) || null;
  }
  // 2. If no profileId specified, but originalActiveProfileId exists in RAW
  if (originalActiveProfileId) {
    return profiles.find((p) => p.id === originalActiveProfileId) || null;
  }
  // 3. If no profileId specified, no originalActiveProfileId in RAW, and exactly 1 profile exists
  if (profiles.length === 1) {
    return profiles[0];
  }
  // 4. Fallback: null (unmigrated)
  return null;
}

// Klucze najwyższego poziomu AppState dopuszczone do zapisu w chmurze.
// UWAGA: każda zmiana tej listy wymaga aktualizacji hasOnly([...]) w firestore.rules,
// inaczej Firestore odrzuci CAŁY zapis błędem permission-denied.
export const SYNCABLE_STATE_KEYS = [
  "profiles",
  "schemaVersion",
  "updatedAt",
  "activeProfileId",
  "driveFileId",
  "recurringRules",
  "transactionRules",
  "smartRules",
  "debts",
  "debtPayoffScenarios",
  "aiMode",
  "localAiEndpoint",
  "localAiModel",
  "autoLockMinutes",
  "lastModifiedBy"
] as const;

/**
 * Zwraca payload zawierający wyłącznie klucze dozwolone przez firestore.rules.
 * Chroni synchronizację przed nieznanymi polami (np. z zaimportowanej kopii JSON).
 */
export function pickSyncableState(state: AppState): Partial<AppState> {
  const source = state as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of SYNCABLE_STATE_KEYS) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out as Partial<AppState>;
}

/**
 * Świeży stan początkowy z jednym pustym profilem.
 */
export function createEmptyState(lastModifiedBy = "użytkownik"): AppState {
  const emptyProfile: Profile = {
    id: crypto.randomUUID(),
    name: "Mój profil",
    kind: "personal",
    transactions: [],
    payments: [],
    goals: [],
    investments: [],
    currency: "PLN",
    budgets: {}
  };

  return {
    profiles: [emptyProfile],
    activeProfileId: emptyProfile.id,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    lastModifiedBy,
    driveFileId: null,
    recurringRules: [],
    transactionRules: []
  };
}

export function validateAndMigrateState(raw: unknown, defaultEmail = "użytkownik"): AppState {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const migrated: AppState = {
    profiles: Array.isArray(data.profiles) ? data.profiles : [],
    activeProfileId: typeof data.activeProfileId === "string" ? data.activeProfileId : null,
    schemaVersion: typeof data.schemaVersion === "number" ? data.schemaVersion : CURRENT_SCHEMA_VERSION,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString(),
    lastModifiedBy: typeof data.lastModifiedBy === "string" ? data.lastModifiedBy : defaultEmail,
    driveFileId: typeof data.driveFileId === "string" ? data.driveFileId : null,
    recurringRules: Array.isArray(data.recurringRules) ? data.recurringRules : [],
    transactionRules: Array.isArray(data.transactionRules) ? data.transactionRules : []
  };

  // Ustawienia aplikacji przechowywane na poziomie AppState — bez tego znikały przy
  // każdym przeładowaniu (migracja przepisuje stan od zera).
  if (data.aiMode === "local") {
    migrated.aiMode = "local";
  } else if (data.aiMode === "none" || data.aiMode === "cloud") {
    migrated.aiMode = "none";
  }
  if (typeof data.localAiEndpoint === "string") {
    migrated.localAiEndpoint = data.localAiEndpoint;
  }
  if (typeof data.localAiModel === "string") {
    migrated.localAiModel = data.localAiModel;
  }
  if (typeof data.autoLockMinutes === "number" && Number.isFinite(data.autoLockMinutes)) {
    migrated.autoLockMinutes = data.autoLockMinutes;
  }

  // Ensure each profile is fully typed with all arrays initialized
  migrated.profiles = migrated.profiles.map((p: unknown) => {
    const profileObj = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
    const rawRecurring = Array.isArray(profileObj.recurringRules) ? profileObj.recurringRules : [];
    const rawTx = Array.isArray(profileObj.transactionRules) ? profileObj.transactionRules : [];

    const profile: Profile = {
      id: String(profileObj.id || crypto.randomUUID()),
      name: String(profileObj.name || "Profil"),
      kind: (profileObj.kind === "shared" ? "shared" : "personal") as "personal" | "shared",
      partnerName: profileObj.partnerName ? String(profileObj.partnerName) : undefined,
      avatar: profileObj.avatar ? String(profileObj.avatar) : undefined,
      pinHash: profileObj.pinHash ? String(profileObj.pinHash) : undefined,
      salt: profileObj.salt ? String(profileObj.salt) : undefined,
      encryptedPayload: profileObj.encryptedPayload ? String(profileObj.encryptedPayload) : undefined,
      accounts: Array.isArray(profileObj.accounts) ? profileObj.accounts : [],
      transactions: Array.isArray(profileObj.transactions)
        ? profileObj.transactions.map((t: any) => {
            const txObj = (t && typeof t === "object" ? t : {}) as Record<string, unknown>;
            const rawDebtId = typeof txObj.debtId === "string" ? txObj.debtId.trim() : undefined;
            const cleanTx = {
              ...t,
              currency: t.currency || (typeof profileObj.currency === "string" ? profileObj.currency : (data.currencyPreference ?? "PLN"))
            };
            if (rawDebtId) {
              cleanTx.debtId = rawDebtId;
            } else {
              delete cleanTx.debtId;
            }
            return cleanTx;
          })
        : [],
      payments: Array.isArray(profileObj.payments) ? profileObj.payments.map((p: any) => ({ ...p, currency: p.currency || (typeof profileObj.currency === "string" ? profileObj.currency : (data.currencyPreference ?? "PLN")) })) : [],
      goals: Array.isArray(profileObj.goals) ? profileObj.goals : [],
      investments: Array.isArray(profileObj.investments) ? profileObj.investments : [],
      budgets: profileObj.budgets && typeof profileObj.budgets === "object" ? (profileObj.budgets as Record<string, number>) : {},
      recurringRules: rawRecurring.filter(isRuleLike).map((r) => normalizeRecurringRule(r, (typeof profileObj.currency === "string" ? profileObj.currency : (data.currencyPreference ?? "PLN")) as import("../types").SupportedCurrency)),
      transactionRules: rawTx.filter(isRuleLike).map((r) => {
        const clean = normalizeTransactionRule(r);
        delete clean.profileId;
        return clean;
      }),
      settlements: Array.isArray(profileObj.settlements) ? profileObj.settlements : [],
      debts: Array.isArray(profileObj.debts) ? profileObj.debts : [],
      currency: (typeof profileObj.currency === "string" ? profileObj.currency : (data.currencyPreference ?? "PLN")) as import("../types").SupportedCurrency
    };

    // Ensure Goals are migrated with optional transfers list
    profile.goals = profile.goals.map((g: unknown) => {
      const goalObj = (g && typeof g === "object" ? g : {}) as Record<string, unknown>;
      return {
        id: String(goalObj.id || ""),
        name: String(goalObj.name || "Cel"),
        target: Number(goalObj.target || 0),
        saved: Number(goalObj.saved || 0),
        transfers: Array.isArray(goalObj.transfers) ? goalObj.transfers : [],
        ...(goalObj.targetDate ? { targetDate: String(goalObj.targetDate) } : {}),
        currency: (goalObj.currency || (typeof profileObj.currency === "string" ? profileObj.currency : (data.currencyPreference ?? "PLN"))) as import("../types").SupportedCurrency
      };
    });

    profile.investments = profile.investments.map((i: unknown) => {
      const invObj = (i && typeof i === "object" ? i : {}) as Record<string, unknown>;
      return {
        id: String(invObj.id || ""),
        name: String(invObj.name || "Inwestycja"),
        amount: Number(invObj.amount || 0),
        isoDate: String(invObj.isoDate || getLocalDateIso()),
        ...(invObj.type ? { type: String(invObj.type) } : {}),
        ...(invObj.notes ? { notes: String(invObj.notes) } : {}),
        currency: (invObj.currency || (typeof profileObj.currency === "string" ? profileObj.currency : (data.currencyPreference ?? "PLN"))) as import("../types").SupportedCurrency
      };
    });

    return profile;
  });

  const originalActiveProfileId = (typeof data.activeProfileId === "string" && data.activeProfileId.trim() !== "")
    ? data.activeProfileId
    : null;

  if (!migrated.activeProfileId) {
    migrated.activeProfileId = null;
  }

  // --- MIGRATION: AppState.recurringRules to Profile.recurringRules ---
  if (migrated.recurringRules && migrated.recurringRules.length > 0) {
    const unmigratedRules: RecurringRule[] = [];

    for (const rawRule of migrated.recurringRules) {
      if (!isRuleLike(rawRule)) {
        continue;
      }

      const ruleProfileId = typeof rawRule.profileId === "string" && rawRule.profileId.trim() !== "" ? rawRule.profileId : undefined;
      const targetProfile = findTargetProfile(ruleProfileId, originalActiveProfileId, migrated.profiles);

      if (targetProfile) {
        const cleanRule = normalizeRecurringRule(rawRule, targetProfile.currency);
        if (!targetProfile.recurringRules) {
          targetProfile.recurringRules = [];
        }
        const exists = targetProfile.recurringRules.some((r) => r.id === cleanRule.id);
        if (!exists) {
          targetProfile.recurringRules.push(cleanRule);
        }
      } else {
        const cleanUnmigrated = normalizeRecurringRule(rawRule, (data.currencyPreference ?? "PLN") as import("../types").SupportedCurrency);
        if (ruleProfileId) {
          (cleanUnmigrated as RecurringRule & { profileId?: string }).profileId = ruleProfileId;
        }
        unmigratedRules.push(cleanUnmigrated);
      }
    }

    migrated.recurringRules = unmigratedRules;
  }

  // --- MIGRATION: AppState.transactionRules to Profile.transactionRules ---
  if (migrated.transactionRules && migrated.transactionRules.length > 0) {
    const unmigratedRules: TransactionRule[] = [];

    for (const rawRule of migrated.transactionRules) {
      if (!isRuleLike(rawRule)) {
        continue;
      }

      const ruleProfileId = typeof rawRule.profileId === "string" && rawRule.profileId.trim() !== "" ? rawRule.profileId : undefined;
      const targetProfile = findTargetProfile(ruleProfileId, originalActiveProfileId, migrated.profiles);

      if (targetProfile) {
        const cleanRule = normalizeTransactionRule(rawRule);
        delete cleanRule.profileId;
        if (!targetProfile.transactionRules) {
          targetProfile.transactionRules = [];
        }
        const exists = targetProfile.transactionRules.some((r) => r.id === cleanRule.id);
        if (!exists) {
          targetProfile.transactionRules.push(cleanRule);
        }
      } else {
        const cleanUnmigrated = normalizeTransactionRule(rawRule);
        if (ruleProfileId) {
          cleanUnmigrated.profileId = ruleProfileId;
        }
        unmigratedRules.push(cleanUnmigrated);
      }
    }

    migrated.transactionRules = unmigratedRules;
  }

  return migrated;
}
