import { formatMoney, DEFAULT_CURRENCY } from '@shared/money';

// The active locale is set by the i18n LanguageProvider so every money() call across
// the app becomes locale-aware (Arabic-Indic numerals in Arabic) without threading a
// locale through every call site. Callers may still pass an explicit locale.
let currentLocale = 'en-JO';
export function setMoneyLocale(locale: string) {
  currentLocale = locale;
}

/**
 * Format an integer minor-unit amount as localized currency. Currency-aware: JOD
 * renders 3 decimals (fils), USD 2. The legacy name `cents` is kept for callers;
 * the value is interpreted as the currency's minor unit.
 */
export function money(cents: number, currency: string = DEFAULT_CURRENCY, locale: string = currentLocale): string {
  return formatMoney(cents, currency, locale);
}

export function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
