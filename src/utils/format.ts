import type { AppSettings } from '../types';

const CURRENCY_SYMBOLS: Record<string, string> = {
  MYR: 'RM', AUD: 'A$', CAD: 'C$', CHF: 'Fr', CNY: '¥',
  EUR: '€', GBP: '£', HKD: 'HK$', NZD: 'NZ$', SGD: 'S$', USD: '$',
};

export function createFormatter(settings: AppSettings): (cents: number) => string {
  return (cents: number): string => {
    const value = cents / 100;
    let formatted: string;

    if (settings.numberFormat === 'european') {
      formatted = value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (settings.numberFormat === 'swiss') {
      formatted = value.toLocaleString('fr-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
      formatted = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    if (settings.symbolDisplay === 'hide') {
      return formatted;
    } else if (settings.symbolDisplay === 'iso') {
      return `${formatted} ${settings.currency}`;
    } else {
      const symbol = CURRENCY_SYMBOLS[settings.currency] ?? settings.currency;
      return `${symbol}${formatted}`;
    }
  };
}

export function createParser(settings: AppSettings): (str: string) => number | null {
  return (str: string): number | null => {
    let normalized = str.trim();
    if (settings.numberFormat === 'european') {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
    const v = parseFloat(normalized);
    if (isNaN(v) || v < 0) return null;
    return Math.round(v * 100);
  };
}

// Default instances for backwards-compat (components should prefer store's fmt/parse)
const DEFAULT_SETTINGS: AppSettings = { currency: 'MYR', symbolDisplay: 'show', numberFormat: 'english' };
export const fmt = createFormatter(DEFAULT_SETTINGS);
export const parseDollars = createParser(DEFAULT_SETTINGS);
