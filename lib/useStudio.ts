'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import {
  CanvasField,
  CombinedFieldDef,
  DatasetItem,
  ExcelRow,
  ExportBatchSize,
  ImageAsset,
  Notice,
  NoticeKind,
  OutputFormat,
  TemplateItem,
} from '@/types';
import {
  loadTemplatePages,
  mergeDatasets,
  parseCSV,
  parseExcel,
  validateUpload,
} from './fileParser';
import {
  buildAssetIndex,
  createAssetFromFile,
  createAssetsFromPdf,
  findAsset,
  releaseAsset,
  ROW_INDEX_KEY,
  MAX_PDF_IMAGE_PAGES,
} from './assets';
import {
  defaultMediaBox,
  downloadZip,
  ExportCancelledError,
  ExportJob,
  ExportStats,
  exportBatch,
  exportSinglePDF,
} from './exportUtils';
import { generateId, sanitizeFilename } from './utils';
import {
  loadLayoutFromStorage,
  parseLayout,
  saveLayoutToStorage,
  serializeLayout,
} from './layoutIO';
import { makeSampleAssets, makeSampleCertificate, sampleRows, SAMPLE_HEADERS } from './sample';
import { DEFAULT_CODE_COLOR } from './mediaField';

/** What to place on the canvas. Used by tap-to-add and by drag-and-drop from the palette. */
export type FieldSpec =
  | { type: 'column'; header: string }
  | { type: 'static'; text: string }
  | { type: 'combined'; def: CombinedFieldDef }
  | { type: 'media'; kind: 'image' | 'qr' | 'barcode'; column?: string; group?: string; assetKey?: string; text?: string };

const HISTORY_LIMIT = 100;
const COALESCE_MS = 800;

interface History {
  past: CanvasField[][];
  present: CanvasField[];
  future: CanvasField[][];
}

const emptyHistory: History = { past: [], present: [], future: [] };

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

export const buildField = (
  spec: FieldSpec,
  pos: { x: number; y: number } | null,
  template: { width: number; height: number },
  assets: ImageAsset[],
  existingCount: number
): CanvasField => {
  const cascade = (existingCount % 8) * 24;
  const center = { x: template.width / 2 + cascade, y: template.height / 2 + cascade };
  const id = generateId();
  const textBase = {
    fontSize: 24,
    fill: '#1d1d1f',
    fontStyle: 'normal' as const,
    fontFamily: 'Arial',
    align: 'center' as const,
  };

  if (spec.type === 'column') {
    return { id, headerName: spec.header, ...(pos ?? center), ...textBase, isStatic: false };
  }
  if (spec.type === 'static') {
    return { id, headerName: spec.text, ...(pos ?? center), ...textBase, isStatic: true };
  }
  if (spec.type === 'combined') {
    const d = spec.def;
    return {
      id,
      headerName: d.label,
      ...(pos ?? center),
      fontSize: d.fontSize,
      fill: d.fill,
      fontStyle: d.fontStyle,
      fontFamily: d.fontFamily,
      align: d.align,
      isStatic: false,
      segments: d.segments.map((s) => ({ ...s, id: generateId() })),
      width: d.width,
    };
  }

  // Media: image / QR / barcode. Anchored by their top-left corner.
  const asset = spec.kind === 'image' && spec.assetKey ? findAsset(buildAssetIndex(assets), spec.assetKey) : null;
  const box = defaultMediaBox(
    spec.kind,
    template.width,
    template.height,
    asset ? { w: asset.image.width, h: asset.image.height } : undefined
  );
  const at = pos ?? { x: center.x - box.width / 2, y: center.y - box.height / 2 };
  const label =
    spec.kind === 'image'
      ? asset?.name ?? spec.group ?? spec.column ?? 'Image'
      : `${spec.kind === 'qr' ? 'QR' : 'Barcode'}: ${spec.column ?? spec.text ?? ''}`;
  return {
    id,
    headerName: label,
    x: Math.round(at.x),
    y: Math.round(at.y),
    fontSize: 24,
    fill: DEFAULT_CODE_COLOR,
    fontStyle: 'normal',
    kind: spec.kind,
    width: box.width,
    height: box.height,
    imageSrc: spec.kind === 'image' && !spec.column ? spec.assetKey : undefined,
    imageColumn: spec.column,
    imageGroup: spec.group,
    codeText: spec.kind !== 'image' && !spec.column ? spec.text ?? '' : undefined,
    fit: 'contain',
    shape: 'rect',
    borderWidth: 0,
    borderColor: '#000000',
    opacity: 1,
    lockRatio: true,
  };
};

export function useStudio() {
  // ---- files ----
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [assets, setAssets] = useState<ImageAsset[]>([]);
  const [excluded, setExcluded] = useState<Set<number>>(() => new Set());

  // ---- design ----
  const [hist, setHist] = useState<History>(emptyHistory);
  const histRef = useRef<History>(emptyHistory);
  const coalesceRef = useRef<{ key: string; at: number } | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [combinedFields, setCombinedFields] = useState<CombinedFieldDef[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [snapEnabled, setSnapEnabled] = useState(true);

  // ---- export settings ----
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('image');
  const [exportBatchSize, setExportBatchSize] = useState<ExportBatchSize>(100);
  const [filenameTemplate, setFilenameTemplate] = useState('');
  const [exportAllTemplates, setExportAllTemplates] = useState(false);
  const [perSheet, setPerSheet] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const abortRef = useRef<AbortController | null>(null);

  // ---- ui ----
  const [notices, setNotices] = useState<Notice[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [savedLayoutAvailable, setSavedLayoutAvailable] = useState(false);
  const autosaveReady = useRef(false);

  const canvasFields = hist.present;

  // ---------------- notices ----------------
  const notify = useCallback((kind: NoticeKind, message: string) => {
    setNotices((prev) => [...prev.slice(-3), { id: generateId(), kind, message }]);
  }, []);
  const dismissNotice = useCallback((id: string) => {
    setNotices((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // ---------------- fields + history ----------------
  const commit = useCallback((next: History) => {
    histRef.current = next;
    setHist(next);
  }, []);

  /** Replace the field list. Pass `coalesce` to merge rapid edits (sliders, typing) into one undo step. */
  const setFields = useCallback(
    (next: CanvasField[] | ((prev: CanvasField[]) => CanvasField[]), opts?: { coalesce?: string }) => {
      const h = histRef.current;
      const value = typeof next === 'function' ? next(h.present) : next;
      if (value === h.present) return;
      const now = Date.now();
      const last = coalesceRef.current;
      const merge = !!opts?.coalesce && !!last && last.key === opts.coalesce && now - last.at < COALESCE_MS;
      coalesceRef.current = opts?.coalesce ? { key: opts.coalesce, at: now } : null;
      commit({
        past: merge ? h.past : [...h.past, h.present].slice(-HISTORY_LIMIT),
        present: value,
        future: [],
      });
    },
    [commit]
  );

  const updateField = useCallback(
    (id: string, patch: Partial<CanvasField>) => {
      setFields(
        (prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)),
        { coalesce: `${id}:${Object.keys(patch).sort().join(',')}` }
      );
    },
    [setFields]
  );

  const undo = useCallback(() => {
    const h = histRef.current;
    if (h.past.length === 0) return;
    coalesceRef.current = null;
    commit({ past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] });
  }, [commit]);

  const redo = useCallback(() => {
    const h = histRef.current;
    if (h.future.length === 0) return;
    coalesceRef.current = null;
    commit({ past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) });
  }, [commit]);

  // Drop the selection if its field disappeared (delete, undo).
  const effectiveSelectedId = canvasFields.some((f) => f.id === selectedFieldId) ? selectedFieldId : null;

  // ---------------- derived data ----------------
  const merged = useMemo(() => mergeDatasets(datasets), [datasets]);
  const excelHeaders = merged.headers;
  // Tag each row with its position so pictures can be matched by order (see ROW_INDEX_KEY).
  const allRows: ExcelRow[] = useMemo(
    () => merged.rows.map((row, i) => ({ ...row, [ROW_INDEX_KEY]: i })),
    [merged.rows]
  );
  const activeRows = useMemo(
    () => (excluded.size === 0 ? allRows : allRows.filter((_, i) => !excluded.has(i))),
    [allRows, excluded]
  );
  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === activeTemplateId) ?? templates[0] ?? null,
    [templates, activeTemplateId]
  );
  const assetIndex = useMemo(() => buildAssetIndex(assets), [assets]);
  const safePreviewIndex = Math.min(previewIndex, Math.max(0, activeRows.length - 1));
  const previewRow = activeRows[safePreviewIndex] ?? null;

  // ---------------- uploads ----------------
  const addTemplates = useCallback(
    async (files: File[]) => {
      setBusy('Loading templates…');
      const added: TemplateItem[] = [];
      for (const file of files) {
        const problem = validateUpload(file, 'template');
        if (problem) {
          notify('error', problem);
          continue;
        }
        try {
          const { pages, totalPages } = await loadTemplatePages(file);
          pages.forEach((p) => added.push({ id: generateId(), name: p.name, image: p.image }));
          if (totalPages > pages.length) {
            notify('warning', `"${file.name}" has ${totalPages} pages; the first ${pages.length} were added.`);
          }
        } catch (e) {
          notify('error', `Couldn't load "${file.name}". ${errorMessage(e)}`);
        }
      }
      setBusy(null);
      if (added.length > 0) {
        setTemplates((prev) => [...prev, ...added]);
        setActiveTemplateId((prev) => prev ?? added[0].id);
        if (added.length > 1) notify('success', `Added ${added.length} templates.`);
      }
    },
    [notify]
  );

  const removeTemplate = useCallback((id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    setActiveTemplateId((prev) => (prev === id ? null : prev));
  }, []);

  const addDatasets = useCallback(
    async (files: File[]) => {
      setBusy('Reading data…');
      const added: DatasetItem[] = [];
      for (const file of files) {
        const problem = validateUpload(file, 'dataset');
        if (problem) {
          notify('error', problem);
          continue;
        }
        try {
          const isCSV = /\.csv$/i.test(file.name);
          const result = isCSV ? await parseCSV(file) : await parseExcel(file);
          if (result.data.length === 0) {
            notify('warning', `"${file.name}" has no data rows.`);
            continue;
          }
          added.push({ id: generateId(), name: file.name, headers: result.headers, rows: result.data });
        } catch (e) {
          notify('error', `Couldn't read "${file.name}". Check that it is a valid CSV or Excel file. (${errorMessage(e)})`);
        }
      }
      setBusy(null);
      if (added.length > 0) {
        setDatasets((prev) => [...prev, ...added]);
        setExcluded(new Set());
      }
    },
    [notify]
  );

  const removeDataset = useCallback((id: string) => {
    setDatasets((prev) => prev.filter((d) => d.id !== id));
    setExcluded(new Set());
  }, []);

  const addImages = useCallback(
    async (files: File[]) => {
      setBusy('Loading images…');
      const added: ImageAsset[] = [];
      for (const file of files) {
        const problem = validateUpload(file, 'image');
        if (problem) {
          notify('error', problem);
          continue;
        }
        try {
          if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
            // Every page of a PDF becomes its own picture, kept in page order ("name.pdf (page 2)").
            const { assets: pageAssets, totalPages } = await createAssetsFromPdf(file, (page, total) =>
              setBusy(`Reading "${file.name}": page ${page} of ${total}… keep this tab open`)
            );
            added.push(...pageAssets);
            if (totalPages > MAX_PDF_IMAGE_PAGES) {
              notify('warning', `"${file.name}" has ${totalPages} pages; the first ${MAX_PDF_IMAGE_PAGES} were added.`);
            } else if (pageAssets.length > 1) {
              notify('success', `"${file.name}": all ${pageAssets.length} pages added as pictures, in order.`);
            }
          } else {
            added.push(await createAssetFromFile(file));
          }
        } catch (e) {
          notify('error', `Couldn't load "${file.name}". ${errorMessage(e)}`);
        }
      }
      setBusy(null);
      if (added.length > 0) {
        setAssets((prev) => {
          // A re-uploaded file with the same name replaces the old one.
          const keys = new Set(added.map((a) => a.key));
          prev.filter((a) => keys.has(a.key)).forEach(releaseAsset);
          return [...prev.filter((a) => !keys.has(a.key)), ...added];
        });
      }
    },
    [notify]
  );

  const removeImage = useCallback((id: string) => {
    setAssets((prev) => {
      prev.filter((a) => a.id === id).forEach(releaseAsset);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  /** Remove every page picture that came from one PDF. */
  const removeImageGroup = useCallback((group: string) => {
    setAssets((prev) => {
      prev.filter((a) => a.group === group).forEach(releaseAsset);
      return prev.filter((a) => a.group !== group);
    });
  }, []);

  // ---------------- placing fields ----------------
  const addField = useCallback(
    (spec: FieldSpec, pos?: { x: number; y: number }) => {
      if (!activeTemplate) {
        notify('info', 'Add a template first (Step 1).');
        return null;
      }
      const field = buildField(
        spec,
        pos ?? null,
        { width: activeTemplate.image.width, height: activeTemplate.image.height },
        assets,
        histRef.current.present.length
      );
      setFields((prev) => [...prev, field]);
      setSelectedFieldId(field.id);
      return field;
    },
    [activeTemplate, assets, notify, setFields]
  );

  const deleteSelected = useCallback(() => {
    if (!effectiveSelectedId) return;
    setFields((prev) => prev.filter((f) => f.id !== effectiveSelectedId));
    setSelectedFieldId(null);
  }, [effectiveSelectedId, setFields]);

  const duplicateSelected = useCallback(() => {
    const source = histRef.current.present.find((f) => f.id === effectiveSelectedId);
    if (!source) return;
    const copy: CanvasField = {
      ...source,
      id: generateId(),
      x: source.x + 24,
      y: source.y + 24,
      segments: source.segments?.map((s) => ({ ...s, id: generateId() })),
    };
    setFields((prev) => [...prev, copy]);
    setSelectedFieldId(copy.id);
  }, [effectiveSelectedId, setFields]);

  const nudgeSelected = useCallback(
    (dx: number, dy: number) => {
      if (!effectiveSelectedId) return;
      setFields(
        (prev) => prev.map((f) => (f.id === effectiveSelectedId ? { ...f, x: f.x + dx, y: f.y + dy } : f)),
        { coalesce: `nudge:${effectiveSelectedId}` }
      );
    },
    [effectiveSelectedId, setFields]
  );

  const addCombinedDef = useCallback((def: CombinedFieldDef) => setCombinedFields((prev) => [...prev, def]), []);
  const removeCombinedDef = useCallback(
    (id: string) => setCombinedFields((prev) => prev.filter((d) => d.id !== id)),
    []
  );

  // ---------------- rows ----------------
  const toggleRowExcluded = useCallback((index: number) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);
  const setRowsExcluded = useCallback((indices: number[], excludedValue: boolean) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      indices.forEach((i) => (excludedValue ? next.add(i) : next.delete(i)));
      return next;
    });
  }, []);

  const stepPreview = useCallback(
    (delta: number) => {
      setPreviewIndex((i) => {
        const max = Math.max(0, activeRows.length - 1);
        return Math.min(max, Math.max(0, Math.min(i, max) + delta));
      });
    },
    [activeRows.length]
  );

  // ---------------- layout save / load ----------------
  const applyLayout = useCallback(
    (layout: ReturnType<typeof parseLayout>) => {
      if (!layout) return;
      commit({ past: [...histRef.current.past, histRef.current.present].slice(-HISTORY_LIMIT), present: layout.fields, future: [] });
      setCombinedFields(layout.combinedFields);
      setFilenameTemplate(layout.filenameTemplate);
      setOutputFormat(layout.outputFormat);
      setSelectedFieldId(null);
    },
    [commit]
  );

  const saveLayoutFile = useCallback(() => {
    const layout = serializeLayout(canvasFields, combinedFields, filenameTemplate, outputFormat);
    saveAs(new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' }), 'echo-multiplier-layout.json');
  }, [canvasFields, combinedFields, filenameTemplate, outputFormat]);

  const loadLayoutFile = useCallback(
    async (file: File) => {
      try {
        const layout = parseLayout(JSON.parse(await file.text()));
        if (!layout) {
          notify('error', `"${file.name}" isn't an Echo Multiplier layout file.`);
          return;
        }
        applyLayout(layout);
        notify('success', `Loaded layout with ${layout.fields.length} field${layout.fields.length === 1 ? '' : 's'}.`);
      } catch {
        notify('error', `Couldn't read "${file.name}". Is it a layout .json file?`);
      }
    },
    [applyLayout, notify]
  );

  const restoreAutosave = useCallback(() => {
    const layout = loadLayoutFromStorage();
    if (!layout) {
      notify('info', 'No saved layout was found.');
      return;
    }
    applyLayout(layout);
    setSavedLayoutAvailable(false);
    notify('success', 'Restored your last layout.');
  }, [applyLayout, notify]);

  // Offer to restore on first load; autosave afterwards.
  useEffect(() => {
    // localStorage only exists in the browser, so it can only be read after mount (not during render).
    const saved = loadLayoutFromStorage();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved && saved.fields.length > 0) setSavedLayoutAvailable(true);
    autosaveReady.current = true;
  }, []);

  useEffect(() => {
    if (!autosaveReady.current || canvasFields.length === 0) return;
    const timer = setTimeout(() => {
      saveLayoutToStorage(serializeLayout(canvasFields, combinedFields, filenameTemplate, outputFormat));
    }, 600);
    return () => clearTimeout(timer);
  }, [canvasFields, combinedFields, filenameTemplate, outputFormat]);

  // ---------------- sample ----------------
  // What you had before loading the sample, so "Undo sample" can put it back.
  const latestState = useRef({
    templates,
    activeTemplateId,
    datasets,
    assets,
    excluded,
    hist,
    combinedFields,
    previewMode,
    previewIndex,
  });
  useEffect(() => {
    latestState.current = { templates, activeTemplateId, datasets, assets, excluded, hist, combinedFields, previewMode, previewIndex };
  });
  const sampleBackup = useRef<typeof latestState.current | null>(null);
  const [sampleLoaded, setSampleLoaded] = useState(false);

  const undoSample = useCallback(() => {
    const b = sampleBackup.current;
    if (!b) return;
    setTemplates(b.templates);
    setActiveTemplateId(b.activeTemplateId);
    setDatasets(b.datasets);
    setAssets(b.assets);
    setExcluded(b.excluded);
    commit(b.hist);
    setCombinedFields(b.combinedFields);
    setPreviewMode(b.previewMode);
    setPreviewIndex(b.previewIndex);
    setSelectedFieldId(null);
    sampleBackup.current = null;
    setSampleLoaded(false);
    notify('success', 'Sample removed. Your files are back the way they were.');
  }, [commit, notify]);

  const loadSample = useCallback(async () => {
    setBusy('Preparing sample…');
    try {
      const [blue, green, sampleAssets] = await Promise.all([
        makeSampleCertificate('#2563eb'),
        makeSampleCertificate('#059669'),
        makeSampleAssets(),
      ]);
      const t1: TemplateItem = { id: generateId(), name: 'Sample certificate (blue)', image: blue };
      const t2: TemplateItem = { id: generateId(), name: 'Sample certificate (green)', image: green };
      // Remember the current state once (loading the sample twice still undoes to the original).
      if (!sampleBackup.current) sampleBackup.current = latestState.current;
      setSampleLoaded(true);
      setTemplates([t1, t2]);
      setActiveTemplateId(t1.id);
      setDatasets([{ id: generateId(), name: 'Sample data', headers: SAMPLE_HEADERS, rows: sampleRows() }]);
      setExcluded(new Set());
      setAssets(sampleAssets);

      const text = (header: string, x: number, y: number, extra: Partial<CanvasField>): CanvasField => ({
        id: generateId(),
        headerName: header,
        x,
        y,
        fontSize: 40,
        fill: '#0f172a',
        fontStyle: 'bold',
        fontFamily: 'Georgia',
        align: 'center',
        ...extra,
      });
      const fields: CanvasField[] = [
        text('Name', 600, 335, { fontSize: 72, format: { type: 'title' }, autoFit: true, width: 900 }),
        text('Course', 600, 510, { fontSize: 44, fontStyle: 'italic' }),
        text('Score', 600, 630, { fontSize: 48, format: { type: 'number', decimals: 1 } }),
        text('Date', 600, 735, { fontSize: 26, fontStyle: 'normal', fill: '#475569', format: { type: 'date', pattern: 'D MMMM YYYY' } }),
        {
          ...buildField({ type: 'media', kind: 'image', column: 'Photo' }, { x: 1010, y: 75 }, { width: 1200, height: 850 }, sampleAssets, 0),
          width: 130,
          height: 130,
          shape: 'circle',
          fit: 'cover',
          borderWidth: 4,
          borderColor: '#2563eb',
        },
        {
          ...buildField({ type: 'media', kind: 'qr', column: 'ID' }, { x: 80, y: 620 }, { width: 1200, height: 850 }, sampleAssets, 0),
          width: 130,
          height: 130,
        },
      ];
      commit({ past: [], present: fields, future: [] });
      setSelectedFieldId(null);
      setPreviewMode(true);
      setPreviewIndex(0);
      notify('success', 'Sample loaded: 2 templates, 5 people, 5 photos and a ready-made layout.');
    } catch (e) {
      notify('error', `Couldn't build the sample. ${errorMessage(e)}`);
    } finally {
      setBusy(null);
    }
  }, [commit, notify]);

  // ---------------- export ----------------
  const cancelExport = useCallback(() => abortRef.current?.abort(), []);

  const runExport = useCallback(async () => {
    if (isExporting) return;
    const jobsTemplates = exportAllTemplates ? templates : activeTemplate ? [activeTemplate] : [];
    if (jobsTemplates.length === 0 || activeRows.length === 0 || canvasFields.length === 0) {
      notify('info', 'You need a template, some data and at least one field before exporting.');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const stats: ExportStats = { missingMedia: 0 };
    const total = activeRows.length * jobsTemplates.length;
    setIsExporting(true);
    setExportProgress({ current: 0, total });

    const many = jobsTemplates.length > 1;
    const baseName = filenameTemplate.trim()
      ? sanitizeFilename(filenameTemplate.replace(/\{\{[^}]+\}\}/g, '')) || 'documents'
      : 'echo-multiplier-documents';
    const options = {
      perSheet,
      signal: controller.signal,
      stats,
      onProgress: (current: number, t: number) => setExportProgress({ current, total: t }),
    };

    const downloads: { blob: Blob; name: string }[] = [];
    try {
      let done = 0;
      for (const template of jobsTemplates) {
        const job: ExportJob = { templateImage: template.image, fields: canvasFields, assets };
        const label = many ? `-${sanitizeFilename(template.name).replace(/\s+/g, '-')}` : '';

        let volumes: { blob: Blob; startRecord: number; endRecord: number }[] = [];
        if (outputFormat === 'single-pdf') {
          volumes = await exportSinglePDF(job, activeRows, options, done, total);
        } else {
          // Keep each ZIP batch a whole number of sheets so no sheet is split across two ZIPs.
          const rawBatch = exportBatchSize === 'all' ? activeRows.length : exportBatchSize;
          const batchSize = Math.max(perSheet, Math.floor(rawBatch / perSheet) * perSheet);
          for (let start = 0; start < activeRows.length; start += batchSize) {
            const batch = activeRows.slice(start, start + batchSize);
            volumes.push(
              ...(await exportBatch(job, batch, filenameTemplate, outputFormat, options, start, activeRows.length, done + start, total))
            );
          }
        }
        done += activeRows.length;

        const ext = outputFormat === 'single-pdf' ? 'pdf' : 'zip';
        volumes.forEach(({ blob, startRecord, endRecord }, idx) => {
          const part =
            volumes.length === 1
              ? ''
              : `-part-${String(idx + 1).padStart(2, '0')}-records-${startRecord}-${endRecord}`;
          downloads.push({ blob, name: `${baseName}${label}${part}.${ext}` });
        });
      }

      downloads.forEach(({ blob, name }) => (name.endsWith('.zip') ? downloadZip(blob, name) : saveAs(blob, name)));
      notify('success', `Done! ${total} document${total === 1 ? '' : 's'} exported in ${downloads.length} file${downloads.length === 1 ? '' : 's'}.`);
      if (stats.missingMedia > 0) {
        notify('warning', `${stats.missingMedia} picture${stats.missingMedia === 1 ? ' was' : 's were'} left blank because no matching image was found.`);
      }
    } catch (e) {
      if (e instanceof ExportCancelledError) notify('info', 'Export cancelled. Nothing was downloaded.');
      else {
        console.error('Export failed:', e);
        notify('error', `Export failed: ${errorMessage(e)}. Try a smaller batch size or the JPG format.`);
      }
    } finally {
      abortRef.current = null;
      setIsExporting(false);
      setExportProgress({ current: 0, total: 0 });
    }
  }, [
    activeRows,
    activeTemplate,
    assets,
    canvasFields,
    exportAllTemplates,
    exportBatchSize,
    filenameTemplate,
    isExporting,
    notify,
    outputFormat,
    perSheet,
    templates,
  ]);

  return {
    // files
    templates,
    activeTemplate,
    setActiveTemplateId,
    datasets,
    assets,
    assetIndex,
    excelHeaders,
    allRows,
    activeRows,
    excluded,
    addTemplates,
    removeTemplate,
    addDatasets,
    removeDataset,
    addImages,
    removeImage,
    removeImageGroup,
    toggleRowExcluded,
    setRowsExcluded,
    loadSample,
    undoSample,
    sampleLoaded,
    busy,
    // design
    canvasFields,
    setFields,
    updateField,
    selectedFieldId: effectiveSelectedId,
    setSelectedFieldId,
    combinedFields,
    addCombinedDef,
    removeCombinedDef,
    addField,
    deleteSelected,
    duplicateSelected,
    nudgeSelected,
    undo,
    redo,
    canUndo: hist.past.length > 0,
    canRedo: hist.future.length > 0,
    previewMode,
    setPreviewMode,
    previewIndex: safePreviewIndex,
    stepPreview,
    previewRow,
    snapEnabled,
    setSnapEnabled,
    saveLayoutFile,
    loadLayoutFile,
    restoreAutosave,
    savedLayoutAvailable,
    // export
    outputFormat,
    setOutputFormat,
    exportBatchSize,
    setExportBatchSize,
    filenameTemplate,
    setFilenameTemplate,
    exportAllTemplates,
    setExportAllTemplates,
    perSheet,
    setPerSheet,
    isExporting,
    exportProgress,
    runExport,
    cancelExport,
    // ui
    notices,
    notify,
    dismissNotice,
  };
}

export type Studio = ReturnType<typeof useStudio>;
