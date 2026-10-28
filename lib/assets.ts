import { ExcelRow, ImageAsset } from '@/types';
import { generateId } from './utils';

const THUMB_SIDE = 240;

/** Lowercase, trimmed, with any folder path removed: "C:\\pics\\Ana.PNG" -> "ana.png". */
export const normalizeKey = (value: string | number): string => {
  const str = String(value).trim().toLowerCase();
  const parts = str.split(/[\\/]/);
  return parts[parts.length - 1];
};

// "logo.pdf (page 2)" -> "logo (page 2)"; "ana.png" -> "ana".
const stripExtension = (key: string): string => key.replace(/\.[a-z0-9]{1,5}( \(page \d+\))?$/i, '$1');

/**
 * Every data row carries its position in the combined data under this key (0 = first row), so a
 * picture can be chosen "by position" (row 1 → page 1 of a PDF) even after rows are left out.
 */
export const ROW_INDEX_KEY = '__row';

export interface AssetIndex {
  /** Lookup by file name (with or without extension). */
  byKey: Map<string, ImageAsset>;
  /** PDF page pictures grouped by their PDF, in page order. */
  groups: Map<string, ImageAsset[]>;
}

const indexCache = new WeakMap<ImageAsset[], AssetIndex>();

/** Build (and memoize per array) the lookups for matching dataset values to library images. */
export const buildAssetIndex = (assets: ImageAsset[]): AssetIndex => {
  const cached = indexCache.get(assets);
  if (cached) return cached;
  const byKey = new Map<string, ImageAsset>();
  const groups = new Map<string, ImageAsset[]>();
  assets.forEach((asset) => {
    byKey.set(asset.key, asset);
    const bare = stripExtension(asset.key);
    // Don't let an extension-less alias overwrite an exact match from another file.
    if (!byKey.has(bare)) byKey.set(bare, asset);
    if (asset.group) {
      const list = groups.get(asset.group);
      if (list) list.push(asset);
      else groups.set(asset.group, [asset]);
    }
  });
  groups.forEach((list) => list.sort((a, b) => (a.page ?? 0) - (b.page ?? 0)));
  const index: AssetIndex = { byKey, groups };
  indexCache.set(assets, index);
  return index;
};

/** Find the library image a cell value refers to (e.g. "ana.png" or just "ana"). */
export const findAsset = (index: AssetIndex, value: string | number | undefined | null): ImageAsset | null => {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const key = normalizeKey(value);
  return index.byKey.get(key) ?? index.byKey.get(stripExtension(key)) ?? null;
};

/** The picture for a data row taken by position from a PDF's pages (row 0 → page 1), or null. */
export const findAssetByRow = (
  index: AssetIndex,
  group: string,
  row: ExcelRow | null
): ImageAsset | null => {
  const list = index.groups.get(group);
  if (!list || list.length === 0) return null;
  const at = row ? Number(row[ROW_INDEX_KEY]) : 0;
  return Number.isInteger(at) && at >= 0 ? list[at] ?? null : null;
};

/** PDF groups in the library, with their page counts, in upload order. */
export const listGroups = (assets: ImageAsset[]): { name: string; pages: ImageAsset[] }[] => {
  const index = buildAssetIndex(assets);
  return Array.from(index.groups, ([name, pages]) => ({ name, pages }));
};

/** The value of a row's cell, or '' when missing. */
export const cellText = (row: ExcelRow | null, column: string | undefined): string => {
  if (!row || !column) return '';
  const v = row[column];
  return v === undefined || v === null ? '' : String(v);
};

const drawScaled = (img: HTMLImageElement, maxSide: number, mime: string): string => {
  const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * ratio));
  const h = Math.max(1, Math.round(img.height * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL(mime);
};

const loadImageFromUrl = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Not a valid image'));
    img.src = url;
  });

/**
 * Turn an uploaded image file into a library asset. The picture is used exactly as uploaded: the original
 * file bytes are shown and exported, nothing is resized or re-encoded. (Only the small thumbnail is scaled.)
 */
export const createAssetFromFile = async (file: File): Promise<ImageAsset> => {
  const url = URL.createObjectURL(file);
  let image: HTMLImageElement;
  try {
    image = await loadImageFromUrl(url);
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
  return {
    id: generateId(),
    name: file.name,
    key: normalizeKey(file.name),
    image,
    thumb: drawScaled(image, THUMB_SIDE, 'image/png'),
  };
};

/** Make an asset from an in-memory image (used by the sample files). */
export const createAssetFromImage = (name: string, image: HTMLImageElement): ImageAsset => ({
  id: generateId(),
  name,
  key: normalizeKey(name),
  image,
  thumb: drawScaled(image, THUMB_SIDE, 'image/png'),
});

/** Most pages read from one PDF of pictures (each page is one picture). */
export const MAX_PDF_IMAGE_PAGES = 2000;

/** Longer side (px) of the small placeholder shown while a page is being read at full quality. */
const PAGE_PLACEHOLDER_SIDE = 360;

/** Pages are read from the PDF at this many pixels per PDF point (4 = 288 dpi) when shown large or exported. */
const FULL_RENDER_SCALE = 4;
/** Biggest bitmap we ask the browser for when reading a page (pixels). */
const FULL_RENDER_MAX_AREA = 120_000_000;
const FULL_RENDER_MAX_SIDE = 16384;

/**
 * Read EVERY page of a PDF (up to MAX_PDF_IMAGE_PAGES) as a picture, keeping page order.
 * Nothing from the PDF is compressed: each page keeps only a small lossless (PNG) placeholder, and
 * `loadFull` reads the page again from the ORIGINAL PDF at high resolution whenever it is shown large in
 * the editor or exported. Names are "<file> (page N)"; `group` is the file name, `page` is 1-based.
 */
export const createAssetsFromPdf = async (
  file: File,
  onProgress?: (page: number, total: number) => void
): Promise<{ assets: ImageAsset[]; totalPages: number }> => {
  const pdfjsLib = await import('pdfjs-dist');
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
  }
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const totalPages = pdf.numPages;
  const count = Math.min(totalPages, MAX_PDF_IMAGE_PAGES);
  const assets: ImageAsset[] = [];

  const renderPage = async (pageNumber: number, scaleFor: (w: number, h: number) => number) => {
    const page = await pdf.getPage(pageNumber);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: scaleFor(base.width, base.height) });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is not available');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const renderContext: Parameters<typeof page.render>[0] = { canvas, canvasContext: context, viewport };
    await page.render(renderContext).promise;
    page.cleanup();
    return canvas;
  };

  for (let pageNumber = 1; pageNumber <= count; pageNumber++) {
    const small = await renderPage(pageNumber, (w, h) => PAGE_PLACEHOLDER_SIDE / Math.max(w, h));
    const thumb = small.toDataURL('image/png'); // lossless
    small.width = small.height = 0;
    const image = await loadImageFromUrl(thumb);
    const name = totalPages > 1 ? `${file.name} (page ${pageNumber})` : file.name;
    assets.push({
      id: generateId(),
      name,
      key: normalizeKey(name),
      image,
      thumb,
      group: file.name,
      page: pageNumber,
      loadFull: () =>
        renderPage(pageNumber, (w, h) =>
          Math.min(FULL_RENDER_SCALE, Math.sqrt(FULL_RENDER_MAX_AREA / (w * h)), FULL_RENDER_MAX_SIDE / Math.max(w, h))
        ),
    });

    onProgress?.(pageNumber, count);
    if (pageNumber % 5 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  return { assets, totalPages };
};

/** Free the memory behind an asset's picture (only needed for object URLs). */
export const releaseAsset = (asset: ImageAsset) => {
  if (asset.image.src.startsWith('blob:')) URL.revokeObjectURL(asset.image.src);
};
