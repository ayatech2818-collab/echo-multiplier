import { FieldFormat } from '@/types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const DEFAULT_DATE_PATTERN = 'DD MMM YYYY';

const pad = (n: number) => String(n).padStart(2, '0');

/** Parse a cell into a Date. Handles Excel serial numbers and anything Date can read. */
export const parseDateValue = (value: string | number): Date | null => {
  if (typeof value === 'number' || /^\d{4,6}(\.\d+)?$/.test(String(value).trim())) {
    const n = Number(value);
    // Excel serial dates (1900 system): 25569 = 1970-01-01.
    if (n > 20000 && n < 80000) {
      const d = new Date(Math.round((n - 25569) * 86400 * 1000));
      return isNaN(d.getTime()) ? null : new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    }
  }
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? null : d;
};

export const formatDate = (date: Date, pattern: string): string => {
  const tokens: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    YY: String(date.getFullYear()).slice(-2),
    MMMM: MONTHS[date.getMonth()],
    MMM: MONTHS[date.getMonth()].slice(0, 3),
    MM: pad(date.getMonth() + 1),
    M: String(date.getMonth() + 1),
    DD: pad(date.getDate()),
    D: String(date.getDate()),
  };
  return pattern.replace(/YYYY|YY|MMMM|MMM|MM|M|DD|D/g, (t) => tokens[t]);
};

const toNumber = (value: string | number): number | null => {
  if (typeof value === 'number') return isFinite(value) ? value : null;
  const cleaned = String(value).replace(/[,\s]/g, '').replace(/^[^\d.+-]+/, '');
  if (cleaned === '' || isNaN(Number(cleaned))) return null;
  return Number(cleaned);
};

const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|[\s\-'])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());

/**
 * Apply a display format to a raw cell value. Never throws: if the value can't be formatted
 * (e.g. "abc" as a number) the original text is returned unchanged.
 */
export const formatValue = (value: string | number, format?: FieldFormat): string => {
  const text = String(value);
  if (!format || format.type === 'none' || text === '') return text;

  switch (format.type) {
    case 'upper':
      return text.toUpperCase();
    case 'lower':
      return text.toLowerCase();
    case 'title':
      return titleCase(text);
    case 'number':
    case 'currency': {
      const n = toNumber(value);
      if (n === null) return text;
      const decimals = Math.min(10, Math.max(0, format.decimals ?? (format.type === 'currency' ? 2 : 0)));
      const body = n.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      return format.type === 'currency' ? `${format.symbol ?? '$'}${body}` : body;
    }
    case 'date': {
      const d = parseDateValue(value);
      return d ? formatDate(d, format.pattern || DEFAULT_DATE_PATTERN) : text;
    }
    default:
      return text;
  }
};
