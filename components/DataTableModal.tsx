'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Studio } from '@/lib/useStudio';

const ROW_H = 44;
const COL_W = 168;
const CHECK_W = 64;
const OVERSCAN = 6;

/**
 * Browse the loaded rows, search them, and untick rows to leave out of the export.
 * Only the rows in view are rendered, so tens of thousands of rows stay smooth.
 */
export default function DataTableModal({ studio, onClose }: { studio: Studio; onClose: () => void }) {
  const { allRows, excelHeaders, excluded } = studio;
  const [query, setQuery] = useState('');
  const [scrollTop, setScrollTop] = useState(0);
  const [viewH, setViewH] = useState(400);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Original row indexes that match the search.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = allRows.map((_, i) => i);
    if (!q) return all;
    return all.filter((i) => excelHeaders.some((h) => String(allRows[i][h] ?? '').toLowerCase().includes(q)));
  }, [allRows, excelHeaders, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setViewH(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const end = Math.min(visible.length, Math.ceil((scrollTop + viewH) / ROW_H) + OVERSCAN);
  const slice = visible.slice(start, end);
  const totalW = CHECK_W + excelHeaders.length * COL_W;
  const includedCount = allRows.length - excluded.size;
  const allVisibleIncluded = visible.length > 0 && visible.every((i) => !excluded.has(i));

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Data table"
        onClick={(e) => e.stopPropagation()}
        className="flex h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-pop sm:h-[80dvh] sm:rounded-2xl"
      >
        <div className="flex items-center gap-3 border-b border-line p-3 sm:p-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-ink">Your data</h2>
            <p className="text-xs text-muted">
              {includedCount} of {allRows.length} rows will be exported. Untick a row to leave it out.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-page hover:text-ink"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3 sm:px-4">
          <div className="relative min-w-[180px] flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setScrollTop(0);
                if (scrollRef.current) scrollRef.current.scrollTop = 0;
              }}
              placeholder="Search rows…"
              className="h-11 w-full rounded-xl border border-line pl-9 pr-3 text-ink"
            />
          </div>
          <button
            type="button"
            onClick={() => studio.setRowsExcluded(visible, allVisibleIncluded)}
            className="min-h-[44px] rounded-full border border-line px-4 text-sm font-medium text-ink hover:border-accent hover:text-accent"
          >
            {allVisibleIncluded ? `Leave out ${query ? 'matching' : 'all'} rows` : `Include ${query ? 'matching' : 'all'} rows`}
          </button>
        </div>

        <div
          ref={scrollRef}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
          className="thin-scroll relative min-h-0 flex-1 overflow-auto"
        >
          <div style={{ width: totalW, minWidth: '100%' }}>
            {/* Header */}
            <div
              className="sticky top-0 z-10 flex border-b border-line bg-page text-xs font-semibold uppercase tracking-wide text-muted"
              style={{ height: ROW_H, width: totalW }}
            >
              <div className="flex items-center justify-center" style={{ width: CHECK_W }}>
                Use
              </div>
              {excelHeaders.map((h) => (
                <div key={h} className="flex items-center truncate px-3" style={{ width: COL_W }} title={h}>
                  <span className="truncate">{h}</span>
                </div>
              ))}
            </div>

            {visible.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted">No rows match “{query}”.</p>
            ) : (
              <div style={{ height: visible.length * ROW_H, position: 'relative', width: totalW }}>
                {slice.map((rowIndex, k) => {
                  const row = allRows[rowIndex];
                  const off = excluded.has(rowIndex);
                  return (
                    <div
                      key={rowIndex}
                      className={`absolute left-0 flex border-b border-line text-sm ${off ? 'bg-page text-faint line-through' : 'text-ink'}`}
                      style={{ top: (start + k) * ROW_H, height: ROW_H, width: totalW }}
                    >
                      <label
                        className="flex cursor-pointer items-center justify-center"
                        style={{ width: CHECK_W }}
                        title={off ? 'Include this row' : 'Leave this row out'}
                      >
                        <input
                          type="checkbox"
                          checked={!off}
                          onChange={() => studio.toggleRowExcluded(rowIndex)}
                          className="h-5 w-5 cursor-pointer accent-[rgb(var(--c-accent))]"
                          aria-label={`Row ${rowIndex + 1}`}
                        />
                      </label>
                      {excelHeaders.map((h) => (
                        <div key={h} className="flex items-center truncate px-3" style={{ width: COL_W }}>
                          <span className="truncate">{String(row[h] ?? '')}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
