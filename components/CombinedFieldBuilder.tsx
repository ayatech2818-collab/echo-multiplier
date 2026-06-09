'use client';

import { useState } from 'react';
import {
  Plus,
  X,
  Bold,
  Italic,
  Settings2,
  ChevronLeft,
  ChevronRight,
  Database,
  Type as TypeIcon,
} from 'lucide-react';
import { CombinedFieldDef, CombinedSegment, ExcelRow, FontStyle } from '@/types';
import { generateId } from '@/lib/utils';
import { resolveSegmentText } from '@/lib/combinedLayout';
import { FONT_FAMILIES } from './StyleToolbar';

interface CombinedFieldBuilderProps {
  headers: string[];
  sampleRow: ExcelRow | null;
  onAdd: (def: CombinedFieldDef) => void;
}

const BASE_FONT_SIZE = 24;
const BASE_FILL = '#1d1d1f';
const DEFAULT_WRAP_WIDTH = 400;

const SEPARATORS: { label: string; value: string }[] = [
  { label: 'Space', value: ' ' },
  { label: 'Comma', value: ', ' },
  { label: 'Dash', value: ' - ' },
];

const composeFontStyle = (bold: boolean, italic: boolean): FontStyle =>
  bold && italic ? 'bold italic' : bold ? 'bold' : italic ? 'italic' : 'normal';

// Shows a literal text segment readably (spaces are otherwise invisible).
const displayTextValue = (value: string): string =>
  value.trim() === '' ? '␣'.repeat(value.length) : value;

export default function CombinedFieldBuilder({ headers, sampleRow, onAdd }: CombinedFieldBuilderProps) {
  const [segments, setSegments] = useState<CombinedSegment[]>([]);
  const [textInput, setTextInput] = useState('');
  const [label, setLabel] = useState('');
  const [baseFontSize, setBaseFontSize] = useState(BASE_FONT_SIZE);
  const [baseFill, setBaseFill] = useState(BASE_FILL);
  const [wrapEnabled, setWrapEnabled] = useState(false);
  const [wrapWidth, setWrapWidth] = useState(DEFAULT_WRAP_WIDTH);
  const [editingId, setEditingId] = useState<string | null>(null);

  const addColumn = (header: string) => {
    setSegments((prev) => [...prev, { id: generateId(), type: 'column', value: header }]);
  };

  const addText = (value: string) => {
    if (!value) return;
    setSegments((prev) => [...prev, { id: generateId(), type: 'text', value }]);
  };

  const addTypedText = () => {
    if (!textInput) return;
    addText(textInput);
    setTextInput('');
  };

  const removeSegment = (id: string) => {
    setSegments((prev) => prev.filter((s) => s.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const moveSegment = (id: string, dir: -1 | 1) => {
    setSegments((prev) => {
      const index = prev.findIndex((s) => s.id === id);
      const target = index + dir;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const updateSegment = (id: string, updates: Partial<CombinedSegment>) => {
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const handleAdd = () => {
    if (segments.length === 0) return;
    const derivedLabel =
      label.trim() ||
      segments
        .map((s) => (s.type === 'column' ? `{${s.value}}` : s.value))
        .join('')
        .trim()
        .slice(0, 40) ||
      'Combined field';

    onAdd({
      id: generateId(),
      label: derivedLabel,
      segments: segments.map((s) => ({ ...s })),
      width: wrapEnabled ? wrapWidth : undefined,
      fontSize: baseFontSize,
      fill: baseFill,
      fontStyle: 'normal',
      fontFamily: 'Arial',
      align: 'left',
    });

    setSegments([]);
    setTextInput('');
    setLabel('');
    setEditingId(null);
  };

  return (
    <div>
      <p className="mb-3 text-sm text-muted">
        Join several columns and your own words into one sentence (e.g. <span className="font-medium text-ink">Dear
        {' '}John Smith, invoice INV-204 is due 12 Jun</span>). Style each part on its own and set the spacing
        between them.
      </p>

      {/* Add column / text */}
      <div className="space-y-3">
        {headers.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-faint">Add a column</p>
            <div className="flex flex-wrap gap-2">
              {headers.map((header) => (
                <button
                  key={header}
                  type="button"
                  onClick={() => addColumn(header)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700"
                >
                  <Database size={14} strokeWidth={2} className="text-violet-600" />
                  <span className="max-w-[200px] truncate">{header}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-1.5 text-xs font-medium text-faint">Add text or a separator</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTypedText();
                }
              }}
              placeholder="Type words, e.g. Dear "
              className="h-10 flex-1 rounded-xl border border-line bg-surface px-3.5 text-sm text-ink transition-colors hover:border-line-strong"
            />
            <button
              type="button"
              onClick={addTypedText}
              disabled={!textInput}
              className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:bg-faint"
            >
              <TypeIcon size={16} strokeWidth={2.25} />
              Add text
            </button>
            <div className="flex items-center gap-1.5">
              {SEPARATORS.map((sep) => (
                <button
                  key={sep.label}
                  type="button"
                  onClick={() => addText(sep.value)}
                  title={`Add a ${sep.label.toLowerCase()} separator`}
                  className="h-10 rounded-full border border-line bg-surface px-3 text-xs font-medium text-muted transition-colors hover:border-line-strong hover:text-ink"
                >
                  {sep.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Assembled segments */}
      {segments.length > 0 && (
        <div className="mt-4 space-y-2 rounded-xl border border-line bg-page/60 p-3">
          {segments.map((seg, index) => {
            const isOpen = editingId === seg.id;
            const fontStyle = seg.fontStyle ?? 'normal';
            const isBold = fontStyle.includes('bold');
            const isItalic = fontStyle.includes('italic');
            return (
              <div key={seg.id} className="rounded-lg border border-line bg-surface shadow-sm">
                <div className="flex items-center gap-2 px-2.5 py-2">
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveSegment(seg.id, -1)}
                      disabled={index === 0}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-page disabled:opacity-30"
                      title="Move left"
                    >
                      <ChevronLeft size={16} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSegment(seg.id, 1)}
                      disabled={index === segments.length - 1}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-page disabled:opacity-30"
                      title="Move right"
                    >
                      <ChevronRight size={16} strokeWidth={2} />
                    </button>
                  </div>

                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    {seg.type === 'column' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-violet-50 px-2 py-1 text-sm font-medium text-violet-700">
                        <Database size={13} strokeWidth={2} />
                        <span className="max-w-[180px] truncate">{seg.value}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-page px-2 py-1 font-mono text-sm text-ink">
                        <span className="max-w-[220px] truncate whitespace-pre">{displayTextValue(seg.value)}</span>
                      </span>
                    )}
                    {index > 0 && (seg.gapBefore ?? 0) > 0 && (
                      <span className="text-xs text-faint">+{seg.gapBefore}px gap</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditingId(isOpen ? null : seg.id)}
                    className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                      isOpen ? 'bg-accent text-white' : 'text-muted hover:bg-page'
                    }`}
                    title="Style this part"
                  >
                    <Settings2 size={15} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSegment(seg.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-danger transition-colors hover:bg-danger-soft"
                    title="Remove part"
                  >
                    <X size={15} strokeWidth={2.25} />
                  </button>
                </div>

                {isOpen && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-line px-2.5 py-2.5">
                    <select
                      value={seg.fontFamily ?? 'Arial'}
                      onChange={(e) => updateSegment(seg.id, { fontFamily: e.target.value })}
                      className="h-8 cursor-pointer rounded-lg border border-line bg-surface px-2 text-xs text-ink"
                      style={{ fontFamily: seg.fontFamily ?? 'Arial' }}
                      title="Font"
                    >
                      {FONT_FAMILIES.map((font) => (
                        <option key={font} value={font} style={{ fontFamily: font }}>
                          {font}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => updateSegment(seg.id, { fontStyle: composeFontStyle(!isBold, isItalic) })}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                        isBold ? 'bg-accent text-white' : 'text-ink hover:bg-page'
                      }`}
                      title="Bold"
                    >
                      <Bold size={15} strokeWidth={2.25} />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSegment(seg.id, { fontStyle: composeFontStyle(isBold, !isItalic) })}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                        isItalic ? 'bg-accent text-white' : 'text-ink hover:bg-page'
                      }`}
                      title="Italic"
                    >
                      <Italic size={15} strokeWidth={2.25} />
                    </button>
                    <label className="flex items-center gap-1 text-xs text-muted">
                      Size
                      <input
                        type="number"
                        min={8}
                        max={200}
                        value={seg.fontSize ?? ''}
                        placeholder={String(baseFontSize)}
                        onChange={(e) =>
                          updateSegment(seg.id, {
                            fontSize: e.target.value === '' ? undefined : parseInt(e.target.value) || undefined,
                          })
                        }
                        className="h-8 w-16 rounded-lg border border-line px-2 text-xs tabular-nums text-ink"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-xs text-muted" title="Color">
                      Color
                      <input
                        type="color"
                        value={seg.fill ?? baseFill}
                        onChange={(e) => updateSegment(seg.id, { fill: e.target.value })}
                        className="h-8 w-8 cursor-pointer rounded-lg border border-line bg-surface p-0.5"
                      />
                    </label>
                    {index > 0 && (
                      <label className="flex items-center gap-1 text-xs text-muted" title="Space before this part">
                        Space before
                        <input
                          type="number"
                          min={0}
                          max={400}
                          value={seg.gapBefore ?? 0}
                          onChange={(e) => updateSegment(seg.id, { gapBefore: parseInt(e.target.value) || 0 })}
                          className="h-8 w-16 rounded-lg border border-line px-2 text-xs tabular-nums text-ink"
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Base style + wrap + live preview */}
      {segments.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted">
              Base size
              <input
                type="number"
                min={8}
                max={200}
                value={baseFontSize}
                onChange={(e) => setBaseFontSize(parseInt(e.target.value) || BASE_FONT_SIZE)}
                className="h-8 w-16 rounded-lg border border-line px-2 text-xs tabular-nums text-ink"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted">
              Base color
              <input
                type="color"
                value={baseFill}
                onChange={(e) => setBaseFill(e.target.value)}
                className="h-8 w-8 cursor-pointer rounded-lg border border-line bg-surface p-0.5"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <input
                type="checkbox"
                checked={wrapEnabled}
                onChange={(e) => setWrapEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-line"
              />
              Wrap to width
            </label>
            {wrapEnabled && (
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted">
                Width
                <input
                  type="number"
                  min={50}
                  max={4000}
                  value={wrapWidth}
                  onChange={(e) => setWrapWidth(parseInt(e.target.value) || DEFAULT_WRAP_WIDTH)}
                  className="h-8 w-20 rounded-lg border border-line px-2 text-xs tabular-nums text-ink"
                />
                px
              </label>
            )}
          </div>

          {/* Live preview */}
          <div>
            <p className="mb-1 text-xs font-medium text-faint">
              Preview {sampleRow ? '(first row)' : '(column names — upload data to see values)'}
            </p>
            <div className="overflow-x-auto rounded-xl border border-line bg-surface p-3">
              <div
                className="leading-snug"
                style={{ maxWidth: wrapEnabled ? wrapWidth : undefined, whiteSpace: wrapEnabled ? 'normal' : 'pre' }}
              >
                {segments.map((seg) => {
                  const text = resolveSegmentText(seg, sampleRow) || (seg.type === 'column' ? seg.value : '');
                  const style: React.CSSProperties = {
                    fontSize: seg.fontSize ?? baseFontSize,
                    color: seg.fill ?? baseFill,
                    fontWeight: (seg.fontStyle ?? 'normal').includes('bold') ? 700 : 400,
                    fontStyle: (seg.fontStyle ?? 'normal').includes('italic') ? 'italic' : 'normal',
                    fontFamily: seg.fontFamily ?? 'Arial',
                    marginLeft: seg.gapBefore ? `${seg.gapBefore}px` : undefined,
                    whiteSpace: 'pre-wrap',
                  };
                  return (
                    <span key={seg.id} style={style}>
                      {text}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Name + add */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Optional name for this field"
              className="h-10 flex-1 rounded-xl border border-line bg-surface px-3.5 text-sm text-ink transition-colors hover:border-line-strong"
            />
            <button
              type="button"
              onClick={handleAdd}
              className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-violet-600 px-5 text-sm font-semibold text-white transition-all hover:bg-violet-700 active:scale-95"
            >
              <Plus size={16} strokeWidth={2.25} />
              Add to fields
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
