# Saldo — Handoff Summary (Sprint 5)

## Cel dokumentu

Ten dokument podsumowuje zakres, implementację, walidację i stan przekazania prac po Sprincie 5 dla modułu **Kredyty i Hipoteka** w aplikacji **Saldo**.

Sprint 5 rozszerzył istniejący symulator strategii spłaty portfela o strategię **Własna kolejność (Custom Payoff Ordering)**. Dokument jest punktem startowym do planowania kolejnego sprintu.

## Kontekst projektu

Projekt jest rozwijany lokalnie, privacy-first, z naciskiem na deterministyczne obliczenia, konserwatywne komunikaty finansowe i małe, bezpieczne przyrosty funkcjonalne.

Repozytorium projektu:

```text
/Users/sewerynpawlowski/Documents/PROJEKT APKA/saldo
```

Dotychczasowy workflow:

- jeden wąski sprint naraz,
- osobny prompt planistyczny,
- osobny prompt implementacyjny `GENERATE PATCH ONLY`,
- walidacja testów, lint i build,
- manualny QA / product review,
- commit dopiero po PASS.

## Stan przed Sprintem 5

Sprinty 0–4 dostarczyły kolejno:

- UX mock zakładki Kredyty i Hipoteka,
- CRUD zobowiązań i persistence,
- portfolio KPIs oraz overpayment simulator,
- refinance MVP i głębszą analitykę długu,
- multi-offer refinance comparison,
- symulator spłaty portfela z metodami Status Quo, Avalanche i Snowball.

Ostatni potwierdzony commit przed Sprintem 5:

```text
b37fdd9 feat(debts): add debt payoff strategy simulator with avalanche and snowball methods
```

## Cel Sprintu 5

Celem było umożliwienie użytkownikowi ręcznego ustalenia kolejności spłaty aktywnych zobowiązań i przeliczenie planu z użyciem istniejącego silnika payoff strategies.

Strategia Custom nie miała być przedstawiana jako obiektywnie najlepsza. Aplikacja pokazuje orientacyjny wynik kolejności wybranej przez użytkownika.

## Zrealizowany zakres

### Logika domenowa

W `src/services/debtCalculations.ts`:

- rozszerzono `DebtPayoffStrategyType` o `custom`,
- dodano helper `buildValidatedCustomOrder`,
- zintegrowano Custom z istniejącym silnikiem `simulateSinglePayoffStrategy` / `calculatePortfolioPayoffStrategies`,
- dodano opcjonalny parametr `customPayoffOrder?: string[]`,
- zachowano istniejące strategie `baseline`, `avalanche` i `snowball`,
- zachowano miesięczny budżet nadpłaty i efekt kaskadowy,
- zachowano istniejące KPI: debt-free date, total interest, interest saved oraz payoff queue.

### Walidacja kolejności

`buildValidatedCustomOrder` działa według następujących zasad:

- poprawna pełna lista jest respektowana w podanej kolejności,
- kolejność częściowa zachowuje podane priorytety,
- pominięte aktywne zobowiązania są deterministycznie dopisywane na końcu,
- duplikaty są ignorowane po pierwszym wystąpieniu,
- nieistniejące identyfikatory są pomijane,
- zamknięte zobowiązania nie są dodawane do aktywnej kolejki,
- pusta lub niezdefiniowana kolejność ma bezpieczny fallback,
- wejściowe tablice i obiekty nie są mutowane.

### UI

W `src/components/debts/DebtsView.tsx`:

- dodano czwartą kartę strategii: `Własna kolejność`,
- dodano lokalny stan `customDebtOrder`,
- dodano panel `Ustal kolejność spłaty`,
- dodano listę aktywnych zobowiązań z numerem pozycji, nazwą, bankiem, saldem, oprocentowaniem i ratą,
- dodano przyciski `Przenieś wyżej` i `Przenieś niżej`,
- zmiana kolejności natychmiast przelicza symulację,
- roadmapa odzwierciedla kolejność Custom,
- kolejność nie jest zapisywana w persistence.

### Dostępność i copy

- przyciski reorderingu mają polskie, opisowe `aria-label`,
- pierwszy element ma wyłączone `Przenieś wyżej`,
- ostatni element ma wyłączone `Przenieś niżej`,
- zachowano widoczny focus ring,
- komunikaty pozostają ostrożne i symulacyjne,
- nie ma obietnic gwarantowanej oszczędności ani rekomendacji finansowej.

## Zmienione pliki

Working tree Sprintu 5 obejmuje:

```text
src/components/debts/DebtsView.test.tsx
src/components/debts/DebtsView.tsx
src/services/debtCalculations.test.ts
src/services/debtCalculations.ts
```

Nie powinny być zmieniane:

```text
src/components/debts/RefinanceComparisonModal.tsx
```

Sprint 5 nie wymagał:

- migracji persistence,
- zmian w `Profile`,
- zmian w Firestore,
- importu CSV/PDF,
- zewnętrznych API.

## Testy i walidacja

### Testy ukierunkowane

```bash
npx vitest run src/services/debtCalculations.test.ts src/components/debts/DebtsView.test.tsx
```

Wynik:

```text
Test Files  2 passed (2)
Tests       41 passed (41)
```

### Lint / TypeScript

```bash
npm run lint
```

Wynik:

```text
0 errors
```

### Build

```bash
npm run build
```

Wynik:

```text
SUCCESS
```

### Pełny zestaw testów

```bash
npx vitest run
```

Wynik:

```text
Test Files  67 passed (67)
Tests       477 passed (477)
```

## QA i ograniczenia

Automatyczna walidacja Sprintu 5 zakończyła się PASS:

- testy domenowe i integracyjne PASS,
- lint / TypeScript PASS,
- build produkcyjny PASS,
- pełny zestaw testów PASS.

Pozostaje zalecany manualny QA w przeglądarce:

- otwarcie zakładki symulatora strategii,
- wybranie `Własna kolejność`,
- przeniesienie długu wyżej i niżej,
- sprawdzenie zmiany pierwszego celu spłaty,
- sprawdzenie roadmapy,
- sprawdzenie widoku mobilnego,
- sprawdzenie nawigacji klawiaturą,
- sprawdzenie braku regresji w Avalanche, Snowball i Status Quo.

Najważniejsze ograniczenie:

- `customDebtOrder` jest przechowywane wyłącznie w lokalnym stanie komponentu i nie jest utrwalane w Firestore ani w `Profile`.

## Stan Git

Na moment przygotowania handoffu Sprint 5 nie został jeszcze zacommitowany. Working tree zawiera cztery zmodyfikowane pliki:

```text
 M src/components/debts/DebtsView.test.tsx
 M src/components/debts/DebtsView.tsx
 M src/services/debtCalculations.test.ts
 M src/services/debtCalculations.ts
```

Proponowany commit:

```bash
git add src/components/debts/DebtsView.tsx src/components/debts/DebtsView.test.tsx src/services/debtCalculations.ts src/services/debtCalculations.test.ts
git commit -m "feat(debts): add custom payoff ordering strategy to debt simulator"
```

Nie tworzyć commita przed wykonaniem manualnego QA.

## Następny sprint

Naturalne kierunki po Sprincie 5:

- manualny QA i ewentualny mały refinement UX Custom,
- zapis i wersjonowanie scenariuszy payoff,
- automatyczne generowanie transakcji budżetowych na podstawie planu,
- knowledge center dotyczące metod spłaty,
- import danych długu z CSV/PDF.

Rekomendacja: przed wyborem Sprintu 6 ponownie zastosować zasadę jednego małego zakresu. Nie łączyć persistence scenariuszy, importów i automatycznego generowania transakcji w jednym sprincie.

## Zasady kontynuacji

- small safe scope,
- patch-only,
- bez migracji persistence, jeśli nie są konieczne,
- czyste i deterministyczne funkcje domenowe,
- copy konserwatywne i truthfulness-first,
- brak zmian w refinansowaniu bez osobnego zakresu,
- testy domenowe i UI,
- lint + test + build,
- manualny QA przed commitem,
- osobny conventional commit dla każdego sprintu.
