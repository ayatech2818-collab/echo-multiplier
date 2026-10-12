'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  FolderOpen,
  History,
  LayoutTemplate,
  Magnet,
  MoreHorizontal,
  Plus,
  Redo2,
  Save,
  SlidersHorizontal,
  Table2,
  Trash2,
  Undo2,
} from 'lucide-react';
import CanvasWorkspace from './CanvasWorkspace';
import Palette from './Palette';
import PropertiesPanel from './PropertiesPanel';
import DataTableModal from './DataTableModal';
import type { Studio } from '@/lib/useStudio';

const iconBtn =
  'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink';

/** On phones/tablets: a bottom sheet. From `lg` up: a normal side column. */
function Panel({
  open,
  onClose,
  title,
  children,
  className = '',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/40 xl:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        aria-label={title}
        className={`fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[78dvh] max-w-xl xl:mx-0 xl:max-w-none overflow-y-auto rounded-t-2xl border-t border-line bg-surface px-4 pb-safe pt-3 shadow-pop transition-transform duration-200 thin-scroll ${
          open ? 'visible translate-y-0' : 'invisible translate-y-full'
        } xl:visible xl:sticky xl:top-20 xl:max-h-[calc(100dvh-110px)] xl:translate-y-0 xl:rounded-2xl xl:border xl:p-4 xl:shadow-soft ${className}`}
      >
        <div className="mb-3 flex items-center justify-between xl:hidden">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-full px-4 text-sm font-semibold text-accent hover:bg-accent-soft"
          >
            Done
          </button>
        </div>
        {children}
      </aside>
    </>
  );
}

function LayoutMenu({ studio, onShowData }: { studio: Studio; onShowData: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const item =
    'flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm text-ink hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={iconBtn}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
        title="More actions"
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-line bg-surface p-1.5 shadow-pop">
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() => {
              onShowData();
              setOpen(false);
            }}
            disabled={studio.allRows.length === 0}
          >
            <Table2 size={16} /> View data &amp; leave rows out
          </button>
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() => {
              studio.saveLayoutFile();
              setOpen(false);
            }}
            disabled={studio.canvasFields.length === 0}
          >
            <Save size={16} /> Save layout to a file
          </button>
          <button type="button" role="menuitem" className={item} onClick={() => fileRef.current?.click()}>
            <FolderOpen size={16} /> Open a saved layout
          </button>
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() => {
              studio.restoreAutosave();
              setOpen(false);
            }}
            disabled={!studio.savedLayoutAvailable}
          >
            <History size={16} /> Restore my last layout
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void studio.loadLayoutFile(file);
              e.target.value = '';
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function DesignStep({
  studio,
  onBack,
  onContinue,
}: {
  studio: Studio;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [propsOpen, setPropsOpen] = useState(false);
  const [segmentId, setSegmentId] = useState<string | null>(null);
  const [showData, setShowData] = useState(false);
  const { activeTemplate, templates, canvasFields, selectedFieldId, previewMode, activeRows } = studio;

  if (!activeTemplate) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-line bg-surface px-6 py-16 text-center shadow-soft">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <LayoutTemplate size={30} strokeWidth={1.75} />
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-ink">Add a template to start designing</h2>
        <p className="mt-2 max-w-md text-sm text-muted">
          The template is the blank document your fields are placed on. Add one in Step 1 (or try the sample files).
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-5 flex min-h-[48px] items-center gap-2 rounded-full bg-accent px-6 font-semibold text-white hover:bg-accent-hover"
        >
          <ArrowLeft size={18} /> Go to Step 1
        </button>
      </div>
    );
  }

  const hasData = activeRows.length > 0;
  const selected = !!selectedFieldId;

  return (
    <div className="pb-24 xl:pb-0">
      <div className="mb-4">
        <h1 className="text-lg font-semibold tracking-tight text-ink">2. Design your document</h1>
        <p className="text-sm text-muted">
          Add fields from the left, drag them into place, and style them on the right. Turn on{' '}
          <strong className="font-medium text-ink">Preview</strong> to see real data.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px] xl:items-start">
        {/* Left: what to add */}
        <Panel open={paletteOpen} onClose={() => setPaletteOpen(false)} title="Add to template">
          <Palette studio={studio} onPlaced={() => setPaletteOpen(false)} />
        </Panel>

        {/* Center: canvas */}
        <section className="min-w-0">
          {/* Toolbar */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {templates.length > 1 && (
              <select
                value={activeTemplate.id}
                onChange={(e) => studio.setActiveTemplateId(e.target.value)}
                className="h-11 max-w-[200px] cursor-pointer rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink"
                aria-label="Template shown"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
            <button type="button" className={iconBtn} onClick={studio.undo} disabled={!studio.canUndo} aria-label="Undo" title="Undo (Ctrl+Z)">
              <Undo2 size={18} />
            </button>
            <button type="button" className={iconBtn} onClick={studio.redo} disabled={!studio.canRedo} aria-label="Redo" title="Redo (Ctrl+Y)">
              <Redo2 size={18} />
            </button>
            <button
              type="button"
              className={iconBtn}
              onClick={studio.duplicateSelected}
              disabled={!selected}
              aria-label="Duplicate field"
              title="Duplicate (Ctrl+D)"
            >
              <Copy size={18} />
            </button>
            <button
              type="button"
              className={`${iconBtn} hover:!border-danger hover:!text-danger`}
              onClick={studio.deleteSelected}
              disabled={!selected}
              aria-label="Delete field"
              title="Delete (Delete key)"
            >
              <Trash2 size={18} />
            </button>
            <button
              type="button"
              onClick={() => studio.setSnapEnabled(!studio.snapEnabled)}
              aria-pressed={studio.snapEnabled}
              aria-label="Snap to guides"
              title="Snap to center and other fields"
              className={`${iconBtn} ${studio.snapEnabled ? '!border-accent !bg-accent-soft !text-accent' : ''}`}
            >
              <Magnet size={18} />
            </button>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => studio.setPreviewMode(!previewMode)}
                disabled={!hasData}
                aria-pressed={previewMode}
                title={hasData ? 'Show real data (P)' : 'Add data in Step 1 to preview'}
                className={`flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                  previewMode ? 'bg-accent text-white shadow-soft' : 'border border-line bg-surface text-ink hover:border-accent'
                }`}
              >
                {previewMode ? <Eye size={18} /> : <EyeOff size={18} />}
                <span className="hidden sm:inline">{previewMode ? 'Preview on' : 'Preview off'}</span>
                <span className="sm:hidden">Preview</span>
              </button>
              <LayoutMenu studio={studio} onShowData={() => setShowData(true)} />
            </div>
          </div>

          {previewMode && hasData && (
            <div className="mb-3 flex items-center justify-center gap-2">
              <button
                type="button"
                className={iconBtn}
                onClick={() => studio.stepPreview(-1)}
                disabled={studio.previewIndex <= 0}
                aria-label="Previous row"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="min-w-[120px] text-center text-sm font-medium tabular-nums text-ink" aria-live="polite">
                Row {studio.previewIndex + 1} of {activeRows.length}
              </span>
              <button
                type="button"
                className={iconBtn}
                onClick={() => studio.stepPreview(1)}
                disabled={studio.previewIndex >= activeRows.length - 1}
                aria-label="Next row"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          <CanvasWorkspace studio={studio} />

          {canvasFields.length === 0 && (
            <p className="mt-3 rounded-xl border border-dashed border-line-strong bg-surface p-3 text-center text-sm text-muted">
              <strong className="font-medium text-ink">Nothing placed yet.</strong> Use{' '}
              <span className="xl:hidden">the “Add” button below</span>
              <span className="hidden xl:inline">the panel on the left</span> to put a field on your template.
            </p>
          )}

          <p className="mt-3 hidden text-xs text-muted xl:block">
            Shortcuts: <kbd className="rounded bg-page px-1.5 py-0.5 text-ink">P</kbd> preview ·{' '}
            <kbd className="rounded bg-page px-1.5 py-0.5 text-ink">Arrows</kbd> nudge ·{' '}
            <kbd className="rounded bg-page px-1.5 py-0.5 text-ink">Ctrl+Z</kbd> undo ·{' '}
            <kbd className="rounded bg-page px-1.5 py-0.5 text-ink">Ctrl+D</kbd> duplicate ·{' '}
            <kbd className="rounded bg-page px-1.5 py-0.5 text-ink">Del</kbd> remove ·{' '}
            <kbd className="rounded bg-page px-1.5 py-0.5 text-ink">Esc</kbd> deselect
          </p>

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onBack}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 font-medium text-ink hover:border-accent"
            >
              <ArrowLeft size={18} /> Back
            </button>
            <button
              type="button"
              onClick={onContinue}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-accent px-6 text-base font-semibold text-white shadow-soft transition-all hover:bg-accent-hover active:scale-[0.98]"
            >
              Continue to export <ArrowRight size={18} />
            </button>
          </div>
        </section>

        {/* Right: properties */}
        <Panel open={propsOpen} onClose={() => setPropsOpen(false)} title="Style">
          <PropertiesPanel studio={studio} selectedSegmentId={segmentId} onSelectSegment={setSegmentId} />
        </Panel>
      </div>

      {/* Phone / tablet action bar */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 pt-2.5 backdrop-blur xl:hidden">
        <div className="mx-auto flex max-w-md gap-3">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full bg-accent font-semibold text-white shadow-soft active:scale-[0.98]"
          >
            <Plus size={18} /> Add
          </button>
          <button
            type="button"
            onClick={() => setPropsOpen(true)}
            className={`relative flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full border font-semibold active:scale-[0.98] ${
              selected ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-ink'
            }`}
          >
            <SlidersHorizontal size={18} /> Style
            {selected && <span className="absolute right-4 top-3 h-2 w-2 rounded-full bg-accent" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {showData && <DataTableModal studio={studio} onClose={() => setShowData(false)} />}
    </div>
  );
}
