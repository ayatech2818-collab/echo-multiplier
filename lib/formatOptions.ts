/** Date styles offered in the properties panel. Tokens: YYYY YY MMMM MMM MM M DD D. */
export const DATE_PATTERNS: { pattern: string; label: string }[] = [
  { pattern: 'DD MMM YYYY', label: '12 Oct 2026' },
  { pattern: 'D MMMM YYYY', label: '12 October 2026' },
  { pattern: 'MMMM D, YYYY', label: 'October 12, 2026' },
  { pattern: 'DD/MM/YYYY', label: '12/10/2026' },
  { pattern: 'MM/DD/YYYY', label: '10/12/2026' },
  { pattern: 'YYYY-MM-DD', label: '2026-10-12' },
];
