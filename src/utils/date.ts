export function getLocalDateIso(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addMonthsClamped(dateString: string, monthsToAdd: number): string {
  const d = new Date(dateString + "T00:00:00");
  if (isNaN(d.getTime())) return dateString; // Fallback
  
  const currentDay = d.getDate();
  const targetMonth = d.getMonth() + monthsToAdd;
  
  const res = new Date(d.getFullYear(), targetMonth, 1);
  const daysInTargetMonth = new Date(res.getFullYear(), res.getMonth() + 1, 0).getDate();
  res.setDate(Math.min(currentDay, daysInTargetMonth));
  
  const yyyy = res.getFullYear();
  const mm = String(res.getMonth() + 1).padStart(2, '0');
  const dd = String(res.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatDatePl(isoDate: string): string {
  if (!isoDate) return "";
  try {
    const d = new Date(`${isoDate}T12:00:00`);
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return isoDate;
  }
}

export const monthsPl = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
];

export function getMonthNamePl(monthIdx: number): string {
  return monthsPl[monthIdx] || "";
}
