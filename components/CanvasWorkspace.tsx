'use client';

import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Group, Rect } from 'react-konva';
import Konva from 'konva';
import { Maximize2, Minus, Plus } from 'lucide-react';
import { CanvasField, ExcelRow } from '@/types';
import { layoutCombined } from '@/lib/combinedLayout';
import { resolveFieldText, generateId } from '@/lib/utils';
import StyleToolbar from './StyleToolbar';
import { FIELD_DND_TYPE, FieldDragPayload } from './HeaderChip';

interface CanvasWorkspaceProps {
  templateImage: HTMLImageElement | null;
  canvasFields: CanvasField[];
  onFieldsUpdate: (fields: CanvasField[]) => void;
  selectedFieldId: string | null;
  onFieldSelect: (id: string | null) => void;
  previewMode: boolean;
  previewData: ExcelRow | null;
  onStageRef?: (stage: Konva.Stage | null) => void;
  onTextLayerRef?: (layer: Konva.Layer | null) => void;
}

export default function CanvasWorkspace({
  templateImage,
  canvasFields,
  onFieldsUpdate,
  selectedFieldId,
  onFieldSelect,
  previewMode,
  previewData,
  onStageRef,
  onTextLayerRef,
}: CanvasWorkspaceProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const textLayerRef = useRef<Konva.Layer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [zoom, setZoom] = useState(1.25);
  // For combined fields: which segment the StyleToolbar targets (null = whole field / base style).
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  // Calculate scale to fit canvas in viewport - use ideal screen size
  useEffect(() => {
    if (templateImage && containerRef.current) {
      const updateScale = () => {
        const container = containerRef.current;
        if (!container) return;

        // Use more of the available workspace so the editor feels less cramped.
        const maxWidth = container.clientWidth;
        const maxHeight = window.innerHeight - 190; // leave space for header and controls
        
        const scaleX = maxWidth / templateImage.width;
        const scaleY = maxHeight / templateImage.height;
        const fitScale = Math.min(scaleX, scaleY, 1.8);
        const newScale = Math.min(fitScale * zoom, 3);
        
        setScale(newScale);
        setDimensions({
          width: templateImage.width,
          height: templateImage.height,
        });
      };

      updateScale();
      
      // Use ResizeObserver for better responsiveness
      const container = containerRef.current;
      const resizeObserver = new ResizeObserver(updateScale);
      resizeObserver.observe(container);
      
      window.addEventListener('resize', updateScale);
      return () => {
        window.removeEventListener('resize', updateScale);
        resizeObserver.disconnect();
      };
    }
  }, [templateImage, zoom]);

  const zoomOut = () => {
    setZoom((currentZoom) => Math.max(0.5, Number((currentZoom - 0.25).toFixed(2))));
  };

  const zoomIn = () => {
    setZoom((currentZoom) => Math.min(3, Number((currentZoom + 0.25).toFixed(2))));
  };

  const resetZoom = () => {
    setZoom(1);
  };

  useEffect(() => {
    if (onStageRef && stageRef.current) {
      onStageRef(stageRef.current);
    }
  }, [onStageRef]);

  useEffect(() => {
    if (onTextLayerRef && textLayerRef.current) {
      onTextLayerRef(textLayerRef.current);
    }
  }, [onTextLayerRef]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

    const raw = e.dataTransfer.getData(FIELD_DND_TYPE);
    if (!raw) return;

    let payload: FieldDragPayload;
    try {
      payload = JSON.parse(raw) as FieldDragPayload;
    } catch {
      return;
    }

    const stage = stageRef.current;
    if (!stage) return;

    const rect = e.currentTarget.getBoundingClientRect();
    // Convert screen coordinates to canvas coordinates
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    const combined = payload.combined;
    const newField: CanvasField = combined
      ? {
          id: `field-${Date.now()}-${Math.random()}`,
          headerName: combined.label,
          x,
          y,
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
          id: `field-${Date.now()}-${Math.random()}`,
          headerName: payload.content,
          x,
          y,
          fontSize: 24,
          fill: '#1d1d1f',
          fontStyle: 'normal',
          fontFamily: 'Arial',
          align: 'center',
          isStatic: payload.isStatic,
        };

    onFieldsUpdate([...canvasFields, newField]);
    onFieldSelect(newField.id);
  };

  const handleFieldDragEnd = (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    const updatedFields = canvasFields.map((field) =>
      field.id === id
        ? { ...field, x: e.target.x(), y: e.target.y() }
        : field
    );
    onFieldsUpdate(updatedFields);
  };

  const handleFieldUpdate = (id: string, updates: Partial<CanvasField>) => {
    const updatedFields = canvasFields.map((field) =>
      field.id === id ? { ...field, ...updates } : field
    );
    onFieldsUpdate(updatedFields);
    
    // Force layer redraw to show changes immediately
    if (textLayerRef.current) {
      textLayerRef.current.batchDraw();
    }
  };

  const selectedField = canvasFields.find((f) => f.id === selectedFieldId);
  // Only treat a segment as selected if it belongs to the currently selected field — this implicitly
  // clears the selection when the user picks a different field (no reset effect needed).
  const activeSegmentId =
    selectedField?.segments?.some((s) => s.id === selectedSegmentId) ? selectedSegmentId : null;

  return (
    <div className="relative w-full" ref={containerRef}>
      {selectedField && selectedFieldId && (
        <StyleToolbar
          field={selectedField}
          onUpdate={(updates) => handleFieldUpdate(selectedFieldId, updates)}
          selectedSegmentId={activeSegmentId}
          onSelectSegment={setSelectedSegmentId}
        />
      )}
      <div className="mb-3 flex items-center justify-center gap-1.5">
        <button
          onClick={zoomOut}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-sm transition-colors hover:border-accent hover:text-accent disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink"
          disabled={zoom <= 0.5}
          title="Zoom out"
          type="button"
        >
          <Minus size={16} strokeWidth={2} />
        </button>
        <button
          onClick={resetZoom}
          className="flex h-9 min-w-[88px] items-center justify-center gap-1.5 rounded-full border border-line bg-surface px-3 text-xs font-semibold tabular-nums text-ink shadow-sm transition-colors hover:border-accent hover:text-accent"
          title="Fit to workspace"
          type="button"
        >
          <Maximize2 size={14} strokeWidth={2} />
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={zoomIn}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-sm transition-colors hover:border-accent hover:text-accent disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink"
          disabled={zoom >= 3}
          title="Zoom in"
          type="button"
        >
          <Plus size={16} strokeWidth={2} />
        </button>
      </div>
      <div
        className="mx-auto inline-block overflow-hidden rounded-2xl border border-line bg-surface shadow-soft"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Stage
          ref={stageRef}
          width={dimensions.width * scale}
          height={dimensions.height * scale}
          scaleX={scale}
          scaleY={scale}
          onClick={(e) => {
            if (e.target === e.target.getStage()) {
              onFieldSelect(null);
            }
          }}
        >
          <Layer>
            {templateImage && (
              <KonvaImage
                image={templateImage}
                width={dimensions.width}
                height={dimensions.height}
              />
            )}
          </Layer>
          <Layer ref={textLayerRef}>
            {canvasFields.map((field) => {
              // Combined ("sentence") field: a draggable group of per-segment styled runs,
              // laid out by the shared engine so preview matches export exactly.
              if (field.segments) {
                const { runs, boxWidth, boxHeight, offsetX } = layoutCombined(
                  field,
                  previewMode ? previewData : null
                );
                const isSelected = selectedFieldId === field.id;
                return (
                  <Group
                    key={field.id}
                    id={field.id}
                    x={field.x}
                    y={field.y}
                    offsetX={offsetX}
                    draggable
                    onDragEnd={(e) => handleFieldDragEnd(field.id, e)}
                    onClick={() => onFieldSelect(field.id)}
                    onTap={() => onFieldSelect(field.id)}
                  >
                    {/* Invisible hit area so the whole box is draggable/clickable, not just glyphs */}
                    <Rect x={0} y={0} width={Math.max(boxWidth, 8)} height={Math.max(boxHeight, 8)} fill="transparent" />
                    {isSelected && (
                      <Rect
                        x={0}
                        y={0}
                        width={Math.max(boxWidth, 8)}
                        height={Math.max(boxHeight, 8)}
                        stroke="#2563eb"
                        strokeWidth={1}
                        dash={[6, 4]}
                        listening={false}
                      />
                    )}
                    {runs.map((run, idx) => (
                      <Text
                        key={idx}
                        x={run.x}
                        y={run.y}
                        text={run.text}
                        fontSize={run.fontSize}
                        fill={run.fill}
                        fontStyle={run.fontStyle}
                        fontFamily={run.fontFamily}
                        listening={false}
                      />
                    ))}
                  </Group>
                );
              }

              // Single-column or static field: one text node, anchored by alignment.
              const displayText = resolveFieldText(field, previewMode ? previewData : null);

              const textAlign = field.align || 'center';

              // Create a temporary text node to measure width for centering
              const tempText = new Konva.Text({
                text: displayText,
                fontSize: field.fontSize,
                fontStyle: field.fontStyle,
                fontFamily: field.fontFamily || 'Arial',
              });
              const textWidth = tempText.width();

              // Calculate offset based on alignment
              let offsetX = 0;
              if (textAlign === 'center') {
                offsetX = textWidth / 2;
              } else if (textAlign === 'right') {
                offsetX = textWidth;
              }

              return (
                <Text
                  key={field.id}
                  id={field.id}
                  x={field.x}
                  y={field.y}
                  text={displayText}
                  fontSize={field.fontSize}
                  fill={field.fill}
                  fontStyle={field.fontStyle}
                  fontFamily={field.fontFamily || 'Arial'}
                  offsetX={offsetX}
                  draggable
                  onDragEnd={(e) => handleFieldDragEnd(field.id, e)}
                  onClick={() => onFieldSelect(field.id)}
                  onTap={() => onFieldSelect(field.id)}
                  stroke={selectedFieldId === field.id ? '#2563eb' : undefined}
                  strokeWidth={selectedFieldId === field.id ? 2 : 0}
                  listening={true}
                />
              );
            })}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
