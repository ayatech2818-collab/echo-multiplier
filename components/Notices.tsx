'use client';

import { useEffect } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { Notice, NoticeKind } from '@/types';

const TONES: Record<NoticeKind, { box: string; Icon: React.ElementType }> = {
  error: { box: 'border-danger/40 bg-danger-soft text-danger', Icon: AlertCircle },
  warning: { box: 'border-warn/40 bg-warn-soft text-warn', Icon: AlertTriangle },
  success: { box: 'border-success/40 bg-success-soft text-success', Icon: CheckCircle2 },
  info: { box: 'border-accent/30 bg-accent-soft text-accent', Icon: Info },
};

// Errors and warnings stay until dismissed; friendly messages fade on their own.
const AUTO_DISMISS_MS: Partial<Record<NoticeKind, number>> = { success: 7000, info: 6000 };

function NoticeItem({ notice, onDismiss }: { notice: Notice; onDismiss: (id: string) => void }) {
  const { box, Icon } = TONES[notice.kind];

  useEffect(() => {
    const ms = AUTO_DISMISS_MS[notice.kind];
    if (!ms) return;
    const timer = setTimeout(() => onDismiss(notice.id), ms);
    return () => clearTimeout(timer);
  }, [notice.id, notice.kind, onDismiss]);

  return (
    <div
      role={notice.kind === 'error' ? 'alert' : 'status'}
      className={`animate-slide-up pointer-events-auto flex items-start gap-2.5 rounded-xl border p-3 text-sm shadow-pop ${box}`}
    >
      <Icon size={18} strokeWidth={2} className="mt-0.5 flex-shrink-0" />
      <p className="min-w-0 flex-1 break-words text-ink">{notice.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(notice.id)}
        className="-m-1.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface/60"
        aria-label="Dismiss message"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export default function Notices({
  notices,
  onDismiss,
}: {
  notices: Notice[];
  onDismiss: (id: string) => void;
}) {
  if (notices.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-[60] mx-auto flex w-full max-w-md flex-col gap-2 px-4">
      {notices.map((n) => (
        <NoticeItem key={n.id} notice={n} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
