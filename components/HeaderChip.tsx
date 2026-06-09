'use client';

import { Plus, X } from 'lucide-react';
import { CombinedFieldDef } from '@/types';

// MIME type used to pass the chip payload through native HTML5 drag-and-drop (desktop).
export const FIELD_DND_TYPE = 'application/x-field';

export interface FieldDragPayload {
  content: string;
  isStatic: boolean;
  // When set, the chip places a combined ("sentence") field built from these segments + base style.
  combined?: CombinedFieldDef;
}

interface HeaderChipProps {
  label: string;
  isStatic?: boolean;
  combined?: CombinedFieldDef;
  onAdd: (label: string, isStatic: boolean, combined?: CombinedFieldDef) => void;
  onRemove?: () => void;
}

export default function HeaderChip({ label, isStatic = false, combined, onAdd, onRemove }: HeaderChipProps) {
  const handleDragStart = (e: React.DragEvent) => {
    const payload: FieldDragPayload = { content: label, isStatic, combined };
    e.dataTransfer.setData(FIELD_DND_TYPE, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const tone = combined
    ? 'bg-violet-600 text-white hover:bg-violet-700'
    : isStatic
    ? 'bg-success text-white hover:bg-success-hover'
    : 'bg-accent text-white hover:bg-accent-hover';

  return (
    <div
      draggable
      role="button"
      tabIndex={0}
      onDragStart={handleDragStart}
      onClick={() => onAdd(label, isStatic, combined)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onAdd(label, isStatic, combined);
        }
      }}
      title="Tap to add, or drag onto the template"
      className={`group inline-flex min-h-[44px] cursor-pointer select-none items-center gap-1.5 rounded-full pl-2.5 pr-3.5 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-soft active:scale-95 ${tone}`}
    >
      <Plus size={15} strokeWidth={2.5} className="opacity-80 transition-transform group-hover:rotate-90" />
      <span className="max-w-[220px] truncate">{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${label}`}
          title="Remove custom text"
          className="-mr-1.5 ml-0.5 flex h-6 w-6 items-center justify-center rounded-full transition-colors hover:bg-white/25"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
