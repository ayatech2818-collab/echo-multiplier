import { describe, expect, it } from 'vitest';
import { formatValue, parseDateValue } from '../format';
import { buildAssetIndex, findAsset, findAssetByRow, normalizeKey, pictureScaleOfPage, ROW_INDEX_KEY } from '../assets';
import { parseLayout } from '../layoutIO';
import { mergeDatasets } from '../fileParser';
import { AUTO_SCALE_MAX, effectiveScale, neededScale, resolveScale, sheetGrid } from '../exportUtils';
import { alignDelta } from '../fieldBounds';
import { computeMediaLayout } from '../mediaField';
import { analyzeExport, usedColumns } from '../checks';
import { resolveFieldText } from '../utils';
import type { CanvasField, ImageAsset } from '@/types';

const asset = (name: string): ImageAsset => ({
  id: name,
  name,
  key: normalizeKey(name),
  image: {} as HTMLImageElement,
  thumb: '',
});

const textField = (over: Partial<CanvasField> = {}): CanvasField => ({
  id: 'f1',
  headerName: 'Name',
  x: 0,
  y: 0,
  fontSize: 20,
  fill: '#000',
  fontStyle: 'normal',
  ...over,
});

describe('formatValue', () => {
  it('changes case', () => {
    expect(formatValue('ana LOPEZ', { type: 'upper' })).toBe('ANA LOPEZ');
    expect(formatValue('ANA LOPEZ', { type: 'lower' })).toBe('ana lopez');
    expect(formatValue("mary-jane o'neil", { type: 'title' })).toBe("Mary-Jane O'Neil");
  });

  it('formats numbers and currency, and leaves non-numbers alone', () => {
    expect(formatValue(1234.5, { type: 'number', decimals: 1 })).toBe('1,234.5');
    expect(formatValue('1500', { type: 'currency', symbol: '₹' })).toBe('₹1,500.00');
    expect(formatValue('n/a', { type: 'number' })).toBe('n/a');
  });

  it('formats dates from text and from Excel serial numbers', () => {
    expect(formatValue('2026-06-01', { type: 'date', pattern: 'D MMMM YYYY' })).toBe('1 June 2026');
    // 46174 = 2026-06-01 in Excel's 1900 date system
    expect(formatValue(46174, { type: 'date', pattern: 'DD/MM/YYYY' })).toBe('01/06/2026');
    expect(formatValue('not a date', { type: 'date' })).toBe('not a date');
    expect(parseDateValue('garbage')).toBeNull();
  });

  it('never touches empty values', () => {
    expect(formatValue('', { type: 'upper' })).toBe('');
  });
});

describe('resolveFieldText', () => {
  it('applies the field format to the row value', () => {
    const f = textField({ format: { type: 'upper' } });
    expect(resolveFieldText(f, { Name: 'ana' })).toBe('ANA');
  });
  it('shows the header as a placeholder without data', () => {
    expect(resolveFieldText(textField(), null)).toBe('Name');
  });
  it('returns empty text for a missing cell', () => {
    expect(resolveFieldText(textField(), {})).toBe('');
  });
});

describe('image matching', () => {
  const index = buildAssetIndex([asset('Ana.PNG'), asset('ben.jpg'), asset('Brochure.pdf (page 2)')]);

  it('matches with or without extension, any case, ignoring folders', () => {
    expect(findAsset(index, 'ana.png')?.name).toBe('Ana.PNG');
    expect(findAsset(index, 'ANA')?.name).toBe('Ana.PNG');
    expect(findAsset(index, 'C:\\photos\\ben.jpg')?.name).toBe('ben.jpg');
  });

  it('matches PDF pages by "name (page N)" with or without .pdf', () => {
    expect(findAsset(index, 'brochure.pdf (page 2)')?.name).toBe('Brochure.pdf (page 2)');
    expect(findAsset(index, 'Brochure (page 2)')?.name).toBe('Brochure.pdf (page 2)');
    expect(findAsset(index, 'Brochure (page 3)')).toBeNull();
  });

  it('returns null for blanks and unknown names', () => {
    expect(findAsset(index, '')).toBeNull();
    expect(findAsset(index, undefined)).toBeNull();
    expect(findAsset(index, 'zed.png')).toBeNull();
  });
});

describe('mergeDatasets', () => {
  it('concatenates rows and unions headers in first-seen order', () => {
    const merged = mergeDatasets([
      { headers: ['Name', 'Class'], rows: [{ Name: 'A', Class: '1' }] },
      { headers: ['Name', 'Score'], rows: [{ Name: 'B', Score: 9 }] },
    ]);
    expect(merged.headers).toEqual(['Name', 'Class', 'Score']);
    expect(merged.rows).toHaveLength(2);
  });
  it('handles no datasets', () => {
    expect(mergeDatasets([])).toEqual({ headers: [], rows: [] });
  });
});

describe('parseLayout', () => {
  it('rejects things that are not layouts', () => {
    expect(parseLayout(null)).toBeNull();
    expect(parseLayout({ version: 2, fields: [] })).toBeNull();
    expect(parseLayout({ version: 1 })).toBeNull();
  });

  it('keeps valid fields and drops malformed ones', () => {
    const layout = parseLayout({
      version: 1,
      fields: [textField(), { id: 'bad' }, null],
      combinedFields: [{ nope: true }],
      outputFormat: 'weird',
    });
    expect(layout?.fields).toHaveLength(1);
    expect(layout?.combinedFields).toHaveLength(0);
    expect(layout?.outputFormat).toBe('image');
  });
});

describe('sheetGrid (documents per page)', () => {
  it('stacks wide documents and puts tall ones side by side', () => {
    expect(sheetGrid(2, 1200, 850)).toEqual({ cols: 1, rows: 2 });
    expect(sheetGrid(2, 850, 1200)).toEqual({ cols: 2, rows: 1 });
    expect(sheetGrid(6, 1200, 850)).toEqual({ cols: 2, rows: 3 });
  });
  it('makes square grids for 4 and 9', () => {
    expect(sheetGrid(4, 1, 1)).toEqual({ cols: 2, rows: 2 });
    expect(sheetGrid(9, 1, 1)).toEqual({ cols: 3, rows: 3 });
    expect(sheetGrid(1, 1, 1)).toEqual({ cols: 1, rows: 1 });
  });
  it('always has room for every document', () => {
    [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((n) => {
      const g = sheetGrid(n, 1200, 850);
      expect(g.cols * g.rows).toBeGreaterThanOrEqual(n);
    });
  });
});

describe('export checks', () => {
  const imageField = textField({ id: 'img', kind: 'image', imageColumn: 'Photo', headerName: 'Photo' });

  it('lists used columns once', () => {
    expect(usedColumns([textField(), textField({ id: 'x' }), imageField]).sort()).toEqual(['Name', 'Photo']);
  });

  it('warns about empty cells, unmatched images, and duplicate names', () => {
    const rows = [
      { Name: 'A', Photo: 'a.png' },
      { Name: 'A', Photo: 'missing.png' },
      { Name: '', Photo: '' },
    ];
    const messages = analyzeExport([textField(), imageField], rows, [asset('a.png')], '').map((c) => c.message);
    expect(messages.some((m) => m.includes('empty "Name"'))).toBe(true);
    expect(messages.some((m) => m.includes('aren') || m.includes("isn't"))).toBe(true);
    expect(messages.some((m) => m.includes('repeated'))).toBe(true);
  });

  it('blocks export when a static image is not uploaded', () => {
    const f = textField({ id: 's', kind: 'image', imageSrc: 'logo.png' });
    const checks = analyzeExport([f], [{ Name: 'A' }], [], '');
    expect(checks.some((c) => c.level === 'error')).toBe(true);
  });
});

describe('pictures by PDF page order', () => {
  const page = (n: number): ImageAsset => ({ ...asset(`photos.pdf (page ${n})`), group: 'photos.pdf', page: n });
  // Deliberately out of order: the index must sort pages.
  const index = buildAssetIndex([page(3), page(1), page(2), asset('logo.png')]);

  it('groups pages and keeps page order', () => {
    expect(index.groups.get('photos.pdf')?.map((a) => a.page)).toEqual([1, 2, 3]);
    expect(index.groups.has('logo.png')).toBe(false);
  });

  it('matches row N to page N (row numbers are zero-based)', () => {
    expect(findAssetByRow(index, 'photos.pdf', { [ROW_INDEX_KEY]: 0 })?.page).toBe(1);
    expect(findAssetByRow(index, 'photos.pdf', { [ROW_INDEX_KEY]: 2 })?.page).toBe(3);
  });

  it('keeps the match when rows are left out (uses the original position)', () => {
    // Row 2 survives while rows 0 and 1 are excluded: it must still get page 3, not page 1.
    expect(findAssetByRow(index, 'photos.pdf', { [ROW_INDEX_KEY]: 2 })?.page).toBe(3);
  });

  it('returns null past the last page, for unknown PDFs, and for rows without a position', () => {
    expect(findAssetByRow(index, 'photos.pdf', { [ROW_INDEX_KEY]: 3 })).toBeNull();
    expect(findAssetByRow(index, 'other.pdf', { [ROW_INDEX_KEY]: 0 })).toBeNull();
    expect(findAssetByRow(index, 'photos.pdf', { Name: 'x' })).toBeNull();
  });

  it('warns when there are fewer pages than rows', () => {
    const field = textField({ id: 'p', kind: 'image', imageGroup: 'photos.pdf', headerName: 'photos.pdf' });
    const rows = [0, 1, 2, 3, 4].map((i) => ({ Name: `n${i}`, [ROW_INDEX_KEY]: i }));
    const checks = analyzeExport([field], rows, [page(1), page(2), page(3)], '');
    expect(checks.some((c) => c.level === 'warning' && c.message.includes('2 rows have no page'))).toBe(true);
  });
});

describe('placing on the template', () => {
  const tw = 1000;
  const th = 500;
  const box = { left: 100, top: 40, width: 200, height: 100 };

  it('centres horizontally and vertically', () => {
    expect(alignDelta(box, 'hcenter', tw, th)).toEqual({ dx: 400 - 100, dy: 0 });
    expect(alignDelta(box, 'vcenter', tw, th)).toEqual({ dx: 0, dy: 200 - 40 });
  });

  it('after moving, a centred box really is centred', () => {
    const { dx } = alignDelta(box, 'hcenter', tw, th);
    const { dy } = alignDelta(box, 'vcenter', tw, th);
    expect(box.left + dx + box.width / 2).toBe(tw / 2);
    expect(box.top + dy + box.height / 2).toBe(th / 2);
  });

  it('keeps a small margin from the edges', () => {
    const margin = Math.round(Math.min(tw, th) * 0.03);
    expect(box.left + alignDelta(box, 'left', tw, th).dx).toBe(margin);
    expect(box.left + alignDelta(box, 'right', tw, th).dx + box.width).toBe(tw - margin);
    expect(box.top + alignDelta(box, 'top', tw, th).dy).toBe(margin);
    expect(box.top + alignDelta(box, 'bottom', tw, th).dy + box.height).toBe(th - margin);
  });
});

describe('picture fit modes', () => {
  const f = (fit: CanvasField['fit']): CanvasField =>
    textField({ kind: 'image', fit, width: 200, height: 100, headerName: 'p' });

  it('contain keeps the whole picture, centred, with bars', () => {
    const m = computeMediaLayout(f('contain'), 100, 100);
    expect([m.dw, m.dh, m.dx, m.dy]).toEqual([100, 100, 50, 0]);
  });
  it('cover fills the box by cropping', () => {
    const m = computeMediaLayout(f('cover'), 100, 100);
    expect([m.dw, m.dh]).toEqual([200, 100]);
    expect(m.crop).toEqual({ x: 0, y: 25, width: 100, height: 50 });
  });
  it('fill stretches to the box exactly', () => {
    const m = computeMediaLayout(f('fill'), 100, 100);
    expect([m.dx, m.dy, m.dw, m.dh]).toEqual([0, 0, 200, 100]);
    expect(m.crop).toBeUndefined();
  });
});

describe('picture focus point', () => {
  const tall = (fit: CanvasField['fit'], focusY: number): CanvasField =>
    textField({ kind: 'image', fit, width: 100, height: 100, focusX: 0.5, focusY, headerName: 'p' });

  it('best fit keeps the top of a tall photo when focus is top (faces stay in view)', () => {
    // 100x200 photo in a 100x100 box: shows 100x100 of the source, anchored to the top.
    expect(computeMediaLayout(tall('cover', 0), 100, 200).crop).toEqual({ x: 0, y: 0, width: 100, height: 100 });
    expect(computeMediaLayout(tall('cover', 1), 100, 200).crop).toEqual({ x: 0, y: 100, width: 100, height: 100 });
    expect(computeMediaLayout(tall('cover', 0.5), 100, 200).crop?.y).toBe(50);
  });

  it('whole picture can sit at the top or bottom of the box', () => {
    const wide = (fy: number) => textField({ kind: 'image', fit: 'contain', width: 100, height: 100, focusY: fy, headerName: 'p' });
    expect(computeMediaLayout(wide(0), 200, 100).dy).toBe(0);
    expect(computeMediaLayout(wide(1), 200, 100).dy).toBe(50);
  });
});

describe('output sharpness', () => {
  const photo = (n: { w: number; h: number }): ImageAsset => ({ ...asset('p.png'), native: n });
  const field = (over: Partial<CanvasField>): CanvasField =>
    textField({ kind: 'image', imageSrc: 'p.png', width: 200, height: 200, headerName: 'p', ...over });

  it('needs more than 1x when a photo is bigger than its box', () => {
    const index = buildAssetIndex([photo({ w: 2000, h: 2000 })]);
    expect(neededScale([field({ fit: 'contain' })], [{ Name: 'a' }], index)).toBeCloseTo(10, 5);
  });

  it('uses only the visible part of a cropped photo', () => {
    // 3000x1000 photo, best fit in a 200x200 box: only the middle 1000x1000 shows, drawn 200px wide => 5x.
    const index = buildAssetIndex([photo({ w: 3000, h: 1000 })]);
    expect(neededScale([field({ fit: 'cover' })], [{ Name: 'a' }], index)).toBeCloseTo(5, 5);
  });

  it('stays at 1x when pictures are small or there are none', () => {
    const index = buildAssetIndex([photo({ w: 100, h: 100 })]);
    expect(neededScale([field({})], [{ Name: 'a' }], index)).toBe(1);
    expect(neededScale([textField()], [{ Name: 'a' }], index)).toBe(1);
  });

  it('automatic is capped, fixed choices are honoured', () => {
    const index = buildAssetIndex([photo({ w: 6000, h: 6000 })]);
    const f = [field({ fit: 'contain' })];
    expect(resolveScale('auto', f, [{ Name: 'a' }], index)).toBe(AUTO_SCALE_MAX);
    expect(resolveScale(2, f, [{ Name: 'a' }], index)).toBe(2);
    expect(resolveScale(1, f, [{ Name: 'a' }], index)).toBe(1);
  });

  it('never asks the browser for a page it cannot build', () => {
    expect(effectiveScale(100, 1200, 800)).toBeLessThan(100);
    expect(effectiveScale(2, 1200, 800)).toBe(2);
  });
});

describe('picture resolution inside a PDF page', () => {
  const OPS = { save: 1, restore: 2, transform: 3, paintImageXObject: 4, paintFormXObjectBegin: 5, paintFormXObjectEnd: 6 };
  const page = (ops: [number, unknown[]][]) => ({
    getOperatorList: async () => ({ fnArray: ops.map((o) => o[0]), argsArray: ops.map((o) => o[1]) }),
  });

  it('reports pixels per PDF point of the embedded picture', async () => {
    // A 1000x1500 photo placed 200x300 points wide => 5 pixels per point.
    const p = page([
      [OPS.save, []],
      [OPS.transform, [200, 0, 0, 300, 50, 50]],
      [OPS.paintImageXObject, ['img_1', 1000, 1500]],
      [OPS.restore, []],
    ]);
    expect(await pictureScaleOfPage(p, OPS)).toBeCloseTo(5, 5);
  });

  it('follows nested transforms and picks the biggest picture', async () => {
    const p = page([
      [OPS.save, []],
      [OPS.transform, [2, 0, 0, 2, 0, 0]],
      [OPS.transform, [50, 0, 0, 50, 0, 0]], // 100 x 100 points in total
      [OPS.paintImageXObject, ['small', 100, 100]], // 1 px per point
      [OPS.restore, []],
      [OPS.save, []],
      [OPS.transform, [400, 0, 0, 400, 0, 0]],
      [OPS.paintImageXObject, ['big', 2400, 2400]], // 6 px per point, bigger on the page
      [OPS.restore, []],
    ]);
    expect(await pictureScaleOfPage(p, OPS)).toBeCloseTo(6, 5);
  });

  it('returns null when the page has no picture', async () => {
    expect(await pictureScaleOfPage(page([[OPS.save, []], [OPS.restore, []]]), OPS)).toBeNull();
  });
});
