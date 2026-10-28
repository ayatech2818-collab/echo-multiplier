import { CanvasField, ExcelRow, ImageAsset } from '@/types';
import { buildAssetIndex, cellText, findAsset, findAssetByRow } from './assets';
import { autoNameValue, generateFilename } from './exportUtils';
import { sanitizeFilename } from './utils';

export interface ExportCheck {
  level: 'warning' | 'error';
  message: string;
}

/** Columns (dataset headers) that the placed fields read from. */
export const usedColumns = (fields: CanvasField[]): string[] => {
  const cols = new Set<string>();
  fields.forEach((f) => {
    if (f.segments) {
      f.segments.forEach((s) => s.type === 'column' && cols.add(s.value));
    } else if (f.kind === 'image' || f.kind === 'qr' || f.kind === 'barcode') {
      if (f.imageColumn) cols.add(f.imageColumn);
    } else if (!f.isStatic) {
      cols.add(f.headerName);
    }
  });
  return Array.from(cols);
};

const isBlank = (row: ExcelRow, column: string) => {
  const v = row[column];
  return v === undefined || v === null || String(v).trim() === '';
};

/**
 * Look for problems that would produce poor documents, before any rendering happens:
 * empty cells in used columns, per-row images with no matching upload, and duplicate file names.
 */
export const analyzeExport = (
  fields: CanvasField[],
  rows: ExcelRow[],
  assets: ImageAsset[],
  filenameTemplate: string
): ExportCheck[] => {
  const checks: ExportCheck[] = [];
  if (rows.length === 0) return checks;

  // Empty cells in the columns we use.
  usedColumns(fields).forEach((column) => {
    let empty = 0;
    rows.forEach((row) => {
      if (isBlank(row, column)) empty++;
    });
    if (empty > 0) {
      checks.push({
        level: 'warning',
        message: `${empty} row${empty === 1 ? '' : 's'} have an empty "${column}" value.`,
      });
    }
  });

  // Per-row images that can't be matched to an uploaded image.
  const index = buildAssetIndex(assets);
  fields
    .filter((f) => f.kind === 'image' && f.imageColumn)
    .forEach((f) => {
      let unmatched = 0;
      rows.forEach((row) => {
        const value = cellText(row, f.imageColumn);
        if (value !== '' && !findAsset(index, value)) unmatched++;
      });
      if (unmatched > 0) {
        checks.push({
          level: 'warning',
          message: `${unmatched} image${unmatched === 1 ? '' : 's'} in "${f.imageColumn}" ${
            unmatched === 1 ? "isn't" : "aren't"
          } in your uploaded images, so ${unmatched === 1 ? 'that document' : 'those documents'} will have no picture.`,
        });
      }
    });

  // Pictures taken by position from a PDF: every row needs its own page.
  fields
    .filter((f) => f.kind === 'image' && f.imageGroup)
    .forEach((f) => {
      const pages = index.groups.get(f.imageGroup!)?.length ?? 0;
      if (pages === 0) {
        checks.push({
          level: 'error',
          message: `The PDF "${f.imageGroup}" used for pictures isn't uploaded. Add it in Step 1.`,
        });
        return;
      }
      const without = rows.filter((row) => !findAssetByRow(index, f.imageGroup!, row)).length;
      if (without > 0) {
        checks.push({
          level: 'warning',
          message: `"${f.imageGroup}" has ${pages} page${pages === 1 ? '' : 's'} but ${without} row${
            without === 1 ? ' has' : 's have'
          } no page at that position, so ${without === 1 ? 'that document' : 'those documents'} will have no picture.`,
        });
      }
    });

  // Static images whose file is no longer in the library (e.g. after loading a saved layout).
  fields
    .filter((f) => f.kind === 'image' && f.imageSrc)
    .forEach((f) => {
      if (!findAsset(index, f.imageSrc)) {
        checks.push({
          level: 'error',
          message: `The image "${f.imageSrc}" used by a field isn't uploaded. Add it in Step 1.`,
        });
      }
    });

  // Duplicate output names (the exporter adds "(2)" etc., but it is worth knowing).
  const seen = new Map<string, number>();
  rows.forEach((row, i) => {
    const auto = sanitizeFilename(autoNameValue(fields, row));
    const name = generateFilename(filenameTemplate, row, auto || `document-${i + 1}`);
    seen.set(name, (seen.get(name) ?? 0) + 1);
  });
  let duplicates = 0;
  seen.forEach((count) => {
    if (count > 1) duplicates += count - 1;
  });
  if (duplicates > 0) {
    checks.push({
      level: 'warning',
      message: `${duplicates} file name${duplicates === 1 ? ' is' : 's are'} repeated; a number like "(2)" will be added.`,
    });
  }

  return checks;
};
