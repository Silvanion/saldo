# Wydajność i Optymalizacja — Raport Sprint 91

Dokumentacja pomiarów wydajnościowych, analizy wielkości paczek produkcyjnych (bundle size) oraz wdrożonych optymalizacji w aplikacji Saldo.

---

## 1. Pomiary wielkości paczek (Vite Build)

### Porównanie przed i po optymalizacji

| Chunk / Moduł | Przed Sprintem 91 | Po Sprincie 91 | Zmiana / Zysk |
| :--- | :--- | :--- | :--- |
| **`DebtsView`** | **700.61 kB** (173.10 kB gzip) | **327.37 kB** (63.77 kB gzip) | **-53.3% (-373.2 kB / -109.3 kB gzip)** |
| **`vendor-charts`** *(nowy wydzielony chunk)* | *(zagnieżdżony w DebtsView)* | **372.91 kB** (108.28 kB gzip) | Izolacja biblioteki wykresów (on-demand) |
| **`vendor-firebase`** | 918.20 kB (224.71 kB gzip) | 918.20 kB (224.71 kB gzip) | Bez zmian (niezależny vendor chunk) |
| **`vendor-pdf`** | 784.70 kB (239.54 kB gzip) | 784.70 kB (239.54 kB gzip) | Bez zmian (niezależny vendor chunk) |
| **`vendor-framework`** | 329.81 kB (105.46 kB gzip) | 329.81 kB (105.46 kB gzip) | Bez zmian |
| **`index.js` (main entry)** | 330.72 kB (82.54 kB gzip) | 330.76 kB (82.55 kB gzip) | Bez zmian |

> **Kluczowy wniosek**: Chunk widoku kredytów `DebtsView` został odchudzony o ponad połowę (**53.3% redukcji**), a cała biblioteka `recharts` i `d3` została odizolowana do dedykowanego chunka ładowanego asynchronicznie wyłącznie przy renderowaniu wykresów spłaty.

---

## 2. Zastosowane techniki optymalizacji

### A. Strategiczne dzielenie kodu (Code Splitting & Manual Chunks)
- W `vite.config.ts` dodano dedykowaną regułę dla ekosystemu wykresów:
  ```ts
  if (
    id.includes('recharts') ||
    id.includes('d3-') ||
    id.includes('victory-vendor')
  ) {
    return 'vendor-charts';
  }
  ```
- Wszystkie ciężkie widoki aplikacji (`DebtsView`, `BudgetView`, `TransactionsView`, `PaymentsView`, `GoalsView`, `AnalysisView`, `SettingsView`, `HelpView`) oraz ciężkie modale (`ExportReportsModal`, `CalendarReminderModal`, `DriveConflictModal`, `SmartRulesManagerModal`, `ChangelogModal`) posiadają lazy loading z dynamicznym `import()` i `Suspense`.

### B. Memoizacja komponentów (`React.memo`)
- **`BudgetView`**: Owinięty w `React.memo`, co eliminuje re-render całego widoku budżetowego przy globalnych zmianach w stanie nadrzędnym.
- **`DebtPortfolioCard`**: Owinięty w `React.memo`. Przy modyfikacji lub usunięciu pojedynczego kredytu re-renderuje się wyłącznie dotknięty komponent, a nie cała lista portfela.
- **`DebtStrategyGuidanceCard`**: Owinięty w `React.memo` zapobiegający re-renderom bloku edukacyjnego strategii.
- **`TransactionsView`**: Owinięty w `React.memo`, zabezpieczający listę transakcji przed niepotrzebnymi cyklami aktualizacji.
- **`BudgetWarningsWidget`**: Już wcześniej zabezpieczony przez `React.memo`.

### C. Progresywne renderowanie transakcji
- W `TransactionsView.tsx` lista transakcji renderowana jest w porcjach (`itemsToShow = 25`, krok rozwijania: 25) z przyciskiem `btn-load-more` spełniającym standard WCAG AAA (`min-h-[44px]`).
- Stan paginacji automatycznie resetuje się przy jakiejkolwiek zmianie filtrów lub frazy wyszukiwania.

### D. Narzędzia pomiarowe
- W `src/utils/performance.ts` wdrożono bezkosztowe w trybie produkcyjnym narzędzia:
  - `measurePerformance(name, fn)`
  - `measureAsyncPerformance(name, fn)`
