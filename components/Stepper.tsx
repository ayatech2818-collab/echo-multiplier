'use client';

import { Check, Download, LayoutTemplate, UploadCloud } from 'lucide-react';

export type StepNumber = 1 | 2 | 3;

const STEPS: { step: StepNumber; label: string; Icon: React.ElementType }[] = [
  { step: 1, label: 'Files', Icon: UploadCloud },
  { step: 2, label: 'Design', Icon: LayoutTemplate },
  { step: 3, label: 'Export', Icon: Download },
];

/** The three-step navigation. Steps unlock as their requirements are met. */
export default function Stepper({
  current,
  onChange,
  unlocked,
}: {
  current: StepNumber;
  onChange: (step: StepNumber) => void;
  unlocked: Record<StepNumber, boolean>;
}) {
  return (
    <nav aria-label="Steps" className="flex items-center gap-1 sm:gap-2">
      {STEPS.map(({ step, label, Icon }, i) => {
        const active = current === step;
        const done = step < current;
        const enabled = unlocked[step];
        return (
          <div key={step} className="flex items-center gap-1 sm:gap-2">
            {i > 0 && <span className="h-px w-3 bg-line-strong sm:w-6" aria-hidden="true" />}
            <button
              type="button"
              onClick={() => enabled && onChange(step)}
              disabled={!enabled}
              aria-current={active ? 'step' : undefined}
              title={enabled ? undefined : 'Finish the earlier step first'}
              className={`flex min-h-[44px] items-center gap-2 rounded-full px-2.5 text-sm font-medium transition-colors sm:px-3.5 ${
                active
                  ? 'bg-accent text-white shadow-soft'
                  : enabled
                  ? 'text-ink hover:bg-accent-soft'
                  : 'cursor-not-allowed text-faint'
              }`}
            >
              <span
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  active ? 'bg-white/25' : done ? 'bg-success text-white' : 'bg-page'
                }`}
              >
                {done ? <Check size={13} strokeWidth={3} /> : step}
              </span>
              <span className={active ? '' : 'hidden sm:inline'}>{label}</span>
              <Icon size={16} className="hidden md:block" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </nav>
  );
}
