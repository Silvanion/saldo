export type DebtCategory = "mortgage" | "credit_card" | "cash_loan" | "revolving" | "bnpl" | "other";

export interface MockDebtItem {
  id: string;
  name: string;
  institution: string;
  type: DebtCategory;
  typeLabel: string;
  balance: number;
  originalAmount: number;
  monthlyPayment: number;
  interestRate: number; // e.g. 6.85
  rateType: "fixed" | "variable";
  rateDescription: string;
  endDate: string;
  remainingMonths: number;
  remainingInterest: number;
  ltv?: number; // loan to value %
  creditLimit?: number;
  gracePeriodDays?: number;
  nextPaymentDate: string;
  badges: Array<{ label: string; tone: "brand" | "danger" | "warning" | "neutral" }>;
  insight: string;
  isFavorite?: boolean;
}

export interface PortfolioKpiData {
  totalBalance: number;
  monthlyDebtService: number;
  remainingInterest: number;
  weightedInterestRate: number;
  mostExpensiveDebt: { name: string; apr: number };
  nearestPayment: { name: string; date: string; amount: number };
  refiAlert: { title: string; subtitle: string; breakEvenMonths: number };
  overpaymentPotential: { monthlyAmount: number; yearsSaved: number; interestSaved: number };
}

export const MOCK_PORTFOLIO_KPIS: PortfolioKpiData = {
  totalBalance: 412000,
  monthlyDebtService: 4980,
  remainingInterest: 188300,
  weightedInterestRate: 9.2,
  mostExpensiveDebt: {
    name: "Karta Visa Gold (mBank)",
    apr: 18.9
  },
  nearestPayment: {
    name: "Hipoteka mieszkanie",
    date: "27 sierpnia",
    amount: 2940
  },
  refiAlert: {
    title: "Potencjał refinansowania",
    subtitle: "Obniżka o 0.95 p.p. zwraca koszty wejścia",
    breakEvenMonths: 18
  },
  overpaymentPotential: {
    monthlyAmount: 1000,
    yearsSaved: 6,
    interestSaved: 39800
  }
};

export const MOCK_DEBTS: MockDebtItem[] = [
  {
    id: "debt-mortgage-1",
    name: "Hipoteka mieszkanie",
    institution: "PKO Bank Polski",
    type: "mortgage",
    typeLabel: "Kredyt hipoteczny",
    balance: 382000,
    originalAmount: 420000,
    monthlyPayment: 2940,
    interestRate: 6.85,
    rateType: "fixed",
    rateDescription: "Stała stopa 6.85% do 03.2028 (WIBOR 3M + marża 1.95%)",
    endDate: "2051",
    remainingMonths: 304,
    remainingInterest: 161200,
    ltv: 71,
    nextPaymentDate: "2026-08-27",
    badges: [
      { label: "Stała stopa do 03.2028", tone: "brand" },
      { label: "Refi candidate", tone: "warning" },
      { label: "Potencjał nadpłaty", tone: "brand" }
    ],
    insight: "Nadpłata 1 000 zł / m-c skraca okres spłaty o 6 lat i oszczędza 39 800 zł odsetek."
  },
  {
    id: "debt-card-1",
    name: "Karta kredytowa Visa Gold",
    institution: "mBank",
    type: "credit_card",
    typeLabel: "Karta kredytowa",
    balance: 12400,
    originalAmount: 15000,
    creditLimit: 15000,
    monthlyPayment: 620,
    interestRate: 18.9,
    rateType: "variable",
    rateDescription: "Zmienne 18.90% APR (okres bezodsetkowy do 54 dni)",
    endDate: "Odnawialny",
    remainingMonths: 24,
    remainingInterest: 4300,
    gracePeriodDays: 54,
    nextPaymentDate: "2026-09-05",
    badges: [
      { label: "Najdroższy dług (18.9%)", tone: "danger" },
      { label: "Priorytet spłaty", tone: "danger" }
    ],
    insight: "To najdroższe aktywne zobowiązanie w portfelu. Przekierowanie nadwyżek tutaj przyniesie natychmiastową oszczędność."
  },
  {
    id: "debt-cash-1",
    name: "Kredyt gotówkowy na remont",
    institution: "Santander Bank",
    type: "cash_loan",
    typeLabel: "Kredyt gotówkowy",
    balance: 16800,
    originalAmount: 25000,
    monthlyPayment: 1120,
    interestRate: 11.5,
    rateType: "fixed",
    rateDescription: "Stałe oprocentowanie 11.50% (Raty równe)",
    endDate: "11.2027",
    remainingMonths: 16,
    remainingInterest: 2150,
    nextPaymentDate: "2026-09-15",
    badges: [
      { label: "Stała rata", tone: "neutral" },
      { label: "Średni koszt", tone: "warning" }
    ],
    insight: "Spłata postępuje zgodnie z planem. Pozostało 16 rat do całkowitego zamknięcia."
  },
  {
    id: "debt-bnpl-1",
    name: "Allegro Pay / PayPo (Sprzęt AGD)",
    institution: "PayPo / Allegro",
    type: "bnpl",
    typeLabel: "Raty 0% / BNPL",
    balance: 800,
    originalAmount: 2000,
    monthlyPayment: 200,
    interestRate: 0.0,
    rateType: "fixed",
    rateDescription: "Raty 0% RRSO (4 raty pozostały)",
    endDate: "12.2026",
    remainingMonths: 4,
    remainingInterest: 0,
    nextPaymentDate: "2026-09-10",
    badges: [
      { label: "0% RRSO", tone: "neutral" },
      { label: "Koniec za 4 mies.", tone: "neutral" }
    ],
    insight: "Zobowiązanie bezkosztowe (0% RRSO). Nie wymaga wcześniejszej nadpłaty."
  }
];

export const MOCK_AMORTIZATION_SCHEDULE = [
  { month: "09/2026", installment: 2940, principal: 742, interest: 2198, balance: 381258 },
  { month: "10/2026", installment: 2940, principal: 746, interest: 2194, balance: 380512 },
  { month: "11/2026", installment: 2940, principal: 751, interest: 2189, balance: 379761 },
  { month: "12/2026", installment: 2940, principal: 755, interest: 2185, balance: 379006 },
  { month: "01/2027", installment: 2940, principal: 759, interest: 2181, balance: 378247 },
  { month: "02/2027", installment: 2940, principal: 764, interest: 2176, balance: 377483 },
  { month: "03/2027", installment: 2940, principal: 768, interest: 2172, balance: 376715 },
  { month: "04/2027", installment: 2940, principal: 772, interest: 2168, balance: 375943 },
  { month: "05/2027", installment: 2940, principal: 777, interest: 2163, balance: 375166 },
  { month: "06/2027", installment: 2940, principal: 781, interest: 2159, balance: 374385 },
  { month: "07/2027", installment: 2940, principal: 786, interest: 2154, balance: 373599 },
  { month: "08/2027", installment: 2940, principal: 790, interest: 2150, balance: 372809 }
];

export const MOCK_STRATEGIES = [
  {
    id: "strategy-avalanche",
    name: "Lawina zadłużenia (Najwyższy APR)",
    recommended: true,
    description: "Kierowanie wszystkich nadwyżek w najdroższy dług (Karta 18.9%), minimalizując całkowity koszt odsetek.",
    timeframe: "Karta spłacona w 8 miesięcy",
    interestSavings: "31 200 zł oszczędności",
    liquidityImpact: "Bardzo wysoka poprawa płynności po 8 miesiącach",
    badge: "Najniższy koszt odsetek"
  },
  {
    id: "strategy-snowball",
    name: "Kula śnieżna (Najmniejsze saldo)",
    recommended: false,
    description: "Szybkie domknięcie drobnych zobowiązań (Allegro Pay, potem Gotówkowy), budując motywację psychologiczną.",
    timeframe: "2 długi zamknięte w 12 miesięcy",
    interestSavings: "19 400 zł oszczędności",
    liquidityImpact: "Stopniowe uwalnianie miesięcznego przepływu gotówki",
    badge: "Szybki sukces psychologiczny"
  },
  {
    id: "strategy-mortgage-focus",
    name: "Agresywna nadpłata hipoteki",
    recommended: false,
    description: "Systematyczne nadpłacanie kredytu mieszkaniowego kwotą 1 000 zł/mc ze skróceniem okresu kredytowania.",
    timeframe: "Skrócenie kredytu z 25 do 19 lat",
    interestSavings: "39 800 zł oszczędności",
    liquidityImpact: "Zamrożenie kapitału w nieruchomości, niższa bieżąca elastyczność",
    badge: "Długi horyzont"
  }
];

export const MOCK_KNOWLEDGE_ARTICLES = [
  {
    id: "kb-1",
    category: "Hipoteka",
    title: "Stała vs Zmienna stopa: kiedy warto refinansować?",
    readTime: "4 min",
    summary: "Jak liczyć punkt rentowności (break-even) przy zmianie oprocentowania i na jakie ukryte opłaty bankowe uważać."
  },
  {
    id: "kb-2",
    category: "Nadpłata",
    title: "Skrócenie okresu czy zmniejszenie raty — co wybrać?",
    readTime: "3 min",
    summary: "Porównanie matematyki odsetek z bezpieczeństwem domowego budżetu i płynnością poduszki finansowej."
  },
  {
    id: "kb-3",
    category: "Karty i Limity",
    title: "Jak działa okres bezodsetkowy i pułapka minimalnej spłaty?",
    readTime: "5 min",
    summary: "Dlaczego spłacanie tylko kwoty minimalnej może wydłużyć spłatę karty do kilkunastu lat."
  },
  {
    id: "kb-4",
    category: "Optymalizacja",
    title: "Konsolidacja drogich pożyczek — czy to się opłaca?",
    readTime: "4 min",
    summary: "Kiedy połączenie limitów i kredytów gotówkowych w jedną niższą ratę jest korzystne, a kiedy zwiększa koszt całkowity."
  }
];
