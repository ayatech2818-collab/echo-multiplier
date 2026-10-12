'use client';

import { useState } from 'react';
import { Barcode, ChevronDown, Image as ImageIcon, QrCode, Type } from 'lucide-react';
import HeaderChip from './HeaderChip';
import CombinedFieldBuilder from './CombinedFieldBuilder';
import type { FieldSpec, Studio } from '@/lib/useStudio';

type MediaKind = 'image' | 'qr' | 'barcode';

const MEDIA_TILES: { kind: MediaKind | 'text'; label: string; Icon: React.ElementType }[] = [
  { kind: 'text', label: 'Custom text', Icon: Type },
  { kind: 'image', label: 'Image', Icon: ImageIcon },
  { kind: 'qr', label: 'QR code', Icon: QrCode },
  { kind: 'barcode', label: 'Barcode', Icon: Barcode },
];

const selectClass =
  'h-11 w-full cursor-pointer rounded-xl border border-line bg-surface px-3 text-ink transition-colors hover:border-line-strong';

/** Small inline form to add an image, QR code or barcode, from a data column or a fixed value. */
function AddMediaForm({ kind, studio, onDone }: { kind: MediaKind; studio: Studio; onDone: () => void }) {
  const { excelHeaders, assets } = studio;
  const hasColumns = excelHeaders.length > 0;
  const hasAssets = assets.length > 0;
  const [mode, setMode] = useState<'fixed' | 'column'>(hasColumns && !(kind === 'image' && hasAssets) ? 'column' : 'fixed');
  const [column, setColumn] = useState('');
  const [assetKey, setAssetKey] = useState('');
  const [text, setText] = useState('');

  const effectiveColumn = column || excelHeaders[0] || '';
  const effectiveAsset = assetKey || assets[0]?.key || '';

  const add = () => {
    if (mode === 'column') {
      studio.addField({ type: 'media', kind, column: effectiveColumn });
    } else if (kind === 'image') {
      studio.addField({ type: 'media', kind, assetKey: effectiveAsset });
    } else {
      studio.addField({ type: 'media', kind, text: text.trim() });
    }
    onDone();
  };

  const canAdd = mode === 'column' ? !!effectiveColumn : kind === 'image' ? !!effectiveAsset : text.trim() !== '';

  const fixedLabel = kind === 'image' ? 'Same image on every document' : 'Same value on every document';
  const columnLabel = kind === 'image' ? 'Different image per row (from a column)' : 'Value from a data column';

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-line bg-page p-3">
      <div className="space-y-1.5">
        {(['fixed', 'column'] as const).map((m) => (
          <label
            key={m}
            className={`flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm ${
              mode === m ? 'bg-surface text-ink shadow-sm' : 'text-muted'
            } ${m === 'column' && !hasColumns ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <input
              type="radio"
              name={`mode-${kind}`}
              checked={mode === m}
              disabled={m === 'column' && !hasColumns}
              onChange={() => setMode(m)}
              className="h-4 w-4 accent-[rgb(var(--c-accent))]"
            />
            {m === 'fixed' ? fixedLabel : columnLabel}
          </label>
        ))}
      </div>

      {mode === 'column' ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            {kind === 'image' ? 'Column with image file names' : 'Column to encode'}
          </label>
          <select value={effectiveColumn} onChange={(e) => setColumn(e.target.value)} className={selectClass}>
            {excelHeaders.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
      ) : kind === 'image' ? (
        hasAssets ? (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Choose an image</label>
            <div className="grid grid-cols-4 gap-2">
              {assets.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAssetKey(a.key)}
                  className={`overflow-hidden rounded-lg border-2 bg-surface ${
                    effectiveAsset === a.key ? 'border-accent' : 'border-line'
                  }`}
                  title={a.name}
                  aria-pressed={effectiveAsset === a.key}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.thumb} alt={a.name} className="aspect-square w-full object-contain" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted">Upload images in Step 1 first, then pick one here.</p>
        )
      ) : (
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            {kind === 'qr' ? 'Text or link to encode' : 'Value to encode'}
          </label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={kind === 'qr' ? 'https://example.com' : 'ABC-12345'}
            className="h-11 w-full rounded-xl border border-line px-3"
          />
        </div>
      )}

      <button
        type="button"
        onClick={add}
        disabled={!canAdd}
        className="flex min-h-[44px] w-full items-center justify-center rounded-full bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-faint"
      >
        Add to template
      </button>
    </div>
  );
}

/** Left panel: everything that can be placed on the template. */
export default function Palette({ studio, onPlaced }: { studio: Studio; onPlaced?: () => void }) {
  const { excelHeaders, combinedFields, allRows } = studio;
  const [open, setOpen] = useState<MediaKind | null>(null);
  const [showCombined, setShowCombined] = useState(false);

  const place = (spec: FieldSpec) => {
    studio.addField(spec);
    onPlaced?.();
  };

  return (
    <div className="space-y-5">
      {/* Data columns */}
      <section>
        <h3 className="mb-0.5 text-sm font-semibold text-ink">Data columns</h3>
        <p className="mb-2.5 text-xs text-muted">
          Tap a column to put its text on the template (or drag it). Each document gets its own row&apos;s value.
        </p>
        {excelHeaders.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {excelHeaders.map((header) => (
              <HeaderChip key={header} label={header} spec={{ type: 'column', header }} onAdd={place} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl bg-page p-3 text-xs text-muted">
            No data yet. Add an Excel/CSV file in Step 1 to see its columns here.
          </p>
        )}
      </section>

      {/* Special fields */}
      <section>
        <h3 className="mb-0.5 text-sm font-semibold text-ink">Add something else</h3>
        <p className="mb-2.5 text-xs text-muted">Fixed text, pictures, QR codes and barcodes.</p>
        <div className="grid grid-cols-2 gap-2">
          {MEDIA_TILES.map(({ kind, label, Icon }) => {
            const active = kind === 'text' ? showCombined : open === kind;
            return (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  if (kind === 'text') {
                    setShowCombined((v) => !v);
                    setOpen(null);
                  } else {
                    setOpen(open === kind ? null : kind);
                    setShowCombined(false);
                  }
                }}
                aria-expanded={active}
                className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors ${
                  active
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line bg-surface text-ink hover:border-accent/60'
                }`}
              >
                <Icon size={18} strokeWidth={2} />
                {label}
                <ChevronDown size={14} className={`transition-transform ${active ? 'rotate-180' : ''}`} />
              </button>
            );
          })}
        </div>

        {open && (
          <AddMediaForm
            key={open}
            kind={open}
            studio={studio}
            onDone={() => {
              setOpen(null);
              onPlaced?.();
            }}
          />
        )}

        {showCombined && (
          <div className="mt-3 rounded-xl border border-line bg-page p-3">
            <CombinedFieldBuilder
              headers={excelHeaders}
              sampleRow={allRows[0] ?? null}
              onAdd={studio.addCombinedDef}
            />
          </div>
        )}
      </section>

      {/* Saved custom text */}
      {combinedFields.length > 0 && (
        <section>
          <h3 className="mb-0.5 text-sm font-semibold text-ink">Your custom text</h3>
          <p className="mb-2.5 text-xs text-muted">Tap to place again. Combines words and columns.</p>
          <div className="flex flex-wrap gap-2">
            {combinedFields.map((def) => (
              <HeaderChip
                key={def.id}
                label={def.label}
                spec={{ type: 'combined', def }}
                tone="combined"
                onAdd={place}
                onRemove={() => studio.removeCombinedDef(def.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
