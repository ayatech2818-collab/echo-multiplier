'use client';

import { Bold, Italic, Type, AlignLeft, AlignCenter, AlignRight, Layers } from 'lucide-react';
import { CanvasField, CombinedSegment, FontStyle } from '@/types';

interface StyleToolbarProps {
  field: CanvasField;
  onUpdate: (updates: Partial<CanvasField>) => void;
  // For combined fields: which segment the style controls currently target (null = whole field / base style).
  selectedSegmentId?: string | null;
  onSelectSegment?: (id: string | null) => void;
}

export const FONT_FAMILIES = [
  'Arial',
  'Times New Roman',
  'Courier New',
  'Georgia',
  'Verdana',
  'Comic Sans MS',
  'Impact',
  'Trebuchet MS',
  'Palatino',
  'Garamond',
];

const composeFontStyle = (bold: boolean, italic: boolean): FontStyle =>
  bold && italic ? 'bold italic' : bold ? 'bold' : italic ? 'italic' : 'normal';

const segmentLabel = (seg: CombinedSegment): string => {
  if (seg.type === 'column') return seg.value;
  const trimmed = seg.value.trim();
  return trimmed === '' ? '␣' : trimmed;
};

export default function StyleToolbar({ field, onUpdate, selectedSegmentId = null, onSelectSegment }: StyleToolbarProps) {
  const isCombined = !!field.segments && field.segments.length > 0;
  const activeSeg = isCombined && selectedSegmentId ? field.segments!.find((s) => s.id === selectedSegmentId) ?? null : null;
  const activeSegIndex = activeSeg ? field.segments!.findIndex((s) => s.id === activeSeg.id) : -1;

  // Active style values: a selected segment's override, falling back to the field's base style.
  const activeFontFamily = activeSeg?.fontFamily ?? field.fontFamily ?? 'Arial';
  const activeFontStyle: FontStyle = activeSeg?.fontStyle ?? field.fontStyle;
  const activeFontSize = activeSeg?.fontSize ?? field.fontSize;
  const activeFill = activeSeg?.fill ?? field.fill;

  const isBold = activeFontStyle.includes('bold');
  const isItalic = activeFontStyle.includes('italic');

  // Route a style change either to the selected segment override, or to the field's base style.
  const applyStyle = (updates: Partial<Pick<CombinedSegment, 'fontFamily' | 'fontStyle' | 'fontSize' | 'fill'>>) => {
    if (activeSeg) {
      const segments = field.segments!.map((s) => (s.id === activeSeg.id ? { ...s, ...updates } : s));
      onUpdate({ segments });
    } else {
      onUpdate(updates as Partial<CanvasField>);
    }
  };

  const applySegment = (updates: Partial<CombinedSegment>) => {
    if (!activeSeg) return;
    const segments = field.segments!.map((s) => (s.id === activeSeg.id ? { ...s, ...updates } : s));
    onUpdate({ segments });
  };

  const align = field.align || 'center';
  const alignOptions = [
    { value: 'left' as const, Icon: AlignLeft, label: 'Align left' },
    { value: 'center' as const, Icon: AlignCenter, label: 'Align center' },
    { value: 'right' as const, Icon: AlignRight, label: 'Align right' },
  ];

  return (
    <div className="mb-3 w-full rounded-xl border border-line bg-surface p-2 shadow-pop">
      {/* Combined-field segment selector */}
      {isCombined && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5 border-b border-line pb-2">
          <span className="mr-1 inline-flex items-center gap-1 text-xs font-medium text-faint">
            <Layers size={13} strokeWidth={2} />
            Editing:
          </span>
          <button
            type="button"
            onClick={() => onSelectSegment?.(null)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              !activeSeg ? 'bg-accent text-white' : 'bg-page text-muted hover:text-ink'
            }`}
            title="Edit the whole field (base style)"
          >
            Whole field
          </button>
          {field.segments!.map((seg) => (
            <button
              key={seg.id}
              type="button"
              onClick={() => onSelectSegment?.(seg.id)}
              className={`max-w-[140px] truncate rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                activeSeg?.id === seg.id
                  ? 'bg-accent text-white'
                  : seg.type === 'column'
                  ? 'bg-violet-50 text-violet-700 hover:bg-violet-100'
                  : 'bg-page text-muted hover:text-ink'
              }`}
              title={seg.type === 'column' ? `Column: ${seg.value}` : `Text: ${seg.value}`}
            >
              {segmentLabel(seg)}
            </button>
          ))}
        </div>
      )}

      <div className="flex w-full flex-wrap items-center gap-2">
        {/* Font Family */}
        <select
          value={activeFontFamily}
          onChange={(e) => applyStyle({ fontFamily: e.target.value })}
          className="h-9 cursor-pointer rounded-lg border border-line bg-surface px-2 text-sm text-ink transition-colors hover:border-line-strong"
          style={{ fontFamily: activeFontFamily }}
          title="Font"
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font} value={font} style={{ fontFamily: font }}>
              {font}
            </option>
          ))}
        </select>

        <div className="h-6 w-px bg-line" />

        {/* Bold/Italic */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => applyStyle({ fontStyle: composeFontStyle(!isBold, isItalic) })}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
              isBold ? 'bg-accent text-white' : 'text-ink hover:bg-page'
            }`}
            title="Bold"
            aria-pressed={isBold}
            type="button"
          >
            <Bold size={16} strokeWidth={2.25} />
          </button>
          <button
            onClick={() => applyStyle({ fontStyle: composeFontStyle(isBold, !isItalic) })}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
              isItalic ? 'bg-accent text-white' : 'text-ink hover:bg-page'
            }`}
            title="Italic"
            aria-pressed={isItalic}
            type="button"
          >
            <Italic size={16} strokeWidth={2.25} />
          </button>
        </div>

        <div className="h-6 w-px bg-line" />

        {/* Text Alignment (whole field) */}
        <div className="flex items-center gap-0.5 rounded-lg bg-page p-0.5">
          {alignOptions.map(({ value, Icon, label }) => {
            const active = align === value;
            return (
              <button
                key={value}
                onClick={() => onUpdate({ align: value })}
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-all ${
                  active ? 'bg-surface text-accent shadow-sm' : 'text-muted hover:text-ink'
                }`}
                title={label}
                aria-label={label}
                aria-pressed={active}
                type="button"
              >
                <Icon size={16} strokeWidth={2} />
              </button>
            );
          })}
        </div>

        <div className="h-6 w-px bg-line" />

        {/* Font Size */}
        <div className="flex items-center gap-1.5">
          <Type size={16} strokeWidth={2} className="text-faint" />
          <input
            type="number"
            value={activeFontSize}
            onChange={(e) => applyStyle({ fontSize: parseInt(e.target.value) || 12 })}
            className="h-9 w-16 rounded-lg border border-line px-2 text-sm tabular-nums text-ink transition-colors hover:border-line-strong"
            min="8"
            max="200"
            title="Font size"
          />
        </div>

        <div className="h-6 w-px bg-line" />

        {/* Color */}
        <div className="flex items-center gap-1.5">
          <input
            type="color"
            value={activeFill}
            onChange={(e) => applyStyle({ fill: e.target.value })}
            className="h-9 w-9 cursor-pointer rounded-lg border border-line bg-surface p-0.5"
            title="Text color"
          />
          <input
            type="text"
            value={activeFill}
            onChange={(e) => {
              const value = e.target.value;
              if (value.match(/^#[0-9A-Fa-f]{0,6}$/)) {
                applyStyle({ fill: value });
              }
            }}
            className="h-9 w-24 rounded-lg border border-line px-2 font-mono text-xs text-ink transition-colors hover:border-line-strong"
            placeholder="#000000"
            maxLength={7}
            title="Hex color"
          />
        </div>

        {/* Combined-field extras: per-join spacing for the selected segment + field wrap width */}
        {isCombined && (
          <>
            <div className="h-6 w-px bg-line" />
            {activeSeg && activeSegIndex > 0 && (
              <label className="flex items-center gap-1 text-xs font-medium text-muted" title="Space before this part (per-join spacing)">
                Space
                <input
                  type="number"
                  min={0}
                  max={400}
                  value={activeSeg.gapBefore ?? 0}
                  onChange={(e) => applySegment({ gapBefore: parseInt(e.target.value) || 0 })}
                  className="h-9 w-16 rounded-lg border border-line px-2 text-sm tabular-nums text-ink"
                />
              </label>
            )}
            <label className="flex items-center gap-1 text-xs font-medium text-muted" title="Wrap width (blank = single line)">
              Width
              <input
                type="number"
                min={50}
                max={4000}
                value={field.width ?? ''}
                placeholder="auto"
                onChange={(e) => onUpdate({ width: e.target.value === '' ? undefined : parseInt(e.target.value) || undefined })}
                className="h-9 w-20 rounded-lg border border-line px-2 text-sm tabular-nums text-ink"
              />
            </label>
          </>
        )}
      </div>
    </div>
  );
}
