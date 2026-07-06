import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import { ExcelRow, CanvasField, OutputFormat } from '@/types';
import { sanitizeFilename, resolveFieldText } from './utils';
import { layoutCombined, resolveSegmentText } from './combinedLayout';
import Konva from 'konva';

/**
 * Maximum in-memory size for a single ZIP archive before auto-splitting (150 MB).
 * Based on the base64-decoded byte size of all blobs accumulated so far.
 */
const ZIP_SIZE_LIMIT_BYTES = 150 * 1024 * 1024;

/**
 * Maximum number of pages per single-PDF volume before auto-splitting.
 * Keep this conservative to avoid "Invalid string length" crashes in jsPDF.
 */
const PDF_PAGE_LIMIT = 200;

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

/** Render a row onto the text layer (shared helper). */
const renderRowOnLayer = (
  textLayer: Konva.Layer,
  canvasFields: CanvasField[],
  rowData: ExcelRow
) => {
  textLayer.destroyChildren();

  canvasFields.forEach((field) => {
    // Combined field: render one text node per laid-out run.
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

    // Single-column or static field.
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

/**
 * Export a batch of rows to one or more ZIP archives.
 * When the estimated in-memory size of the current ZIP exceeds ZIP_SIZE_LIMIT_BYTES
 * the current archive is sealed and a new one is started automatically.
 *
 * Returns an array of { blob, startRecord, endRecord } objects – one entry per
 * auto-split volume.  The caller is responsible for naming and downloading each.
 */
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
): Promise<{ blob: Blob; startRecord: number; endRecord: number }[]> => {
  const volumes: { blob: Blob; startRecord: number; endRecord: number }[] = [];

  let zip = new JSZip();
  let usedNames = new Map<string, number>();
  /** Rough byte estimate of blobs added to the current zip (uncompressed). */
  let currentZipBytes = 0;
  /** Global record index of the first row in the current zip volume. */
  let volumeStart = startIndex + 1;

  for (let i = 0; i < excelData.length; i++) {
    const rowData = excelData[i];
    const recordNumber = startIndex + i + 1;

    renderRowOnLayer(textLayer, canvasFields, rowData);

    // Generate filename
    const auto = sanitizeFilename(autoNameValue(canvasFields, rowData));
    const fallback = auto || `document-${recordNumber}`;
    let filename = generateFilename(filenameTemplate, rowData, fallback);

    // Ensure uniqueness within this zip volume
    const count = usedNames.get(filename) ?? 0;
    usedNames.set(filename, count + 1);
    if (count > 0) filename = `${filename} (${count + 1})`;

    // Export document
    const { blob, filename: fullFilename } = await exportSingleDocument(stage, filename, format);
    const blobSize = blob.size;

    // Check if adding this file would bust the size limit AND we have at least one file already.
    if (currentZipBytes > 0 && currentZipBytes + blobSize > ZIP_SIZE_LIMIT_BYTES) {
      // Seal the current zip and start a new volume.
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      volumes.push({ blob: zipBlob, startRecord: volumeStart, endRecord: recordNumber - 1 });

      zip = new JSZip();
      usedNames = new Map<string, number>();
      currentZipBytes = 0;
      volumeStart = recordNumber;
    }

    zip.file(fullFilename, blob);
    currentZipBytes += blobSize;

    if (onProgress) {
      onProgress(recordNumber, totalRecords);
    }
  }

  // Seal the final (or only) volume.
  if (currentZipBytes > 0) {
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    volumes.push({
      blob: zipBlob,
      startRecord: volumeStart,
      endRecord: startIndex + excelData.length,
    });
  }

  return volumes;
};

/**
 * Export all rows as one or more PDFs.
 * When the page count hits PDF_PAGE_LIMIT the current PDF is sealed and a
 * new volume started, preventing "Invalid string length" crashes.
 *
 * Returns an array of { blob, startRecord, endRecord } objects.
 */
export const exportSinglePDF = async (
  stage: Konva.Stage,
  textLayer: Konva.Layer,
  canvasFields: CanvasField[],
  excelData: ExcelRow[],
  onProgress?: (current: number, total: number) => void,
): Promise<{ blob: Blob; startRecord: number; endRecord: number }[]> => {
  if (excelData.length === 0) throw new Error('No data to export');

  const volumes: { blob: Blob; startRecord: number; endRecord: number }[] = [];

  // Render first row to get page dimensions
  renderRowOnLayer(textLayer, canvasFields, excelData[0]);
  const firstDataURL = stage.toDataURL({ pixelRatio: 2, mimeType: 'image/jpeg', quality: 0.92 });

  const img = new Image();
  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
    img.src = firstDataURL;
  });

  const pageW = img.width;
  const pageH = img.height;

  let pdf = new jsPDF({
    orientation: pageW > pageH ? 'landscape' : 'portrait',
    unit: 'px',
    format: [pageW, pageH],
  });

  pdf.addImage(firstDataURL, 'JPEG', 0, 0, pageW, pageH);
  if (onProgress) onProgress(1, excelData.length);

  let pagesInCurrentVolume = 1;
  let volumeStart = 1;

  for (let i = 1; i < excelData.length; i++) {
    const recordNumber = i + 1;

    // Seal and start new volume if we hit the page cap
    if (pagesInCurrentVolume >= PDF_PAGE_LIMIT) {
      volumes.push({ blob: pdf.output('blob'), startRecord: volumeStart, endRecord: i });
      pdf = new jsPDF({
        orientation: pageW > pageH ? 'landscape' : 'portrait',
        unit: 'px',
        format: [pageW, pageH],
      });
      pagesInCurrentVolume = 0;
      volumeStart = recordNumber;
    }

    renderRowOnLayer(textLayer, canvasFields, excelData[i]);
    const dataURL = stage.toDataURL({ pixelRatio: 2, mimeType: 'image/jpeg', quality: 0.92 });

    if (pagesInCurrentVolume > 0) {
      pdf.addPage([pageW, pageH]);
    }
    pdf.addImage(dataURL, 'JPEG', 0, 0, pageW, pageH);
    pagesInCurrentVolume++;

    if (onProgress) onProgress(recordNumber, excelData.length);
  }

  // Seal final volume
  volumes.push({ blob: pdf.output('blob'), startRecord: volumeStart, endRecord: excelData.length });

  return volumes;
};

export const downloadZip = (blob: Blob, filename: string = 'documents.zip') => {
  saveAs(blob, filename);
};
