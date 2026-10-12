import { ExcelRow, ImageAsset } from '@/types';
import { generateId } from './utils';

/** Longest side an uploaded library image keeps; larger photos are downscaled to save memory. */
export const MAX_ASSET_SIDE = 2000;
const THUMB_SIDE = 96;

/** Lowercase, trimmed, with any folder path removed: "C:\\pics\\Ana.PNG" -> "ana.png". */
export const normalizeKey = (value: string | number): string => {
  const str = String(value).trim().toLowerCase();
  const parts = str.split(/[\\/]/);
  return parts[parts.length - 1];
};

// "logo.pdf (page 2)" -> "logo (page 2)"; "ana.png" -> "ana".
const stripExtension = (key: string): string => key.replace(/\.[a-z0-9]{1,5}( \(page \d+\))?$/i, '$1');

export type AssetIndex = Map<string, ImageAsset>;

const indexCache = new WeakMap<ImageAsset[], AssetIndex>();

/** Build (and memoize per array) a lookup so a dataset value matches an asset with or without extension. */
export const buildAssetIndex = (assets: ImageAsset[]): AssetIndex => {
  const cached = indexCache.get(assets);
  if (cached) return cached;
  const index: AssetIndex = new Map();
  assets.forEach((asset) => {
    index.set(asset.key, asset);
    const bare = stripExtension(asset.key);
    // Don't let an extension-less alias overwrite an exact match from another file.
    if (!index.has(bare)) index.set(bare, asset);
  });
  indexCache.set(assets, index);
  return index;
};

/** Find the library image a cell value refers to (e.g. "ana.png" or just "ana"). */
export const findAsset = (index: AssetIndex, value: string | number | undefined | null): ImageAsset | null => {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const key = normalizeKey(value);
  return index.get(key) ?? index.get(stripExtension(key)) ?? null;
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

const readDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

const loadImageFromUrl = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Not a valid image'));
    img.src = url;
  });

/** Turn an uploaded image file into a library asset (downscaling oversized photos, making a thumbnail). */
export const createAssetFromFile = async (file: File): Promise<ImageAsset> => {
  const url = await readDataUrl(file);
  let image = await loadImageFromUrl(url);
  if (Math.max(image.width, image.height) > MAX_ASSET_SIDE) {
    const keepsAlpha = /png|webp|gif|svg/i.test(file.type);
    image = await loadImageFromUrl(drawScaled(image, MAX_ASSET_SIDE, keepsAlpha ? 'image/png' : 'image/jpeg'));
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
