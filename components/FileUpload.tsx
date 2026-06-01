'use client';

import { Upload } from 'lucide-react';
import { useRef } from 'react';

interface FileUploadProps {
  label: string;
  accept: string;
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export default function FileUpload({ label, accept, onFileSelect, disabled }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div
      className={`relative border border-[#e0e0e0] rounded-[18px] p-8 text-center transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[#0066cc]'
      }`}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />
      <Upload className="mx-auto mb-3 text-[#0066cc]" size={20} strokeWidth={1.5} />
      <p className="text-[17px] font-medium text-[#1d1d1f]">{label}</p>
      <p className="mt-1 text-[15px] text-[#86868b]">
        Drag & drop or click to browse
      </p>
    </div>
  );
}
