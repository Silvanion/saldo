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
    <div className="border border-border rounded-2xl overflow-hidden mb-4 bg-surface shadow-sm hover:shadow-md transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left focus:outline-none hover:bg-slate-700/30 dark:hover:bg-surface/5 transition-colors"
      >
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-indigo-50 text-[#137566] rounded-xl shadow-xs shrink-0">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-text-main text-base sm:text-lg">{title}</span>
              {badge && (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-[#137566] px-2 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
            </div>
            <span className="text-xs text-text-muted font-medium">{category}</span>
          </div>
        </div>
        <div className="text-text-muted p-1 rounded-xl hover:bg-slate-700/50 dark:hover:bg-surface/10 transition-colors">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>
      {isOpen && (
        <div className="p-5 pt-4 text-slate-700 border-t border-slate-100 leading-relaxed bg-surface/50">
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
      <div className="bg-gradient-to-br from-[#137566] via-[#0f5c50] to-[#0a4239] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 bg-surface/10  px-3 py-1 rounded-full text-xs font-bold text-emerald-200 border border-white/10">
            <Sparkles className="w-3.5 h-3.5" /> Complete User Guide & Knowledge Base
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-300" />
            Centrum Pomocy i Przewodnik Po Saldo
          </h2>
          <p className="text-[#c3ebe2] text-sm sm:text-base max-w-3xl leading-relaxed">
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
                className="w-full pl-11 pr-4 py-3 bg-surface text-white placeholder-slate-400 rounded-xl shadow-inner text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-64 h-64 bg-black/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickSummaryCards.map((card, idx) => (
          <div key={idx} className={card.wrapperClass}>
            <div className={card.iconClass}>
              {card.icon}
            </div>
            <div>
              <h4 className="font-bold text-text-main text-sm">{card.title}</h4>
              <p className="text-xs text-text-muted mt-1">{card.description}</p>
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
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? "bg-[#137566] text-white shadow-sm scale-105"
                : "bg-surface text-text-muted border border-border hover:bg-surface"
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
      <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2.5">
          <HelpCircle className="w-6 h-6 text-[#137566]" />
          Najczęściej zadawane pytania (FAQ)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {faqData.map((faq, idx) => (
            <div key={idx} className="p-4 bg-surface rounded-2xl border border-slate-100 space-y-1.5">
              <h5 className="font-bold text-white text-sm">{faq.question}</h5>
              <p className="text-text-muted leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
