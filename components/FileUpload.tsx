'use client';

import { Upload, CheckCircle2, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';

interface FileUploadProps {
  label: string;
  accept: string;
  onFileSelect: (file: File) => void | Promise<void>;
  disabled?: boolean;
  hint?: string;
  selectedFileName?: string | null;
}

export default function FileUpload({
  label,
  accept,
  onFileSelect,
  disabled,
  hint = 'Drag & drop or click to browse',
  selectedFileName,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingName, setProcessingName] = useState<string | null>(null);

  const select = async (file: File) => {
    setIsProcessing(true);
    setProcessingName(file.name);
    try {
      await onFileSelect(file);
    } finally {
      setIsProcessing(false);
      setProcessingName(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isProcessing) return;
    const file = e.dataTransfer.files[0];
    if (file) void select(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void select(file);
    // Allow re-selecting the same file later
    e.target.value = '';
  };

  const open = () => !disabled && !isProcessing && inputRef.current?.click();
  const loaded = !!selectedFileName && !isProcessing;
  const interactive = !disabled && !isProcessing;

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
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        if (interactive) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      className={`group relative flex min-h-[168px] flex-col items-center justify-center rounded-2xl border px-6 py-8 text-center transition-all ${
        disabled
          ? 'cursor-not-allowed border-line bg-surface opacity-50'
          : isProcessing
          ? 'cursor-wait border-accent/40 bg-accent-soft/40'
          : isDragging
          ? 'cursor-pointer border-accent bg-accent-soft ring-4 ring-accent/15'
          : loaded
          ? 'cursor-pointer border-success/50 bg-success-soft hover:shadow-soft'
          : 'cursor-pointer border-line bg-surface hover:border-accent/50 hover:shadow-soft'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        disabled={disabled || isProcessing}
      />

      <div
        className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
          isProcessing
            ? 'bg-accent/10 text-accent'
            : loaded
            ? 'bg-success/10 text-success'
            : 'bg-accent-soft text-accent'
        }`}
      >
        {isProcessing ? (
          <Loader2 size={22} strokeWidth={2.25} className="animate-spin" />
        ) : loaded ? (
          <CheckCircle2 size={22} strokeWidth={2} />
        ) : (
          <Upload size={22} strokeWidth={1.75} className="transition-transform group-hover:-translate-y-0.5" />
        )}
      </div>

      <p className="text-base font-semibold text-ink">{label}</p>

      {isProcessing ? (
        <>
          <p className="mt-1 max-w-full truncate text-sm font-medium text-accent" title={processingName ?? undefined}>
            Processing{processingName ? ` ${processingName}` : ''}…
          </p>
          <div className="mt-3 h-1.5 w-40 max-w-full overflow-hidden rounded-full bg-accent/15">
            <div className="animate-indeterminate h-full w-1/3 rounded-full bg-accent" />
          </div>
        </>
      ) : loaded ? (
        <>
          <p className="mt-1 max-w-full truncate text-sm font-medium text-success" title={selectedFileName ?? undefined}>
            {selectedFileName}
          </p>
          <p className="mt-1 text-xs text-faint">Click to replace</p>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted">{hint}</p>
      )}
    </div>
  );
}
