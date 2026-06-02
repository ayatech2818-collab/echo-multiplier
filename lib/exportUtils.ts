import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import { ExcelRow, CanvasField, OutputFormat } from '@/types';
import { sanitizeFilename } from './utils';
import Konva from 'konva';

export const generateFilename = (template: string, rowData: ExcelRow, fallback: string): string => {
  let filename = template.trim();

  if (!filename) {
    return fallback;
  }
  
  // Replace {{HeaderName}} with actual values
  const matches = filename.match(/\{\{([^}]+)\}\}/g);
  if (matches) {
    matches.forEach((match) => {
      const headerName = match.replace(/\{\{|\}\}/g, '').trim();
      const value = rowData[headerName] || 'Unknown';
      filename = filename.replace(match, String(value));
    });
  }
  
  // Sanitize the filename to remove invalid characters
  return sanitizeFilename(filename) || fallback;
};

export const exportSingleDocument = async (
  stage: Konva.Stage,
  filename: string,
  format: OutputFormat
): Promise<{ blob: Blob; filename: string }> => {
  const dataURL = stage.toDataURL({ pixelRatio: 2 });
  
  if (format === 'image') {
    const response = await fetch(dataURL);
    const blob = await response.blob();
    return { blob, filename: `${filename}.png` };
  } else {
    // PDF export
    const img = new Image();
    await new Promise((resolve) => {
      img.onload = resolve;
      img.src = dataURL;
    });
    
    const pdf = new jsPDF({
      orientation: img.width > img.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [img.width, img.height],
    });
    
    pdf.addImage(dataURL, 'PNG', 0, 0, img.width, img.height);
    const pdfBlob = pdf.output('blob');
    
    return { blob: pdfBlob, filename: `${filename}.pdf` };
  }
};

export const exportBatch = async (
  stage: Konva.Stage,
  textLayer: Konva.Layer,
  canvasFields: CanvasField[],
  excelData: ExcelRow[],
  filenameTemplate: string,
  format: OutputFormat,
  onProgress?: (current: number, total: number) => void,
  startIndex: number = 0,
  totalRecords: number = excelData.length
): Promise<Blob> => {
  const zip = new JSZip();
  
  for (let i = 0; i < excelData.length; i++) {
    const rowData = excelData[i];
    
    // Update text fields with current row data
    textLayer.destroyChildren();
    
    canvasFields.forEach((field) => {
      const value = rowData[field.headerName] || '';
      const textAlign = field.align || 'center';
      
      // Create text node
      const text = new Konva.Text({
        x: field.x,
        y: field.y,
        text: String(value),
        fontSize: field.fontSize,
        fill: field.fill,
        fontStyle: field.fontStyle,
        fontFamily: field.fontFamily || 'Arial',
      });
      
      // Calculate offset based on alignment to center text at the given coordinates
      const textWidth = text.width();
      let offsetX = 0;
      if (textAlign === 'center') {
        offsetX = textWidth / 2;
      } else if (textAlign === 'right') {
        offsetX = textWidth;
      }
      
      text.offsetX(offsetX);
      textLayer.add(text);
    });
    
    textLayer.batchDraw();
    
    // Generate filename
    const recordNumber = startIndex + i + 1;
    const filename = generateFilename(filenameTemplate, rowData, `document-${recordNumber}`);
    
    // Export document
    const { blob, filename: fullFilename } = await exportSingleDocument(
      stage,
      filename,
      format
    );
    
    zip.file(fullFilename, blob);
    
    if (onProgress) {
      onProgress(recordNumber, totalRecords);
    }
  }
  
  return await zip.generateAsync({ type: 'blob' });
};

export const downloadZip = (blob: Blob, filename: string = 'documents.zip') => {
  saveAs(blob, filename);
};
