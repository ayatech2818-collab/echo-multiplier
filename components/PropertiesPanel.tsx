'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Barcode,
  Bold,
  Copy,
  Image as ImageIcon,
  Italic,
  Layers,
  Maximize,
  Sparkles,
  MousePointerClick,
  QrCode,
  Trash2,
  Type,
} from 'lucide-react';
import { CanvasField, CombinedSegment, FieldFormat, FontStyle, FormatType } from '@/types';
import { FONT_FAMILIES } from '@/lib/fonts';
import { isTextField } from '@/lib/utils';
import { DATE_PATTERNS } from '@/lib/formatOptions';
import { listGroups } from '@/lib/assets';
import type { Studio } from '@/lib/useStudio';

const composeFontStyle = (bold: boolean, italic: boolean): FontStyle =>
  bold && italic ? 'bold italic' : bold ? 'bold' : italic ? 'italic' : 'normal';

const segmentLabel = (seg: CombinedSegment): string => {
  if (seg.type === 'column') return seg.value;
  const trimmed = seg.value.trim();
  return trimmed === '' ? '␣' : trimmed;
};

const inputClass = 'h-11 w-full rounded-xl border border-line px-3 tabular-nums text-ink transition-colors hover:border-line-strong';
const selectClass = 'h-11 w-full cursor-pointer rounded-xl border border-line px-3 text-ink transition-colors hover:border-line-strong';

/** A number box that lets you clear and retype freely, and only applies values inside min/max. */
function NumField({
  value,
  onChange,
  min,
  max,
  label,
  placeholder,
  allowEmpty,
}: {
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  min: number;
  max: number;
  label: string;
  placeholder?: string;
  allowEmpty?: boolean;
}) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const shown = value === undefined ? '' : String(Math.round(value * 100) / 100);

  return (
    <input
      type="number"
      inputMode="decimal"
      aria-label={label}
      value={focused ? text : shown}
      placeholder={placeholder}
      min={min}
      max={max}
      onFocus={() => {
        setText(shown);
        setFocused(true);
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        setText(e.target.value);
        if (e.target.value === '') {
          if (allowEmpty) onChange(undefined);
          return;
        }
        const n = Number(e.target.value);
        if (isFinite(n) && n >= min && n <= max) onChange(n);
      }}
      className={inputClass}
    />
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-4 first:border-t-0 first:pt-0">
      <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-faint">{title}</h4>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Labeled({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
    </label>
  );
}

function ToggleGroup<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; icon?: React.ElementType }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-0.5 rounded-xl bg-page p-1">
      {options.map(({ value: v, label: l, icon: Icon }) => {
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            aria-pressed={active}
            className={`flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium transition-all ${
              active ? 'bg-surface text-accent shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {Icon && <Icon size={16} strokeWidth={2} />}
            {l}
          </button>
        );
      })}
    </div>
  );
}

const KIND_META = {
  text: { label: 'Text', Icon: Type },
  image: { label: 'Image', Icon: ImageIcon },
  qr: { label: 'QR code', Icon: QrCode },
  barcode: { label: 'Barcode', Icon: Barcode },
} as const;

interface PropertiesPanelProps {
  studio: Studio;
  selectedSegmentId: string | null;
  onSelectSegment: (id: string | null) => void;
}

/** Right panel: shows only the options that apply to the selected field. */
export default function PropertiesPanel({ studio, selectedSegmentId, onSelectSegment }: PropertiesPanelProps) {
  const field = studio.canvasFields.find((f) => f.id === studio.selectedFieldId) ?? null;
  const [moreOpen, setMoreOpen] = useState(false);

  if (!field) {
    return (
      <div className="flex flex-col items-center px-2 py-10 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <MousePointerClick size={22} />
        </div>
        <p className="text-sm font-semibold text-ink">Nothing selected</p>
        <p className="mt-1 max-w-[220px] text-xs text-muted">
          Tap a field on the template to change its font, size, colour or position.
        </p>
      </div>
    );
  }

  const update = (patch: Partial<CanvasField>) => studio.updateField(field.id, patch);
  const kind = field.kind ?? 'text';
  const { label: kindLabel, Icon: KindIcon } = KIND_META[kind];
  const text = isTextField(field);
  const isCombined = !!field.segments && field.segments.length > 0;
  const isColumnText = text && !field.isStatic && !isCombined;

  const activeSeg =
    isCombined && selectedSegmentId ? field.segments!.find((s) => s.id === selectedSegmentId) ?? null : null;
  const activeSegIndex = activeSeg ? field.segments!.findIndex((s) => s.id === activeSeg.id) : -1;
  const activeFontFamily = activeSeg?.fontFamily ?? field.fontFamily ?? 'Arial';
  const activeFontStyle: FontStyle = activeSeg?.fontStyle ?? field.fontStyle;
  const activeFontSize = activeSeg?.fontSize ?? field.fontSize;
  const activeFill = activeSeg?.fill ?? field.fill;
  const isBold = activeFontStyle.includes('bold');
  const isItalic = activeFontStyle.includes('italic');

  // Route a style change either to the selected segment's override, or to the field's base style.
  const applyStyle = (updates: Partial<Pick<CombinedSegment, 'fontFamily' | 'fontStyle' | 'fontSize' | 'fill'>>) => {
    if (activeSeg) {
      update({ segments: field.segments!.map((s) => (s.id === activeSeg.id ? { ...s, ...updates } : s)) });
    } else {
      update(updates as Partial<CanvasField>);
    }
  };
  const applySegment = (updates: Partial<CombinedSegment>) => {
    if (!activeSeg) return;
    update({ segments: field.segments!.map((s) => (s.id === activeSeg.id ? { ...s, ...updates } : s)) });
  };

  const format: FieldFormat = field.format ?? { type: 'none' };
  const setFormat = (patch: Partial<FieldFormat>) => update({ format: { ...format, ...patch } });

  const setSize = (axis: 'width' | 'height', n: number | undefined) => {
    if (n === undefined) return;
    const w = field.width ?? 160;
    const h = field.height ?? 160;
    const square = kind === 'qr';
    const keep = square || field.lockRatio !== false;
    if (!keep) {
      update({ [axis]: n });
      return;
    }
    const ratio = h > 0 ? w / h : 1;
    if (axis === 'width') update({ width: n, height: square ? n : Math.max(8, Math.round(n / ratio)) });
    else update({ height: n, width: square ? n : Math.max(8, Math.round(n * ratio)) });
  };

  const hasAsset = !!field.imageSrc;
  const fieldName = field.headerName.length > 28 ? `${field.headerName.slice(0, 27)}…` : field.headerName;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <KindIcon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink" title={field.headerName}>
            {fieldName}
          </p>
          <p className="text-xs text-muted">
            {isCombined ? 'Custom text' : kindLabel}
            {isColumnText ? ' · from data' : field.isStatic ? ' · fixed text' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={studio.duplicateSelected}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-accent hover:text-accent"
          aria-label="Duplicate field"
          title="Duplicate (Ctrl+D)"
        >
          <Copy size={17} />
        </button>
        <button
          type="button"
          onClick={studio.deleteSelected}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-danger/30 text-danger transition-colors hover:bg-danger-soft"
          aria-label="Delete field"
          title="Delete (Delete key)"
        >
          <Trash2 size={17} />
        </button>
      </div>

      {/* ---------- Text ---------- */}
      {text && (
        <Section title="Text">
          {isCombined && (
            <div className="rounded-xl bg-page p-2.5">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted">
                <Layers size={13} /> Editing
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => onSelectSegment(null)}
                  className={`min-h-[36px] rounded-full px-3 text-xs font-medium transition-colors ${
                    !activeSeg ? 'bg-accent text-white' : 'bg-surface text-muted hover:text-ink'
                  }`}
                >
                  Whole field
                </button>
                {field.segments!.map((seg) => (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => onSelectSegment(seg.id)}
                    title={seg.type === 'column' ? `Column: ${seg.value}` : `Text: ${seg.value}`}
                    className={`min-h-[36px] max-w-[140px] truncate rounded-full px-3 text-xs font-medium transition-colors ${
                      activeSeg?.id === seg.id
                        ? 'bg-accent text-white'
                        : seg.type === 'column'
                        ? 'bg-violet-soft text-violet hover:opacity-80'
                        : 'bg-surface text-muted hover:text-ink'
                    }`}
                  >
                    {segmentLabel(seg)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Labeled label="Font">
            <select
              value={activeFontFamily}
              onChange={(e) => applyStyle({ fontFamily: e.target.value })}
              className={selectClass}
              style={{ fontFamily: activeFontFamily }}
            >
              {FONT_FAMILIES.map((font) => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>
          </Labeled>

          <div className="grid grid-cols-2 gap-3">
            <Labeled label="Size">
              <NumField
                label="Font size"
                value={activeFontSize}
                min={6}
                max={400}
                onChange={(n) => n !== undefined && applyStyle({ fontSize: Math.round(n) })}
              />
            </Labeled>
            <Labeled label="Colour">
              <div className="flex gap-1.5">
                <input
                  type="color"
                  value={activeFill}
                  onChange={(e) => applyStyle({ fill: e.target.value })}
                  className="h-11 w-12 flex-shrink-0 cursor-pointer rounded-xl border border-line bg-surface"
                  aria-label="Text colour"
                />
                <input
                  type="text"
                  value={activeFill}
                  onChange={(e) => /^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) && applyStyle({ fill: e.target.value })}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-line px-2 font-mono text-xs text-ink"
                  maxLength={7}
                  aria-label="Hex colour"
                />
              </div>
            </Labeled>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-xl bg-page p-1">
              <button
                type="button"
                onClick={() => applyStyle({ fontStyle: composeFontStyle(!isBold, isItalic) })}
                aria-pressed={isBold}
                aria-label="Bold"
                className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                  isBold ? 'bg-accent text-white' : 'text-ink hover:bg-surface'
                }`}
              >
                <Bold size={16} strokeWidth={2.25} />
              </button>
              <button
                type="button"
                onClick={() => applyStyle({ fontStyle: composeFontStyle(isBold, !isItalic) })}
                aria-pressed={isItalic}
                aria-label="Italic"
                className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                  isItalic ? 'bg-accent text-white' : 'text-ink hover:bg-surface'
                }`}
              >
                <Italic size={16} strokeWidth={2.25} />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <ToggleGroup
                label="Alignment"
                value={field.align ?? 'center'}
                onChange={(align) => update({ align })}
                options={[
                  { value: 'left', label: '', icon: AlignLeft },
                  { value: 'center', label: '', icon: AlignCenter },
                  { value: 'right', label: '', icon: AlignRight },
                ]}
              />
            </div>
          </div>

          {isCombined && (
            <div className="grid grid-cols-2 gap-3">
              {activeSeg && activeSegIndex > 0 && (
                <Labeled label="Space before">
                  <NumField
                    label="Space before this part"
                    value={activeSeg.gapBefore ?? 0}
                    min={0}
                    max={400}
                    onChange={(n) => n !== undefined && applySegment({ gapBefore: Math.round(n) })}
                  />
                </Labeled>
              )}
              <Labeled label="Wrap width" hint="Empty = one line">
                <NumField
                  label="Wrap width"
                  value={field.width}
                  min={50}
                  max={4000}
                  allowEmpty
                  placeholder="auto"
                  onChange={(n) => update({ width: n === undefined ? undefined : Math.round(n) })}
                />
              </Labeled>
            </div>
          )}
        </Section>
      )}

      {/* Text: auto-fit + formatting (single-column fields) */}
      {text && !isCombined && (
        <Section title="Fit & format">
          <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl bg-page px-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={!!field.autoFit}
              onChange={(e) =>
                update({ autoFit: e.target.checked, width: e.target.checked ? field.width ?? 600 : field.width })
              }
              className="h-5 w-5 accent-[rgb(var(--c-accent))]"
            />
            <span>
              Shrink long text to fit
              <span className="block text-xs text-muted">Keeps long names inside the space you set.</span>
            </span>
          </label>
          <button
            type="button"
            onClick={studio.bestFitSelected}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-line px-3 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
            title="Centre it and shrink long text so it always fits across the template"
          >
            <Sparkles size={16} /> Fit text across template
          </button>
          {field.autoFit && (
            <Labeled label="Maximum width (px)">
              <NumField
                label="Maximum width"
                value={field.width}
                min={20}
                max={6000}
                onChange={(n) => n !== undefined && update({ width: Math.round(n) })}
              />
            </Labeled>
          )}

          {isColumnText && (
            <>
              <Labeled label="Show the value as">
                <select
                  value={format.type}
                  onChange={(e) => update({ format: { ...format, type: e.target.value as FormatType } })}
                  className={selectClass}
                >
                  <option value="none">As written</option>
                  <option value="upper">UPPERCASE</option>
                  <option value="lower">lowercase</option>
                  <option value="title">Title Case</option>
                  <option value="number">Number (1,234.5)</option>
                  <option value="currency">Currency ($1,234.50)</option>
                  <option value="date">Date</option>
                </select>
              </Labeled>
              {(format.type === 'number' || format.type === 'currency') && (
                <div className="grid grid-cols-2 gap-3">
                  <Labeled label="Decimals">
                    <NumField
                      label="Decimals"
                      value={format.decimals ?? (format.type === 'currency' ? 2 : 0)}
                      min={0}
                      max={6}
                      onChange={(n) => n !== undefined && setFormat({ decimals: Math.round(n) })}
                    />
                  </Labeled>
                  {format.type === 'currency' && (
                    <Labeled label="Symbol">
                      <input
                        type="text"
                        value={format.symbol ?? '$'}
                        maxLength={4}
                        onChange={(e) => setFormat({ symbol: e.target.value })}
                        className={inputClass}
                      />
                    </Labeled>
                  )}
                </div>
              )}
              {format.type === 'date' && (
                <Labeled label="Date style" hint="Works with dates typed in Excel or as text.">
                  <select
                    value={format.pattern ?? DATE_PATTERNS[0].pattern}
                    onChange={(e) => setFormat({ pattern: e.target.value })}
                    className={selectClass}
                  >
                    {DATE_PATTERNS.map((p) => (
                      <option key={p.pattern} value={p.pattern}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </Labeled>
              )}
            </>
          )}
        </Section>
      )}

      {/* ---------- Image / QR / barcode ---------- */}
      {!text && (
        <>
          <Section title={kind === 'image' ? 'Picture' : 'Code'}>
            {kind === 'image' && hasAsset && (
              <Labeled label="Image">
                <select
                  value={field.imageSrc}
                  onChange={(e) => {
                    const asset = studio.assets.find((a) => a.key === e.target.value);
                    update({ imageSrc: e.target.value, headerName: asset?.name ?? field.headerName });
                  }}
                  className={selectClass}
                >
                  {!studio.assets.some((a) => a.key === field.imageSrc) && (
                    <option value={field.imageSrc}>{field.imageSrc} (not uploaded)</option>
                  )}
                  {studio.assets.map((a) => (
                    <option key={a.id} value={a.key}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Labeled>
            )}
            {field.imageGroup !== undefined && (
              <Labeled label="PDF with the pictures" hint="Row 1 uses page 1, row 2 uses page 2, and so on.">
                <select
                  value={field.imageGroup}
                  onChange={(e) => update({ imageGroup: e.target.value, headerName: e.target.value })}
                  className={selectClass}
                >
                  {!listGroups(studio.assets).some((g) => g.name === field.imageGroup) && (
                    <option value={field.imageGroup}>{field.imageGroup} (not uploaded)</option>
                  )}
                  {listGroups(studio.assets).map((g) => (
                    <option key={g.name} value={g.name}>
                      {g.name} ({g.pages.length} pages)
                    </option>
                  ))}
                </select>
              </Labeled>
            )}
            {field.imageColumn !== undefined && (
              <Labeled
                label={kind === 'image' ? 'Column with image file names' : 'Column to encode'}
                hint={kind === 'image' ? 'Each row shows the image named in this column.' : undefined}
              >
                <select
                  value={field.imageColumn}
                  onChange={(e) => update({ imageColumn: e.target.value })}
                  className={selectClass}
                >
                  {!studio.excelHeaders.includes(field.imageColumn) && (
                    <option value={field.imageColumn}>{field.imageColumn} (missing)</option>
                  )}
                  {studio.excelHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </Labeled>
            )}
            {kind !== 'image' && field.imageColumn === undefined && (
              <Labeled label="Text to encode">
                <input
                  type="text"
                  value={field.codeText ?? ''}
                  onChange={(e) => update({ codeText: e.target.value, headerName: `${kind === 'qr' ? 'QR' : 'Barcode'}: ${e.target.value}` })}
                  className={inputClass}
                />
              </Labeled>
            )}
            {kind !== 'image' && (
              <Labeled label="Code colour">
                <div className="flex gap-1.5">
                  <input
                    type="color"
                    value={field.fill}
                    onChange={(e) => update({ fill: e.target.value })}
                    className="h-11 w-12 flex-shrink-0 cursor-pointer rounded-xl border border-line bg-surface"
                    aria-label="Code colour"
                  />
                  <p className="flex-1 self-center text-xs text-muted">Keep it dark so phones can scan it.</p>
                </div>
              </Labeled>
            )}
          </Section>

          <Section title="Size">
            <div className="grid grid-cols-2 gap-3">
              <Labeled label="Width">
                <NumField label="Width" value={field.width} min={8} max={6000} onChange={(n) => setSize('width', n)} />
              </Labeled>
              <Labeled label="Height">
                <NumField
                  label="Height"
                  value={field.height}
                  min={8}
                  max={6000}
                  onChange={(n) => setSize('height', n)}
                />
              </Labeled>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {kind === 'image' && (
                <button
                  type="button"
                  onClick={studio.bestFitSelected}
                  className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-line px-3 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
                  title="Change the box's height so it has the same shape as the picture"
                >
                  <Sparkles size={16} /> Match box to picture
                </button>
              )}
              <button
                type="button"
                onClick={studio.fitSelectedToTemplate}
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-line px-3 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
                title="Make it as large as fits on the template, centred"
              >
                <Maximize size={16} /> Fit to template
              </button>
            </div>
            {kind !== 'qr' && (
              <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl bg-page px-3 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={field.lockRatio !== false}
                  onChange={(e) => update({ lockRatio: e.target.checked })}
                  className="h-5 w-5 accent-[rgb(var(--c-accent))]"
                />
                Keep proportions
              </label>
            )}
          </Section>

          {kind === 'image' && (
            <Section title="Look">
              <Labeled
                label="Picture placement in the box"
                hint={
                  (field.fit ?? 'contain') === 'cover'
                    ? 'Best fit: fills the whole box without stretching; the overflow is cropped.'
                    : (field.fit ?? 'contain') === 'fill'
                    ? 'Stretch: fills the box exactly, but the picture can look squashed.'
                    : 'Whole picture: nothing is cropped; empty space may show around it.'
                }
              >
                <ToggleGroup
                  label="Picture placement"
                  value={field.fit ?? 'contain'}
                  onChange={(fit) => update({ fit })}
                  options={[
                    { value: 'cover', label: 'Best fit' },
                    { value: 'contain', label: 'Whole' },
                    { value: 'fill', label: 'Stretch' },
                  ]}
                />
              </Labeled>
              {(field.fit ?? 'contain') !== 'fill' && (
                <Labeled
                  label="Focus"
                  hint={
                    (field.fit ?? 'contain') === 'cover'
                      ? 'Choose which part of the picture stays visible (e.g. top keeps faces).'
                      : 'Choose where the picture sits inside the box.'
                  }
                >
                  <div role="group" aria-label="Focus" className="mx-auto grid w-32 grid-cols-3 gap-1.5">
                    {[0, 0.5, 1].flatMap((fy) =>
                      [0, 0.5, 1].map((fx) => {
                        const active = (field.focusX ?? 0.5) === fx && (field.focusY ?? 0.5) === fy;
                        const names = ['top', 'middle', 'bottom'];
                        const cols = ['left', 'centre', 'right'];
                        return (
                          <button
                            key={`${fx}-${fy}`}
                            type="button"
                            onClick={() => update({ focusX: fx, focusY: fy })}
                            aria-pressed={active}
                            aria-label={`${names[fy * 2]} ${cols[fx * 2]}`}
                            title={`${names[fy * 2]} ${cols[fx * 2]}`}
                            className={`h-9 rounded-lg border transition-colors ${
                              active ? 'border-accent bg-accent' : 'border-line bg-page hover:border-accent/60'
                            }`}
                          />
                        );
                      })
                    )}
                  </div>
                </Labeled>
              )}
              <Labeled label="Shape">
                <ToggleGroup
                  label="Shape"
                  value={field.shape ?? 'rect'}
                  onChange={(shape) => update({ shape })}
                  options={[
                    { value: 'rect', label: 'Rectangle' },
                    { value: 'circle', label: 'Circle' },
                  ]}
                />
              </Labeled>
              {(field.shape ?? 'rect') === 'rect' && (
                <Labeled
                  label={`Rounded corners ${Math.round(field.cornerRadius ?? 0)}px`}
                  hint="0 = square corners. Drag right for softer edges."
                >
                  <input
                    type="range"
                    min={0}
                    max={Math.max(1, Math.floor(Math.min(field.width ?? 160, field.height ?? 160) / 2))}
                    value={Math.min(field.cornerRadius ?? 0, Math.floor(Math.min(field.width ?? 160, field.height ?? 160) / 2))}
                    onChange={(e) => update({ cornerRadius: Number(e.target.value) })}
                    className="h-11 w-full cursor-pointer accent-[rgb(var(--c-accent))]"
                    aria-label="Rounded corners"
                  />
                </Labeled>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Labeled label="Border (px)">
                  <NumField
                    label="Border width"
                    value={field.borderWidth ?? 0}
                    min={0}
                    max={60}
                    onChange={(n) => n !== undefined && update({ borderWidth: Math.round(n) })}
                  />
                </Labeled>
                <Labeled label="Border colour">
                  <input
                    type="color"
                    value={field.borderColor ?? '#000000'}
                    onChange={(e) => update({ borderColor: e.target.value })}
                    className="h-11 w-full cursor-pointer rounded-xl border border-line bg-surface"
                    aria-label="Border colour"
                  />
                </Labeled>
              </div>
              {(field.borderWidth ?? 0) > 0 && (
                <Labeled label="Border style">
                  <ToggleGroup
                    label="Border style"
                    value={field.borderStyle ?? 'solid'}
                    onChange={(borderStyle) => update({ borderStyle })}
                    options={[
                      { value: 'solid', label: 'Solid' },
                      { value: 'dashed', label: 'Dashed' },
                      { value: 'dotted', label: 'Dotted' },
                    ]}
                  />
                </Labeled>
              )}
              <Labeled label="Background colour" hint="Shows behind the picture (around it, or through transparent areas).">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={field.bgColor ?? '#ffffff'}
                    onChange={(e) => update({ bgColor: e.target.value })}
                    className="h-11 w-12 flex-shrink-0 cursor-pointer rounded-xl border border-line bg-surface"
                    aria-label="Background colour"
                  />
                  {field.bgColor ? (
                    <button
                      type="button"
                      onClick={() => update({ bgColor: undefined })}
                      className="min-h-[44px] rounded-full border border-line px-4 text-sm font-medium text-ink hover:border-accent"
                    >
                      Remove
                    </button>
                  ) : (
                    <span className="text-xs text-muted">None (transparent)</span>
                  )}
                </div>
              </Labeled>
              <Labeled label={`Opacity ${Math.round((field.opacity ?? 1) * 100)}%`}>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={Math.round((field.opacity ?? 1) * 100)}
                  onChange={(e) => update({ opacity: Number(e.target.value) / 100 })}
                  className="h-11 w-full cursor-pointer accent-[rgb(var(--c-accent))]"
                />
              </Labeled>
            </Section>
          )}
        </>
      )}

      {/* ---------- Place on template ---------- */}
      <Section title="Place on template">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { t: 'left', label: 'Left edge', Icon: AlignHorizontalJustifyStart },
              { t: 'hcenter', label: 'Centre horizontally', Icon: AlignHorizontalJustifyCenter },
              { t: 'right', label: 'Right edge', Icon: AlignHorizontalJustifyEnd },
              { t: 'top', label: 'Top edge', Icon: AlignVerticalJustifyStart },
              { t: 'vcenter', label: 'Centre vertically', Icon: AlignVerticalJustifyCenter },
              { t: 'bottom', label: 'Bottom edge', Icon: AlignVerticalJustifyEnd },
            ] as const
          ).map(({ t, label, Icon }) => (
            <button
              key={t}
              type="button"
              onClick={() => studio.alignSelected(t)}
              aria-label={label}
              title={label}
              className="flex h-11 items-center justify-center rounded-xl border border-line text-ink transition-colors hover:border-accent hover:text-accent active:bg-accent-soft"
            >
              <Icon size={18} />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => studio.alignSelected('center')}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-accent-soft px-3 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-white"
        >
          Centre on template
        </button>
      </Section>

      {/* ---------- Position ---------- */}
      <Section title="Position">
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          className="flex min-h-[44px] w-full items-center justify-between rounded-xl bg-page px-3 text-sm font-medium text-ink"
        >
          X {Math.round(field.x)}, Y {Math.round(field.y)}
          <span className="text-xs font-normal text-muted">{moreOpen ? 'Hide' : 'Fine-tune'}</span>
        </button>
        {moreOpen && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Labeled label="X">
                <NumField
                  label="X position"
                  value={field.x}
                  min={-10000}
                  max={20000}
                  onChange={(n) => n !== undefined && update({ x: n })}
                />
              </Labeled>
              <Labeled label="Y">
                <NumField
                  label="Y position"
                  value={field.y}
                  min={-10000}
                  max={20000}
                  onChange={(n) => n !== undefined && update({ y: n })}
                />
              </Labeled>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted">Nudge (hold for 10px)</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { Icon: ArrowLeft, dx: -1, dy: 0, label: 'Left' },
                  { Icon: ArrowUp, dx: 0, dy: -1, label: 'Up' },
                  { Icon: ArrowDown, dx: 0, dy: 1, label: 'Down' },
                  { Icon: ArrowRight, dx: 1, dy: 0, label: 'Right' },
                ].map(({ Icon, dx, dy, label }) => (
                  <NudgeButton key={label} label={label} onNudge={(step) => studio.nudgeSelected(dx * step, dy * step)}>
                    <Icon size={18} />
                  </NudgeButton>
                ))}
              </div>
            </div>
          </>
        )}
      </Section>
    </div>
  );
}

/** Tap = 1px, press and hold = repeat in 10px steps (works with a finger or a mouse). */
function NudgeButton({
  label,
  onNudge,
  children,
}: {
  label: string;
  onNudge: (step: number) => void;
  children: React.ReactNode;
}) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  // Never leave a repeating timer running if the panel closes mid-press.
  useEffect(() => stop, []);
  const start = () => {
    stop();
    onNudge(1);
    timer.current = setInterval(() => onNudge(10), 140);
  };

  return (
    <button
      type="button"
      aria-label={`Nudge ${label}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        start();
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onNudge(e.shiftKey ? 10 : 1);
        }
      }}
      className="flex h-11 items-center justify-center rounded-xl border border-line text-ink transition-colors hover:border-accent hover:text-accent active:bg-accent-soft"
    >
      {children}
    </button>
  );
}
