'use client';

import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Text } from 'react-konva';
import Konva from 'konva';
import { Maximize2, Minus, Plus } from 'lucide-react';
import { CanvasField, ExcelRow } from '@/types';
import StyleToolbar from './StyleToolbar';

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
  const [draggedHeader, setDraggedHeader] = useState<string | null>(null);

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
    
    if (!draggedHeader) return;

    const stage = stageRef.current;
    if (!stage) return;

    const rect = e.currentTarget.getBoundingClientRect();
    // Convert screen coordinates to canvas coordinates
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    const newField: CanvasField = {
      id: `field-${Date.now()}-${Math.random()}`,
      headerName: draggedHeader,
      x,
      y,
      fontSize: 24,
      fill: '#1d1d1f',
      fontStyle: 'normal',
      fontFamily: 'Arial',
      align: 'center',
    };

    onFieldsUpdate([...canvasFields, newField]);
    setDraggedHeader(null);
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

  // Listen for drag events from HeaderChip
  useEffect(() => {
    const handleDragStart = (e: DragEvent) => {
      const header = (e.target as HTMLElement)?.textContent;
      if (header) {
        setDraggedHeader(header);
      }
    };

    document.addEventListener('dragstart', handleDragStart as any);
    return () => document.removeEventListener('dragstart', handleDragStart as any);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="mb-3 flex items-center justify-center gap-2">
        <button
          onClick={zoomOut}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e0e0e0] bg-white text-[#1d1d1f] hover:border-[#0066cc] disabled:opacity-40"
          disabled={zoom <= 0.5}
          title="Zoom out"
          type="button"
        >
          <Minus size={16} strokeWidth={2} />
        </button>
        <button
          onClick={resetZoom}
          className="flex h-9 min-w-20 items-center justify-center gap-2 rounded-full border border-[#e0e0e0] bg-white px-3 text-[13px] font-medium text-[#1d1d1f] hover:border-[#0066cc]"
          title="Fit to workspace"
          type="button"
        >
          <Maximize2 size={15} strokeWidth={2} />
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={zoomIn}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e0e0e0] bg-white text-[#1d1d1f] hover:border-[#0066cc] disabled:opacity-40"
          disabled={zoom >= 3}
          title="Zoom in"
          type="button"
        >
          <Plus size={16} strokeWidth={2} />
        </button>
      </div>
      <div
        className="inline-block bg-white rounded-[18px] overflow-hidden mx-auto"
        style={{
          boxShadow: 'rgba(0, 0, 0, 0.22) 3px 5px 30px',
        }}
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
              const displayText = previewMode && previewData
                ? String(previewData[field.headerName] || field.headerName)
                : field.headerName;

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
                  stroke={selectedFieldId === field.id ? '#0066cc' : undefined}
                  strokeWidth={selectedFieldId === field.id ? 2 : 0}
                  listening={true}
                />
              );
            })}
          </Layer>
        </Stage>
      </div>

      {selectedField && selectedFieldId && (
        <StyleToolbar
          field={selectedField}
          onUpdate={(updates) => handleFieldUpdate(selectedFieldId, updates)}
          position={{
            x: selectedField.x * scale,
            y: selectedField.y * scale,
          }}
          scale={scale}
        />
      )}
    </div>
  );
}
