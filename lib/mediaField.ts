import { CanvasField, ExcelRow } from '@/types';
import { AssetIndex, cellText, findAsset, findAssetByRow } from './assets';
import { getCodeCanvas } from './codes';
import { ROW_INDEX_KEY } from './assets';

/** Drawable source for a media field plus why it may be missing. */
export interface MediaSource {
  source: HTMLImageElement | HTMLCanvasElement | null;
  // What the field is supposed to show, for placeholders ("photo.png", "Photo column", …).
  label: string;
  // True when a source was expected but couldn't be produced (unmatched image, unencodable code).
  missing: boolean;
}

export const DEFAULT_CODE_COLOR = '#000000';

/**
 * Resolve what an image / QR / barcode field should draw for a row.
 * `row === null` is the editor skeleton (no preview data): per-row fields show a placeholder.
 */
export const resolveMediaSource = (
  field: CanvasField,
  row: ExcelRow | null,
  assets: AssetIndex
): MediaSource => {
  const kind = field.kind;

  if (kind === 'image') {
    if (field.imageSrc) {
      const asset = findAsset(assets, field.imageSrc);
      return { source: asset?.image ?? null, label: field.imageSrc, missing: !asset };
    }
    if (field.imageGroup) {
      // By position: the row's number picks the PDF page. With no preview row, show page 1 as a sample.
      const asset = findAssetByRow(assets, field.imageGroup, row);
      const at = row ? Number(row[ROW_INDEX_KEY]) + 1 : 1;
      return { source: asset?.image ?? null, label: `${field.imageGroup} · page ${at}`, missing: !!row && !asset };
    }
    const column = field.imageColumn ?? '';
    if (!row) return { source: null, label: column, missing: false };
    const value = cellText(row, column);
    const asset = findAsset(assets, value);
    return { source: asset?.image ?? null, label: value || column, missing: !asset };
  }

  if (kind === 'qr' || kind === 'barcode') {
    let text = field.codeText ?? '';
    if (field.imageColumn) {
      if (!row) return { source: null, label: field.imageColumn, missing: false };
      text = cellText(row, field.imageColumn);
    }
    const canvas = getCodeCanvas(kind, text, field.fill || DEFAULT_CODE_COLOR, Math.max(field.width ?? 160, field.height ?? 160) * 2);
    return { source: canvas, label: text || field.imageColumn || 'code', missing: !canvas };
  }

  return { source: null, label: '', missing: false };
};

export interface MediaLayout {
  // Box (field size).
  w: number;
  h: number;
  // Where/how the picture is drawn inside the box.
  dx: number;
  dy: number;
  dw: number;
  dh: number;
  crop?: { x: number; y: number; width: number; height: number };
}

export const DEFAULT_MEDIA_SIZE = 160;

export const fieldBox = (field: CanvasField): { w: number; h: number } => ({
  w: Math.max(8, field.width ?? DEFAULT_MEDIA_SIZE),
  h: Math.max(8, field.height ?? DEFAULT_MEDIA_SIZE),
});

/** Fit a source of srcW×srcH into the field's box ('contain' letterboxes, 'cover' crops to fill). */
export const computeMediaLayout = (field: CanvasField, srcW: number, srcH: number): MediaLayout => {
  const { w, h } = fieldBox(field);
  if (srcW <= 0 || srcH <= 0) return { w, h, dx: 0, dy: 0, dw: w, dh: h };

  const wantsCover = field.kind === 'image' && (field.fit === 'cover' || (field.shape === 'circle' && field.fit !== 'contain'));
  if (wantsCover) {
    const s = Math.max(w / srcW, h / srcH);
    const cw = w / s;
    const ch = h / s;
    return {
      w,
      h,
      dx: 0,
      dy: 0,
      dw: w,
      dh: h,
      crop: { x: (srcW - cw) / 2, y: (srcH - ch) / 2, width: cw, height: ch },
    };
  }

  const s = Math.min(w / srcW, h / srcH);
  const dw = srcW * s;
  const dh = srcH * s;
  return { w, h, dx: (w - dw) / 2, dy: (h - dh) / 2, dw, dh };
};
