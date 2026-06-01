'use client';

import { useEffect } from 'react';

interface KeyboardShortcutsProps {
  onPreviewToggle: () => void;
  onExport: () => void;
  onDeleteSelected: () => void;
  canExport: boolean;
  hasSelection: boolean;
}

export default function KeyboardShortcuts({
  onPreviewToggle,
  onExport,
  onDeleteSelected,
  canExport,
  hasSelection,
}: KeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // P - Toggle Preview
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        onPreviewToggle();
      }

      // Cmd/Ctrl + E - Export
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        if (canExport) {
          onExport();
        }
      }

      // Delete/Backspace - Delete selected field
      if ((e.key === 'Delete' || e.key === 'Backspace') && hasSelection) {
        e.preventDefault();
        onDeleteSelected();
      }

      // Escape - Deselect
      if (e.key === 'Escape' && hasSelection) {
        e.preventDefault();
        onDeleteSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPreviewToggle, onExport, onDeleteSelected, canExport, hasSelection]);

  return null; // This component doesn't render anything
}
