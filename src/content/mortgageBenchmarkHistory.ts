export type MortgageBenchmarkPoint = {
  date: string;              // ISO date: YYYY-MM-DD
  value?: number;
  minValue?: number;
  maxValue?: number;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  methodologyNote?: string;
  limitationsNote?: string;
};

export type MortgageBenchmarkSeries = {
  id: string;
  metric: "reference-rate" | "mortgage-rate" | "margin" | "ltv" | "average-loan-amount";
  label: string;
  unit: "percent" | "currency" | "ratio" | "months";
  currency?: "PLN";
  points: MortgageBenchmarkPoint[];
  description: string;
  methodologyNote: string;
  limitationsNote?: string;
};

export const MORTGAGE_BENCHMARK_HISTORY: MortgageBenchmarkSeries[] = [
  {
    id: "history-nbp-ref",
    metric: "reference-rate",
    label: "Stopa referencyjna NBP",
    unit: "percent",
    description: "Zestawienie historycznych decyzji RPP o podstawowej stopie NBP.",
    methodologyNote: "Wartość stopy referencyjnej ogłaszana przez Radę Polityki Pieniężnej.",
    points: [
      {
        date: "2022-09-08",
        value: 6.75,
        sourceName: "NBP",
        sourceUrl: "https://nbp.pl/podstawowe-stopy-procentowe-archiwum/",
        publishedAt: "2022-09-08"
      },
      {
        date: "2023-09-07",
        value: 6.00,
        sourceName: "NBP",
        sourceUrl: "https://nbp.pl/podstawowe-stopy-procentowe-archiwum/",
        publishedAt: "2023-09-07"
      },
      {
        date: "2023-10-05",
        value: 5.75,
        sourceName: "NBP",
        sourceUrl: "https://nbp.pl/podstawowe-stopy-procentowe-archiwum/",
        publishedAt: "2023-10-05"
      },
      {
        date: "2026-03-05",
        value: 3.75,
        sourceName: "NBP",
        sourceUrl: "https://nbp.pl/polityka-pieniezna/decyzje-rpp/podstawowe-stopy-procentowe-nbp/",
        publishedAt: "2026-03-05"
      }
    ]
  },
  {
    id: "history-avg-loan-amount",
    metric: "average-loan-amount",
    label: "Średnia kwota nowego kredytu",
    unit: "currency",
    currency: "PLN",
    description: "Historia średniej kwoty nowo udzielonego kredytu hipotecznego według BIK.",
    methodologyNote: "Dane zagregowane na podstawie oficjalnych raportów Biura Informacji Kredytowej.",
    points: [
      {
        date: "2026-07-31",
        value: 487530,
        sourceName: "BIK",
        sourceUrl: "https://media.bik.pl/informacje-prasowe/875640/ip_bik_dane-o-rynku-kredytowym-w-lipcu_2026-08-247243966",
        publishedAt: "2026-08-23"
      }
    ]
  },
  {
    id: "history-avg-margin",
    metric: "margin",
    label: "Orientacyjna marża rynkowa",
    unit: "percent",
    description: "Przykładowe orientacyjne zakresy marż kredytów z wkładem 20%.",
    methodologyNote: "Zależy od LTV, wkładu własnego, relacji z bankiem i kwoty kredytu.",
    limitationsNote: "Brak wystarczająco porównywalnej historii – dane mają charakter orientacyjny i nie mogą stanowić rekomendacji.",
    points: [
      {
        date: "2026-08-01",
        minValue: 1.49,
        maxValue: 3.55,
        sourceName: "Raport rynkowy (Totalmoney)",
        sourceUrl: "https://www.totalmoney.pl/artykuly/srednia-marza-kredytu-hipotecznego",
        publishedAt: "2026-08-01",
        limitationsNote: "Dla profilu 20% wkładu niektóre banki oferują marże ok. 1.82–1.85%."
      }
    ]
  }
];
