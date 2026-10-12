'use client';

import { Plus, X } from 'lucide-react';
import type { FieldSpec } from '@/lib/useStudio';

// MIME type used to pass the chip payload through native HTML5 drag-and-drop (desktop).
export const FIELD_DND_TYPE = 'application/x-field';

export interface FieldDragPayload {
  spec: FieldSpec;
}

interface HeaderChipProps {
  label: string;
  spec: FieldSpec;
  tone?: 'column' | 'combined';
  onAdd: (spec: FieldSpec) => void;
  onRemove?: () => void;
}

export default function HeaderChip({ label, spec, tone = 'column', onAdd, onRemove }: HeaderChipProps) {
  const handleDragStart = (e: React.DragEvent) => {
    const payload: FieldDragPayload = { spec };
    e.dataTransfer.setData(FIELD_DND_TYPE, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const toneClass =
    tone === 'combined'
      ? 'bg-violet text-white hover:bg-violet-hover'
      : 'bg-accent text-white hover:bg-accent-hover';

  return (
    <div
      draggable
      role="button"
      tabIndex={0}
      onDragStart={handleDragStart}
      onClick={() => onAdd(spec)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onAdd(spec);
        }
      }}
      title="Tap to add, or drag onto the template"
      className={`group inline-flex min-h-[44px] max-w-full cursor-pointer select-none items-center gap-1.5 rounded-full pl-2.5 pr-3.5 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-soft active:scale-95 ${toneClass}`}
    >
      <Plus size={15} strokeWidth={2.5} className="flex-shrink-0 opacity-80 transition-transform group-hover:rotate-90" />
      <span className="max-w-[200px] truncate">{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${label}`}
          title="Remove custom text"
          className="-mr-1.5 ml-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/25"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
