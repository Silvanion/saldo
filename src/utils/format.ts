export const parseAmount = (val: string): number => {
  if (!val) return 0;
  // strip spaces, currency symbols like PLN, zł, $, €
  let clean = val.replace(/[^0-9,\.\-]/g, "");
  
  // Find the last separator to treat it as decimal delimiter
  const commaIndex = clean.lastIndexOf(",");
  const dotIndex = clean.lastIndexOf(".");
  
  if (commaIndex > dotIndex) {
    // comma is decimal separator: replace dots (thousands) with empty, and comma with dot
    clean = clean.replace(/\./g, "").replace(",", ".");
  } else if (dotIndex > commaIndex) {
    // dot is decimal separator: replace commas with empty
    clean = clean.replace(/,/g, "");
  }
  
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

export const plnFormatter = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN'
});

export const formatPln = (val: number): string => plnFormatter.format(val);

export function cleanPolishChars(text: string): string {
  const map: Record<string, string> = {
    'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
    'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
  };
  return text.replace(/[ąćęłnóśźżĄĆĘŁŃÓŚŹŻ]/g, match => map[match] || match);
}

export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
