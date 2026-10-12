import Konva from 'konva';
import { CanvasField, FontStyle } from '@/types';

let probe: Konva.Text | null = null;

/** Measure the rendered width of a single line of text (reuses one Konva.Text node). */
export const measureText = (
  text: string,
  fontSize: number,
  fontStyle: FontStyle,
  fontFamily: string
): number => {
  if (!probe) probe = new Konva.Text({});
  probe.setAttrs({ text, fontSize, fontStyle, fontFamily });
  return probe.width();
};

export const MIN_AUTOFIT_SIZE = 6;

/**
 * Font size to render a single-column field with. When `autoFit` is on and a max `width` is set,
 * the size shrinks until the text fits; otherwise it is the field's own size. Shared by the editor
 * and the export so both render identically.
 */
export const effectiveFontSize = (field: CanvasField, text: string): number => {
  if (!field.autoFit || !field.width || field.width <= 0 || text === '') return field.fontSize;
  const family = field.fontFamily || 'Arial';
  let size = field.fontSize;
  while (size > MIN_AUTOFIT_SIZE && measureText(text, size, field.fontStyle, family) > field.width) {
    size -= 1;
  }
  return size;
};
