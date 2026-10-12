import { CanvasField, CombinedFieldDef, LayoutFile, OutputFormat } from '@/types';

const STORAGE_KEY = 'echo-multiplier:layout:v1';
const THEME_KEY = 'echo-multiplier:theme';

/** localStorage can throw (private mode, blocked site data) or be missing — never let that break the app. */
export const safeStorage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* storage unavailable: the app still works, it just won't remember */
    }
  },
  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

export const THEME_STORAGE_KEY = THEME_KEY;

export const serializeLayout = (
  fields: CanvasField[],
  combinedFields: CombinedFieldDef[],
  filenameTemplate: string,
  outputFormat: OutputFormat
): LayoutFile => ({ version: 1, fields, combinedFields, filenameTemplate, outputFormat });

const OUTPUT_FORMATS: OutputFormat[] = ['image', 'pdf', 'single-pdf'];

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && isFinite(v);

/** Validate unknown JSON into a LayoutFile, or return null if it isn't one. Drops malformed fields. */
export const parseLayout = (raw: unknown): LayoutFile | null => {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  if (data.version !== 1 || !Array.isArray(data.fields)) return null;

  const fields = (data.fields as unknown[]).filter((f): f is CanvasField => {
    if (!f || typeof f !== 'object') return false;
    const field = f as Record<string, unknown>;
    return (
      typeof field.id === 'string' &&
      typeof field.headerName === 'string' &&
      isFiniteNumber(field.x) &&
      isFiniteNumber(field.y) &&
      isFiniteNumber(field.fontSize)
    );
  });

  const combinedFields = Array.isArray(data.combinedFields)
    ? (data.combinedFields as unknown[]).filter(
        (d): d is CombinedFieldDef =>
          !!d && typeof d === 'object' && typeof (d as CombinedFieldDef).id === 'string' && Array.isArray((d as CombinedFieldDef).segments)
      )
    : [];

  return {
    version: 1,
    fields,
    combinedFields,
    filenameTemplate: typeof data.filenameTemplate === 'string' ? data.filenameTemplate : '',
    outputFormat: OUTPUT_FORMATS.includes(data.outputFormat as OutputFormat) ? (data.outputFormat as OutputFormat) : 'image',
  };
};

export const saveLayoutToStorage = (layout: LayoutFile) => safeStorage.set(STORAGE_KEY, JSON.stringify(layout));

export const loadLayoutFromStorage = (): LayoutFile | null => {
  const raw = safeStorage.get(STORAGE_KEY);
  if (!raw) return null;
  try {
    return parseLayout(JSON.parse(raw));
  } catch {
    return null;
  }
};
