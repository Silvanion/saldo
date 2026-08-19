import React, { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  BookOpen,
  HelpCircle,
  Sparkles,
  X
} from "lucide-react";
import { helpCategories, helpSectionsData, faqData, quickSummaryCards } from "../content/helpContent";

interface HelpSectionProps {
  key?: React.Key;
  id?: string;
  title: string;
  category: string;
  icon: React.ReactNode;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function HelpSection({ title, category, icon, badge, defaultOpen = false, children }: HelpSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`border rounded-2xl overflow-hidden mb-3.5 shadow-xs transition-colors ${
      isOpen ? "bg-surface border-brand/30 shadow-sm" : "bg-surface border-border hover:bg-surface-offset"
    }`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left active:scale-[0.99] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring relative z-10"
      >
        <div className="flex items-center gap-3.5">
          <div className={`p-2.5 rounded-xl shadow-xs shrink-0 ${isOpen ? "bg-brand-subtle text-brand border border-brand/20" : "bg-surface-2 text-text-muted border border-border"}`}>
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-bold text-base sm:text-lg ${isOpen ? "text-brand" : "text-text-main"}`}>{title}</span>
              {badge && (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-surface-2 text-text-muted px-2 py-0.5 rounded-md border border-border">
                  {badge}
                </span>
              )}
            </div>
            <span className="text-xs text-text-faint font-medium">{category}</span>
          </div>
        </div>
        <div className="text-text-muted p-1.5 rounded-xl hover:bg-surface-2 transition-colors shrink-0 ml-3">
          {isOpen ? <ChevronUp className="w-5 h-5 text-brand" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>
      {isOpen && (
        <div className="p-5 pt-4 text-text-muted border-t border-border leading-relaxed text-sm bg-surface-2/40">
          {children}
        </div>
      )}
    </div>
  );
}

export function HelpView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Wszystko");

  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return helpSectionsData.filter((item) => {
      const matchCat = selectedCategory === "Wszystko" || item.cat === selectedCategory;
      const matchSearch =
        q === "" ||
        item.title.toLowerCase().includes(q) ||
        item.cat.toLowerCase().includes(q) ||
        (item.badge && item.badge.toLowerCase().includes(q)) ||
        (item.keywords && item.keywords.some((k) => k.toLowerCase().includes(q)));
      return matchCat && matchSearch;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 text-text-main relative overflow-hidden shadow-sm">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-brand-subtle border border-brand/20 px-3 py-1 rounded-full text-xs font-bold text-brand">
            <Sparkles className="w-3.5 h-3.5" /> Baza Wiedzy i Instrukcja Użytkownika
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-brand" />
            Centrum Pomocy
          </h2>
          <p className="text-text-muted text-sm sm:text-base max-w-3xl leading-relaxed">
            Kompleksowy poradnik opisujący architekturę, mechanikę wyliczeń finansowych, ochronę kapitału oraz instrukcje krok po kroku.
          </p>

          {/* Interactive Search Bar */}
          <div className="pt-2 max-w-xl">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szukaj funkcji (np. 'import CSV', 'Safe-to-Spend', 'Runway', 'NBP', 'PIN')..."
                className="w-full pl-10 pr-9 py-2.5 bg-surface-2 border border-border text-text-main placeholder:text-text-faint rounded-xl text-xs sm:text-sm font-medium focus-visible:ring-2 focus-visible:ring-focus-ring transition shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-main p-0.5 rounded cursor-pointer"
                  title="Wyczyść szukanie"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {quickSummaryCards.map((card, idx) => (
          <div key={idx} className={card.wrapperClass}>
            <div className={card.iconClass}>
              {card.icon}
            </div>
            <div>
              <h4 className="font-bold text-text-main text-xs sm:text-sm mb-0.5">{card.title}</h4>
              <p className="text-xs text-text-muted leading-relaxed">{card.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {helpCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer ${
              selectedCategory === cat
                ? "bg-brand-subtle text-brand border border-brand/20 shadow-xs"
                : "bg-surface text-text-muted border border-border hover:bg-surface-offset hover:text-text-main active:scale-95"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Accordion Sections */}
      <div className="space-y-3">
        {filteredSections.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="font-bold text-text-main text-sm">Brak pasujących artykułów pomocy</p>
            <p className="text-xs text-text-faint mt-1">Spróbuj wpisać inną frazę lub wybierz inną kategorię.</p>
          </div>
        ) : (
          filteredSections.map((section) => (
            <HelpSection
              key={section.id}
              id={section.id}
              category={section.cat}
              title={section.title}
              icon={section.icon}
              badge={section.badge}
              defaultOpen={section.defaultOpen}
            >
              {section.content}
            </HelpSection>
          ))
        )}
      </div>

      {/* Interactive FAQ Box */}
      <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
        <h3 className="text-lg font-bold text-text-main flex items-center gap-2.5">
          <HelpCircle className="w-5 h-5 text-brand" />
          Najczęściej zadawane pytania (FAQ)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {faqData.map((faq, idx) => (
            <div key={idx} className="p-4 sm:p-5 bg-surface-2 rounded-2xl border border-border space-y-2">
              <h5 className="font-bold text-text-main text-sm">{faq.question}</h5>
              <p className="text-text-muted text-xs sm:text-sm leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
