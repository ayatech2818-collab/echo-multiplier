import { saveAs } from 'file-saver';
import Konva from 'konva';
import { ExcelRow, CanvasField, OutputFormat, ImageAsset, ExportQuality } from '@/types';
import { sanitizeFilename, resolveFieldText, isTextField } from './utils';
import { layoutCombined, resolveSegmentText } from './combinedLayout';
import { effectiveFontSize, measureText } from './measure';
import { buildAssetIndex, AssetIndex } from './assets';
import {
  borderDash,
  computeMediaLayout,
  cornerRadiusOf,
  findFieldAsset,
  isCircleField,
  needsClip,
  resolveMediaSource,
  traceOutline,
} from './mediaField';

const MB = 1024 * 1024;

const isSmallDevice = () =>
  typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

/**
 * A ZIP / PDF is only split into several files when ONE file would get too big for the browser's
 * memory. Normal runs (hundreds of documents) come out as a single download.
 */
const zipLimitBytes = () => (isSmallDevice() ? 150 * MB : 400 * MB);
const pdfLimitBytes = () => (isSmallDevice() ? 80 * MB : 220 * MB);

/**
 * Exports are made at the template's own pixel size (1 template pixel = 1 output pixel). They are only
 * scaled down when the browser itself could not create a canvas that large.
 */
const canvasLimits = () => (isSmallDevice() ? { side: 8192, area: 16_000_000 } : { side: 16384, area: 200_000_000 });

/** Largest scale (output px per template px) this browser can build a page of w × h at. */
const maxRatio = (w: number, h: number): number => {
  const l = canvasLimits();
  return Math.min(l.side / Math.max(w, h), Math.sqrt(l.area / (w * h)));
};

/** The scale actually used for a page: what was asked for, unless the browser can't build it that large. */
export const effectiveScale = (requested: number, w: number, h: number): number =>
  Math.max(0.05, Math.min(requested, maxRatio(w, h)));

/** 'auto' = as sharp as the pictures need; or a fixed multiple of the template's size (1, 2, 4…). */
export type Sharpness = 'auto' | number;

/** Auto sharpness never asks for more than this many output pixels per template pixel. */
export const AUTO_SCALE_MAX = 8;

/** Pixel size of an asset's full-quality picture. */
const assetNative = (a: ImageAsset): { w: number; h: number } =>
  a.native ?? { w: a.image.naturalWidth || a.image.width, h: a.image.naturalHeight || a.image.height };

/**
 * How many output pixels per template pixel it takes to show every picture at its own resolution:
 * a 2000 px photo drawn into a 200 px box on the template needs 10×. (1 when nothing needs more.)
 */
export const neededScale = (fields: CanvasField[], rows: ExcelRow[], index: AssetIndex): number => {
  let need = 1;
  for (const field of fields) {
    if (field.kind !== 'image') continue;
    const seen = new Set<string>();
    for (const row of rows) {
      const asset = findFieldAsset(field, row, index);
      if (!asset || seen.has(asset.id)) continue;
      seen.add(asset.id);
      const n = assetNative(asset);
      const layout = computeMediaLayout(field, n.w, n.h);
      const shown = layout.crop ? layout.crop.width : n.w;
      if (layout.dw > 0) need = Math.max(need, shown / layout.dw);
    }
  }
  return need;
};

/** Turn the user's sharpness choice into a number for this run. */
export const resolveScale = (
  sharpness: Sharpness,
  fields: CanvasField[],
  rows: ExcelRow[],
  assets: AssetIndex
): number => (sharpness === 'auto' ? Math.min(AUTO_SCALE_MAX, neededScale(fields, rows, assets)) : Math.max(0.1, sharpness));

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
  /** True if the page was too large for this browser and had to be scaled down. */
  downscaled: boolean;
}

export interface ExportOptions {
  /** How many documents share one page/sheet (1 = one per page). */
  perSheet?: number;
  /** 'max' = lossless PNG, 'high' = JPEG at 100%. Default 'max'. */
  quality?: ExportQuality;
  /** Output pixels per template pixel for the whole run (see resolveScale). Default 1. */
  scale?: number;
  onProgress?: (current: number, total: number) => void;
  signal?: AbortSignal;
  stats?: ExportStats;
}

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new ExportCancelledError();
};

/** Let the browser paint / handle input between rows so the progress bar keeps moving. */
const yieldToBrowser = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const encodingFor = (quality: ExportQuality = 'max') =>
  quality === 'max'
    ? ({ mime: 'image/png', ext: 'png', pdfType: 'PNG' } as const)
    : ({ mime: 'image/jpeg', ext: 'jpg', pdfType: 'JPEG' } as const);

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

type Drawable = HTMLImageElement | HTMLCanvasElement;

/**
 * Shrink a large picture to the size it will be drawn at, in gentle halving steps. A single big jump
 * (e.g. a 3000 px photo into a 130 px badge) gives jagged, noisy edges; stepping keeps it sharp.
 */
const resample = (src: Drawable, srcW: number, srcH: number, factor: number): HTMLCanvasElement => {
  const tw = Math.max(1, Math.round(srcW * factor));
  const th = Math.max(1, Math.round(srcH * factor));
  let current: Drawable = src;
  let cw = srcW;
  let ch = srcH;
  while (cw / 2 >= tw && ch / 2 >= th) {
    const nw = Math.ceil(cw / 2);
    const nh = Math.ceil(ch / 2);
    const step = document.createElement('canvas');
    step.width = nw;
    step.height = nh;
    const sctx = step.getContext('2d');
    if (!sctx) break;
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(current, 0, 0, nw, nh);
    current = step;
    cw = nw;
    ch = nh;
  }
  const out = document.createElement('canvas');
  out.width = tw;
  out.height = th;
  const octx = out.getContext('2d');
  if (octx) {
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(current, 0, 0, tw, th);
  }
  return out;
};

const addMediaNode = (
  layer: Konva.Layer,
  field: CanvasField,
  rowData: ExcelRow,
  assets: AssetIndex,
  pixelRatio: number,
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

  let image: Drawable = media.source;
  let crop = m.crop;
  if (field.kind === 'image') {
    const shownW = crop ? crop.width : srcW;
    // Output pixels per source pixel; only shrink the picture when it is really being drawn smaller.
    const factor = (m.dw * pixelRatio) / shownW;
    if (factor < 0.5) {
      // Picture is much bigger than its box: resample it smoothly to the size it is drawn at.
      image = resample(media.source, srcW, srcH, factor);
      if (crop) {
        const sx = image.width / srcW;
        const sy = image.height / srcH;
        crop = { x: crop.x * sx, y: crop.y * sy, width: crop.width * sx, height: crop.height * sy };
      }
    }
  }

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
      image,
      x: m.dx,
      y: m.dy,
      width: m.dw,
      height: m.dh,
      crop,
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
  pixelRatio: number,
  stats?: ExportStats
) => {
  layer.destroyChildren();

  canvasFields.forEach((field) => {
    if (!isTextField(field)) {
      addMediaNode(layer, field, rowData, assets, pixelRatio, stats);
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
}

const createTarget = (job: ExportJob): RenderTarget => createExportStage(job.templateImage);

const destroyTarget = (target: RenderTarget) => {
  target.stage.destroy();
};

/**
 * Pictures that came from a PDF are shown small in the editor. For the real output each one is re-read
 * from the ORIGINAL PDF at high resolution, just for the moment its document is drawn.
 */
const loadFullMedia = async (job: ExportJob, index: AssetIndex, row: ExcelRow): Promise<ImageAsset[]> => {
  const loaded: ImageAsset[] = [];
  for (const field of job.fields) {
    if (field.kind !== 'image') continue;
    const asset = findFieldAsset(field, row, index);
    if (asset?.loadFull && !asset.fullImage) {
      asset.fullImage = await asset.loadFull();
      loaded.push(asset);
    }
  }
  return loaded;
};

/** Draw one row with its full-resolution pictures, hand the result to `capture`, then free the memory. */
const withRow = async <T,>(
  target: RenderTarget,
  job: ExportJob,
  index: AssetIndex,
  row: ExcelRow,
  pixelRatio: number,
  stats: ExportStats | undefined,
  capture: () => T
): Promise<T> => {
  const loaded = await loadFullMedia(job, index, row);
  try {
    renderRowOnLayer(target.layer, job.fields, row, index, pixelRatio, stats);
    return capture();
  } finally {
    loaded.forEach((a) => {
      a.fullImage = undefined;
    });
  }
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

interface RenderedPage {
  url: string;
  width: number;
  height: number;
}

/** Render one page (a single document, or a sheet of several) at full quality. */
const renderPage = async (
  target: RenderTarget,
  job: ExportJob,
  index: AssetIndex,
  rows: ExcelRow[],
  perSheet: number,
  quality: ExportQuality,
  requestedScale: number,
  stats?: ExportStats
): Promise<RenderedPage> => {
  const enc = encodingFor(quality);
  const W = job.templateImage.width;
  const H = job.templateImage.height;

  if (perSheet <= 1) {
    const pr = effectiveScale(requestedScale, W, H);
    if (pr < requestedScale * 0.999 && stats) stats.downscaled = true;
    const url = await withRow(target, job, index, rows[0], pr, stats, () =>
      target.stage.toDataURL({ pixelRatio: pr, mimeType: enc.mime, quality: 1 })
    );
    return { url, width: Math.round(W * pr), height: Math.round(H * pr) };
  }

  const { cols, rows: gridRows } = sheetGrid(perSheet, W, H);
  const pad = Math.min(W, H) * SHEET_MARGIN;
  const sheetW = cols * W + (cols + 1) * pad;
  const sheetH = gridRows * H + (gridRows + 1) * pad;
  const pr = effectiveScale(requestedScale, sheetW, sheetH);
  if (pr < requestedScale * 0.999 && stats) stats.downscaled = true;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sheetW * pr));
  canvas.height = Math.max(1, Math.round(sheetH * pr));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser could not create a page that large');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < rows.length; i++) {
    const doc = await withRow(target, job, index, rows[i], pr, stats, () => target.stage.toCanvas({ pixelRatio: pr }));
    const col = i % cols;
    const r = Math.floor(i / cols);
    const x = (pad + col * (W + pad)) * pr;
    const y = (pad + r * (H + pad)) * pr;
    ctx.drawImage(doc, x, y, W * pr, H * pr);
    // Hairline so the documents can be cut apart.
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 0.5, y - 0.5, W * pr + 1, H * pr + 1);
  }

  const url = canvas.toDataURL(enc.mime, 1);
  const out = { url, width: canvas.width, height: canvas.height };
  // Free the big bitmap right away (matters on phones).
  canvas.width = canvas.height = 0;
  return out;
};

const dataUrlToBlob = async (dataURL: string): Promise<Blob> => {
  const response = await fetch(dataURL);
  return response.blob();
};

/** Approximate size in bytes of a base64 data URL's content. */
const dataUrlBytes = (url: string) => Math.round(url.length * 0.75);

const chunk = <T,>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

/**
 * Export a set of rows as one or more ZIP archives (one image or PDF per document, or per sheet when
 * several documents share a page). A new ZIP is only started when the current one would pass the
 * browser's memory limit. `startIndex`/`totalRecords` position this batch within the whole run.
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
  const quality = options.quality ?? 'max';
  const scale = options.scale ?? 1;
  const enc = encodingFor(quality);
  const perSheet = Math.max(1, options.perSheet ?? 1);
  const volumes: ExportVolume[] = [];
  const index = buildAssetIndex(job.assets);
  const target = createTarget(job);
  const limit = zipLimitBytes();

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

      const page = await renderPage(target, job, index, group, perSheet, quality, scale, stats);
      let blob: Blob;
      let fullFilename: string;
      if (format === 'image') {
        blob = await dataUrlToBlob(page.url);
        fullFilename = `${filename}.${enc.ext}`;
      } else {
        const pdf = new jsPDF({
          orientation: page.width > page.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [page.width, page.height],
        });
        pdf.addImage(page.url, enc.pdfType, 0, 0, page.width, page.height, undefined, 'FAST');
        blob = pdf.output('blob');
        fullFilename = `${filename}.pdf`;
      }

      // Start a new ZIP only if this file would push the current one past the memory limit.
      if (currentZipBytes > 0 && currentZipBytes + blob.size > limit) {
        volumes.push({
          blob: await zip.generateAsync({ type: 'blob', compression: 'STORE' }),
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
        // STORE = no extra compression: the pictures are already compressed, and this keeps every pixel as exported.
        blob: await zip.generateAsync({ type: 'blob', compression: 'STORE' }),
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
 * A new PDF is only started when the current one would get too big for the browser to build.
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
  const quality = options.quality ?? 'max';
  const scale = options.scale ?? 1;
  const enc = encodingFor(quality);
  const perSheet = Math.max(1, options.perSheet ?? 1);
  const volumes: ExportVolume[] = [];
  const index = buildAssetIndex(job.assets);
  const target = createTarget(job);
  const limit = pdfLimitBytes();

  try {
    const groups = chunk(rows, perSheet);
    const first = await renderPage(target, job, index, groups[0], perSheet, quality, scale, stats);
    const pageW = first.width;
    const pageH = first.height;
    const orientation = pageW > pageH ? 'landscape' : 'portrait';

    let pdf = new jsPDF({ orientation, unit: 'px', format: [pageW, pageH] });
    pdf.addImage(first.url, enc.pdfType, 0, 0, pageW, pageH, undefined, 'FAST');
    let volumeBytes = dataUrlBytes(first.url);
    let done = groups[0].length;
    onProgress?.(progressOffset + done, progressTotal);

    let pagesInCurrentVolume = 1;
    let volumeStart = 1;

    for (let g = 1; g < groups.length; g++) {
      throwIfAborted(signal);
      const firstRecord = done + 1;

      const page = await renderPage(target, job, index, groups[g], perSheet, quality, scale, stats);
      const pageBytes = dataUrlBytes(page.url);

      if (volumeBytes + pageBytes > limit) {
        volumes.push({ blob: pdf.output('blob'), startRecord: volumeStart, endRecord: done });
        pdf = new jsPDF({ orientation, unit: 'px', format: [pageW, pageH] });
        pagesInCurrentVolume = 0;
        volumeBytes = 0;
        volumeStart = firstRecord;
      }

      if (pagesInCurrentVolume > 0) pdf.addPage([pageW, pageH]);
      pdf.addImage(page.url, enc.pdfType, 0, 0, pageW, pageH, undefined, 'FAST');
      volumeBytes += pageBytes;
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
