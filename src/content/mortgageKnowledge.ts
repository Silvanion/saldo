export type MortgageKnowledgeArticle = {
  id: string;
  title: string;
  category: "basics" | "decisions" | "safety";
  summary: string;
  body: string;
  readingTimeMinutes: number;
  updatedAt: string;
  sources: {
    label: string;
    url: string;
  }[];
  relatedAction?: {
    label: string;
    target: "debt-details" | "overpayment-calculator" | "scenario-editor" | "benchmarks";
  };
};

export type MortgageBenchmarkSnapshot = {
  id: string;
  market: "PL";
  asOf: string;
  publishedAt: string;
  sourceName: string;
  sourceUrl: string;
  metric: "reference-rate" | "mortgage-rate" | "margin" | "ltv" | "average-loan-amount";
  label: string;
  unit: "percent" | "currency" | "ratio" | "months";
  value?: number;
  minValue?: number;
  maxValue?: number;
  currency?: "PLN";
  methodologyNote: string;
  limitationsNote?: string;
  isOrientational?: boolean;
  freshnessDays: number; // np. po ilu dniach uznać za nieaktualne
};

export const MORTGAGE_ARTICLES: MortgageKnowledgeArticle[] = [
  {
    id: "basics-how-it-works",
    title: "Jak działa kredyt hipoteczny",
    category: "basics",
    summary: "Podstawowe pojęcia i mechanizmy rządzące kredytami hipotecznymi.",
    body: "Kredyt hipoteczny to długoterminowe zobowiązanie z zabezpieczeniem na nieruchomości. Składa się z kapitału (kwoty, którą pożyczasz) oraz odsetek (kosztu pieniądza w czasie). Odsetki naliczane są od aktualnego salda zadłużenia. Dlatego każda nadpłata kapitału zmniejsza bazę, od której liczone są odsetki w kolejnych miesiącach.",
    readingTimeMinutes: 2,
    updatedAt: "2026-08-31",
    sources: []
  },
  {
    id: "basics-rates",
    title: "Oprocentowanie, marża i wskaźnik",
    category: "basics",
    summary: "Z czego składa się oprocentowanie Twojego kredytu.",
    body: "Na oprocentowanie zmienne składa się wskaźnik referencyjny (np. WIBOR 3M lub WIRON) oraz stała marża banku. Marża to zarobek banku, który negocjujesz przy podpisywaniu umowy. Wskaźnik referencyjny odzwierciedla koszt pieniądza na rynku i zmienia się niezależnie od Ciebie.",
    readingTimeMinutes: 3,
    updatedAt: "2026-08-31",
    sources: [
      { label: "NBP - Stopy procentowe", url: "https://nbp.pl/polityka-pieniezna/decyzje-rpp/podstawowe-stopy-procentowe-nbp/" }
    ]
  },
  {
    id: "basics-rrso",
    title: "RRSO a oprocentowanie nominalne",
    category: "basics",
    summary: "Dlaczego RRSO jest wyższe niż oprocentowanie w umowie.",
    body: "Rzeczywista Roczna Stopa Oprocentowania (RRSO) uwzględnia nie tylko oprocentowanie nominalne, ale także prowizję, ubezpieczenia i inne koszty okołokredytowe. Jest to najlepszy wskaźnik do porównywania całkowitego kosztu ofert różnych banków w momencie zaciągania kredytu.",
    readingTimeMinutes: 2,
    updatedAt: "2026-08-31",
    sources: []
  },
  {
    id: "basics-installments",
    title: "Raty równe i malejące",
    category: "basics",
    summary: "Różnice między systemami spłaty i ich wpływ na odsetki.",
    body: "W ratach równych na początku spłacasz głównie odsetki, a kapitał powoli. W ratach malejących część kapitałowa jest stała od początku, co sprawia, że pierwsza rata jest wyższa, ale łączne odsetki przez cały okres kredytowania są znacznie niższe.",
    readingTimeMinutes: 3,
    updatedAt: "2026-08-31",
    sources: []
  },
  {
    id: "basics-ltv",
    title: "Wkład własny i LTV",
    category: "basics",
    summary: "Czym jest wskaźnik Loan-to-Value (LTV).",
    body: "LTV to stosunek kwoty kredytu do wartości nieruchomości. KNF wymaga, aby wkład własny wynosił minimum 20% (lub 10% przy dodatkowym ubezpieczeniu). Im niższe LTV (czyli mniejszy dług w stosunku do wartości), tym często lepsze warunki marżowe oferuje bank.",
    readingTimeMinutes: 2,
    updatedAt: "2026-08-31",
    sources: [
      { label: "KNF - Rekomendacja S", url: "https://www.knf.gov.pl/" }
    ],
    relatedAction: { label: "Sprawdź swoje LTV", target: "benchmarks" }
  },
  {
    id: "decisions-rate-type",
    title: "Oprocentowanie stałe czy zmienne",
    category: "decisions",
    summary: "Jak wybrać między bezpieczeństwem a szansą na niższe koszty.",
    body: "Oprocentowanie stałe chroni przed wzrostem stóp procentowych, zapewniając pewność raty. Oprocentowanie zmienne reaguje na rynkowe stopy - rata spada, gdy stopy maleją, ale rośnie w cyklach podwyżek.",
    readingTimeMinutes: 4,
    updatedAt: "2026-08-31",
    sources: []
  },
  {
    id: "decisions-overpayment",
    title: "Nadpłata: skrócenie okresu czy obniżenie raty",
    category: "decisions",
    summary: "Dwie główne korzyści z nadpłacania kapitału.",
    body: "Gdy nadpłacasz kapitał, możesz wybrać: zachować okres kredytowania i obniżyć przyszłą ratę (więcej luzu w domowym budżecie), lub zachować wysokość raty i skrócić okres (największa oszczędność na odsetkach). W Saldo możesz zasymulować obie opcje w kalkulatorze nadpłat.",
    readingTimeMinutes: 3,
    updatedAt: "2026-08-31",
    sources: [],
    relatedAction: { label: "Symuluj scenariusze", target: "scenario-editor" }
  },
  {
    id: "decisions-refinance",
    title: "Kiedy sprawdzać refinansowanie",
    category: "decisions",
    summary: "Czy opłaca się przenieść kredyt do innego banku?",
    body: "Refinansowanie opłaca się, gdy nowy bank oferuje znacząco niższą marżę lub tańsze stałe oprocentowanie, a różnica pokrywa koszty przeniesienia (np. prowizję za wcześniejszą spłatę w starym banku, wycenę, notariusza).",
    readingTimeMinutes: 3,
    updatedAt: "2026-08-31",
    sources: []
  },
  {
    id: "decisions-fixed-end",
    title: "Koniec stałego oprocentowania",
    category: "decisions",
    summary: "Co przeanalizować przed przejściem na oprocentowanie zmienne.",
    body: "Przed końcem okresu stałego oprocentowania, bank prześle nową propozycję stawki stałej. Sprawdź warunki umowy i aktualne zasady rynkowe, aby porównać ofertę z bieżącymi ofertami innych banków (refinansowanie) i obecną stawką zmienną.",
    readingTimeMinutes: 2,
    updatedAt: "2026-08-31",
    sources: []
  },
  {
    id: "safety-early-repayment",
    title: "Prowizja za wcześniejszą spłatę",
    category: "safety",
    summary: "Kiedy bank może pobrać prowizję za nadpłatę.",
    body: "Możliwość pobrania rekompensaty zależy od rodzaju umowy i przepisów. Zgodnie z ustawą o kredycie hipotecznym, dla kredytów ze zmienną stopą prowizja może być pobierana tylko w pierwszych 3 latach. Sprawdź warunki swojej umowy dla stałej stopy.",
    readingTimeMinutes: 2,
    updatedAt: "2026-08-31",
    sources: [
      { label: "UOKiK - Ustawa o kredycie hipotecznym", url: "https://finanse.uokik.gov.pl/chf/ustawa-o-kredycie-hipotecznym/" }
    ]
  },
  {
    id: "safety-buffer",
    title: "Bufor bezpieczeństwa przed nadpłatą",
    category: "safety",
    summary: "Zanim nadpłacisz kredyt, zbuduj poduszkę.",
    body: "Choć nadpłacanie kredytu jest bardzo opłacalne, pozbawia Cię płynności finansowej (gotówki). Przed agresywnym nadpłacaniem upewnij się, że posiadasz poduszkę finansową pokrywającą koszty życia na wypadek utraty dochodu.",
    readingTimeMinutes: 2,
    updatedAt: "2026-08-31",
    sources: []
  }
];

export const MORTGAGE_BENCHMARKS: MortgageBenchmarkSnapshot[] = [
  {
    id: "benchmark-nbp-ref",
    market: "PL",
    asOf: "2026-03-05",
    publishedAt: "2026-03-05",
    sourceName: "NBP",
    sourceUrl: "https://nbp.pl/polityka-pieniezna/decyzje-rpp/podstawowe-stopy-procentowe-nbp/",
    metric: "reference-rate",
    label: "Stopa referencyjna NBP",
    unit: "percent",
    value: 3.75,
    methodologyNote: "Podstawowa stopa NBP wyznaczająca koszt pieniądza. Wpływa bezpośrednio na wskaźniki WIBOR i WIRON.",
    freshnessDays: 45 // Posiedzenia są co miesiąc
  },
  {
    id: "benchmark-avg-loan-amount",
    market: "PL",
    asOf: "2026-07-31",
    publishedAt: "2026-08-23",
    sourceName: "BIK",
    sourceUrl: "https://media.bik.pl/informacje-prasowe/875640/ip_bik_dane-o-rynku-kredytowym-w-lipcu_2026-08-247243966",
    metric: "average-loan-amount",
    label: "Średnia kwota nowego kredytu",
    unit: "currency",
    currency: "PLN",
    value: 487530,
    methodologyNote: "Średnia kwota nowo udzielanego kredytu mieszkaniowego w lipcu 2026 roku według danych BIK.",
    freshnessDays: 90
  },
  {
    id: "benchmark-avg-margin",
    market: "PL",
    asOf: "2026-08-01",
    publishedAt: "2026-08-01",
    sourceName: "Raport rynkowy (Totalmoney)",
    sourceUrl: "https://www.totalmoney.pl/artykuly/srednia-marza-kredytu-hipotecznego",
    metric: "margin",
    label: "Orientacyjna marża rynkowa",
    unit: "percent",
    minValue: 1.49,
    maxValue: 3.55,
    isOrientational: true,
    methodologyNote: "Zależy od LTV, wkładu własnego, relacji z bankiem i kwoty kredytu. Dla profilu 20% wkładu własnego niektóre banki oferują marże ok. 1.82–1.85%.",
    limitationsNote: "Zakres zależny od profilu klienta i warunków banku",
    freshnessDays: 90
  }
];
