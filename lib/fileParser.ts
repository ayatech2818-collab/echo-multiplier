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

export const loadPDF = async (file: File): Promise<HTMLImageElement> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Dynamically import PDF.js only on client side
      const pdfjsLib = await import('pdfjs-dist');
      
      // Use local worker file
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
      }
      
      const arrayBuffer = await file.arrayBuffer();
      
      // Load PDF
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
      });
      
      const pdf = await loadingTask.promise;
      
      // Get first page
      const page = await pdf.getPage(1);
      
      // Set scale for good quality (2x for retina displays)
      const scale = 2;
      const viewport = page.getViewport({ scale });
      
      // Create canvas to render PDF
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // Render PDF page to canvas
      const renderContext: Parameters<typeof page.render>[0] = {
        canvas,
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
      
      // Convert canvas to image
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to convert PDF to image'));
      img.src = canvas.toDataURL('image/png');
      
    } catch (error) {
      console.error('PDF loading error:', error);
      reject(new Error('Failed to load PDF. The file may be corrupted, password-protected, or in an unsupported format.'));
    }
  });
};

export const loadTemplate = async (file: File): Promise<HTMLImageElement> => {
  const fileType = file.type;
  
  if (fileType === 'application/pdf') {
    return loadPDF(file);
  } else if (fileType.startsWith('image/')) {
    return loadImage(file);
  } else {
    throw new Error('Unsupported file type. Please upload an image (PNG/JPG) or PDF.');
  }
};
