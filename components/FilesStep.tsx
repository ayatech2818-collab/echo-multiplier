'use client';

import { useState } from 'react';
import {
  ArrowRight,
  FileSpreadsheet,
  Image as ImageIcon,
  LayoutTemplate,
  Sparkles,
  Table2,
  Undo2,
  X,
} from 'lucide-react';
import FileUpload from './FileUpload';
import DataTableModal from './DataTableModal';
import type { Studio } from '@/lib/useStudio';

function Card({
  icon: Icon,
  title,
  hint,
  badge,
  children,
}: {
  icon: React.ElementType;
  title: string;
  hint: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-4 shadow-soft sm:p-5">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Icon size={20} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
            {badge && (
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">{badge}</span>
            )}
          </div>
          <p className="text-sm text-muted">{hint}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-danger-soft hover:text-danger"
      aria-label={label}
      title={label}
    >
      <X size={16} />
    </button>
  );
}

export default function FilesStep({ studio, onContinue }: { studio: Studio; onContinue: () => void }) {
  const [showData, setShowData] = useState(false);
  const { templates, activeTemplate, datasets, assets, allRows, excelHeaders } = studio;
  const ready = templates.length > 0;

  return (
    <div className="space-y-5">
      {/* Intro + sample */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-ink">1. Add your files</h1>
          <p className="text-sm text-muted">
            A <strong className="font-medium text-ink">template</strong> is the blank document (certificate, card, letter).{' '}
            <strong className="font-medium text-ink">Data</strong> has one row per document.{' '}
            <strong className="font-medium text-ink">Images</strong> are optional (logos, photos, signatures).
          </p>
        </div>
        {studio.sampleLoaded ? (
          <button
            type="button"
            onClick={studio.undoSample}
            className="flex min-h-[44px] flex-shrink-0 items-center justify-center gap-2 rounded-full border border-danger/40 bg-surface px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger-soft"
            title="Remove the sample and go back to what you had before"
          >
            <Undo2 size={16} />
            Undo sample files
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void studio.loadSample()}
            disabled={!!studio.busy}
            className="flex min-h-[44px] flex-shrink-0 items-center justify-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-4 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-white disabled:opacity-50"
          >
            <Sparkles size={16} />
            Try with sample files
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        {/* Templates */}
        <Card
          icon={LayoutTemplate}
          title="Templates"
          badge={templates.length > 0 ? String(templates.length) : undefined}
          hint="Image or PDF. Add several to export each one."
        >
          <FileUpload
            label={templates.length > 0 ? 'Add more templates' : 'Add templates'}
            hint="PNG, JPG or PDF"
            accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
            multiple
            compact={templates.length > 0}
            onFilesSelect={studio.addTemplates}
          />
          {templates.length > 0 && (
            <ul className="mt-3 space-y-2">
              {templates.map((t) => {
                const active = activeTemplate?.id === t.id;
                return (
                  <li
                    key={t.id}
                    className={`flex items-center gap-3 rounded-xl border p-2 transition-colors ${
                      active ? 'border-accent bg-accent-soft/50' : 'border-line'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => studio.setActiveTemplateId(t.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      aria-pressed={active}
                      title="Use this template in the design step"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={t.image.src}
                        alt=""
                        className="h-12 w-16 flex-shrink-0 rounded-md border border-line bg-white object-contain"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">{t.name}</span>
                        <span className="block text-xs text-muted">
                          {t.image.width}×{t.image.height}px{active ? ' · showing' : ''}
                        </span>
                      </span>
                    </button>
                    <RemoveButton label={`Remove ${t.name}`} onClick={() => studio.removeTemplate(t.id)} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Data */}
        <Card
          icon={FileSpreadsheet}
          title="Data"
          badge={allRows.length > 0 ? `${allRows.length} rows` : undefined}
          hint="Excel or CSV. Several files are combined."
        >
          <FileUpload
            label={datasets.length > 0 ? 'Add more data' : 'Add data files'}
            hint="XLSX, XLS or CSV"
            accept=".xlsx,.xls,.csv"
            multiple
            compact={datasets.length > 0}
            onFilesSelect={studio.addDatasets}
          />
          {datasets.length > 0 && (
            <>
              <ul className="mt-3 space-y-2">
                {datasets.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 rounded-xl border border-line p-2 pl-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{d.name}</p>
                      <p className="text-xs text-muted">
                        {d.rows.length} rows · {d.headers.length} columns
                      </p>
                    </div>
                    <RemoveButton label={`Remove ${d.name}`} onClick={() => studio.removeDataset(d.id)} />
                  </li>
                ))}
              </ul>
              <div className="mt-3 rounded-xl bg-page p-3 text-xs text-muted">
                <p className="mb-1.5 font-medium text-ink">Columns found</p>
                <div className="flex flex-wrap gap-1.5">
                  {excelHeaders.map((h) => (
                    <span key={h} className="rounded-full border border-line bg-surface px-2 py-0.5 text-ink">
                      {h}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowData(true)}
                className="mt-3 flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-line px-4 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
              >
                <Table2 size={16} />
                View data
              </button>
            </>
          )}
        </Card>

        {/* Images */}
        <Card
          icon={ImageIcon}
          title="Images"
          badge={assets.length > 0 ? String(assets.length) : undefined}
          hint="Optional. Logos, stamps, photos, or PDF pages."
        >
          <FileUpload
            label={assets.length > 0 ? 'Add more images' : 'Add images'}
            hint="Pictures or PDFs (each PDF page becomes a picture)"
            accept="image/*,application/pdf"
            multiple
            compact={assets.length > 0}
            onFilesSelect={studio.addImages}
          />
          {assets.length > 0 ? (
            <>
              <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3">
                {assets.map((a) => (
                  <li key={a.id} className="relative overflow-hidden rounded-xl border border-line bg-page">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.thumb} alt={a.name} className="aspect-square w-full object-contain" />
                    <p className="truncate px-1.5 py-1 text-[11px] text-muted" title={a.name}>
                      {a.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => studio.removeImage(a.id)}
                      className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-surface/90 text-muted shadow-sm hover:text-danger"
                      aria-label={`Remove ${a.name}`}
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">
                Tip: to give each document its own picture, put the image file names in a data column (like{' '}
                <code className="rounded bg-page px-1 text-ink">ana.png</code>).
              </p>
            </>
          ) : (
            <p className="mt-3 text-xs text-muted">Skip this if your documents only need text.</p>
          )}
        </Card>
      </div>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        {!ready && <p className="text-sm text-muted sm:mr-auto">Add at least one template to continue.</p>}
        <button
          type="button"
          onClick={onContinue}
          disabled={!ready}
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-accent px-6 text-base font-semibold text-white shadow-soft transition-all hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-faint disabled:shadow-none"
        >
          Continue to design
          <ArrowRight size={18} />
        </button>
      </div>

      {showData && <DataTableModal studio={studio} onClose={() => setShowData(false)} />}
    </div>
  );
}
