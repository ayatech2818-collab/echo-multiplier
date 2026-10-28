import { saveAs } from 'file-saver';
import Konva from 'konva';
import { ExcelRow, CanvasField, OutputFormat, ImageAsset } from '@/types';
import { sanitizeFilename, resolveFieldText, isTextField } from './utils';
import { layoutCombined, resolveSegmentText } from './combinedLayout';
import { effectiveFontSize, measureText } from './measure';
import { buildAssetIndex, AssetIndex } from './assets';
import {
  borderDash,
  computeMediaLayout,
  cornerRadiusOf,
  isCircleField,
  needsClip,
  resolveMediaSource,
  traceOutline,
} from './mediaField';

/**
 * Maximum in-memory size for a single ZIP archive before auto-splitting (150 MB).
 * Based on the byte size of all blobs accumulated so far.
 */
const ZIP_SIZE_LIMIT_BYTES = 150 * 1024 * 1024;

/**
 * Maximum number of pages per single-PDF volume before auto-splitting.
 * Keep this conservative to avoid "Invalid string length" crashes in jsPDF.
 */
const PDF_PAGE_LIMIT = 200;

/** Longest side (px) of an exported page. Keeps huge templates from exhausting canvas memory. */
const MAX_EXPORT_SIDE = 4096;
/** Lower cap on phones/tablets, where canvas memory is tighter. */
const MAX_EXPORT_SIDE_MOBILE = 3000;

export class ExportCancelledError extends Error {
  constructor() {
    super('Export cancelled');
    this.name = 'ExportCancelledError';
  }
}

export interface ExportVolume {
  blob: Blob;
  startRecord: number;
  endRecord: number;
}

/** Everything needed to render documents for one template. */
export interface ExportJob {
  templateImage: HTMLImageElement;
  fields: CanvasField[];
  assets: ImageAsset[];
}

/** Mutable counters filled while exporting so the UI can report problems afterwards. */
export interface ExportStats {
  missingMedia: number;
}

export interface ExportOptions {
  /** How many documents share one page/sheet (1 = one per page). */
  perSheet?: number;
  onProgress?: (current: number, total: number) => void;
  signal?: AbortSignal;
  stats?: ExportStats;
}

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new ExportCancelledError();
};

/** Let the browser paint / handle input between rows so the progress bar keeps moving. */
const yieldToBrowser = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const isSmallDevice = () =>
  typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

/**
 * When no filename template is given, name each file after a field the user placed on the template.
 * Priority: the first single-column text field, else the first column segment inside a combined field.
 * Returns '' when no data-backed field is placed (caller falls back to a numbered name).
 */
export const autoNameValue = (canvasFields: CanvasField[], rowData: ExcelRow): string => {
  const columnField = canvasFields.find((f) => isTextField(f) && !f.isStatic && !f.segments);
  if (columnField) return resolveFieldText(columnField, rowData);

  for (const field of canvasFields) {
    const columnSeg = field.segments?.find((s) => s.type === 'column');
    if (columnSeg) return resolveSegmentText(columnSeg, rowData);
  }
  return '';
};

export const generateFilename = (template: string, rowData: ExcelRow, fallback: string): string => {
  const filename = template.trim();

  if (!filename) {
    return fallback;
  }

  // Replace {{HeaderName}} with actual values
  const replaced = filename.replace(/\{\{([^}]+)\}\}/g, (_match, header: string) => {
    const value = rowData[header.trim()];
    return value === undefined || value === null || String(value) === '' ? 'Unknown' : String(value);
  });

  // Sanitize the filename to remove invalid characters
  return sanitizeFilename(replaced) || fallback;
};

/** An offscreen Konva stage at the template's native size (independent of the on-screen preview). */
const createExportStage = (templateImage: HTMLImageElement) => {
  const container = document.createElement('div');
  const stage = new Konva.Stage({
    container,
    width: templateImage.width,
    height: templateImage.height,
  });
  const bgLayer = new Konva.Layer({ listening: false });
  bgLayer.add(new Konva.Image({ image: templateImage, width: templateImage.width, height: templateImage.height }));
  const layer = new Konva.Layer({ listening: false });
  stage.add(bgLayer);
  stage.add(layer);
  return { stage, layer };
};

const addMediaNode = (
  layer: Konva.Layer,
  field: CanvasField,
  rowData: ExcelRow,
  assets: AssetIndex,
  stats?: ExportStats
) => {
  const media = resolveMediaSource(field, rowData, assets);
  if (!media.source) {
    if (media.missing && stats) stats.missingMedia += 1;
    return;
  }
  const srcW = media.source instanceof HTMLImageElement ? media.source.naturalWidth || media.source.width : media.source.width;
  const srcH = media.source instanceof HTMLImageElement ? media.source.naturalHeight || media.source.height : media.source.height;
  const m = computeMediaLayout(field, srcW, srcH);
  const circle = isCircleField(field);
  const radius = cornerRadiusOf(field, m.w, m.h);

  const group = new Konva.Group({
    x: field.x,
    y: field.y,
    opacity: field.opacity ?? 1,
    clipFunc: needsClip(field, m.w, m.h) ? (ctx) => traceOutline(ctx, field, m.w, m.h) : undefined,
  });
  if (field.kind !== 'image') {
    // Codes always sit on a white plate so they stay scannable on any background.
    group.add(new Konva.Rect({ x: 0, y: 0, width: m.w, height: m.h, fill: '#ffffff' }));
  } else if (field.bgColor) {
    // Background colour behind the picture (clipped to the same outline).
    group.add(new Konva.Rect({ x: 0, y: 0, width: m.w, height: m.h, fill: field.bgColor }));
  }
  group.add(
    new Konva.Image({
      image: media.source,
      x: m.dx,
      y: m.dy,
      width: m.dw,
      height: m.dh,
      crop: m.crop,
    })
  );
  layer.add(group);

  if (field.borderWidth && field.borderWidth > 0) {
    const stroke = field.borderColor || '#000000';
    layer.add(
      circle
        ? new Konva.Ellipse({
            x: field.x + m.w / 2,
            y: field.y + m.h / 2,
            radiusX: m.w / 2,
            radiusY: m.h / 2,
            stroke,
            strokeWidth: field.borderWidth,
            dash: borderDash(field),
            opacity: field.opacity ?? 1,
          })
        : new Konva.Rect({
            x: field.x,
            y: field.y,
            width: m.w,
            height: m.h,
            cornerRadius: radius,
            stroke,
            strokeWidth: field.borderWidth,
            dash: borderDash(field),
            opacity: field.opacity ?? 1,
          })
    );
  }
};

/** Render one row's fields onto the (cleared) layer. */
const renderRowOnLayer = (
  layer: Konva.Layer,
  canvasFields: CanvasField[],
  rowData: ExcelRow,
  assets: AssetIndex,
  stats?: ExportStats
) => {
  layer.destroyChildren();

  canvasFields.forEach((field) => {
    if (!isTextField(field)) {
      addMediaNode(layer, field, rowData, assets, stats);
      return;
    }

    // Combined field: render one text node per laid-out run.
    if (field.segments) {
      const { runs, offsetX } = layoutCombined(field, rowData);
      runs.forEach((run) => {
        layer.add(
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
    const fontSize = effectiveFontSize(field, value);
    const fontFamily = field.fontFamily || 'Arial';
    const textWidth = measureText(value, fontSize, field.fontStyle, fontFamily);
    let offsetX = 0;
    if (textAlign === 'center') offsetX = textWidth / 2;
    else if (textAlign === 'right') offsetX = textWidth;

    layer.add(
      new Konva.Text({
        x: field.x,
        y: field.y,
        text: value,
        fontSize,
        fill: field.fill,
        fontStyle: field.fontStyle,
        fontFamily,
        offsetX,
      })
    );
  });

  layer.draw();
};

interface RenderTarget {
  stage: Konva.Stage;
  layer: Konva.Layer;
  pixelRatio: number;
}

const createTarget = (job: ExportJob): RenderTarget => {
  const { stage, layer } = createExportStage(job.templateImage);
  const cap = isSmallDevice() ? MAX_EXPORT_SIDE_MOBILE : MAX_EXPORT_SIDE;
  const longest = Math.max(job.templateImage.width, job.templateImage.height);
  return { stage, layer, pixelRatio: Math.min(1, cap / longest) };
};

const renderToDataURL = (
  target: RenderTarget,
  job: ExportJob,
  index: AssetIndex,
  row: ExcelRow,
  stats: ExportStats | undefined,
  mimeType: 'image/jpeg' | 'image/png'
): string => {
  renderRowOnLayer(target.layer, job.fields, row, index, stats);
  return target.stage.toDataURL({ pixelRatio: target.pixelRatio, mimeType, quality: 0.92 });
};

const dataUrlToBlob = async (dataURL: string): Promise<Blob> => {
  const response = await fetch(dataURL);
  return response.blob();
};

const loadDataUrl = (dataURL: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to render page'));
    img.src = dataURL;
  });

const destroyTarget = (target: RenderTarget) => {
  target.stage.destroy();
};

/** Choices offered for "documents per page". */
export const SHEET_SIZES = [1, 2, 4, 6, 9] as const;

/** Rows × columns used to tile `n` documents; wide documents stack, tall ones sit side by side. */
export const sheetGrid = (n: number, docW: number, docH: number): { cols: number; rows: number } => {
  if (n <= 1) return { cols: 1, rows: 1 };
  const wide = docW >= docH;
  if (n === 2) return wide ? { cols: 1, rows: 2 } : { cols: 2, rows: 1 };
  if (n === 6) return wide ? { cols: 2, rows: 3 } : { cols: 3, rows: 2 };
  const cols = Math.ceil(Math.sqrt(n));
  return { cols, rows: Math.ceil(n / cols) };
};

const SHEET_MARGIN = 0.03; // of the shorter document side; also the gap between documents

/** Render one sheet (1..perSheet documents) to a JPEG data URL. */
const renderSheetToDataURL = (
  target: RenderTarget,
  job: ExportJob,
  index: AssetIndex,
  rows: ExcelRow[],
  perSheet: number,
  stats?: ExportStats
): string => {
  if (perSheet <= 1) return renderToDataURL(target, job, index, rows[0], stats, 'image/jpeg');

  const W = job.templateImage.width;
  const H = job.templateImage.height;
  const { cols, rows: gridRows } = sheetGrid(perSheet, W, H);
  const pad = Math.min(W, H) * SHEET_MARGIN;
  const sheetW = cols * W + (cols + 1) * pad;
  const sheetH = gridRows * H + (gridRows + 1) * pad;
  const cap = isSmallDevice() ? MAX_EXPORT_SIDE_MOBILE : MAX_EXPORT_SIDE;
  const pr = Math.min(1, cap / Math.max(sheetW, sheetH));

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sheetW * pr));
  canvas.height = Math.max(1, Math.round(sheetH * pr));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available on this device');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  rows.forEach((row, i) => {
    renderRowOnLayer(target.layer, job.fields, row, index, stats);
    const doc = target.stage.toCanvas({ pixelRatio: pr });
    const col = i % cols;
    const r = Math.floor(i / cols);
    const x = (pad + col * (W + pad)) * pr;
    const y = (pad + r * (H + pad)) * pr;
    ctx.drawImage(doc, x, y, W * pr, H * pr);
    // Hairline so the documents can be cut apart.
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 0.5, y - 0.5, W * pr + 1, H * pr + 1);
  });

  const url = canvas.toDataURL('image/jpeg', 0.92);
  // Free the big bitmap right away (matters on phones).
  canvas.width = canvas.height = 0;
  return url;
};

const chunk = <T,>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

/**
 * Export a set of rows as one or more ZIP archives (one JPG or PDF per document, or per sheet when
 * several documents share a page). When the in-memory size of the current ZIP exceeds
 * ZIP_SIZE_LIMIT_BYTES the archive is sealed and a new one started. `startIndex`/`totalRecords`
 * position this batch within the whole run for naming and progress.
 */
export const exportBatch = async (
  job: ExportJob,
  rows: ExcelRow[],
  filenameTemplate: string,
  format: OutputFormat,
  options: ExportOptions = {},
  startIndex: number = 0,
  totalRecords: number = rows.length,
  progressOffset: number = 0,
  progressTotal: number = totalRecords
): Promise<ExportVolume[]> => {
  const { default: JSZip } = await import('jszip');
  const { default: jsPDF } = await import('jspdf');
  const { onProgress, signal, stats } = options;
  const perSheet = Math.max(1, options.perSheet ?? 1);
  const volumes: ExportVolume[] = [];
  const index = buildAssetIndex(job.assets);
  const target = createTarget(job);

  let zip = new JSZip();
  let usedNames = new Map<string, number>();
  let currentZipBytes = 0;
  let volumeStart = startIndex + 1;

  try {
    const groups = chunk(rows, perSheet);
    let done = 0;
    for (let g = 0; g < groups.length; g++) {
      throwIfAborted(signal);
      const group = groups[g];
      const firstRecord = startIndex + done + 1;
      const lastRecord = startIndex + done + group.length;

      let filename: string;
      if (perSheet > 1) {
        const sheetNo = Math.floor((startIndex + done) / perSheet) + 1;
        filename = `sheet-${String(sheetNo).padStart(3, '0')} (records ${firstRecord}-${lastRecord})`;
      } else {
        const rowData = group[0];
        const auto = sanitizeFilename(autoNameValue(job.fields, rowData));
        filename = generateFilename(filenameTemplate, rowData, auto || `document-${firstRecord}`);
      }

      // Ensure uniqueness within this zip volume
      const count = usedNames.get(filename) ?? 0;
      usedNames.set(filename, count + 1);
      if (count > 0) filename = `${filename} (${count + 1})`;

      const dataURL = renderSheetToDataURL(target, job, index, group, perSheet, stats);
      let blob: Blob;
      let fullFilename: string;
      if (format === 'image') {
        blob = await dataUrlToBlob(dataURL);
        fullFilename = `${filename}.jpg`;
      } else {
        const img = await loadDataUrl(dataURL);
        const pdf = new jsPDF({
          orientation: img.width > img.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [img.width, img.height],
        });
        pdf.addImage(dataURL, 'JPEG', 0, 0, img.width, img.height);
        blob = pdf.output('blob');
        fullFilename = `${filename}.pdf`;
      }

      // Seal the current zip and start a new volume if this file would bust the size limit.
      if (currentZipBytes > 0 && currentZipBytes + blob.size > ZIP_SIZE_LIMIT_BYTES) {
        volumes.push({
          blob: await zip.generateAsync({ type: 'blob' }),
          startRecord: volumeStart,
          endRecord: firstRecord - 1,
        });
        zip = new JSZip();
        usedNames = new Map<string, number>();
        usedNames.set(filename, 1);
        currentZipBytes = 0;
        volumeStart = firstRecord;
      }

      zip.file(fullFilename, blob);
      currentZipBytes += blob.size;
      done += group.length;

      onProgress?.(progressOffset + done, progressTotal);
      await yieldToBrowser();
    }

    if (currentZipBytes > 0) {
      volumes.push({
        blob: await zip.generateAsync({ type: 'blob' }),
        startRecord: volumeStart,
        endRecord: startIndex + rows.length,
      });
    }
  } finally {
    destroyTarget(target);
  }

  return volumes;
};

/**
 * Export all rows as one or more PDFs (one page per document, or per sheet when several share a page).
 * When the page count hits PDF_PAGE_LIMIT the current PDF is sealed and a new volume started,
 * preventing "Invalid string length" crashes.
 */
export const exportSinglePDF = async (
  job: ExportJob,
  rows: ExcelRow[],
  options: ExportOptions = {},
  progressOffset: number = 0,
  progressTotal: number = rows.length
): Promise<ExportVolume[]> => {
  if (rows.length === 0) throw new Error('No data to export');
  const { default: jsPDF } = await import('jspdf');
  const { onProgress, signal, stats } = options;
  const perSheet = Math.max(1, options.perSheet ?? 1);
  const volumes: ExportVolume[] = [];
  const index = buildAssetIndex(job.assets);
  const target = createTarget(job);

  try {
    const groups = chunk(rows, perSheet);
    const firstURL = renderSheetToDataURL(target, job, index, groups[0], perSheet, stats);
    const first = await loadDataUrl(firstURL);
    const pageW = first.width;
    const pageH = first.height;
    const orientation = pageW > pageH ? 'landscape' : 'portrait';

    let pdf = new jsPDF({ orientation, unit: 'px', format: [pageW, pageH] });
    pdf.addImage(firstURL, 'JPEG', 0, 0, pageW, pageH);
    let done = groups[0].length;
    onProgress?.(progressOffset + done, progressTotal);

    let pagesInCurrentVolume = 1;
    let volumeStart = 1;

    for (let g = 1; g < groups.length; g++) {
      throwIfAborted(signal);
      const firstRecord = done + 1;

      if (pagesInCurrentVolume >= PDF_PAGE_LIMIT) {
        volumes.push({ blob: pdf.output('blob'), startRecord: volumeStart, endRecord: done });
        pdf = new jsPDF({ orientation, unit: 'px', format: [pageW, pageH] });
        pagesInCurrentVolume = 0;
        volumeStart = firstRecord;
      }

      const dataURL = renderSheetToDataURL(target, job, index, groups[g], perSheet, stats);
      if (pagesInCurrentVolume > 0) pdf.addPage([pageW, pageH]);
      pdf.addImage(dataURL, 'JPEG', 0, 0, pageW, pageH);
      pagesInCurrentVolume++;
      done += groups[g].length;

      onProgress?.(progressOffset + done, progressTotal);
      await yieldToBrowser();
    }

    volumes.push({ blob: pdf.output('blob'), startRecord: volumeStart, endRecord: rows.length });
  } finally {
    destroyTarget(target);
  }

  return volumes;
};

export const downloadZip = (blob: Blob, filename: string = 'documents.zip') => {
  saveAs(blob, filename);
};

/** Size a media field is given when first placed, relative to the template. */
export const defaultMediaBox = (
  kind: 'image' | 'qr' | 'barcode',
  templateW: number,
  templateH: number,
  src?: { w: number; h: number }
): { width: number; height: number } => {
  const base = Math.round(Math.min(templateW, templateH) * 0.22);
  if (kind === 'barcode') return { width: Math.round(base * 1.8), height: Math.round(base * 0.7) };
  if (kind === 'qr') return { width: base, height: base };
  if (src && src.w > 0 && src.h > 0) {
    // Static image: keep its aspect ratio, fit within the base box.
    const s = Math.min(base * 1.5 / src.w, base * 1.5 / src.h);
    return { width: Math.max(16, Math.round(src.w * s)), height: Math.max(16, Math.round(src.h * s)) };
  }
  return { width: base, height: base };
};
