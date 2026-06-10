'use client';

import { Download, FileImage, FileText, AlertCircle, Plus } from 'lucide-react';
import { ExportBatchSize, OutputFormat } from '@/types';
import { validateTemplate } from '@/lib/utils';
import { useMemo, useState, useRef, useEffect } from 'react';

interface ExportControlsProps {
  filenameTemplate: string;
  onFilenameTemplateChange: (template: string) => void;
  outputFormat: OutputFormat;
  onOutputFormatChange: (format: OutputFormat) => void;
  exportBatchSize: ExportBatchSize;
  onExportBatchSizeChange: (size: ExportBatchSize) => void;
  onExport: () => void;
  disabled: boolean;
  isExporting: boolean;
  progress?: { current: number; total: number };
  headers: string[];
}

export default function ExportControls({
  filenameTemplate,
  onFilenameTemplateChange,
  outputFormat,
  onOutputFormatChange,
  exportBatchSize,
  onExportBatchSizeChange,
  onExport,
  disabled,
  isExporting,
  progress,
  headers,
}: ExportControlsProps) {
  const [showHeaderDropdown, setShowHeaderDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const templateValidation = useMemo(() => {
    if (!filenameTemplate || headers.length === 0) {
      return { valid: true, missingHeaders: [] };
    }
    return validateTemplate(filenameTemplate, headers);
  }, [filenameTemplate, headers]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowHeaderDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const insertHeader = (header: string) => {
    const input = inputRef.current;
    if (!input) return;

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const text = filenameTemplate;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newText = `${before}{{${header}}}${after}`;
    
    onFilenameTemplateChange(newText);
    setShowHeaderDropdown(false);
    
    // Set cursor position after inserted text
    setTimeout(() => {
      const newPosition = start + header.length + 4; // 4 for {{}}
      input.setSelectionRange(newPosition, newPosition);
      input.focus();
    }, 0);
  };

  const handleBatchSizeChange = (value: string) => {
    onExportBatchSizeChange(value === 'all' ? 'all' : Number(value) as ExportBatchSize);
  };

  const progressPct =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : 0;

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft sm:p-6">
      <h3 className="mb-4 text-lg font-semibold tracking-tight text-ink">Export Settings</h3>

      <div className="space-y-5">
        <div className="relative" ref={dropdownRef}>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Filename Template
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={filenameTemplate}
              onChange={(e) => onFilenameTemplateChange(e.target.value)}
              placeholder="Optional: select a field for custom names"
              className={`w-full rounded-xl border bg-surface px-3.5 py-2.5 pr-10 text-sm text-ink transition-colors ${
                !templateValidation.valid
                  ? 'border-danger'
                  : 'border-line hover:border-line-strong'
              }`}
            />
            {headers.length > 0 && (
              <button
                onClick={() => setShowHeaderDropdown(!showHeaderDropdown)}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-accent transition-colors hover:bg-accent-soft"
                title="Insert field"
                type="button"
              >
                <Plus size={18} />
              </button>
            )}
          </div>

          {showHeaderDropdown && headers.length > 0 && (
            <div className="absolute z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-line bg-surface shadow-pop">
              <div className="p-2">
                <p className="px-2 py-1 text-xs font-medium text-faint">
                  Click to insert field:
                </p>
                {headers.map((header) => (
                  <button
                    key={header}
                    onClick={() => insertHeader(header)}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-accent-soft"
                    type="button"
                  >
                    {header}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="mt-1.5 text-xs text-muted">
            Leave empty to name each file after a field you placed on the template (e.g. each row&apos;s
            value), or click the + button to build a custom name.
          </p>
          {!templateValidation.valid && (
            <div className="mt-2 flex items-start gap-2 text-xs text-danger">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>
                Missing headers: {templateValidation.missingHeaders.join(', ')}
              </span>
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Output Format
          </label>
          <div className="flex gap-1 rounded-xl border border-line bg-page p-1">
            <button
              onClick={() => onOutputFormatChange('image')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                outputFormat === 'image'
                  ? 'bg-surface text-accent shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
              type="button"
            >
              <FileImage size={18} strokeWidth={1.75} />
              PNG
            </button>
            <button
              onClick={() => onOutputFormatChange('pdf')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                outputFormat === 'pdf'
                  ? 'bg-surface text-accent shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
              type="button"
            >
              <FileText size={18} strokeWidth={1.75} />
              PDF
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Records per ZIP
          </label>
          <select
            value={exportBatchSize}
            onChange={(e) => handleBatchSizeChange(e.target.value)}
            className="w-full cursor-pointer rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink transition-colors hover:border-line-strong"
          >
            <option value="50">50 records</option>
            <option value="100">100 records</option>
            <option value="250">250 records</option>
            <option value="500">500 records</option>
            <option value="all">All records in one ZIP</option>
          </select>
          <p className="mt-1.5 text-xs text-muted">
            Smaller batches are safer for large files and easier to retry.
          </p>
        </div>

        {isExporting && (
          <div aria-live="polite">
            <div className="mb-1.5 flex justify-between text-xs font-medium text-muted">
              <span>Exporting…</span>
              <span className="tabular-nums">
                {progress?.current || 0} / {progress?.total || 0}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-page">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={onExport}
          disabled={disabled || isExporting || !templateValidation.valid}
          className={`flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-semibold text-white transition-all ${
            disabled || isExporting || !templateValidation.valid
              ? 'cursor-not-allowed bg-faint'
              : 'bg-accent shadow-soft hover:bg-accent-hover active:scale-[0.98]'
          }`}
          type="button"
        >
          <Download size={18} strokeWidth={2} />
          {isExporting ? (
            <span>Exporting {progressPct}%…</span>
          ) : (
            <span>Export All Documents</span>
          )}
        </button>
      </div>
    </div>
  );
}
