'use client';

import { Bold, Italic, Type, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { CanvasField } from '@/types';

interface StyleToolbarProps {
  field: CanvasField;
  onUpdate: (updates: Partial<CanvasField>) => void;
}

const FONT_FAMILIES = [
  'Arial',
  'Times New Roman',
  'Courier New',
  'Georgia',
  'Verdana',
  'Comic Sans MS',
  'Impact',
  'Trebuchet MS',
  'Palatino',
  'Garamond',
];

export default function StyleToolbar({ field, onUpdate }: StyleToolbarProps) {
  const isBold = field.fontStyle.includes('bold');
  const isItalic = field.fontStyle.includes('italic');

  const toggleBold = () => {
    if (isBold) {
      const newStyle = (isItalic ? 'italic' : 'normal') as CanvasField['fontStyle'];
      onUpdate({ fontStyle: newStyle });
    } else {
      const newStyle = (isItalic ? 'bold italic' : 'bold') as CanvasField['fontStyle'];
      onUpdate({ fontStyle: newStyle });
    }
  };

  const toggleItalic = () => {
    if (isItalic) {
      const newStyle = (isBold ? 'bold' : 'normal') as CanvasField['fontStyle'];
      onUpdate({ fontStyle: newStyle });
    } else {
      const newStyle = (isBold ? 'bold italic' : 'italic') as CanvasField['fontStyle'];
      onUpdate({ fontStyle: newStyle });
    }
  };

  const align = field.align || 'center';
  const alignOptions = [
    { value: 'left' as const, Icon: AlignLeft, label: 'Align left' },
    { value: 'center' as const, Icon: AlignCenter, label: 'Align center' },
    { value: 'right' as const, Icon: AlignRight, label: 'Align right' },
  ];

  return (
    <div className="mb-3 flex w-full flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-2 shadow-pop">
      {/* Font Family */}
      <select
        value={field.fontFamily || 'Arial'}
        onChange={(e) => onUpdate({ fontFamily: e.target.value })}
        className="h-9 cursor-pointer rounded-lg border border-line bg-surface px-2 text-sm text-ink transition-colors hover:border-line-strong"
        style={{ fontFamily: field.fontFamily || 'Arial' }}
        title="Font"
      >
        {FONT_FAMILIES.map((font) => (
          <option key={font} value={font} style={{ fontFamily: font }}>
            {font}
          </option>
        ))}
      </select>

      <div className="h-6 w-px bg-line" />

      {/* Bold/Italic */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleBold}
          className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
            isBold ? 'bg-accent text-white' : 'text-ink hover:bg-page'
          }`}
          title="Bold"
          aria-pressed={isBold}
          type="button"
        >
          <Bold size={16} strokeWidth={2.25} />
        </button>
        <button
          onClick={toggleItalic}
          className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
            isItalic ? 'bg-accent text-white' : 'text-ink hover:bg-page'
          }`}
          title="Italic"
          aria-pressed={isItalic}
          type="button"
        >
          <Italic size={16} strokeWidth={2.25} />
        </button>
      </div>

      <div className="h-6 w-px bg-line" />

      {/* Text Alignment (segmented control) */}
      <div className="flex items-center gap-0.5 rounded-lg bg-page p-0.5">
        {alignOptions.map(({ value, Icon, label }) => {
          const active = align === value;
          return (
            <button
              key={value}
              onClick={() => onUpdate({ align: value })}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-all ${
                active ? 'bg-surface text-accent shadow-sm' : 'text-muted hover:text-ink'
              }`}
              title={label}
              aria-label={label}
              aria-pressed={active}
              type="button"
            >
              <Icon size={16} strokeWidth={2} />
            </button>
          );
        })}
      </div>

      <div className="h-6 w-px bg-line" />

      {/* Font Size */}
      <div className="flex items-center gap-1.5">
        <Type size={16} strokeWidth={2} className="text-faint" />
        <input
          type="number"
          value={field.fontSize}
          onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) || 12 })}
          className="h-9 w-16 rounded-lg border border-line px-2 text-sm tabular-nums text-ink transition-colors hover:border-line-strong"
          min="8"
          max="200"
          title="Font size"
        />
      </div>

      <div className="h-6 w-px bg-line" />

      {/* Color */}
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={field.fill}
          onChange={(e) => onUpdate({ fill: e.target.value })}
          className="h-9 w-9 cursor-pointer rounded-lg border border-line bg-surface p-0.5"
          title="Text color"
        />
        <input
          type="text"
          value={field.fill}
          onChange={(e) => {
            const value = e.target.value;
            // Allow typing # and hex characters
            if (value.match(/^#[0-9A-Fa-f]{0,6}$/)) {
              onUpdate({ fill: value });
            }
          }}
          className="h-9 w-24 rounded-lg border border-line px-2 font-mono text-xs text-ink transition-colors hover:border-line-strong"
          placeholder="#000000"
          maxLength={7}
          title="Hex color"
        />
      </div>
    </div>
  );
}
