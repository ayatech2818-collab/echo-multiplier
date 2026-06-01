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
}

export interface ExcelRow {
  [key: string]: string | number;
}

export type OutputFormat = 'image' | 'pdf';

export interface AppState {
  templateImage: HTMLImageElement | null;
  excelHeaders: string[];
  excelData: ExcelRow[];
  canvasFields: CanvasField[];
  selectedFieldId: string | null;
  outputFormat: OutputFormat;
  filenameTemplate: string;
  previewMode: boolean;
}
