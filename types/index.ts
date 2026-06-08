export interface CanvasField {
  id: string;
  headerName: string;
  x: number;
  y: number;
  fontSize: number;
  fill: string;
  fontStyle: 'normal' | 'bold' | 'italic' | 'bold italic';
  fontFamily?: string;
  align?: 'left' | 'center' | 'right';
  // When true, this field renders its literal text (stored in headerName) instead of
  // looking up a value from the dataset row. Used for custom words like "and", "or".
  isStatic?: boolean;
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
