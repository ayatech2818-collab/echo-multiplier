'use client';

import { useState, useRef } from 'react';
import { Eye, EyeOff, Trash2, Layers, UploadCloud, Tags, Pencil, Lightbulb, LayoutTemplate } from 'lucide-react';
import Konva from 'konva';
import { saveAs } from 'file-saver';
import FileUpload from '@/components/FileUpload';
import HeaderChip from '@/components/HeaderChip';
import CanvasWorkspace from '@/components/CanvasWorkspace';
import CombinedFieldBuilder from '@/components/CombinedFieldBuilder';
import ExportControls from '@/components/ExportControls';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import { CanvasField, CombinedFieldDef, ExcelRow, ExportBatchSize, OutputFormat } from '@/types';
import { parseCSV, parseExcel, loadTemplate } from '@/lib/fileParser';
import { exportBatch, downloadZip, exportSinglePDF } from '@/lib/exportUtils';
import { generateId, sanitizeFilename } from '@/lib/utils';

function SectionHeader({
  step,
  title,
  description,
  icon: Icon,
}: {
  step: number;
  title: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Icon size={20} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Step {step}</p>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
        <p className="text-sm text-muted">{description}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const [templateImage, setTemplateImage] = useState<HTMLImageElement | null>(null);
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [datasetName, setDatasetName] = useState<string | null>(null);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [canvasFields, setCanvasFields] = useState<CanvasField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('image');
  const [exportBatchSize, setExportBatchSize] = useState<ExportBatchSize>(100);
  const [filenameTemplate, setFilenameTemplate] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const [combinedFields, setCombinedFields] = useState<CombinedFieldDef[]>([]);

  const stageRef = useRef<Konva.Stage | null>(null);
  const textLayerRef = useRef<Konva.Layer | null>(null);

  const handleTemplateUpload = async (file: File) => {
    try {
      const img = await loadTemplate(file);
      setTemplateImage(img);
      setTemplateName(file.name);
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
      setDatasetName(file.name);
    } catch (error) {
      console.error('Failed to parse dataset:', error);
      alert('Failed to parse dataset. Please check the file format.');
    }
  };

  const handleAddCombinedField = (def: CombinedFieldDef) => {
    setCombinedFields([...combinedFields, def]);
  };

  const handleRemoveCombinedField = (id: string) => {
    setCombinedFields(combinedFields.filter((d) => d.id !== id));
  };

  // Tap/click path for placing a field (works on touch devices, unlike HTML5 drag-and-drop).
  // Places the field near the template center with a small cascade so repeated taps don't overlap.
  const handleAddField = (label: string, isStatic: boolean, combined?: CombinedFieldDef) => {
    if (!templateImage) {
      alert('Please upload a template first.');
      return;
    }

    const cascade = (canvasFields.length % 8) * 24;
    const position = {
      id: generateId(),
      x: templateImage.width / 2 + cascade,
      y: templateImage.height / 2 + cascade,
    };

    const newField: CanvasField = combined
      ? {
          ...position,
          headerName: combined.label,
          fontSize: combined.fontSize,
          fill: combined.fill,
          fontStyle: combined.fontStyle,
          fontFamily: combined.fontFamily,
          align: combined.align,
          isStatic: false,
          segments: combined.segments.map((s) => ({ ...s, id: generateId() })),
          width: combined.width,
        }
      : {
          ...position,
          headerName: label,
          fontSize: 24,
          fill: '#1d1d1f',
          fontStyle: 'normal',
          fontFamily: 'Arial',
          align: 'center',
          isStatic,
        };

    setCanvasFields([...canvasFields, newField]);
    setSelectedFieldId(newField.id);
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
      if (outputFormat === 'single-pdf') {
        // exportSinglePDF now returns an array of volumes (auto-split by page limit)
        const volumes = await exportSinglePDF(
          stageRef.current,
          textLayerRef.current,
          canvasFields,
          excelData,
          (current, total) => {
            setExportProgress({ current, total });
          }
        );

        const baseName = filenameTemplate.trim()
          ? sanitizeFilename(filenameTemplate) || 'documents'
          : 'echo-multiplier-documents';

        volumes.forEach(({ blob, startRecord, endRecord }, idx) => {
          const pdfName =
            volumes.length === 1
              ? `${baseName}.pdf`
              : `${baseName}-part-${String(idx + 1).padStart(2, '0')}-records-${startRecord}-${endRecord}.pdf`;
          saveAs(blob, pdfName);
        });
      } else {
        const batchSize = exportBatchSize === 'all' ? excelData.length : exportBatchSize;

        // exportBatch returns volumes per manual batch; within each manual batch
        // it auto-splits further if the ZIP exceeds the size limit.
        let totalVolumes: number | null = null; // unknown until all batches complete
        const allVolumes: { blob: Blob; startRecord: number; endRecord: number }[] = [];

        for (let startIndex = 0; startIndex < excelData.length; startIndex += batchSize) {
          const batchData = excelData.slice(startIndex, startIndex + batchSize);
          const volumes = await exportBatch(
            stageRef.current,
            textLayerRef.current,
            canvasFields,
            batchData,
            filenameTemplate,
            outputFormat,
            (current, total) => {
              setExportProgress({ current, total });
            },
            startIndex,
            excelData.length
          );
          allVolumes.push(...volumes);
        }

        totalVolumes = allVolumes.length;

        allVolumes.forEach(({ blob, startRecord, endRecord }, idx) => {
          const zipName =
            totalVolumes === 1
              ? 'echo-multiplier-documents.zip'
              : `echo-multiplier-documents-part-${String(idx + 1).padStart(2, '0')}-records-${startRecord}-${endRecord}.zip`;
          downloadZip(blob, zipName);
        });
      }
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
    <div className="min-h-screen bg-page">
      <KeyboardShortcuts
        onPreviewToggle={() => setPreviewMode(!previewMode)}
        onExport={handleExport}
        onDeleteSelected={handleDeleteSelected}
        canExport={!!canExport}
        hasSelection={!!selectedFieldId}
      />

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-line bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white shadow-soft">
            <Layers size={18} strokeWidth={2.25} />
          </div>
          <div className="min-w-0 leading-tight">
            <h1 className="text-base font-semibold tracking-tight text-ink">Echo Multiplier</h1>
            <p className="text-xs text-muted">Batch-generate documents from a template and your data</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
        {/* Upload Section */}
        <section className="mb-6 sm:mb-8">
          <div className="mb-4">
            <SectionHeader
              step={1}
              icon={UploadCloud}
              title="Upload files"
              description="Add a template image or PDF, plus your Excel or CSV dataset."
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 sm:gap-6">
            <FileUpload
              label="Template (Image / PDF)"
              hint="PNG, JPG, or PDF — drag & drop or click"
              accept="image/png,image/jpeg,image/jpg,application/pdf"
              onFileSelect={handleTemplateUpload}
              selectedFileName={templateName}
            />
            <FileUpload
              label="Dataset (Excel / CSV)"
              hint="XLSX, XLS, or CSV — drag & drop or click"
              accept=".xlsx,.xls,.csv"
              onFileSelect={handleDatasetUpload}
              selectedFileName={datasetName}
            />
          </div>
        </section>

        {/* PDF Info */}
        {!templateImage && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-line bg-surface p-4 shadow-soft sm:mb-8">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <Lightbulb size={18} strokeWidth={2} />
            </div>
            <p className="text-sm text-muted">
              <span className="font-medium text-ink">Tip:</span> You can upload PNG, JPG, or PDF files as templates.
              For PDFs, the first page is used. If a PDF fails to load, try exporting it as a PNG/JPG image instead.
            </p>
          </div>
        )}

        {/* Fields Section */}
        {(excelHeaders.length > 0 || templateImage) && (
          <section className="mb-6 rounded-2xl border border-line bg-surface p-4 shadow-soft sm:mb-8 sm:p-6">
            <div className="mb-4">
              <SectionHeader
                step={2}
                icon={Tags}
                title="Place fields"
                description="Tap to add to the template, or drag it onto the canvas, then drag to position."
              />
            </div>

            {excelHeaders.length > 0 && (
              <div className="flex flex-wrap gap-2.5">
                {excelHeaders.map((header) => (
                  <HeaderChip key={header} label={header} onAdd={handleAddField} />
                ))}
              </div>
            )}

            {/* Combined field builder — the single field-creation tool (works with or without a dataset) */}
            <div className={excelHeaders.length > 0 ? 'mt-6 border-t border-line pt-6' : ''}>
              <CombinedFieldBuilder
                headers={excelHeaders}
                sampleRow={excelData[0] || null}
                onAdd={handleAddCombinedField}
              />

              {/* Your created fields — tap to place */}
              {combinedFields.length > 0 && (
                <div className="mt-5 border-t border-line pt-4">
                  <p className="mb-2 text-xs font-medium text-faint">Your added fields — tap to place</p>
                  <div className="flex flex-wrap gap-2.5">
                    {combinedFields.map((def) => (
                      <HeaderChip
                        key={def.id}
                        label={def.label}
                        combined={def}
                        onAdd={handleAddField}
                        onRemove={() => handleRemoveCombinedField(def.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Canvas and Controls */}
        {templateImage && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px] sm:gap-6">
            {/* Canvas Workspace */}
            <section className="flex min-w-0 flex-col">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <SectionHeader
                  step={3}
                  icon={Pencil}
                  title="Edit & export"
                  description="Select a field to style it, fine-tune positions, then export."
                />
                <div className="flex items-center gap-2">
                  {selectedFieldId && (
                    <button
                      onClick={handleDeleteSelected}
                      className="flex h-10 items-center gap-2 rounded-full border border-danger/30 bg-surface px-4 text-sm font-medium text-danger transition-colors hover:bg-danger-soft"
                      title="Delete selected field (Delete key)"
                    >
                      <Trash2 size={18} strokeWidth={1.75} />
                      Delete
                    </button>
                  )}
                  <button
                    onClick={() => setPreviewMode(!previewMode)}
                    className={`flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-all ${
                      previewMode
                        ? 'bg-accent text-white shadow-soft'
                        : 'border border-line bg-surface text-ink hover:border-accent'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                    disabled={excelData.length === 0}
                    title="Toggle preview (P key)"
                  >
                    {previewMode ? (
                      <>
                        <Eye size={18} strokeWidth={1.75} />
                        Preview On
                      </>
                    ) : (
                      <>
                        <EyeOff size={18} strokeWidth={1.75} />
                        Preview Off
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex w-full justify-center overflow-x-auto rounded-2xl bg-page/60 p-3 sm:p-4">
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
              <div className="mt-4 hidden rounded-xl border border-line bg-surface p-4 shadow-soft sm:block">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">Keyboard Shortcuts</p>
                <div className="grid grid-cols-2 gap-2 text-sm text-muted md:grid-cols-4">
                  <div><kbd className="rounded bg-page px-2 py-1 font-medium text-ink">P</kbd> Toggle Preview</div>
                  <div><kbd className="rounded bg-page px-2 py-1 font-medium text-ink">⌘/Ctrl+E</kbd> Export</div>
                  <div><kbd className="rounded bg-page px-2 py-1 font-medium text-ink">Delete</kbd> Remove Field</div>
                  <div><kbd className="rounded bg-page px-2 py-1 font-medium text-ink">Esc</kbd> Deselect</div>
                </div>
              </div>
            </section>

            {/* Export Controls */}
            <aside className="xl:sticky xl:top-20 xl:self-start">
              <ExportControls
                filenameTemplate={filenameTemplate}
                onFilenameTemplateChange={setFilenameTemplate}
                outputFormat={outputFormat}
                onOutputFormatChange={setOutputFormat}
                exportBatchSize={exportBatchSize}
                onExportBatchSizeChange={setExportBatchSize}
                onExport={handleExport}
                disabled={!canExport}
                isExporting={isExporting}
                progress={exportProgress}
                headers={excelHeaders}
              />

              {/* Stats */}
              {excelData.length > 0 && (
                <div className="mt-5 rounded-2xl border border-line bg-surface p-4 shadow-soft sm:p-6">
                  <h3 className="mb-3 text-base font-semibold tracking-tight text-ink">Statistics</h3>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted">Total Records</span>
                      <span className="font-semibold tabular-nums text-ink">{excelData.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Fields Placed</span>
                      <span className="font-semibold tabular-nums text-ink">{canvasFields.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Output Format</span>
                      <span className="font-semibold uppercase text-ink">
                        {outputFormat === 'single-pdf' ? 'Single PDF' : outputFormat}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Records per ZIP</span>
                      <span className="font-semibold tabular-nums text-ink">
                        {outputFormat === 'single-pdf' ? 'N/A' : exportBatchSize === 'all' ? 'All' : exportBatchSize}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}

        {/* Empty State */}
        {!templateImage && (
          <div className="flex flex-col items-center py-16 text-center sm:py-24">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <LayoutTemplate size={30} strokeWidth={1.75} />
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-ink">Start by uploading a template</h2>
            <p className="mt-2 max-w-md text-sm text-muted">
              Upload a template image (or PDF) and a dataset above. Then drop your data fields onto the
              template and export a document for every row.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
