'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { safeStorage, THEME_STORAGE_KEY } from '@/lib/layoutIO';

export default function ThemeToggle() {
  // null until mounted: the real theme is set by the inline script in layout.tsx before paint.
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    // Reading the DOM class set by the pre-paint script keeps server and client markup identical.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    safeStorage.set(THEME_STORAGE_KEY, next ? 'dark' : 'light');
    setDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:border-accent hover:text-accent"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
    </button>
  );
}
