'use client';

import { Download, FileImage, FileText, AlertCircle, Plus } from 'lucide-react';
import { ExportBatchSize, OutputFormat } from '@/types';
import { validateTemplate } from '@/lib/utils';
import { useMemo, useState, useRef, useEffect } from 'react';

interface ExportControlsProps {
  filenameTemplate: string;
  onFilenameTemplateChange: (template: string) => void;
  outputFormat: OutputFormat;
  onOutputFormatChange: (format: OutputFormat) => void;
  exportBatchSize: ExportBatchSize;
  onExportBatchSizeChange: (size: ExportBatchSize) => void;
  onExport: () => void;
  disabled: boolean;
  isExporting: boolean;
  progress?: { current: number; total: number };
  headers: string[];
}

export default function ExportControls({
  filenameTemplate,
  onFilenameTemplateChange,
  outputFormat,
  onOutputFormatChange,
  exportBatchSize,
  onExportBatchSizeChange,
  onExport,
  disabled,
  isExporting,
  progress,
  headers,
}: ExportControlsProps) {
  const [showHeaderDropdown, setShowHeaderDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const templateValidation = useMemo(() => {
    if (!filenameTemplate || headers.length === 0) {
      return { valid: true, missingHeaders: [] };
    }
    return validateTemplate(filenameTemplate, headers);
  }, [filenameTemplate, headers]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowHeaderDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const insertHeader = (header: string) => {
    const input = inputRef.current;
    if (!input) return;

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const text = filenameTemplate;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newText = `${before}{{${header}}}${after}`;
    
    onFilenameTemplateChange(newText);
    setShowHeaderDropdown(false);
    
    // Set cursor position after inserted text
    setTimeout(() => {
      const newPosition = start + header.length + 4; // 4 for {{}}
      input.setSelectionRange(newPosition, newPosition);
      input.focus();
    }, 0);
  };

  const handleBatchSizeChange = (value: string) => {
    onExportBatchSizeChange(value === 'all' ? 'all' : Number(value) as ExportBatchSize);
  };

  return (
    <div className="border border-[#e0e0e0] rounded-[18px] p-6 bg-white">
      <h3 className="text-[19px] font-semibold mb-4 tracking-[-0.02em]">Export Settings</h3>

      <div className="space-y-4">
        <div className="relative" ref={dropdownRef}>
          <label className="block text-[15px] font-medium mb-2 text-[#1d1d1f]">
            Filename Template
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={filenameTemplate}
              onChange={(e) => onFilenameTemplateChange(e.target.value)}
              placeholder="Optional: select a field for custom names"
              className={`w-full px-4 py-2 pr-10 border rounded-[12px] text-[15px] focus:outline-none focus:ring-2 ${
                !templateValidation.valid
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-[#e0e0e0] focus:ring-[#0066cc]'
              }`}
            />
            {headers.length > 0 && (
              <button
                onClick={() => setShowHeaderDropdown(!showHeaderDropdown)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-[#f5f5f7] rounded-lg transition-colors"
                title="Insert field"
                type="button"
              >
                <Plus size={18} className="text-[#0066cc]" />
              </button>
            )}
          </div>
          
          {showHeaderDropdown && headers.length > 0 && (
            <div className="absolute z-50 mt-2 w-full bg-white border border-[#e0e0e0] rounded-[12px] shadow-lg max-h-60 overflow-y-auto">
              <div className="p-2">
                <p className="text-[13px] text-[#86868b] px-2 py-1 font-medium">
                  Click to insert field:
                </p>
                {headers.map((header) => (
                  <button
                    key={header}
                    onClick={() => insertHeader(header)}
                    className="w-full text-left px-3 py-2 text-[15px] hover:bg-[#f5f5f7] rounded-lg transition-colors"
                    type="button"
                  >
                    {header}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <p className="mt-1 text-[13px] text-[#86868b]">
            Leave empty for automatic names, or click the + button to select fields.
          </p>
          {!templateValidation.valid && (
            <div className="mt-2 flex items-start gap-2 text-[13px] text-red-600">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>
                Missing headers: {templateValidation.missingHeaders.join(', ')}
              </span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-[15px] font-medium mb-2 text-[#1d1d1f]">
            Output Format
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => onOutputFormatChange('image')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-[12px] border transition-all ${
                outputFormat === 'image'
                  ? 'bg-[#0066cc] text-white border-[#0066cc]'
                  : 'bg-white text-[#1d1d1f] border-[#e0e0e0] hover:border-[#0066cc]'
              }`}
              type="button"
            >
              <FileImage size={18} strokeWidth={1.5} />
              <span className="text-[15px] font-medium">PNG</span>
            </button>
            <button
              onClick={() => onOutputFormatChange('pdf')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-[12px] border transition-all ${
                outputFormat === 'pdf'
                  ? 'bg-[#0066cc] text-white border-[#0066cc]'
                  : 'bg-white text-[#1d1d1f] border-[#e0e0e0] hover:border-[#0066cc]'
              }`}
              type="button"
            >
              <FileText size={18} strokeWidth={1.5} />
              <span className="text-[15px] font-medium">PDF</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[15px] font-medium mb-2 text-[#1d1d1f]">
            Records per ZIP
          </label>
          <select
            value={exportBatchSize}
            onChange={(e) => handleBatchSizeChange(e.target.value)}
            className="w-full px-4 py-2 border border-[#e0e0e0] rounded-[12px] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0066cc] bg-white cursor-pointer"
          >
            <option value="50">50 records</option>
            <option value="100">100 records</option>
            <option value="250">250 records</option>
            <option value="500">500 records</option>
            <option value="all">All records in one ZIP</option>
          </select>
          <p className="mt-1 text-[13px] text-[#86868b]">
            Smaller batches are safer for large files and easier to retry.
          </p>
        </div>

        <button
          onClick={onExport}
          disabled={disabled || isExporting || !templateValidation.valid}
          className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full text-white font-medium transition-transform ${
            disabled || isExporting || !templateValidation.valid
              ? 'bg-[#86868b] cursor-not-allowed'
              : 'bg-[#0066cc] active:scale-95'
          }`}
          type="button"
        >
          <Download size={18} strokeWidth={1.5} />
          {isExporting ? (
            <span>
              Exporting {progress?.current || 0} / {progress?.total || 0}...
            </span>
          ) : (
            <span>Export All Documents</span>
          )}
        </button>
      </div>
    </div>
  );
}
