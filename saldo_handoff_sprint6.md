# Saldo — Handoff Summary (Sprint 6)

## Cel dokumentu

Ten dokument podsumowuje zakres, implementację, walidację i stan przekazania prac po **Sprincie 6 (UX Refinement: Custom Payoff Ordering)** dla modułu **Kredyty i Hipoteka** w aplikacji **Saldo**.

Dokument stanowi podsumowanie dotychczasowych sprintów oraz bazę do planowania **Sprintu 7**.

---

## Kontekst projektu

Projekt jest rozwijany lokalnie, w paradygmacie *privacy-first*, z naciskiem na deterministyczne obliczenia finansowe, konserwatywne komunikaty i małe, bezpieczne przyrosty funkcjonalne (*small safe scope*).

Ścieżka repozytorium:
```text
/Users/sewerynpawlowski/Documents/PROJEKT APKA/saldo
```

Dotychczasowy workflow:
- jeden wąski sprint naraz,
- osobna faza planistyczna,
- implementacja w trybie `GENERATE PATCH ONLY`,
- rygorystyczna automatyczna walidacja (`lint` + `build` + `vitest`),
- brak mutacji i regresji w istniejących funkcjach,
- commit po weryfikacji.

---

## Stan przed Sprintem 6

Sprinty 0–5 dostarczyły kolejno:
- **Sprint 0:** UX mock zakładki Kredyty i Hipoteka,
- **Sprint 1:** CRUD zobowiązań, persistence i KPI portfela, widok szczegółów i symulator nadpłat,
- **Sprint 2:** Refinance MVP i głębsza analityka długu (mix, ekspozycja stóp, koncentracja kosztów, break-even),
- **Sprint 3:** Multi-offer refinance comparison (1–3 oferty side-by-side w macierzy porównawczej),
- **Sprint 4:** Symulator spłaty całego portfela (Status Quo, Avalanche, Snowball) z efektem kaskadowym (*roll*),
- **Sprint 5:** Własna kolejność spłaty (Custom Payoff Ordering) — mechanizm wyboru priorytetów z zachowaniem budżetu nadpłat.

Commity zamykające Sprint 5:
- `dbf2a77 feat(debts): add custom payoff ordering strategy to debt simulator`
- `b5e0b3a docs: add Sprint 5 handoff summary`

---

## Cel Sprintu 6

Celem Sprintu 6 było **dopracowanie warstwy UX, dostępności, responsywności i komunikacji** dla strategii *Własna kolejność (Custom Payoff Ordering)*, bez dotykania logiki domenowej, algorytmów obliczeniowych, warstwy persystencji czy innych modułów aplikacji.

---

## Zrealizowany zakres Sprintu 6

### 1. Karta strategii Custom
- Zaktualizowano opis w karcie wyboru na rzeczowy, spokojny i pozbawiony obietnic zysku:
  *„Elastyczna — samodzielnie ustalasz priorytety spłaty. Cała nadwyżka budżetowa trafia na cel nr 1, a po jego zamknięciu uwolniona rata zasila kolejne pozycje.”*

### 2. Panel „Ustal kolejność spłaty” i hierarchia wizualna
- Wzbogacono nagłówek panelu o licznik aktywnych celów: `Liczba aktywnych celów: {n}`.
- Wyraźnie wyodrębniono pozycję #1:
  - tło `bg-brand-subtle/30 border-brand/40 shadow-xs ring-1 ring-brand/20`,
  - kontrastowy numer pozycji w kolorze brandu (`bg-brand text-text-inverse`),
  - plakietka statusu `Cel priorytetowy #1`,
  - precyzyjne wyjaśnienie: *„To zobowiązanie otrzymuje całą nadwyżkę nadpłaty do czasu pełnej spłaty.”*
- Kolejne pozycje zachowują stonowane, drugorzędne tło (`bg-surface-2/40 border-border/80`).

### 3. Dostępność i kontrolki reorderingu
- Każdy przycisk posiada semantyczny, kontekstowy `aria-label` uwzględniający nazwę długu, kierunek, aktualną pozycję oraz łączną liczbę pozycji (np. *„Przenieś zobowiązanie Kredyt hipoteczny wyżej (obecnie pozycja 2 z 3)”*).
- Zapewniono zgodność z wytycznymi WCAG 2.5.5 / 2.5.8 poprzez touch target o wymiarach minimum **40×40 px** (`min-h-[40px] min-w-[40px]`).
- Skrajne przyciski otrzymują stan `disabled` wraz z klasami `disabled:opacity-25 disabled:cursor-not-allowed disabled:pointer-events-none`.
- Zachowano widoczny wskaźnik fokusu klawiatury (`focus-visible:ring-2 focus-visible:ring-focus-ring`).

### 4. Responsywność (375 px)
- Przebudowano wiersz zobowiązania na elastyczny flexbox (`flex flex-col sm:flex-row`).
- Metryki długu (saldo, oprocentowanie, rata) płynnie zawijają się, eliminując ryzyko poziomego paska przewijania (overflow) na ekranach smartfonów o szerokości 375 px.

### 5. Czyste copy (usunięcie emoji)
- Usunięto emoji z całego modułu na rzecz profesjonalnych, wektorowych ikon Lucide (`<Info />`, `<Sparkles />`, `<ArrowUp />`, `<ArrowDown />`, `<ShieldCheck />`).

---

## Zmienione pliki

Working tree Sprintu 6 objęło wyłącznie:
```text
src/components/debts/DebtsView.tsx
src/components/debts/DebtsView.test.tsx
```

Pliki celowo **niezmieniane** w Sprincie 6:
- `src/services/debtCalculations.ts` (silnik domenowy nienaruszony),
- `src/services/debtCalculations.test.ts` (testy domenowe nienaruszone),
- `src/components/debts/RefinanceComparisonModal.tsx` (moduł refinansowania nienaruszony),
- `src/types.ts` / Firestore / Profile (brak zmian w schemacie danych).

Commit Sprintu 6:
```text
adedb17 style(debts): refine custom payoff ordering UX
```

---

## Wyniki walidacji technicznej

1. **Testy ukierunkowane:**
   ```bash
   npx vitest run src/services/debtCalculations.test.ts src/components/debts/DebtsView.test.tsx
   # 42 passed (42)
   ```
2. **Kontrola typów (Lint):**
   ```bash
   npm run lint
   # 0 errors
   ```
3. **Build produkcyjny:**
   ```bash
   npm run build
   # SUCCESS (built in ~1.9s)
   ```
4. **Pełny zestaw testów repozytorium:**
   ```bash
   npx vitest run
   # 67 test files passed | 478 tests passed
   ```

---

## Ograniczenia stanu obecnego

1. **Kolejność w pamięci:** `customDebtOrder` jest stanem lokalnym komponentu `DebtsView`. Po odświeżeniu strony kolejność powraca do domyślnego sortowania wg aktywnych długów.
2. **Brak zapisanych scenariuszy:** Użytkownik nie może zapisać alternatywnych wersji symulacji spłaty (np. „Mój plan z nadpłatą 500 zł” vs „Plan z nadpłatą 1000 zł”).

---

## Propozycje dla Sprintu 7

Dwa rekomendowane, wąskie i bezpieczne kierunki dla Sprintu 7:

### Opcja A: Zapisywanie scenariuszy spłaty (Saved Payoff Scenarios)
- **Zakres:** Umożliwienie zapisania bieżącej konfiguracji (wybrana strategia, miesięczna kwota nadpłaty, zdefiniowana własna kolejność `customDebtOrder`, nazwa scenariusza) w lokalnym profilu użytkownika.
- **Wartość:** Użytkownik nie traci mozolnie ułożonej własnej kolejności spłaty ani porównania różnych budżetów nadpłat.
- **Ryzyko/Złożoność:** Niewielkie rozszerzenie typu `Profile` o tablicę `savedPayoffScenarios?: DebtPayoffScenario[]` z bezpieczną migracją i fallbackiem.

### Opcja B: Centrum Wiedzy o Metodach Spłaty (Knowledge Center / Explainer Hub)
- **Zakres:** Dedykowany, zwijany komponent edukacyjny wyjaśniający różnice matematyczne i psychologiczne między metodą Lawiny (Avalanche — matematyczna optymalizacja odsetek), Kulą Śnieżną (Snowball — psychologiczne szybkie wygrane) a Własną Kolejnością (Custom — priorytety życiowe).
- **Wartość:** Zwiększa zaufanie i zrozumienie użytkownika bez dotykania warstwy danych.
- **Ryzyko/Złożoność:** Zerowe ryzyko danych (100% UI/UX bez zmian w `Profile` i persistence).
