export type FontStyle = 'normal' | 'bold' | 'italic' | 'bold italic';
export type TextAlign = 'left' | 'center' | 'right';

// One part of a combined field. A combined field is an ordered list of these.
// `type: 'column'` looks up `value` as an Excel header; `type: 'text'` renders `value` literally
// (including separators like ", " or a single space). Each segment can override the field's base
// style so every part can have its own size/color/font, and `gapBefore` adds per-join spacing.
export interface CombinedSegment {
  id: string;
  type: 'text' | 'column';
  value: string;
  gapBefore?: number; // px inserted before this segment (per-join spacing; ignored on the first)
  // optional per-segment style overrides (fall back to the field's base style):
  fontSize?: number;
  fill?: string;
  fontStyle?: FontStyle;
  fontFamily?: string;
}

export interface CanvasField {
  id: string;
  headerName: string;
  x: number;
  y: number;
  fontSize: number;
  fill: string;
  fontStyle: FontStyle;
  fontFamily?: string;
  align?: TextAlign;
  // When true, this field renders its literal text (stored in headerName) instead of
  // looking up a value from the dataset row. Used for custom words like "and", "or".
  isStatic?: boolean;
  // When present, this is a combined field: rendered as inline styled runs from these segments
  // instead of a single value. `width` is an optional wrap width in canvas px (undefined = single line).
  segments?: CombinedSegment[];
  width?: number;
}

// A reusable combined-field definition built in the CombinedFieldBuilder. Backs a placeable chip;
// when placed it becomes a CanvasField carrying these segments + base style.
export interface CombinedFieldDef {
  id: string;
  label: string;
  segments: CombinedSegment[];
  width?: number;
  // base style (defaults for segments that don't override):
  fontSize: number;
  fill: string;
  fontStyle: FontStyle;
  fontFamily: string;
  align: TextAlign;
}

export interface ExcelRow {
  [key: string]: string | number;
}

export type OutputFormat = 'image' | 'pdf';
export type ExportBatchSize = 50 | 100 | 250 | 500 | 'all';

export interface AppState {
  templateImage: HTMLImageElement | null;
  excelHeaders: string[];
  excelData: ExcelRow[];
  canvasFields: CanvasField[];
  selectedFieldId: string | null;
  outputFormat: OutputFormat;
  exportBatchSize: ExportBatchSize;
  filenameTemplate: string;
  previewMode: boolean;
}
