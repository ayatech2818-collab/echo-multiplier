'use client';

import { Upload, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';

interface FileUploadProps {
  label: string;
  accept: string;
  /** Called with every chosen/dropped file (one element unless `multiple`). */
  onFilesSelect: (files: File[]) => void | Promise<void>;
  multiple?: boolean;
  disabled?: boolean;
  hint?: string;
  /** Show a smaller drop zone (used once a card already lists files). */
  compact?: boolean;
}

/** A drag-and-drop / click-to-browse zone. Each card in Step 1 lists its own files below it. */
export default function FileUpload({
  label,
  accept,
  onFilesSelect,
  multiple = false,
  disabled,
  hint = 'Drag & drop or tap to browse',
  compact = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const select = async (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    setIsProcessing(true);
    try {
      await onFilesSelect(multiple ? files : files.slice(0, 1));
    } finally {
      setIsProcessing(false);
    }
  };

  const interactive = !disabled && !isProcessing;
  const open = () => interactive && inputRef.current?.click();

  return (
    <div
      role="button"
      tabIndex={interactive ? 0 : -1}
      aria-label={label}
      aria-busy={isProcessing}
      onClick={open}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && interactive) {
          e.preventDefault();
          open();
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (interactive) void select(e.dataTransfer.files);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (interactive) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      className={`group flex flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-all ${
        compact ? 'min-h-[88px] px-4 py-4' : 'min-h-[132px] px-4 py-6'
      } ${
        disabled
          ? 'cursor-not-allowed border-line opacity-50'
          : isProcessing
          ? 'cursor-wait border-accent/40 bg-accent-soft/40'
          : isDragging
          ? 'cursor-pointer border-accent bg-accent-soft'
          : 'cursor-pointer border-line-strong hover:border-accent/60 hover:bg-accent-soft/40'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          void select(e.target.files);
          // Allow re-selecting the same file later
          e.target.value = '';
        }}
        className="hidden"
        disabled={!interactive}
      />
      <div
        className={`mb-1.5 flex h-9 w-9 items-center justify-center rounded-full ${
          isProcessing ? 'bg-accent/10 text-accent' : 'bg-accent-soft text-accent'
        }`}
      >
        {isProcessing ? (
          <Loader2 size={18} strokeWidth={2.25} className="animate-spin" />
        ) : (
          <Upload size={18} strokeWidth={1.75} className="transition-transform group-hover:-translate-y-0.5" />
        )}
      </div>
      <p className="text-sm font-semibold text-ink">{isProcessing ? 'Working on it…' : label}</p>
      {!isProcessing && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}
