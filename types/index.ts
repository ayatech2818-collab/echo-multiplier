export type FontStyle = 'normal' | 'bold' | 'italic' | 'bold italic';
export type TextAlign = 'left' | 'center' | 'right';

// What a placed field renders. Undefined means 'text' (keeps older saved layouts working).
export type FieldKind = 'text' | 'image' | 'qr' | 'barcode';

export type FormatType = 'none' | 'upper' | 'lower' | 'title' | 'number' | 'currency' | 'date';

// Display formatting applied to a single-column field's value (preview and export share it).
export interface FieldFormat {
  type: FormatType;
  // number/currency: decimals ("2"), currency: symbol ("₹"), date: pattern ("DD MMM YYYY").
  pattern?: string;
  decimals?: number;
  symbol?: string;
}

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

  // ---- Media fields (image / qr / barcode) ----
  kind?: FieldKind;
  height?: number;
  // Static image: the library key of the chosen image (its lowercase file name).
  imageSrc?: string;
  // Per-row image / qr / barcode: the dataset column that supplies the value.
  imageColumn?: string;
  // Per-row image taken BY POSITION from a PDF's pages: row 1 -> page 1, row 2 -> page 2, ...
  // (the value is the PDF's file name).
  imageGroup?: string;
  // QR / barcode with fixed text (no column): the literal value to encode.
  codeText?: string;
  // How the picture sits in its box: 'cover' = best fit (fills the box, crops overflow, no distortion),
  // 'contain' = whole picture visible (may leave bars), 'fill' = stretched to the box.
  fit?: 'contain' | 'cover' | 'fill';
  // Which part of the picture stays in view / where it sits in the box: 0 = left/top, 0.5 = centre, 1 = right/bottom.
  focusX?: number;
  focusY?: number;
  shape?: 'rect' | 'circle';
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  // Rounded corners in template px (image fields with shape 'rect'; 'circle' is always fully round).
  cornerRadius?: number;
  // Colour shown behind the picture (visible around 'whole picture' fits and transparent PNGs).
  bgColor?: string;
  opacity?: number; // 0..1
  lockRatio?: boolean;

  // ---- Text extras ----
  // Shrink the font until the text fits within `width` (single-column fields only).
  autoFit?: boolean;
  format?: FieldFormat;
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

export type OutputFormat = 'image' | 'pdf' | 'single-pdf';
export type ExportBatchSize = 50 | 100 | 250 | 500 | 'all';

// A template background (one per uploaded image, or one per page of a multi-page PDF).
export interface TemplateItem {
  id: string;
  name: string;
  image: HTMLImageElement;
}

// One parsed dataset file. Datasets are merged (rows concatenated, headers unioned) for use.
export interface DatasetItem {
  id: string;
  name: string;
  headers: string[];
  rows: ExcelRow[];
}

// An uploaded image in the library, used by static image fields and per-row image columns.
export interface ImageAsset {
  id: string;
  name: string; // original file name
  key: string; // lowercase file name, used to match dataset values
  image: HTMLImageElement;
  thumb: string; // small data URL for the library UI
  group?: string; // set for pictures that came from a PDF: the PDF's file name
  page?: number; // 1-based page number within that PDF
}

export type NoticeKind = 'error' | 'warning' | 'success' | 'info';
export interface Notice {
  id: string;
  kind: NoticeKind;
  message: string;
}

// A saved layout (JSON file / localStorage). Templates, data and images are NOT embedded.
export interface LayoutFile {
  version: 1;
  fields: CanvasField[];
  combinedFields: CombinedFieldDef[];
  filenameTemplate: string;
  outputFormat: OutputFormat;
}
