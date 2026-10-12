'use client';

import { useEffect, useState } from 'react';
import { Layers, Loader2 } from 'lucide-react';
import { useStudio } from '@/lib/useStudio';
import Stepper, { StepNumber } from '@/components/Stepper';
import ThemeToggle from '@/components/ThemeToggle';
import Notices from '@/components/Notices';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import FilesStep from '@/components/FilesStep';
import DesignStep from '@/components/DesignStep';
import ExportStep from '@/components/ExportStep';

export default function Home() {
  const studio = useStudio();
  const [step, setStep] = useState<StepNumber>(1);

  const hasTemplate = studio.templates.length > 0;
  const unlocked: Record<StepNumber, boolean> = { 1: true, 2: hasTemplate, 3: hasTemplate };

  // If the template is removed while on a later step, fall back to Step 1.
  const effectiveStep: StepNumber = unlocked[step] ? step : 1;

  const go = (next: StepNumber) => {
    setStep(next);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Warn before closing the tab mid-export or with unsaved work in progress.
  useEffect(() => {
    if (!studio.isExporting) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [studio.isExporting]);

  return (
    <div className="min-h-screen bg-page">
      <KeyboardShortcuts studio={studio} step={effectiveStep} />
      <Notices notices={studio.notices} onDismiss={studio.dismissNotice} />

      {/* Top navigation */}
      <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] items-center gap-2 px-3 py-2 sm:gap-3 sm:px-6">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-accent text-white shadow-soft">
            <Layers size={18} strokeWidth={2.25} />
          </div>
          <div className="hidden min-w-0 leading-tight md:block">
            <h1 className="text-base font-semibold tracking-tight text-ink">Echo Multiplier</h1>
            <p className="truncate text-xs text-muted">Make a document for every row of your data</p>
          </div>
          <div className="flex min-w-0 flex-1 justify-center">
            <Stepper current={effectiveStep} onChange={go} unlocked={unlocked} />
          </div>
          <ThemeToggle />
        </div>
      </header>

      {studio.busy && (
        <div
          role="status"
          className="fixed inset-x-0 top-16 z-[55] mx-auto flex w-fit items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm text-ink shadow-pop"
        >
          <Loader2 size={16} className="animate-spin text-accent" />
          {studio.busy}
        </div>
      )}

      <main className="mx-auto max-w-[1500px] px-3 py-5 sm:px-6 sm:py-8">
        {effectiveStep === 1 && <FilesStep studio={studio} onContinue={() => go(2)} />}
        {effectiveStep === 2 && <DesignStep studio={studio} onBack={() => go(1)} onContinue={() => go(3)} />}
        {effectiveStep === 3 && (
          <ExportStep studio={studio} onBack={() => go(2)} onGoTo={(s) => go(s)} />
        )}
      </main>
    </div>
  );
}
