/**
 * Currency-aware money. Single source of truth for parse / format / round.
 *
 * Money is ALWAYS stored and passed around as an integer number of minor units
 * (the currency's smallest indivisible unit) plus a currency code. There are no
 * floats in money math — division only ever happens for display formatting.
 *
 * Per-currency exponents:
 *   JOD -> 3 (1 JOD = 1000 fils)   <-- Jordan default
 *   USD -> 2 (1 USD = 100 cents)
 *
 * The historical schema names monetary columns `*Cents`. Those integers are now
 * interpreted generically as MINOR UNITS in the row's currency, so a JOD value
 * of 1500 means 1.500 JOD (1500 fils), while a USD value of 1500 means $15.00.
 */

export const DEFAULT_CURRENCY = 'JOD';

/** Minor-unit exponents by ISO-4217 code. Extend as new currencies are supported. */
const CURRENCY_EXPONENTS: Record<string, number> = {
  JOD: 3,
  KWD: 3,
  BHD: 3,
  OMR: 3,
  TND: 3,
  USD: 2,
  EUR: 2,
  GBP: 2,
  AED: 2,
  SAR: 2,
  EGP: 2,
  JPY: 0,
  // fallback handled by minorUnitExponent()
};

const DEFAULT_EXPONENT = 2;

export function normalizeCurrency(currency: string | null | undefined): string {
  const code = (currency ?? DEFAULT_CURRENCY).trim().toUpperCase();
  return code.length === 3 ? code : DEFAULT_CURRENCY;
}

/** Number of decimal places for a currency (its minor-unit exponent). */
export function minorUnitExponent(currency: string): number {
  const code = normalizeCurrency(currency);
  return CURRENCY_EXPONENTS[code] ?? DEFAULT_EXPONENT;
}

/** 10 ** exponent — how many minor units make one major unit. */
export function minorUnitFactor(currency: string): number {
  return 10 ** minorUnitExponent(currency);
}

/** Convert a major-unit decimal (e.g. user-typed 12.5) to integer minor units, no float drift. */
export function toMinor(major: number, currency: string): number {
  if (!Number.isFinite(major)) return 0;
  return Math.round(major * minorUnitFactor(currency));
}

/** Convert integer minor units to a major-unit decimal. For display/serialization only. */
export function toMajor(minor: number, currency: string): number {
  return minor / minorUnitFactor(currency);
}

/**
 * Parse a free-text amount ("12.500", "1,234.5", "د.أ 7") into integer minor units.
 * Returns null when the string holds no parseable number.
 */
export function parseMoney(input: string | number, currency: string): number | null {
  if (typeof input === 'number') return Number.isFinite(input) ? toMinor(input, currency) : null;
  // Keep digits, separators and sign; drop currency symbols / letters / spaces.
  const cleaned = input.replace(/[^0-9.,-]/g, '').trim();
  if (!cleaned) return null;
  // Treat the LAST separator as the decimal point; the rest are grouping.
  const lastSep = Math.max(cleaned.lastIndexOf('.'), cleaned.lastIndexOf(','));
  let normalized: string;
  if (lastSep === -1) {
    normalized = cleaned.replace(/[.,]/g, '');
  } else {
    const intPart = cleaned.slice(0, lastSep).replace(/[.,]/g, '');
    const fracPart = cleaned.slice(lastSep + 1).replace(/[^0-9]/g, '');
    normalized = `${intPart}.${fracPart}`;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? toMinor(value, currency) : null;
}

/**
 * Format integer minor units as a localized currency string.
 * locale: 'ar-JO' for Arabic (Arabic-Indic numerals) or 'en-JO' / 'en-US' for Western.
 */
export function formatMoney(minor: number, currency: string, locale = 'en-JO'): string {
  const code = normalizeCurrency(currency);
  const exponent = minorUnitExponent(code);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: exponent,
      maximumFractionDigits: exponent,
    }).format(toMajor(minor, code));
  } catch {
    // Unknown currency code for Intl — fall back to a plain fixed-decimal render.
    return `${toMajor(minor, code).toFixed(exponent)} ${code}`;
  }
}

/** Round a fractional minor-unit value to an integer (half-up). */
export function roundMinor(value: number): number {
  return Math.round(value);
}

/** Percentage (0-100) of an amount, clamped to the amount, half-up — used by PERCENT discounts. */
export function percentOf(minor: number, percent: number): number {
  return Math.min(minor, Math.round((minor * percent) / 100));
}

/**
 * Rescale an amount when a row's currency changes exponent (data migration helper),
 * e.g. moving a value authored in USD cents (exp 2) to JOD fils (exp 3) multiplies by 10.
 */
export function rescaleMinor(minor: number, fromCurrency: string, toCurrency: string): number {
  const fromExp = minorUnitExponent(fromCurrency);
  const toExp = minorUnitExponent(toCurrency);
  if (fromExp === toExp) return minor;
  if (toExp > fromExp) return minor * 10 ** (toExp - fromExp);
  return Math.round(minor / 10 ** (fromExp - toExp));
}

export function isKnownCurrency(currency: string): boolean {
  return normalizeCurrency(currency) in CURRENCY_EXPONENTS;
}
