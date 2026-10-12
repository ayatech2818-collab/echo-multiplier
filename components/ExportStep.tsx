'use client';

import { useMemo, useRef } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Download,
  FileImage,
  FileStack,
  FileText,
  Loader2,
  X,
} from 'lucide-react';
import { ExportBatchSize, OutputFormat } from '@/types';
import { validateTemplate } from '@/lib/utils';
import { analyzeExport, ExportCheck } from '@/lib/checks';
import { autoNameValue, generateFilename, SHEET_SIZES, sheetGrid } from '@/lib/exportUtils';
import { sanitizeFilename } from '@/lib/utils';
import type { Studio } from '@/lib/useStudio';

const FORMATS: { value: OutputFormat; label: string; hint: string; Icon: React.ElementType }[] = [
  { value: 'image', label: 'JPG images', hint: 'One picture per document, zipped', Icon: FileImage },
  { value: 'pdf', label: 'PDF files', hint: 'One PDF per document, zipped', Icon: FileText },
  { value: 'single-pdf', label: 'One big PDF', hint: 'All documents in one PDF', Icon: FileStack },
];

const selectClass =
  'h-11 w-full cursor-pointer rounded-xl border border-line bg-surface px-3.5 text-ink transition-colors hover:border-line-strong';

export default function ExportStep({
  studio,
  onBack,
  onGoTo,
}: {
  studio: Studio;
  onBack: () => void;
  onGoTo: (step: 1 | 2) => void;
}) {
  const {
    templates,
    activeTemplate,
    activeRows,
    allRows,
    canvasFields,
    assets,
    excelHeaders,
    filenameTemplate,
    outputFormat,
    exportBatchSize,
    exportAllTemplates,
    perSheet,
    isExporting,
    exportProgress,
  } = studio;
  const inputRef = useRef<HTMLInputElement>(null);

  const templateCheck = useMemo(
    () => (filenameTemplate && excelHeaders.length > 0 ? validateTemplate(filenameTemplate, excelHeaders) : { valid: true, missingHeaders: [] as string[] }),
    [filenameTemplate, excelHeaders]
  );

  const checks: ExportCheck[] = useMemo(
    () => analyzeExport(canvasFields, activeRows, assets, filenameTemplate),
    [canvasFields, activeRows, assets, filenameTemplate]
  );
  const blockingErrors = checks.filter((c) => c.level === 'error');

  const requirements = [
    { ok: templates.length > 0, label: 'A template', fix: () => onGoTo(1) },
    { ok: activeRows.length > 0, label: 'Data with at least one row', fix: () => onGoTo(1) },
    { ok: canvasFields.length > 0, label: 'At least one field placed on the template', fix: () => onGoTo(2) },
  ];
  const ready = requirements.every((r) => r.ok) && templateCheck.valid && blockingErrors.length === 0;

  const templateCount = exportAllTemplates ? templates.length : 1;
  const totalDocs = activeRows.length * templateCount;
  const docW = activeTemplate?.image.width ?? 4;
  const docH = activeTemplate?.image.height ?? 3;
  const sheets = Math.max(1, Math.ceil(activeRows.length / perSheet));
  const rawBatch = exportBatchSize === 'all' ? Math.max(1, activeRows.length) : exportBatchSize;
  const sheetsPerZip = Math.max(1, Math.floor(rawBatch / perSheet));
  const filesPerTemplate = outputFormat === 'single-pdf' ? Math.max(1, Math.ceil(sheets / 200)) : Math.max(1, Math.ceil(sheets / sheetsPerZip));
  const totalFiles = filesPerTemplate * templateCount;

  const ext = outputFormat === 'image' ? 'jpg' : 'pdf';
  const exampleNames = useMemo(() => {
    if (outputFormat === 'single-pdf' || perSheet > 1) return [];
    return activeRows.slice(0, 3).map((row, i) => {
      const auto = sanitizeFilename(autoNameValue(canvasFields, row));
      return `${generateFilename(filenameTemplate, row, auto || `document-${i + 1}`)}.${ext}`;
    });
  }, [activeRows, canvasFields, filenameTemplate, outputFormat, perSheet, ext]);

  const insertColumn = (header: string) => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? filenameTemplate.length;
    const end = input?.selectionEnd ?? filenameTemplate.length;
    const next = `${filenameTemplate.slice(0, start)}{{${header}}}${filenameTemplate.slice(end)}`;
    studio.setFilenameTemplate(next);
    const pos = start + header.length + 4;
    setTimeout(() => {
      input?.focus();
      input?.setSelectionRange(pos, pos);
    }, 0);
  };

  const pct =
    exportProgress.total > 0 ? Math.min(100, Math.round((exportProgress.current / exportProgress.total) * 100)) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-ink">3. Export</h1>
        <p className="text-sm text-muted">Choose how you want your documents, then press Export. Everything happens on your device.</p>
      </div>

      {/* Checklist */}
      <section className="rounded-2xl border border-line bg-surface p-4 shadow-soft sm:p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">Before you export</h2>
        <ul className="space-y-1.5">
          {requirements.map((r) => (
            <li key={r.label} className="flex min-h-[36px] items-center gap-2.5 text-sm">
              {r.ok ? (
                <CheckCircle2 size={18} className="flex-shrink-0 text-success" />
              ) : (
                <Circle size={18} className="flex-shrink-0 text-faint" />
              )}
              <span className={r.ok ? 'text-ink' : 'text-muted'}>{r.label}</span>
              {!r.ok && (
                <button
                  type="button"
                  onClick={r.fix}
                  className="ml-auto min-h-[36px] rounded-full px-3 text-sm font-semibold text-accent hover:bg-accent-soft"
                >
                  Fix
                </button>
              )}
            </li>
          ))}
        </ul>

        {checks.length > 0 && (
          <ul className="mt-3 space-y-2 border-t border-line pt-3">
            {checks.map((c, i) => (
              <li
                key={i}
                className={`flex items-start gap-2.5 rounded-xl p-2.5 text-sm ${
                  c.level === 'error' ? 'bg-danger-soft text-danger' : 'bg-warn-soft text-warn'
                }`}
              >
                {c.level === 'error' ? (
                  <AlertCircle size={17} className="mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle size={17} className="mt-0.5 flex-shrink-0" />
                )}
                <span className="text-ink">{c.message}</span>
              </li>
            ))}
            {checks.some((c) => c.level === 'warning') && (
              <li className="px-1 text-xs text-muted">Warnings won&apos;t stop the export, but check them first.</li>
            )}
          </ul>
        )}
      </section>

      {/* Settings */}
      <section className="space-y-5 rounded-2xl border border-line bg-surface p-4 shadow-soft sm:p-5">
        {templates.length > 1 && (
          <div>
            <h2 className="mb-1.5 text-sm font-semibold text-ink">Which templates?</h2>
            <div role="group" aria-label="Which templates" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                { all: false, label: `Only “${activeTemplate?.name ?? 'current'}”`, hint: 'The one shown in Step 2' },
                { all: true, label: `All ${templates.length} templates`, hint: 'One set of files for each template' },
              ].map((opt) => (
                <button
                  key={String(opt.all)}
                  type="button"
                  onClick={() => studio.setExportAllTemplates(opt.all)}
                  aria-pressed={exportAllTemplates === opt.all}
                  className={`min-h-[56px] rounded-xl border px-3.5 py-2 text-left transition-colors ${
                    exportAllTemplates === opt.all ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong'
                  }`}
                >
                  <span className="block truncate text-sm font-medium text-ink">{opt.label}</span>
                  <span className="block text-xs text-muted">{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="mb-1.5 text-sm font-semibold text-ink">File type</h2>
          <div role="group" aria-label="File type" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {FORMATS.map(({ value, label, hint, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => studio.setOutputFormat(value)}
                aria-pressed={outputFormat === value}
                className={`flex min-h-[56px] items-center gap-3 rounded-xl border px-3.5 py-2 text-left transition-colors sm:flex-col sm:items-start sm:gap-1 ${
                  outputFormat === value ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong'
                }`}
              >
                <Icon size={20} className={outputFormat === value ? 'text-accent' : 'text-muted'} />
                <span>
                  <span className="block text-sm font-medium text-ink">{label}</span>
                  <span className="block text-xs text-muted">{hint}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-1 text-sm font-semibold text-ink">Documents per page</h2>
          <p className="mb-2 text-xs text-muted">
            Put several documents on one page to save paper (e.g. 4 small certificates on one sheet). Thin lines show where to cut.
          </p>
          <div role="group" aria-label="Documents per page" className="grid grid-cols-5 gap-2">
            {SHEET_SIZES.map((n) => {
              const { cols, rows } = sheetGrid(n, docW, docH);
              const active = perSheet === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => studio.setPerSheet(n)}
                  aria-pressed={active}
                  aria-label={n === 1 ? 'One document per page' : `${n} documents per page`}
                  className={`flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border px-1 py-2 transition-colors ${
                    active ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="grid gap-[2px] rounded-[3px] border border-line-strong bg-surface p-[2px]"
                    style={{
                      gridTemplateColumns: `repeat(${cols}, 1fr)`,
                      width: cols * (docW >= docH ? 14 : 10) + 6,
                    }}
                  >
                    {Array.from({ length: cols * rows }).map((_, i) => (
                      <span
                        key={i}
                        className={`rounded-[1px] ${active ? 'bg-accent' : 'bg-faint'}`}
                        style={{ aspectRatio: `${docW} / ${docH}` }}
                      />
                    ))}
                  </span>
                  <span className="text-xs font-semibold text-ink">{n === 1 ? '1' : `${n} in 1`}</span>
                </button>
              );
            })}
          </div>
        </div>

        {outputFormat !== 'single-pdf' && (
          <div>
            <label htmlFor="batch" className="mb-1.5 block text-sm font-semibold text-ink">
              Documents per ZIP file
            </label>
            <select
              id="batch"
              value={exportBatchSize}
              onChange={(e) =>
                studio.setExportBatchSize(e.target.value === 'all' ? 'all' : (Number(e.target.value) as ExportBatchSize))
              }
              className={selectClass}
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="250">250</option>
              <option value="500">500</option>
              <option value="all">All in one ZIP</option>
            </select>
            <p className="mt-1.5 text-xs text-muted">Smaller ZIPs are safer on phones and easier to retry.</p>
          </div>
        )}

        <div>
          <label htmlFor="fname" className="mb-1.5 block text-sm font-semibold text-ink">
            {outputFormat === 'single-pdf' ? 'File name' : 'File names'}
          </label>
          <div className="flex gap-2">
            <input
              id="fname"
              ref={inputRef}
              type="text"
              value={filenameTemplate}
              onChange={(e) => studio.setFilenameTemplate(e.target.value)}
              placeholder={outputFormat === 'single-pdf' ? 'Optional name for the PDF' : 'Optional, e.g. {{Name}} - certificate'}
              className={`h-11 min-w-0 flex-1 rounded-xl border px-3.5 text-ink ${
                templateCheck.valid ? 'border-line hover:border-line-strong' : 'border-danger'
              }`}
              aria-invalid={!templateCheck.valid}
            />
            {excelHeaders.length > 0 && outputFormat !== 'single-pdf' && (
              <select
                aria-label="Insert a column into the file name"
                value=""
                onChange={(e) => e.target.value && insertColumn(e.target.value)}
                className="h-11 w-[44%] max-w-[190px] cursor-pointer rounded-xl border border-line bg-surface px-2 text-ink sm:w-auto"
              >
                <option value="">+ Insert column</option>
                {excelHeaders.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            )}
          </div>
          {!templateCheck.valid && (
            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-danger">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              These columns don&apos;t exist: {templateCheck.missingHeaders.join(', ')}
            </p>
          )}
          {exampleNames.length > 0 && (
            <p className="mt-1.5 break-words text-xs text-muted">
              Example: {exampleNames.join(', ')}
              {activeRows.length > 3 ? ', …' : ''}
            </p>
          )}
          <p className="mt-1 text-xs text-muted">
            {outputFormat === 'single-pdf'
              ? 'Leave empty for a default name.'
              : perSheet > 1
              ? 'With several documents per page, each file is named sheet-001, sheet-002, … with the record numbers it contains.'
              : 'Leave empty to name each file after the first data field you placed.'}
          </p>
        </div>
      </section>

      {/* Summary + action */}
      <section className="rounded-2xl border border-line bg-surface p-4 shadow-soft sm:p-5">
        <p className="text-sm text-muted">Summary</p>
        <p className="mt-0.5 text-base font-semibold text-ink">
          {ready || totalDocs > 0
            ? `${activeRows.length.toLocaleString()} document${activeRows.length === 1 ? '' : 's'}${
                templateCount > 1 ? ` × ${templateCount} templates` : ''
              }${perSheet > 1 ? ` → ${(sheets * templateCount).toLocaleString()} page${sheets * templateCount === 1 ? '' : 's'} (${perSheet} per page)` : ''} → ${totalFiles} ${outputFormat === 'single-pdf' ? 'PDF' : 'ZIP'} file${totalFiles === 1 ? '' : 's'}`
            : 'Nothing to export yet'}
        </p>
        {allRows.length > activeRows.length && (
          <p className="mt-0.5 text-xs text-muted">{allRows.length - activeRows.length} row(s) left out in the data table.</p>
        )}

        {isExporting && (
          <div className="mt-4" aria-live="polite">
            <div className="mb-1.5 flex justify-between text-xs font-medium text-muted">
              <span>Exporting… keep this tab open</span>
              <span className="tabular-nums">
                {exportProgress.current} / {exportProgress.total}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-page">
              <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onBack}
            disabled={isExporting}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 font-medium text-ink hover:border-accent disabled:opacity-50"
          >
            <ArrowLeft size={18} /> Back to design
          </button>
          <div className="flex flex-1 gap-3 sm:justify-end">
            {isExporting && (
              <button
                type="button"
                onClick={studio.cancelExport}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-danger/40 px-5 font-medium text-danger hover:bg-danger-soft"
              >
                <X size={18} /> Cancel
              </button>
            )}
            <button
              type="button"
              onClick={() => void studio.runExport()}
              disabled={!ready || isExporting}
              className={`flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full px-6 text-base font-semibold text-white transition-all sm:flex-none ${
                !ready || isExporting ? 'cursor-not-allowed bg-faint' : 'bg-accent shadow-soft hover:bg-accent-hover active:scale-[0.98]'
              }`}
            >
              {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              {isExporting ? `Exporting ${pct}%` : 'Export all documents'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
