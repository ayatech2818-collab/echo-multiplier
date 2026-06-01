'use client';

interface HeaderChipProps {
  header: string;
  onDragStart: (header: string) => void;
}

export default function HeaderChip({ header, onDragStart }: HeaderChipProps) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(header)}
      className="inline-flex items-center px-4 py-2 bg-[#0066cc] text-white rounded-full text-[15px] font-medium cursor-move select-none active:scale-95 transition-transform"
    >
      {header}
    </div>
  );
}
