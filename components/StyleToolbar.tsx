'use client';

import { Bold, Italic, Type, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { CanvasField } from '@/types';

interface StyleToolbarProps {
  field: CanvasField;
  onUpdate: (updates: Partial<CanvasField>) => void;
  position: { x: number; y: number };
  scale?: number;
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

export default function StyleToolbar({ field, onUpdate, position, scale = 1 }: StyleToolbarProps) {
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

  return (
    <div
      className="absolute z-50 flex flex-wrap items-center gap-2 bg-white border border-[#e0e0e0] rounded-[12px] p-2 shadow-lg max-w-[500px]"
      style={{ left: position.x, top: position.y - 70 }}
    >
      {/* Font Family */}
      <div className="flex items-center gap-2 border-r border-[#e0e0e0] pr-2">
        <select
          value={field.fontFamily || 'Arial'}
          onChange={(e) => onUpdate({ fontFamily: e.target.value })}
          className="px-2 py-1 border border-[#e0e0e0] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0066cc] cursor-pointer"
          style={{ fontFamily: field.fontFamily || 'Arial' }}
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font} value={font} style={{ fontFamily: font }}>
              {font}
            </option>
          ))}
        </select>
      </div>

      {/* Bold/Italic */}
      <div className="flex items-center gap-1 border-r border-[#e0e0e0] pr-2">
        <button
          onClick={toggleBold}
          className={`p-2 rounded-lg transition-colors ${
            isBold ? 'bg-[#0066cc] text-white' : 'hover:bg-[#f5f5f7]'
          }`}
          title="Bold"
          type="button"
        >
          <Bold size={16} strokeWidth={2} />
        </button>
        <button
          onClick={toggleItalic}
          className={`p-2 rounded-lg transition-colors ${
            isItalic ? 'bg-[#0066cc] text-white' : 'hover:bg-[#f5f5f7]'
          }`}
          title="Italic"
          type="button"
        >
          <Italic size={16} strokeWidth={2} />
        </button>
      </div>

      {/* Text Alignment */}
      <div className="flex items-center gap-1 border-r border-[#e0e0e0] pr-2">
        <button
          onClick={() => onUpdate({ align: 'left' })}
          className={`p-2 rounded-lg transition-colors ${
            field.align === 'left' ? 'bg-[#0066cc] text-white' : 'hover:bg-[#f5f5f7]'
          }`}
          title="Align Left"
          type="button"
        >
          <AlignLeft size={16} strokeWidth={2} />
        </button>
        <button
          onClick={() => onUpdate({ align: 'center' })}
          className={`p-2 rounded-lg transition-colors ${
            (field.align === 'center' || !field.align) ? 'bg-[#0066cc] text-white' : 'hover:bg-[#f5f5f7]'
          }`}
          title="Align Center"
          type="button"
        >
          <AlignCenter size={16} strokeWidth={2} />
        </button>
        <button
          onClick={() => onUpdate({ align: 'right' })}
          className={`p-2 rounded-lg transition-colors ${
            field.align === 'right' ? 'bg-[#0066cc] text-white' : 'hover:bg-[#f5f5f7]'
          }`}
          title="Align Right"
          type="button"
        >
          <AlignRight size={16} strokeWidth={2} />
        </button>
      </div>

      {/* Font Size */}
      <div className="flex items-center gap-2 border-r border-[#e0e0e0] pr-2">
        <Type size={16} strokeWidth={2} className="text-[#86868b]" />
        <input
          type="number"
          value={field.fontSize}
          onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) || 12 })}
          className="w-16 px-2 py-1 border border-[#e0e0e0] rounded-lg text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
          min="8"
          max="200"
        />
      </div>

      {/* Color */}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={field.fill}
          onChange={(e) => onUpdate({ fill: e.target.value })}
          className="w-10 h-10 rounded-lg cursor-pointer border-2 border-[#e0e0e0] bg-white"
          title="Text Color"
          style={{ padding: '2px' }}
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
          className="w-24 px-2 py-1 border border-[#e0e0e0] rounded-lg text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
          placeholder="#000000"
          maxLength={7}
        />
      </div>
    </div>
  );
}
