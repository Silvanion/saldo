import React, { useState, useMemo } from "react";
import {
  BookOpen,
  LineChart,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { DebtItem } from "../../types";
import { formatMoney } from "../../utils/format";
import { getBenchmarkFreshnessStatus, calculateLTV } from "../../utils/benchmark";
import { MORTGAGE_ARTICLES, MORTGAGE_BENCHMARKS } from "../../content/mortgageKnowledge";

export interface KnowledgeAndBenchmarksTabProps {
  activeDebts: DebtItem[];
  onNavigateToTools: (target: string) => void;
}

export function KnowledgeAndBenchmarksTab({
  activeDebts,
  onNavigateToTools
}: KnowledgeAndBenchmarksTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set());

  const mortgageDebts = activeDebts.filter((d) => d.type === "mortgage");
  const primaryMortgage = mortgageDebts[0];

  const toggleArticle = (id: string) => {
    setExpandedArticles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredArticles = useMemo(() => {
    return MORTGAGE_ARTICLES.filter((art) => {
      const matchesSearch =
        art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.summary.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || art.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const renderBenchmarkComparison = () => {
    if (!primaryMortgage) {
      return (
        <div className="p-5 bg-surface border border-border rounded-2xl shadow-2xs">
          <p className="text-sm text-text-muted">Dodaj kredyt hipoteczny, aby zobaczyć porównanie.</p>
        </div>
      );
    }

    const marginBenchmark = MORTGAGE_BENCHMARKS.find((b) => b.metric === "margin");
    const ltv = calculateLTV(Number(primaryMortgage.balance), primaryMortgage.propertyValue);

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* LTV Card */}
        <div className="p-5 bg-surface border border-border rounded-2xl shadow-2xs space-y-3">
          <h4 className="text-sm font-bold text-text-main flex items-center gap-2">
            <LineChart className="w-4 h-4 text-brand" />
            Twój wskaźnik LTV
          </h4>
          {ltv !== null ? (
            <div>
              <div className="text-2xl font-black text-text-main">{ltv.toFixed(1)}%</div>
              <p className="text-xs text-text-muted mt-1">Stosunek salda kredytu do wartości nieruchomości.</p>
              <div className="mt-3 pt-3 border-t border-border/60 text-[11px] text-text-faint">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand" />
                  Rekomendowany wkład własny: 20% (LTV ≤ 80%)
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-text-muted">Dodaj wartość nieruchomości w edycji kredytu, aby obliczyć LTV.</p>
          )}
        </div>

        {/* Margin Comparison Card */}
        <div className="p-5 bg-surface border border-border rounded-2xl shadow-2xs space-y-3">
          <h4 className="text-sm font-bold text-text-main flex items-center gap-2">
            <LineChart className="w-4 h-4 text-brand" />
            Porównanie marży
          </h4>
          {primaryMortgage.interestRate ? (
            <div>
              <div className="text-2xl font-black text-text-main">{primaryMortgage.interestRate}%</div>
              <p className="text-xs text-text-muted mt-1">Twoje aktualne oprocentowanie (całkowite).</p>
              
              {marginBenchmark && (
                <div className="mt-3 pt-3 border-t border-border/60 text-[11px] text-text-faint space-y-1">
                  <div>
                    Orientacyjna marża rynkowa: <strong className="text-text-main">{marginBenchmark.minValue}% – {marginBenchmark.maxValue}%</strong>
                  </div>
                  <div>
                    Brak wystarczających danych do oddzielenia marży od stawki bazowej w Twoim profilu, aby dokładnie porównać z benchmarkiem.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-text-muted">Uzupełnij oprocentowanie, aby porównać ten parametr.</p>
          )}
        </div>
      </div>
    );
  };

  const renderMarketBenchmarks = () => {
    const now = new Date();
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MORTGAGE_BENCHMARKS.map((benchmark) => {
          const freshness = getBenchmarkFreshnessStatus(benchmark, now);
          
          return (
            <div key={benchmark.id} className="p-4 bg-surface border border-border rounded-2xl shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand px-2 py-0.5 bg-brand-subtle rounded-md">
                    {benchmark.market}
                  </span>
                  {freshness === "needs_refresh" && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-warning-main">
                      <AlertTriangle className="w-3 h-3" />
                      Wymaga odświeżenia
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-text-main mb-1">{benchmark.label}</h4>
                <div className="text-lg font-black text-text-main">
                  {benchmark.value !== undefined 
                    ? benchmark.unit === "currency" 
                      ? formatMoney(benchmark.value, benchmark.currency || "PLN")
                      : `${benchmark.value}${benchmark.unit === "percent" ? "%" : ""}` 
                    : benchmark.unit === "currency"
                      ? `${formatMoney(benchmark.minValue || 0, benchmark.currency || "PLN")} – ${formatMoney(benchmark.maxValue || 0, benchmark.currency || "PLN")}`
                      : `${benchmark.minValue}${benchmark.unit === "percent" ? "%" : ""} – ${benchmark.maxValue}${benchmark.unit === "percent" ? "%" : ""}`}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border/60 text-[10px] text-text-muted space-y-2">
                {benchmark.isOrientational && (
                  <div className="flex items-start gap-1 text-warning-main font-semibold bg-warning-subtle/30 p-1.5 rounded-md border border-warning-main/10">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Dane orientacyjne. {benchmark.limitationsNote}</span>
                  </div>
                )}
                {!benchmark.isOrientational && benchmark.limitationsNote && (
                   <p className="font-semibold text-text-main">{benchmark.limitationsNote}</p>
                )}
                <p>{benchmark.methodologyNote}</p>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-text-faint">Aktualizacja: {benchmark.asOf}</span>
                  <a
                    href={benchmark.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-brand hover:underline font-semibold"
                  >
                    {benchmark.sourceName} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-text-main">Wiedza & Benchmarki</h2>
        <p className="text-sm text-text-muted mt-1">
          Edukacja i orientacyjne dane rynkowe dla kredytów hipotecznych w Polsce.
        </p>
      </div>

      {/* Twój kredyt na tle rynku */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-text-main">Twój kredyt na tle rynku</h3>
        {renderBenchmarkComparison()}
      </section>

      {/* Benchmarki rynkowe */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-text-main">Benchmarki rynku polskiego</h3>
        {renderMarketBenchmarks()}
      </section>

      {/* Wiedza hipoteczna */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-text-main">Baza Wiedzy</h3>
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center p-1 bg-surface-2 rounded-xl border border-border">
              {["all", "basics", "decisions", "safety"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedCategory === cat
                      ? "bg-surface text-text-main shadow-xs border border-border"
                      : "text-text-muted hover:text-text-main"
                  }`}
                >
                  {cat === "all" ? "Wszystkie" : cat === "basics" ? "Podstawy" : cat === "decisions" ? "Decyzje" : "Bezpieczeństwo"}
                </button>
              ))}
            </div>
            
            <div className="relative w-full sm:w-48">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szukaj..."
                className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border rounded-xl text-xs text-text-main placeholder:text-text-faint focus:border-brand focus:ring-1 focus:ring-brand outline-hidden"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {filteredArticles.length === 0 ? (
            <div className="p-8 text-center text-text-muted bg-surface border border-border rounded-2xl border-dashed">
              Brak wyników dla podanych kryteriów.
            </div>
          ) : (
            filteredArticles.map((art) => {
              const isExpanded = expandedArticles.has(art.id);
              return (
                <div key={art.id} className="bg-surface border border-border rounded-2xl overflow-hidden transition-all shadow-2xs">
                  <button
                    type="button"
                    onClick={() => toggleArticle(art.id)}
                    aria-expanded={isExpanded}
                    className="w-full text-left p-4 sm:p-5 flex items-center justify-between hover:bg-surface-hover/50 transition cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-brand-subtle text-brand flex items-center justify-center shrink-0 border border-brand/20">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-text-main">{art.title}</h4>
                        <p className="text-xs text-text-muted mt-0.5 truncate max-w-xs sm:max-w-md">{art.summary}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="hidden sm:inline text-xs text-text-faint">{art.readingTimeMinutes} min</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="px-4 pb-5 sm:px-6 sm:pb-6 pt-1 border-t border-border/60 animate-fade-in text-sm text-text-main leading-relaxed">
                      <p className="whitespace-pre-line">{art.body}</p>
                      
                      {(art.sources.length > 0 || art.relatedAction) && (
                        <div className="mt-5 pt-4 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          {art.sources.length > 0 && (
                            <div className="text-xs text-text-muted flex items-center gap-2">
                              Źródła:
                              {art.sources.map((s, idx) => (
                                <a
                                  key={idx}
                                  href={s.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-brand hover:underline flex items-center gap-1"
                                >
                                  {s.label} <ExternalLink className="w-3 h-3" />
                                </a>
                              ))}
                            </div>
                          )}
                          
                          {art.relatedAction && (
                            <button
                              type="button"
                              onClick={() => onNavigateToTools(art.relatedAction!.target)}
                              className="px-3 py-1.5 bg-surface-2 hover:bg-brand hover:text-text-inverse text-text-main text-xs font-bold rounded-lg border border-border hover:border-brand transition cursor-pointer inline-flex items-center gap-1.5"
                            >
                              {art.relatedAction.label}
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
