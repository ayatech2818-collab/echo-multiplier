import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ExcelRow } from '@/types';

const normalizeParsedRows = (rows: ExcelRow[]): { headers: string[]; data: ExcelRow[] } => {
  const headerSet = new Set<string>();

  const data = rows.map((row) => {
    const normalizedRow: ExcelRow = {};

    Object.entries(row).forEach(([key, value]) => {
      const normalizedKey = key.trim();

      if (normalizedKey) {
        headerSet.add(normalizedKey);
        normalizedRow[normalizedKey] = value;
      }
    });

    return normalizedRow;
  });

  return {
    headers: Array.from(headerSet),
    data,
  };
};

export const parseCSV = (file: File): Promise<{ headers: string[]; data: ExcelRow[] }> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(normalizeParsedRows(results.data as ExcelRow[]));
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};

export const parseExcel = (file: File): Promise<{ headers: string[]; data: ExcelRow[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];

        resolve(normalizeParsedRows(jsonData));
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsBinaryString(file);
  });
};

export const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/** Most pages taken from one PDF; each page becomes its own template. */
export const MAX_PDF_PAGES = 20;

export interface LoadedPage {
  name: string;
  image: HTMLImageElement;
}

/**
 * Render a PDF to images, one per page (up to MAX_PDF_PAGES). Single-page PDFs keep the plain file
 * name; multi-page PDFs get "name (page N)". `truncated` is true when pages were left out.
 */
export const loadPDFPages = async (file: File): Promise<{ pages: LoadedPage[]; totalPages: number }> => {
  try {
    // Dynamically import PDF.js only on client side
    const pdfjsLib = await import('pdfjs-dist');

    // Use local worker file
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;
    const count = Math.min(totalPages, MAX_PDF_PAGES);
    // Lower resolution when many pages are rendered, to keep memory in check.
    const scale = count > 3 ? 1.5 : 2;

    const pages: LoadedPage[] = [];
    for (let pageNumber = 1; pageNumber <= count; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Failed to get canvas context');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext: Parameters<typeof page.render>[0] = {
        canvas,
        canvasContext: context,
        viewport,
      };
      await page.render(renderContext).promise;

      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to convert PDF to image'));
        img.src = canvas.toDataURL('image/png');
      });
      pages.push({ name: totalPages > 1 ? `${file.name} (page ${pageNumber})` : file.name, image });
    }
    return { pages, totalPages };
  } catch (error) {
    console.error('PDF loading error:', error);
    throw new Error(
      'Failed to load PDF. The file may be corrupted, password-protected, or in an unsupported format.'
    );
  }
};

/** First page of a PDF as an image (kept for callers that only need one page). */
export const loadPDF = async (file: File): Promise<HTMLImageElement> => {
  const { pages } = await loadPDFPages(file);
  return pages[0].image;
};

/** Load a template file into one or more pages (images give one, PDFs give one per page). */
export const loadTemplatePages = async (file: File): Promise<{ pages: LoadedPage[]; totalPages: number }> => {
  const fileType = file.type;
  if (fileType === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    return loadPDFPages(file);
  }
  if (fileType.startsWith('image/')) {
    return { pages: [{ name: file.name, image: await loadImage(file) }], totalPages: 1 };
  }
  throw new Error('Unsupported file type. Please upload an image (PNG/JPG) or PDF.');
};

export const loadTemplate = async (file: File): Promise<HTMLImageElement> => {
  const { pages } = await loadTemplatePages(file);
  return pages[0].image;
};

export type UploadKind = 'template' | 'dataset' | 'image';

const LIMITS: Record<UploadKind, { bytes: number; label: string }> = {
  template: { bytes: 50 * 1024 * 1024, label: '50 MB' },
  dataset: { bytes: 25 * 1024 * 1024, label: '25 MB' },
  image: { bytes: 100 * 1024 * 1024, label: '100 MB' },
};

/** Returns a plain-language problem with an upload, or null when it looks fine. */
export const validateUpload = (file: File, kind: UploadKind): string | null => {
  if (file.size === 0) return `"${file.name}" is empty.`;
  const limit = LIMITS[kind];
  if (file.size > limit.bytes) return `"${file.name}" is too large (limit ${limit.label}).`;

  const name = file.name.toLowerCase();
  if (kind === 'dataset' && !/\.(csv|xlsx|xls)$/.test(name)) {
    return `"${file.name}" isn't a CSV or Excel file.`;
  }
  if (kind === 'template' && !(file.type.startsWith('image/') || file.type === 'application/pdf' || name.endsWith('.pdf'))) {
    return `"${file.name}" isn't an image or PDF.`;
  }
  if (kind === 'image' && !(file.type.startsWith('image/') || file.type === 'application/pdf' || name.endsWith('.pdf'))) {
    return `"${file.name}" isn't an image or PDF.`;
  }
  return null;
};

/** Merge several parsed datasets: rows are concatenated and headers are the union (first-seen order). */
export const mergeDatasets = (
  datasets: { headers: string[]; rows: ExcelRow[] }[]
): { headers: string[]; rows: ExcelRow[] } => {
  const headers: string[] = [];
  const seen = new Set<string>();
  const rows: ExcelRow[] = [];
  datasets.forEach((d) => {
    d.headers.forEach((h) => {
      if (!seen.has(h)) {
        seen.add(h);
        headers.push(h);
      }
    });
    rows.push(...d.rows);
  });
  return { headers, rows };
};
