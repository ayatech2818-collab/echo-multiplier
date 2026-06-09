import Konva from 'konva';
import { CanvasField, CombinedSegment, ExcelRow, FontStyle } from '@/types';

/**
 * Shared layout engine for combined ("sentence") fields.
 *
 * A combined field is an ordered list of styled segments. Because each segment can have its own
 * size/color/font, the field cannot be a single Konva.Text node — it is laid out here into a list
 * of positioned `runs`, one per word, each carrying its own style. Both the canvas preview
 * (CanvasWorkspace) and the export loop (exportUtils) consume these runs, so what you see is exactly
 * what is exported.
 */

export interface EffectiveStyle {
  fontSize: number;
  fill: string;
  fontStyle: FontStyle;
  fontFamily: string;
}

export interface CombinedRun {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fill: string;
  fontStyle: FontStyle;
  fontFamily: string;
}

export interface CombinedLayout {
  runs: CombinedRun[];
  boxWidth: number;
  boxHeight: number;
}

const LINE_HEIGHT_FACTOR = 1.2;

/** Resolve a single segment's text. `row === null` means the editor skeleton (show the column name). */
export const resolveSegmentText = (seg: CombinedSegment, row: ExcelRow | null): string => {
  if (seg.type === 'text') return seg.value;
  if (!row) return seg.value; // editor: show the header name as a placeholder
  const value = row[seg.value];
  return value === undefined || value === null ? '' : String(value);
};

/** Effective style for a segment = its override, falling back to the field's base style. */
export const segStyle = (seg: CombinedSegment, field: CanvasField): EffectiveStyle => ({
  fontSize: seg.fontSize ?? field.fontSize,
  fill: seg.fill ?? field.fill,
  fontStyle: seg.fontStyle ?? field.fontStyle,
  fontFamily: seg.fontFamily ?? field.fontFamily ?? 'Arial',
});

// Measure a piece of text using a throwaway Konva.Text node (same technique used elsewhere in the
// codebase). Works identically in the editor and the export loop.
const measure = (text: string, style: EffectiveStyle): number => {
  const node = new Konva.Text({
    text,
    fontSize: style.fontSize,
    fontStyle: style.fontStyle,
    fontFamily: style.fontFamily,
  });
  return node.width();
};

interface Token {
  text: string;
  isSpace: boolean;
  width: number;
  style: EffectiveStyle;
  gapBefore: number; // applied before the first token of a non-first segment
}

interface PlacedItem {
  text: string;
  x: number;
  style: EffectiveStyle;
}

interface Line {
  items: PlacedItem[];
  width: number;
  height: number;
}

/**
 * Lay out a combined field relative to its anchor (0,0 = field top-left). Words flow left→right;
 * if `field.width` is set, words wrap to a new line when they would overflow. Per-segment `gapBefore`
 * adds horizontal spacing at each join. Lines are aligned within the box via `field.align`.
 */
export const layoutCombined = (field: CanvasField, row: ExcelRow | null): CombinedLayout => {
  const segments = field.segments ?? [];
  const align = field.align ?? 'left';
  const wrapWidth = field.width; // undefined → no wrapping (single line, auto width)

  // 1. Tokenize every segment into words and whitespace runs, each carrying its segment's style.
  const tokens: Token[] = [];
  segments.forEach((seg, segIndex) => {
    const style = segStyle(seg, field);
    const text = resolveSegmentText(seg, row);
    const parts = text.match(/\S+|\s+/g) ?? [];
    parts.forEach((part, partIndex) => {
      tokens.push({
        text: part,
        isSpace: /^\s+$/.test(part),
        width: measure(part, style),
        style,
        gapBefore: partIndex === 0 && segIndex > 0 ? seg.gapBefore ?? 0 : 0,
      });
    });
  });

  // 2. Flow tokens into lines.
  const lines: Line[] = [];
  let current: Line = { items: [], width: 0, height: 0 };
  let x = 0;

  const commitLine = () => {
    lines.push(current);
    current = { items: [], width: 0, height: 0 };
    x = 0;
  };

  tokens.forEach((tok) => {
    // Wrap before a word that would overflow the box (never wrap on a leading word).
    if (wrapWidth && !tok.isSpace && current.items.length > 0 && x + tok.gapBefore + tok.width > wrapWidth) {
      commitLine();
    }
    // Collapse whitespace at the start of a line (e.g. the space left dangling by a wrap).
    if (tok.isSpace && current.items.length === 0) return;

    x += tok.gapBefore;
    current.items.push({ text: tok.text, x, style: tok.style });
    x += tok.width;
    current.width = x;
    current.height = Math.max(current.height, tok.style.fontSize);
  });
  if (current.items.length > 0) lines.push(current);

  // 3. Resolve box size and place runs with per-line alignment.
  const maxLineWidth = lines.reduce((max, line) => Math.max(max, line.width), 0);
  const boxWidth = wrapWidth ?? maxLineWidth;

  const runs: CombinedRun[] = [];
  let y = 0;
  lines.forEach((line) => {
    let offset = 0;
    if (align === 'center') offset = (boxWidth - line.width) / 2;
    else if (align === 'right') offset = boxWidth - line.width;

    line.items.forEach((item) => {
      runs.push({
        text: item.text,
        x: offset + item.x,
        y,
        fontSize: item.style.fontSize,
        fill: item.style.fill,
        fontStyle: item.style.fontStyle,
        fontFamily: item.style.fontFamily,
      });
    });
    y += line.height * LINE_HEIGHT_FACTOR;
  });

  return { runs, boxWidth, boxHeight: y };
};
