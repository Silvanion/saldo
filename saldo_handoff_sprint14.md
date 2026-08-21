# Saldo — Sprint 14 Handoff Summary

## Sprint

**Sprint 14: Debt Plan Actions & What-If v1**

**Status:** Completed and committed

**Commit:** `d0f7695 feat(debts): add what-if planning layer with one-time overpayment and strategy preview`

---

## Zakres Sprintu 14

W ramach Sprintu 14 wdrożono lokalną, deterministyczną warstwę symulacji wariantowej (*What-If*) dla spłaty portfela zadłużenia:

1. **Jednorazowa nadpłata (One-Time Overpayment):**
   - Dodano parametr `oneTimeOverpayment: number = 0` w `calculatePortfolioPayoffStrategies` i `simulateSinglePayoffStrategy`.
   - Zapewniono pełną kompatybilność wsteczną silnika kalkulacyjnego.
   - W interfejsie dodano dedykowane pole liczbowe z bezpieczną sanitizacją wartości pustych/ujemnych oraz akcją szybkiego wyzerowania (`Wyzeruj (0 zł)`).
2. **Podgląd alternatywnej strategii (Strategy What-If Switch):**
   - Użytkownik może tymczasowo podejrzeć wynik innej metody (Lawina, Kula Śnieżna, Własna, Status Quo) bez utraty wybranej metody i bez modyfikowania zapisanych scenariuszy.
3. **Podsumowanie wpływu symulacji (What-If Result Summary):**
   - Dynamiczny boks prezentujący wyliczoną różnicę w czasie spłaty (w miesiącach), różnicę w kosztach odsetek oraz nowy szacowany termin spłaty (*debt-free milestone*).
   - Zachowawczy, neutralny język finansowy bez obietnic i bez emoji.
4. **Bezpieczeństwo danych (Save Safety):**
   - Parametry What-If są stanem przejściowym (transient local state) i nie modyfikują obiektów w profilu.
   - Wczytanie scenariusza automatycznie zeruje parametry What-If.
5. **Dostępność i Mobile:**
   - Etykiety semantyczne, atrybuty `aria-expanded` i `aria-controls` na panelu rozwijanym, responsywny układ 1 kolumna (mobile) / 2 kolumny (desktop).

---

## Znane ograniczenia i kompromisy

- **Aplikacja w 1. miesiącu harmonogramu:** Jednorazowa nadpłata jest aplikowana w 1. miesiącu symulacji jako model uproszczony (MVP), alokowana do długu o najwyższym priorytecie wg wybranej strategii.
- **Brak trwałego schematu dla nadpłat jednorazowych:** Parametr symulacji istnieje wyłącznie w stanie lokalnym widoku, zapobiegając niepotrzebnym migracjom bazy danych.

---

## Stan testów i weryfikacji

- **Testy ukierunkowane:** 58 testów (PASS) w `debtCalculations.test.ts` i `DebtsView.test.tsx`.
- **Pełny zestaw testów:** 494 testy (67 suite'ów, 100% PASS).
- **TypeScript / Linter:** 0 błędów (`npm run lint`).
- **Build produkcyjny:** Sukces (`npm run build`).
