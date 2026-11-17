import { Transaction, TransactionRule } from "../types";
import { iconByCategory } from "../utils/categories";

export interface CategorizationResult {
  category: string;
  categoryIcon: string;
  source: "rule" | "history" | "dictionary" | "fallback";
  matchedKeyword?: string;
  confidence: number; // 0.0 - 1.0
}

/**
 * Rozbudowany, deterministyczny słownik polskich i międzynarodowych kontrahentów,
 * marek, sklepów, instytucji oraz mediów.
 * Działa w 100% offline, deterministycznie i bez zewnętrznych modeli LLM.
 */
export const POLISH_MERCHANT_DICTIONARY: Record<string, string> = {
  // --- ŻYWNOŚĆ I ZAKUPY SPOŻYWCZE ---
  "biedronka": "Żywność",
  "lidl": "Żywność",
  "dino ": "Żywność",
  "dino polska": "Żywność",
  "kaufland": "Żywność",
  "auchan": "Żywność",
  "carrefour": "Żywność",
  "żabka": "Żywność",
  "zabka": "Żywność",
  "stokrotka": "Żywność",
  "delikatesy": "Żywność",
  "lewiatan": "Żywność",
  "netto": "Żywność",
  "społem": "Żywność",
  "spolem": "Żywność",
  "intermarche": "Żywność",
  "e.leclerc": "Żywność",
  "leclerc": "Żywność",
  "frisco": "Żywność",
  "spar": "Żywność",
  "piekarnia": "Żywność",
  "cukiernia": "Żywność",
  "rzeźnik": "Żywność",
  "mięsny": "Żywność",
  "warzywniak": "Żywność",
  "sklep spożywczy": "Żywność",
  "delikatesy centrum": "Żywność",

  // --- RESTAURACJE I GASTRONOMIA ---
  "mcdonald": "Rozrywka",
  "kfc": "Rozrywka",
  "burger king": "Rozrywka",
  "pizza": "Rozrywka",
  "pizzeria": "Rozrywka",
  "kebab": "Rozrywka",
  "sushi": "Rozrywka",
  "restauracja": "Rozrywka",
  "bistro": "Rozrywka",
  "kawiarnia": "Rozrywka",
  "starbucks": "Rozrywka",
  "costa coffee": "Rozrywka",
  "uber eats": "Rozrywka",
  "ubereats": "Rozrywka",
  "wolt": "Rozrywka",
  "pyszne": "Rozrywka",
  "glovo": "Rozrywka",
  "pub ": "Rozrywka",
  "browar": "Rozrywka",
  "lodziarnia": "Rozrywka",

  // --- TRANSPORT I PALIWO ---
  "orlen": "Transport",
  "bp ": "Transport",
  "shell": "Transport",
  "circle k": "Transport",
  "circlek": "Transport",
  "amic": "Transport",
  "moya": "Transport",
  "lotos": "Transport",
  "paliw": "Transport",
  "stacja paliw": "Transport",
  "autostrada": "Transport",
  "autonumer": "Transport",
  "autopay": "Transport",
  "e-toll": "Transport",
  "etoll": "Transport",
  "uber trip": "Transport",
  "uber *": "Transport",
  "bolt.eu": "Transport",
  "bolt trip": "Transport",
  "freenow": "Transport",
  "free now": "Transport",
  "taxi": "Transport",
  "pkp intercity": "Transport",
  "pkp ": "Transport",
  "polregio": "Transport",
  "koleje": "Transport",
  "ztm": "Transport",
  "mpk": "Transport",
  "jakdojade": "Transport",
  "biletomat": "Transport",
  "parking": "Transport",
  "parkometr": "Transport",
  "ryanair": "Transport",
  "wizzair": "Transport",
  "lot.com": "Transport",
  "wulkanizacja": "Transport",
  "warsztat samochodowy": "Transport",
  "myjnia": "Transport",

  // --- DOM, OPŁATY I RACHUNKI ---
  "pgnig": "Dom i rachunki",
  "pge ": "Dom i rachunki",
  "pge obrót": "Dom i rachunki",
  "tauron": "Dom i rachunki",
  "enea": "Dom i rachunki",
  "energa": "Dom i rachunki",
  "innogy": "Dom i rachunki",
  "e.on": "Dom i rachunki",
  "prąd": "Dom i rachunki",
  "prad": "Dom i rachunki",
  "energia": "Dom i rachunki",
  "gaz ": "Dom i rachunki",
  "gazownia": "Dom i rachunki",
  "woda": "Dom i rachunki",
  "wodociągi": "Dom i rachunki",
  "ścieki": "Dom i rachunki",
  "odpady": "Dom i rachunki",
  "śmieci": "Dom i rachunki",
  "czynsz": "Dom i rachunki",
  "spółdzielnia": "Dom i rachunki",
  "spoldzielnia": "Dom i rachunki",
  "wspólnota": "Dom i rachunki",
  "wspolnota": "Dom i rachunki",
  "orange": "Dom i rachunki",
  "play": "Dom i rachunki",
  "t-mobile": "Dom i rachunki",
  "plus.pl": "Dom i rachunki",
  "polkomtel": "Dom i rachunki",
  "upc": "Dom i rachunki",
  "vectra": "Dom i rachunki",
  "netia": "Dom i rachunki",
  "toya": "Dom i rachunki",
  "multimedia": "Dom i rachunki",
  "castorama": "Dom i rachunki",
  "leroy merlin": "Dom i rachunki",
  "obi ": "Dom i rachunki",
  "ikea": "Dom i rachunki",
  "jysk": "Dom i rachunki",
  "bricomarche": "Dom i rachunki",
  "agd": "Dom i rachunki",
  "rtv euro agd": "Dom i rachunki",
  "media markt": "Dom i rachunki",
  "media expert": "Dom i rachunki",

  // --- ZDROWIE I URODA ---
  "apteka": "Zdrowie",
  "farmacja": "Zdrowie",
  "leki": "Zdrowie",
  "doz.pl": "Zdrowie",
  "ziko": "Zdrowie",
  "gemini": "Zdrowie",
  "rossmann": "Zdrowie",
  "hebe": "Zdrowie",
  "super-pharm": "Zdrowie",
  "sephora": "Zdrowie",
  "douglas": "Zdrowie",
  "stomatolog": "Zdrowie",
  "dentysta": "Zdrowie",
  "lekarz": "Zdrowie",
  "przychodnia": "Zdrowie",
  "szpital": "Zdrowie",
  "luxmed": "Zdrowie",
  "medicover": "Zdrowie",
  "enel-med": "Zdrowie",
  "diagnostyka": "Zdrowie",
  "alablaboratoria": "Zdrowie",
  "optyk": "Zdrowie",
  "okulista": "Zdrowie",
  "fizjoterapia": "Zdrowie",
  "fryzjer": "Zdrowie",
  "barber": "Zdrowie",
  "kosmetyczka": "Zdrowie",

  // --- ROZRYWKA I KULTURA ---
  "netflix": "Rozrywka",
  "spotify": "Rozrywka",
  "youtube": "Rozrywka",
  "disney": "Rozrywka",
  "hbo": "Rozrywka",
  "max.com": "Rozrywka",
  "apple.com/bill": "Rozrywka",
  "itunes": "Rozrywka",
  "google play": "Rozrywka",
  "cinema city": "Rozrywka",
  "multikino": "Rozrywka",
  "helios": "Rozrywka",
  "kino": "Rozrywka",
  "teatr": "Rozrywka",
  "filharmonia": "Rozrywka",
  "muzeum": "Rozrywka",
  "steamgames": "Rozrywka",
  "playstation": "Rozrywka",
  "sony interactive": "Rozrywka",
  "xbox": "Rozrywka",
  "nintendo": "Rozrywka",
  "empik": "Rozrywka",
  "legimi": "Rozrywka",
  "audioteka": "Rozrywka",
  "siłownia": "Rozrywka",
  "fitness": "Rozrywka",
  "basen": "Rozrywka",
  "multisport": "Rozrywka",
  "kregle": "Rozrywka",

  // --- KREDYTY, RATY I FINANSE ---
  "spłata kredytu": "Kredyt konsumencki",
  "splata kredytu": "Kredyt konsumencki",
  "rata kredytu": "Raty",
  "rata pożyczki": "Kredyt konsumencki",
  "spłata karty": "Spłata karty kredytowej",
  "splata karty": "Spłata karty kredytowej",
  "kredyt hipoteczny": "Kredyt hipoteczny",
  "santander consumer": "Kredyt konsumencki",
  "alior ratalny": "Raty",
  "paypo": "Raty",
  "klarna": "Raty",
  "allegro pay": "Raty",
  "twisto": "Raty",

  // --- PRZYCHODY ---
  "wynagrodzenie": "Wynagrodzenie",
  "pensja": "Wynagrodzenie",
  "wypłata": "Wynagrodzenie",
  "wyplata": "Wynagrodzenie",
  "uposażenie": "Wynagrodzenie",
  "premia": "Premia",
  "bonus": "Premia",
  "nagroda": "Premia",
  "zwrot podatku": "Zwrot",
  "zwrot środków": "Zwrot",
  "zwrot towaru": "Zwrot",
  "faktura b2b": "Działalność",
  "przychód b2b": "Działalność"
};

/**
 * Szuka dopasowania kategorii w historii dotychczasowych transakcji użytkownika.
 * Zapewnia deterministyczne samouczenie się aplikacji na bazie nawyków użytkownika.
 */
export function matchCategoryFromHistory(
  txName: string,
  history: Transaction[]
): { category: string; categoryIcon: string; matchedName: string } | null {
  if (!txName || !history || history.length === 0) return null;

  const needle = txName.trim().toLowerCase();
  if (needle.length < 3) return null;

  // 1. Szukaj dokładnego dopasowania nazwy (case-insensitive)
  const exact = history.find(
    (h) => h.category && h.category !== "Inne" && h.name.trim().toLowerCase() === needle
  );
  if (exact) {
    return {
      category: exact.category,
      categoryIcon: iconByCategory[exact.category] || "✨",
      matchedName: exact.name
    };
  }

  // 2. Szukaj dopasowania podciągu (np. "Biedronka 123" zawiera "Biedronka")
  const partial = history.find((h) => {
    if (!h.category || h.category === "Inne") return false;
    const hName = h.name.trim().toLowerCase();
    if (hName.length < 4) return false;
    return needle.includes(hName) || hName.includes(needle);
  });

  if (partial) {
    return {
      category: partial.category,
      categoryIcon: iconByCategory[partial.category] || "✨",
      matchedName: partial.name
    };
  }

  return null;
}

/**
 * Główna deterministyczna funkcja kategoryzacji.
 * Kolejność priorytetów:
 * 1. Reguły zdefiniowane przez użytkownika (TransactionRule[])
 * 2. Historia transakcji użytkownika (poprzednio skategoryzowane wpisy)
 * 3. Bogaty słownik polskich i zagranicznych kontrahentów
 * 4. Fallback ("Inne" lub zadany fallback)
 */
export function autoCategorizeDetailed(
  txName: string,
  options?: {
    rules?: TransactionRule[];
    history?: Transaction[];
    originalCategory?: string;
    fallback?: string;
  }
): CategorizationResult {
  const { rules = [], history = [], originalCategory = "", fallback = "Inne" } = options || {};
  const cleanName = (txName || "").trim();
  const lowerName = cleanName.toLowerCase();

  // 1. Sprawdź jawne reguły użytkownika
  for (const rule of rules) {
    if (rule.pattern && lowerName.includes(rule.pattern.toLowerCase())) {
      return {
        category: rule.category,
        categoryIcon: rule.categoryIcon || iconByCategory[rule.category] || "✨",
        source: "rule",
        matchedKeyword: rule.pattern,
        confidence: 1.0
      };
    }
  }

  // 2. Jeśli kategoria już istnieje i nie jest "Inne", zachowaj ją
  if (originalCategory && originalCategory !== "Inne") {
    return {
      category: originalCategory,
      categoryIcon: iconByCategory[originalCategory] || "✨",
      source: "fallback",
      confidence: 0.9
    };
  }

  // 3. Sprawdź historię użytkownika
  const historyMatch = matchCategoryFromHistory(cleanName, history);
  if (historyMatch) {
    return {
      category: historyMatch.category,
      categoryIcon: historyMatch.categoryIcon,
      source: "history",
      matchedKeyword: historyMatch.matchedName,
      confidence: 0.85
    };
  }

  // 4. Sprawdź rozbudowany słownik kontrahentów
  for (const [keyword, category] of Object.entries(POLISH_MERCHANT_DICTIONARY)) {
    if (lowerName.includes(keyword)) {
      return {
        category,
        categoryIcon: iconByCategory[category] || "✨",
        source: "dictionary",
        matchedKeyword: keyword,
        confidence: 0.8
      };
    }
  }

  // 5. Fallback
  return {
    category: fallback,
    categoryIcon: iconByCategory[fallback] || "✨",
    source: "fallback",
    confidence: 0.1
  };
}
