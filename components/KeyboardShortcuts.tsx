'use client';

import { useEffect, useRef } from 'react';
import type { Studio } from '@/lib/useStudio';

/** Keyboard shortcuts for the design step (and Ctrl+E to export). Renders nothing. */
export default function KeyboardShortcuts({ studio, step }: { studio: Studio; step: 1 | 2 | 3 }) {
  // Keep one listener for the page's lifetime and read the latest studio through a ref.
  const latest = useRef({ studio, step });
  useEffect(() => {
    latest.current = { studio, step };
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { studio: s, step: currentStep } = latest.current;
      const target = e.target as HTMLElement | null;

      // Don't hijack typing, dropdowns, or anything inside a dialog (e.g. the data table).
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable ||
        target?.closest('[role="dialog"]')
      ) {
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // Ctrl/Cmd + E: export
      if (mod && key === 'e') {
        e.preventDefault();
        if (currentStep === 3) void s.runExport();
        return;
      }

      if (currentStep !== 2) return;

      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
      } else if (mod && key === 'y') {
        e.preventDefault();
        s.redo();
      } else if (mod && key === 'd') {
        e.preventDefault();
        s.duplicateSelected();
      } else if (!mod && !e.altKey && key === 'p') {
        e.preventDefault();
        if (s.allRows.length > 0) s.setPreviewMode(!s.previewMode);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && s.selectedFieldId) {
        e.preventDefault();
        s.deleteSelected();
      } else if (e.key === 'Escape' && s.selectedFieldId) {
        e.preventDefault();
        s.setSelectedFieldId(null);
      } else if (s.selectedFieldId && e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step10 = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step10 : e.key === 'ArrowRight' ? step10 : 0;
        const dy = e.key === 'ArrowUp' ? -step10 : e.key === 'ArrowDown' ? step10 : 0;
        s.nudgeSelected(dx, dy);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return null;
}
