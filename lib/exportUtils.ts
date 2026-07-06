import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import { ExcelRow, CanvasField, OutputFormat } from '@/types';
import { sanitizeFilename, resolveFieldText } from './utils';
import { layoutCombined, resolveSegmentText } from './combinedLayout';
import Konva from 'konva';

/**
 * When no filename template is given, name each file after a field the user placed on the template.
 * Priority: the first single-column field, else the first column segment inside a combined field.
 * Returns '' when no data-backed field is placed (caller falls back to a numbered name).
 */
const autoNameValue = (canvasFields: CanvasField[], rowData: ExcelRow): string => {
  const columnField = canvasFields.find((f) => !f.isStatic && !f.segments);
  if (columnField) return resolveFieldText(columnField, rowData);

  for (const field of canvasFields) {
    const columnSeg = field.segments?.find((s) => s.type === 'column');
    if (columnSeg) return resolveSegmentText(columnSeg, rowData);
  }
  return '';
};

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
      const value = rowData[headerName] ?? 'Unknown';
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
  const dataURL = stage.toDataURL({ pixelRatio: 2, mimeType: 'image/jpeg', quality: 0.92 });
  
  if (format === 'image') {
    const response = await fetch(dataURL);
    const blob = await response.blob();
    return { blob, filename: `${filename}.jpg` };
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
    
    pdf.addImage(dataURL, 'JPEG', 0, 0, img.width, img.height);
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
  // Track names already used in this zip so repeated field values don't silently overwrite each other.
  const usedNames = new Map<string, number>();

  for (let i = 0; i < excelData.length; i++) {
    const rowData = excelData[i];
    
    // Update text fields with current row data
    textLayer.destroyChildren();
    
    canvasFields.forEach((field) => {
      // Combined field: render one text node per laid-out run (anchored at the field top-left).
      if (field.segments) {
        // offsetX anchors the box by `align` around field.x (same as the preview Group's offsetX).
        const { runs, offsetX } = layoutCombined(field, rowData);
        runs.forEach((run) => {
          textLayer.add(
            new Konva.Text({
              x: field.x + run.x - offsetX,
              y: field.y + run.y,
              text: run.text,
              fontSize: run.fontSize,
              fill: run.fill,
              fontStyle: run.fontStyle,
              fontFamily: run.fontFamily,
            })
          );
        });
        return;
      }

      // Single-column or static field: one text node, anchored by alignment.
      const value = resolveFieldText(field, rowData);
      const textAlign = field.align || 'center';

      const text = new Konva.Text({
        x: field.x,
        y: field.y,
        text: value,
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
    
    // Generate filename. With no template, default to a placed field's value for this row.
    const recordNumber = startIndex + i + 1;
    const auto = sanitizeFilename(autoNameValue(canvasFields, rowData));
    const fallback = auto || `document-${recordNumber}`;
    let filename = generateFilename(filenameTemplate, rowData, fallback);

    // Ensure uniqueness within this zip (field values can repeat across rows).
    const count = usedNames.get(filename) ?? 0;
    usedNames.set(filename, count + 1);
    if (count > 0) filename = `${filename} (${count + 1})`;

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

export const exportSinglePDF = async (
  stage: Konva.Stage,
  textLayer: Konva.Layer,
  canvasFields: CanvasField[],
  excelData: ExcelRow[],
  onProgress?: (current: number, total: number) => void,
): Promise<Blob> => {
  if (excelData.length === 0) throw new Error('No data to export');

  // Render the first row so we can determine page dimensions
  const renderRow = (rowData: ExcelRow) => {
    textLayer.destroyChildren();
    canvasFields.forEach((field) => {
      if (field.segments) {
        const { runs, offsetX } = layoutCombined(field, rowData);
        runs.forEach((run) => {
          textLayer.add(
            new Konva.Text({
              x: field.x + run.x - offsetX,
              y: field.y + run.y,
              text: run.text,
              fontSize: run.fontSize,
              fill: run.fill,
              fontStyle: run.fontStyle,
              fontFamily: run.fontFamily,
            })
          );
        });
        return;
      }
      const value = resolveFieldText(field, rowData);
      const textAlign = field.align || 'center';
      const text = new Konva.Text({
        x: field.x,
        y: field.y,
        text: value,
        fontSize: field.fontSize,
        fill: field.fill,
        fontStyle: field.fontStyle,
        fontFamily: field.fontFamily || 'Arial',
      });
      const textWidth = text.width();
      let offsetX = 0;
      if (textAlign === 'center') offsetX = textWidth / 2;
      else if (textAlign === 'right') offsetX = textWidth;
      text.offsetX(offsetX);
      textLayer.add(text);
    });
    textLayer.batchDraw();
  };

  // Render first row to get page dimensions
  renderRow(excelData[0]);
  const firstDataURL = stage.toDataURL({ pixelRatio: 2, mimeType: 'image/jpeg', quality: 0.92 });

  const img = new Image();
  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
    img.src = firstDataURL;
  });

  const pageW = img.width;
  const pageH = img.height;

  const pdf = new jsPDF({
    orientation: pageW > pageH ? 'landscape' : 'portrait',
    unit: 'px',
    format: [pageW, pageH],
  });

  pdf.addImage(firstDataURL, 'JPEG', 0, 0, pageW, pageH);
  if (onProgress) onProgress(1, excelData.length);

  for (let i = 1; i < excelData.length; i++) {
    renderRow(excelData[i]);
    const dataURL = stage.toDataURL({ pixelRatio: 2, mimeType: 'image/jpeg', quality: 0.92 });
    pdf.addPage([pageW, pageH]);
    pdf.addImage(dataURL, 'JPEG', 0, 0, pageW, pageH);
    if (onProgress) onProgress(i + 1, excelData.length);
  }

  return pdf.output('blob');
};

export const downloadZip = (blob: Blob, filename: string = 'documents.zip') => {
  saveAs(blob, filename);
};
