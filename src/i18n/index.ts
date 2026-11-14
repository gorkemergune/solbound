import type { Locale } from '../engine/types';
import { en, type TKey } from './en';

export type { TKey };
// English is bundled (it is also the fallback); Turkish is a separate chunk loaded on demand.
const DICTS: Partial<Record<Locale, Record<string, string>>> = { en };

export function isLocaleLoaded(locale: Locale): boolean {
  return !!DICTS[locale];
}

export async function loadLocale(locale: Locale): Promise<void> {
  if (DICTS[locale]) return;
  if (locale === 'tr') DICTS.tr = (await import('./tr')).tr;
}

/** The language to start in: the saved choice, else the browser language. */
export function initialLocale(): Locale {
  try {
    const v = window.localStorage.getItem('solbound.locale');
    if (v === 'en' || v === 'tr') return v;
  } catch {
    /* storage blocked */
  }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

export type Params = Record<string, string | number | undefined>;

/** Parameterised translation. Never concatenates sentences; unknown keys return the key itself. */
export function translate(locale: Locale, key: string, params?: Params): string {
  const dict = DICTS[locale] ?? (en as Record<string, string>);
  let s = dict[key] ?? (en as Record<string, string>)[key] ?? key;
  if (params) {
    s = s.replace(/\{(\w+)\}/g, (_, p: string) => {
      const v = params[p];
      if (v === undefined) return `{${p}}`;
      return typeof v === 'number' ? formatNumber(locale, v) : v;
    });
  }
  return s;
}

export function hasKey(key: string) {
  return key in en;
}

export function formatNumber(locale: Locale, v: number, digits = 0): string {
  return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-GB', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(v);
}

export function formatFixed(locale: Locale, v: number, digits = 1): string {
  return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-GB', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(v);
}

export function listFormat(locale: Locale, items: string[]): string {
  try {
    return new Intl.ListFormat(locale === 'tr' ? 'tr-TR' : 'en-GB', { style: 'long', type: 'conjunction' }).format(items);
  } catch {
    return items.join(', ');
  }
}

export function orList(locale: Locale, items: string[]): string {
  try {
    return new Intl.ListFormat(locale === 'tr' ? 'tr-TR' : 'en-GB', { style: 'long', type: 'disjunction' }).format(items);
  } catch {
    return items.join(' / ');
  }
}
