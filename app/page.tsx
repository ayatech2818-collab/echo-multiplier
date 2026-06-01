'use client';

import { useState, useRef } from 'react';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import Konva from 'konva';
import FileUpload from '@/components/FileUpload';
import HeaderChip from '@/components/HeaderChip';
import CanvasWorkspace from '@/components/CanvasWorkspace';
import ExportControls from '@/components/ExportControls';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import { CanvasField, ExcelRow, OutputFormat } from '@/types';
import { parseCSV, parseExcel, loadTemplate } from '@/lib/fileParser';
import { exportBatch, downloadZip } from '@/lib/exportUtils';

export default function Home() {
  const [templateImage, setTemplateImage] = useState<HTMLImageElement | null>(null);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [canvasFields, setCanvasFields] = useState<CanvasField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('image');
  const [filenameTemplate, setFilenameTemplate] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });

  const stageRef = useRef<Konva.Stage | null>(null);
  const textLayerRef = useRef<Konva.Layer | null>(null);

  const handleTemplateUpload = async (file: File) => {
    try {
      const img = await loadTemplate(file);
      setTemplateImage(img);
    } catch (error) {
      console.error('Failed to load template:', error);
      const errorMessage = (error as Error).message;
      
      if (file.type === 'application/pdf') {
        alert(
          'Failed to load PDF template.\n\n' +
          'Possible reasons:\n' +
          '• PDF may be password-protected (remove password and try again)\n' +
          '• PDF may be corrupted\n' +
          '• PDF may use unsupported features\n\n' +
          'Try:\n' +
          '• Export PDF as PNG/JPG from your PDF viewer\n' +
          '• Use a different PDF file\n' +
          '• Check browser console for details\n\n' +
          `Error: ${errorMessage}`
        );
      } else {
        alert('Failed to load template. Please try again with a valid image or PDF file.');
      }
    }
  };

  const handleDatasetUpload = async (file: File) => {
    try {
      const isCSV = file.name.endsWith('.csv');
      const result = isCSV ? await parseCSV(file) : await parseExcel(file);
      setExcelHeaders(result.headers);
      setExcelData(result.data);
    } catch (error) {
      console.error('Failed to parse dataset:', error);
      alert('Failed to parse dataset. Please check the file format.');
    }
  };

  const handleDeleteSelected = () => {
    if (selectedFieldId) {
      setCanvasFields(canvasFields.filter((f) => f.id !== selectedFieldId));
      setSelectedFieldId(null);
    }
  };

  const handleExport = async () => {
    if (!stageRef.current || !textLayerRef.current || excelData.length === 0) {
      alert('Please upload both template and dataset, and place at least one field.');
      return;
    }

    setIsExporting(true);
    setExportProgress({ current: 0, total: excelData.length });

    try {
      const zipBlob = await exportBatch(
        stageRef.current,
        textLayerRef.current,
        canvasFields,
        excelData,
        filenameTemplate,
        outputFormat,
        (current, total) => {
          setExportProgress({ current, total });
        }
      );

      downloadZip(zipBlob, 'echo-multiplier-documents.zip');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
      setExportProgress({ current: 0, total: 0 });
    }
  };

  const canExport = templateImage && excelData.length > 0 && canvasFields.length > 0;

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <KeyboardShortcuts
        onPreviewToggle={() => setPreviewMode(!previewMode)}
        onExport={handleExport}
        onDeleteSelected={handleDeleteSelected}
        canExport={!!canExport}
        hasSelection={!!selectedFieldId}
      />

      {/* Top Navigation */}
      <nav className="bg-[#000000] text-white px-6 py-4">
        <div className="max-w-[1400px] mx-auto">
          <h1 className="text-[21px] font-semibold tracking-[-0.02em]">
            Echo-Multiplier
          </h1>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Upload Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <FileUpload
            label="Upload Template (Image/PDF)"
            accept="image/png,image/jpeg,image/jpg,application/pdf"
            onFileSelect={handleTemplateUpload}
          />
          <FileUpload
            label="Upload Dataset (Excel/CSV)"
            accept=".xlsx,.xls,.csv"
            onFileSelect={handleDatasetUpload}
          />
        </section>

        {/* PDF Info */}
        {!templateImage && (
          <div className="mb-8 p-4 bg-white border border-[#e0e0e0] rounded-[12px]">
            <p className="text-[15px] text-[#86868b]">
              <strong className="text-[#1d1d1f]">💡 Tip:</strong> You can upload PNG, JPG, or PDF files as templates. 
              For PDFs, the first page will be used. If a PDF fails to load, try exporting it as a PNG/JPG image instead.
            </p>
          </div>
        )}

        {/* Headers Section */}
        {excelHeaders.length > 0 && (
          <section className="mb-8 border border-[#e0e0e0] rounded-[18px] p-6 bg-white">
            <h2 className="text-[19px] font-semibold mb-4 tracking-[-0.02em]">
              Available Fields
            </h2>
            <p className="text-[15px] text-[#86868b] mb-4">
              Drag and drop fields onto the template to position them
            </p>
            <div className="flex flex-wrap gap-3">
              {excelHeaders.map((header) => (
                <HeaderChip
                  key={header}
                  header={header}
                  onDragStart={() => {}}
                />
              ))}
            </div>
          </section>
        )}

        {/* Canvas and Controls */}
        {templateImage && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
            {/* Canvas Workspace */}
            <section className="flex flex-col min-w-0">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-[19px] font-semibold tracking-[-0.02em]">
                  Template Editor
                </h2>
                <div className="flex items-center gap-2">
                  {selectedFieldId && (
                    <button
                      onClick={handleDeleteSelected}
                      className="flex items-center gap-2 px-4 py-2 rounded-full font-medium text-[15px] bg-white text-red-600 border border-red-600 hover:bg-red-50 transition-colors"
                      title="Delete selected field (Delete key)"
                    >
                      <Trash2 size={18} strokeWidth={1.5} />
                      Delete
                    </button>
                  )}
                  <button
                    onClick={() => setPreviewMode(!previewMode)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-[15px] transition-all ${
                      previewMode
                        ? 'bg-[#0066cc] text-white'
                        : 'bg-white text-[#1d1d1f] border border-[#e0e0e0]'
                    }`}
                    disabled={excelData.length === 0}
                    title="Toggle preview (P key)"
                  >
                    {previewMode ? (
                      <>
                        <Eye size={18} strokeWidth={1.5} />
                        Preview On
                      </>
                    ) : (
                      <>
                        <EyeOff size={18} strokeWidth={1.5} />
                        Preview Off
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-center w-full overflow-x-auto">
                <CanvasWorkspace
                  templateImage={templateImage}
                  canvasFields={canvasFields}
                  onFieldsUpdate={setCanvasFields}
                  selectedFieldId={selectedFieldId}
                  onFieldSelect={setSelectedFieldId}
                  previewMode={previewMode}
                  previewData={excelData[0] || null}
                  onStageRef={(stage) => (stageRef.current = stage)}
                  onTextLayerRef={(layer) => (textLayerRef.current = layer)}
                />
              </div>

              {/* Keyboard Shortcuts Help */}
              <div className="mt-4 p-4 bg-white border border-[#e0e0e0] rounded-[12px]">
                <p className="text-[13px] text-[#86868b] font-medium mb-2">Keyboard Shortcuts:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[13px] text-[#86868b]">
                  <div><kbd className="px-2 py-1 bg-[#f5f5f7] rounded">P</kbd> Toggle Preview</div>
                  <div><kbd className="px-2 py-1 bg-[#f5f5f7] rounded">⌘/Ctrl+E</kbd> Export</div>
                  <div><kbd className="px-2 py-1 bg-[#f5f5f7] rounded">Delete</kbd> Remove Field</div>
                  <div><kbd className="px-2 py-1 bg-[#f5f5f7] rounded">Esc</kbd> Deselect</div>
                </div>
              </div>
            </section>

            {/* Export Controls */}
            <aside className="xl:sticky xl:top-6 xl:self-start">
              <ExportControls
                filenameTemplate={filenameTemplate}
                onFilenameTemplateChange={setFilenameTemplate}
                outputFormat={outputFormat}
                onOutputFormatChange={setOutputFormat}
                onExport={handleExport}
                disabled={!canExport}
                isExporting={isExporting}
                progress={exportProgress}
                headers={excelHeaders}
              />

              {/* Stats */}
              {excelData.length > 0 && (
                <div className="mt-6 border border-[#e0e0e0] rounded-[18px] p-6 bg-white">
                  <h3 className="text-[17px] font-semibold mb-3 tracking-[-0.02em]">
                    Statistics
                  </h3>
                  <div className="space-y-2 text-[15px]">
                    <div className="flex justify-between">
                      <span className="text-[#86868b]">Total Records:</span>
                      <span className="font-medium">{excelData.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#86868b]">Fields Placed:</span>
                      <span className="font-medium">{canvasFields.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#86868b]">Output Format:</span>
                      <span className="font-medium uppercase">{outputFormat}</span>
                    </div>
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}

        {/* Empty State */}
        {!templateImage && (
          <div className="text-center py-20">
            <p className="text-[19px] text-[#86868b]">
              Upload a template image and dataset to get started
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
