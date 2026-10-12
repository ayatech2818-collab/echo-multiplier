import { describe, expect, it } from 'vitest';
import { formatValue, parseDateValue } from '../format';
import { buildAssetIndex, findAsset, normalizeKey } from '../assets';
import { parseLayout } from '../layoutIO';
import { mergeDatasets } from '../fileParser';
import { sheetGrid } from '../exportUtils';
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
