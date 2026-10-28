import { CanvasField, ExcelRow } from '@/types';
import { layoutCombined } from './combinedLayout';
import { effectiveFontSize, measureText } from './measure';
import { fieldBox } from './mediaField';
import { isTextField, resolveFieldText } from './utils';

export interface Bounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * The rectangle a field covers on the template (in template px), for aligning and centering.
 * `row` is the data row currently shown (null = the placeholder text), so text is measured the same
 * way it is drawn.
 */
export const fieldBounds = (field: CanvasField, row: ExcelRow | null): Bounds => {
  if (!isTextField(field)) {
    const { w, h } = fieldBox(field);
    return { left: field.x, top: field.y, width: w, height: h };
  }

  if (field.segments) {
    const { boxWidth, boxHeight, offsetX } = layoutCombined(field, row);
    return { left: field.x - offsetX, top: field.y, width: Math.max(boxWidth, 1), height: Math.max(boxHeight, 1) };
  }

  const text = resolveFieldText(field, row);
  const size = effectiveFontSize(field, text);
  const width = measureText(text, size, field.fontStyle, field.fontFamily || 'Arial');
  const align = field.align || 'center';
  const offsetX = align === 'center' ? width / 2 : align === 'right' ? width : 0;
  return { left: field.x - offsetX, top: field.y, width: Math.max(width, 1), height: size };
};

export type AlignTarget = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom';

/** How far to move a field so it lands where `target` says on a template of tw × th. */
export const alignDelta = (
  b: Bounds,
  target: AlignTarget,
  tw: number,
  th: number
): { dx: number; dy: number } => {
  const margin = Math.round(Math.min(tw, th) * 0.03);
  switch (target) {
    case 'left':
      return { dx: margin - b.left, dy: 0 };
    case 'hcenter':
      return { dx: (tw - b.width) / 2 - b.left, dy: 0 };
    case 'right':
      return { dx: tw - margin - b.width - b.left, dy: 0 };
    case 'top':
      return { dx: 0, dy: margin - b.top };
    case 'vcenter':
      return { dx: 0, dy: (th - b.height) / 2 - b.top };
    case 'bottom':
      return { dx: 0, dy: th - margin - b.height - b.top };
  }
};
