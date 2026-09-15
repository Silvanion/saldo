import {
  Wallet, PiggyBank, TrendingUp, Landmark, CreditCard, Coins,
  Home, Briefcase, Heart, Users,
  Rocket, Star, Gem, Compass,
  type LucideIcon,
} from "lucide-react";

export const AVATAR_ICONS: Record<string, LucideIcon> = {
  wallet: Wallet,
  piggyBank: PiggyBank,
  trendingUp: TrendingUp,
  landmark: Landmark,
  creditCard: CreditCard,
  coins: Coins,
  home: Home,
  briefcase: Briefcase,
  heart: Heart,
  users: Users,
  rocket: Rocket,
  star: Star,
  gem: Gem,
  compass: Compass,
};

export type AvatarIconId = keyof typeof AVATAR_ICONS;

export const AVATAR_ICON_IDS = Object.keys(AVATAR_ICONS) as AvatarIconId[];

export const DEFAULT_AVATAR_ICON: AvatarIconId = "wallet";

interface AvatarColorDef {
  bg: string;
  text: string;
  swatch: string;
}

export const AVATAR_COLORS: Record<string, AvatarColorDef> = {
  brand: { bg: "bg-brand-subtle", text: "text-brand", swatch: "bg-brand" },
  emerald: { bg: "bg-emerald-500/15 dark:bg-emerald-400/20", text: "text-emerald-600 dark:text-emerald-400", swatch: "bg-emerald-500" },
  sky: { bg: "bg-sky-500/15 dark:bg-sky-400/20", text: "text-sky-600 dark:text-sky-400", swatch: "bg-sky-500" },
  violet: { bg: "bg-violet-500/15 dark:bg-violet-400/20", text: "text-violet-600 dark:text-violet-400", swatch: "bg-violet-500" },
  amber: { bg: "bg-amber-500/15 dark:bg-amber-400/20", text: "text-amber-600 dark:text-amber-400", swatch: "bg-amber-500" },
  rose: { bg: "bg-rose-500/15 dark:bg-rose-400/20", text: "text-rose-600 dark:text-rose-400", swatch: "bg-rose-500" },
};

export type AvatarColorId = keyof typeof AVATAR_COLORS;

export const AVATAR_COLOR_IDS = Object.keys(AVATAR_COLORS) as AvatarColorId[];

export const DEFAULT_AVATAR_COLOR: AvatarColorId = "brand";

// Mapowanie starych emotikonów na nowe wektorowe ikony, żeby istniejące profile
// nie wyglądały niespójnie po migracji (bez wymuszania zapisu danych).
const LEGACY_EMOJI_TO_ICON: Record<string, AvatarIconId> = {
  "👤": "wallet",
  "👨‍💻": "briefcase",
  "👩‍💻": "briefcase",
  "🏠": "home",
  "💼": "briefcase",
  "💰": "coins",
  "💎": "gem",
  "🌟": "star",
  "✨": "star",
  "🚀": "rocket",
  "🐶": "heart",
  "🐱": "heart",
};

export function resolveAvatarIcon(stored?: string): AvatarIconId {
  if (!stored) return DEFAULT_AVATAR_ICON;
  if (stored in AVATAR_ICONS) return stored as AvatarIconId;
  return LEGACY_EMOJI_TO_ICON[stored] ?? DEFAULT_AVATAR_ICON;
}

export function resolveAvatarColor(stored?: string): AvatarColorId {
  if (stored && stored in AVATAR_COLORS) return stored as AvatarColorId;
  return DEFAULT_AVATAR_COLOR;
}
