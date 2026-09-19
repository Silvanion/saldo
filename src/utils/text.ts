/**
 * Centralized text normalization utilities.
 * Eliminates duplicate text normalization functions across the codebase.
 */

/**
 * Normalizes text for comparison purposes:
 * - Lowercases
 * - Removes diacritics (NFD normalization + combining character removal)
 * - Removes punctuation
 * - Normalizes whitespace
 * - Trims
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s]/g, "") // remove punctuation
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Polish-specific character normalization (keeps letters, replaces Polish chars)
 * Used for display purposes, not for comparison.
 */
export function cleanPolishChars(text: string): string {
  if (!text) return "";
  const map: Record<string, string> = {
    'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
    'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
  };
  return text.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, match => map[match] || match);
}

/**
 * Normalizes text for smart rule matching:
 * - Lowercases
 * - Removes diacritics (NFKD for compatibility decomposition + combining character removal)
 * - Explicitly handles Polish characters that don't decompose in NFKD
 * - Trims
 * (Keeps punctuation for exact/startsWith matching)
 */
export function normalizeSmartRuleText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/ł/g, "l") // Polish L with stroke doesn't decompose in NFKD
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}