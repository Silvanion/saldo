import React, { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  BookOpen,
  HelpCircle,
  Sparkles,
  ShieldCheck,
  Zap,
  FileSpreadsheet
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
    <div className="border border-border rounded-2xl overflow-hidden mb-4 bg-surface shadow-xs hover:border-border/80 transition-colors">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left focus:outline-none hover:bg-surface-2 active:scale-[0.99] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500/50 relative z-10"
      >
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-brand-surface text-brand rounded-xl shadow-xs shrink-0">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-text-main text-base sm:text-lg">{title}</span>
              {badge && (
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-surface-2 text-text-muted px-2 py-0.5 rounded-md border border-border/50">
                  {badge}
                </span>
              )}
            </div>
            <span className="text-xs text-text-muted font-medium">{category}</span>
          </div>
        </div>
        <div className="text-text-muted p-1 rounded-xl hover:bg-surface-2 transition-colors shrink-0 ml-3">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>
      {isOpen && (
        <div className="p-5 pt-4 text-text-muted border-t border-border/50 leading-relaxed text-sm">
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
    return helpSectionsData.filter((item) => {
      const matchCat = selectedCategory === "Wszystko" || item.cat === selectedCategory;
      const matchSearch =
        searchQuery.trim() === "" ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.cat.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header Banner */}
      <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 text-text-main relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-brand-surface px-3 py-1 rounded-full text-xs font-semibold text-brand">
            <Sparkles className="w-3.5 h-3.5" /> Complete User Guide & Knowledge Base
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
            <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-brand" />
            Centrum Pomocy
          </h2>
          <p className="text-text-muted text-sm sm:text-base max-w-3xl leading-relaxed">
            Kompleksowy poradnik opisujący działanie każdej funkcji, zależności finansowe, ochronę kapitału oraz instrukcje krok po kroku ze wskaźnikami kliknięć.
          </p>

          {/* Interactive Search Bar */}
          <div className="pt-2 max-w-xl">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szukaj funkcji (np. 'import CSV', 'Safe to spend', 'IKE', 'PIN')..."
                className="w-full pl-11 pr-4 py-3 bg-surface-2 text-text-main placeholder-text-muted/60 rounded-xl text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 transition-shadow"
              />
            </div>
          </div>
        </div>

        {/* Decorative elements removed for clean light mode */}
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickSummaryCards.map((card, idx) => (
          <div key={idx} className={card.wrapperClass}>
            <div className={card.iconClass}>
              {card.icon}
            </div>
            <div>
              <h4 className="font-semibold text-text-main text-sm mb-0.5">{card.title}</h4>
              <p className="text-xs text-text-muted leading-relaxed">{card.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {helpCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
              selectedCategory === cat
                ? "bg-text-main text-surface shadow-sm"
                : "bg-surface text-text-muted border border-border hover:bg-surface-2 hover:text-text-main active:scale-95 cursor-pointer"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Accordion Sections */}
      <div className="space-y-4">
        {filteredSections.map((section) => (
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
        ))}
      </div>

      {/* Interactive FAQ Box */}
      <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 space-y-6">
        <h3 className="text-lg font-bold text-text-main flex items-center gap-2.5">
          <HelpCircle className="w-5 h-5 text-text-muted" />
          Najczęściej zadawane pytania (FAQ)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {faqData.map((faq, idx) => (
            <div key={idx} className="p-4 sm:p-5 bg-bg-base/50 rounded-2xl border border-border/50 space-y-2">
              <h5 className="font-semibold text-text-main text-sm">{faq.question}</h5>
              <p className="text-text-muted text-xs sm:text-sm leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
