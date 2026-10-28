'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Text,
  Group,
  Rect,
  Ellipse,
  Line,
  Transformer,
} from 'react-konva';
import Konva from 'konva';
import { Maximize2, Minus, Plus } from 'lucide-react';
import { CanvasField, ExcelRow } from '@/types';
import { layoutCombined } from '@/lib/combinedLayout';
import { resolveFieldText, isTextField } from '@/lib/utils';
import { effectiveFontSize, measureText } from '@/lib/measure';
import {
  borderDash,
  computeMediaLayout,
  cornerRadiusOf,
  fieldBox,
  isCircleField,
  needsClip,
  resolveMediaSource,
  traceOutline,
} from '@/lib/mediaField';
import type { AssetIndex } from '@/lib/assets';
import type { FieldSpec, Studio } from '@/lib/useStudio';
import { FIELD_DND_TYPE, FieldDragPayload } from './HeaderChip';

const SELECT_COLOR = '#2563eb';
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const SNAP_PX = 7; // screen pixels; converted to template pixels by the current scale

type Handlers = {
  onSelect: (e: Konva.KonvaEventObject<Event>) => void;
  onDragStart: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
};

/* ---------------- field renderers (memoized: only re-render when their own data changes) ---------------- */

const TextFieldNode = memo(function TextFieldNode({
  field,
  row,
  selected,
  handlers,
}: {
  field: CanvasField;
  row: ExcelRow | null;
  selected: boolean;
  handlers: Handlers;
}) {
  const text = resolveFieldText(field, row);
  const fontSize = effectiveFontSize(field, text);
  const fontFamily = field.fontFamily || 'Arial';
  const textWidth = measureText(text, fontSize, field.fontStyle, fontFamily);
  const align = field.align || 'center';
  const offsetX = align === 'center' ? textWidth / 2 : align === 'right' ? textWidth : 0;

  return (
    <Text
      id={field.id}
      x={field.x}
      y={field.y}
      text={text}
      fontSize={fontSize}
      fill={field.fill}
      fontStyle={field.fontStyle}
      fontFamily={fontFamily}
      offsetX={offsetX}
      draggable
      onDragStart={handlers.onDragStart}
      onDragMove={handlers.onDragMove}
      onDragEnd={handlers.onDragEnd}
      onClick={handlers.onSelect}
      onTap={handlers.onSelect}
      stroke={selected ? SELECT_COLOR : undefined}
      strokeWidth={selected ? 2 : 0}
    />
  );
});

const CombinedFieldNode = memo(function CombinedFieldNode({
  field,
  row,
  selected,
  handlers,
}: {
  field: CanvasField;
  row: ExcelRow | null;
  selected: boolean;
  handlers: Handlers;
}) {
  // Laid out by the shared engine so the preview matches the export exactly.
  const { runs, boxWidth, boxHeight, offsetX } = layoutCombined(field, row);
  const w = Math.max(boxWidth, 8);
  const h = Math.max(boxHeight, 8);
  return (
    <Group
      id={field.id}
      x={field.x}
      y={field.y}
      offsetX={offsetX}
      draggable
      onDragStart={handlers.onDragStart}
      onDragMove={handlers.onDragMove}
      onDragEnd={handlers.onDragEnd}
      onClick={handlers.onSelect}
      onTap={handlers.onSelect}
    >
      {/* Invisible hit area so the whole box is draggable/clickable, not just glyphs */}
      <Rect x={0} y={0} width={w} height={h} fill="transparent" />
      {selected && (
        <Rect x={0} y={0} width={w} height={h} stroke={SELECT_COLOR} strokeWidth={1} dash={[6, 4]} listening={false} />
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
});

const MediaFieldNode = memo(function MediaFieldNode({
  field,
  row,
  assets,
  selected,
  handlers,
  onTransformEnd,
}: {
  field: CanvasField;
  row: ExcelRow | null;
  assets: AssetIndex;
  selected: boolean;
  handlers: Handlers;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
}) {
  const media = resolveMediaSource(field, row, assets);
  const src = media.source;
  const srcW = src ? (src instanceof HTMLImageElement ? src.naturalWidth || src.width : src.width) : 0;
  const srcH = src ? (src instanceof HTMLImageElement ? src.naturalHeight || src.height : src.height) : 0;
  const m = computeMediaLayout(field, srcW, srcH);
  const circle = isCircleField(field);
  const radius = cornerRadiusOf(field, m.w, m.h);
  const border = field.borderWidth && field.borderWidth > 0 ? field.borderWidth : 0;
  const placeholderLabel =
    media.label === ''
      ? field.kind === 'image'
        ? 'Image'
        : field.kind === 'qr'
        ? 'QR'
        : 'Barcode'
      : media.label;
  const noPicture = !src;

  return (
    <Group
      id={field.id}
      x={field.x}
      y={field.y}
      opacity={field.opacity ?? 1}
      draggable
      onDragStart={handlers.onDragStart}
      onDragMove={handlers.onDragMove}
      onDragEnd={handlers.onDragEnd}
      onClick={handlers.onSelect}
      onTap={handlers.onSelect}
      onTransformEnd={onTransformEnd}
    >
      {/* Hit area / plate (codes sit on white so they stay scannable) */}
      <Rect
        width={m.w}
        height={m.h}
        fill={noPicture ? 'rgba(148,163,184,0.18)' : field.kind === 'image' ? field.bgColor || 'transparent' : '#ffffff'}
        stroke={noPicture ? (media.missing ? '#dc2626' : '#94a3b8') : undefined}
        strokeWidth={noPicture ? 1.5 : 0}
        dash={noPicture ? [8, 6] : undefined}
        cornerRadius={radius}
      />
      {src && (
        <Group
          clipFunc={needsClip(field, m.w, m.h) ? (ctx) => traceOutline(ctx, field, m.w, m.h) : undefined}
          listening={false}
        >
          <KonvaImage image={src} x={m.dx} y={m.dy} width={m.dw} height={m.dh} crop={m.crop} />
        </Group>
      )}
      {noPicture && (
        <Text
          x={4}
          y={0}
          width={m.w - 8}
          height={m.h}
          align="center"
          verticalAlign="middle"
          text={media.missing ? `No picture\n${placeholderLabel}` : placeholderLabel}
          fontSize={Math.max(10, Math.min(22, m.w / 8))}
          fill={media.missing ? '#dc2626' : '#64748b'}
          listening={false}
        />
      )}
      {border > 0 &&
        (circle ? (
          <Ellipse
            x={m.w / 2}
            y={m.h / 2}
            radiusX={m.w / 2}
            radiusY={m.h / 2}
            stroke={field.borderColor || '#000000'}
            strokeWidth={border}
            dash={borderDash(field)}
            listening={false}
          />
        ) : (
          <Rect
            width={m.w}
            height={m.h}
            cornerRadius={radius}
            stroke={field.borderColor || '#000000'}
            strokeWidth={border}
            dash={borderDash(field)}
            listening={false}
          />
        ))}
      {selected && !circle && (
        <Rect width={m.w} height={m.h} cornerRadius={radius} stroke={SELECT_COLOR} strokeWidth={1} dash={[6, 4]} listening={false} />
      )}
    </Group>
  );
});

/* ---------------- workspace ---------------- */

interface Guides {
  x: number | null;
  y: number | null;
}

export default function CanvasWorkspace({ studio }: { studio: Studio }) {
  const {
    activeTemplate,
    canvasFields: fields,
    selectedFieldId,
    previewMode,
    previewRow,
    snapEnabled,
    assetIndex,
  } = studio;
  const templateImage = activeTemplate?.image ?? null;
  const row = previewMode ? previewRow : null;

  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [guides, setGuides] = useState<Guides>({ x: null, y: null });
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);
  // Edges of the *other* fields, captured when a drag starts so dragging stays cheap.
  const snapTargets = useRef<{ xs: number[]; ys: number[] }>({ xs: [], ys: [] });

  // Always-current copies so the stable handlers below never go stale.
  const latest = useRef({ fields, scale, snapEnabled, studio, templateImage });
  useEffect(() => {
    latest.current = { fields, scale, snapEnabled, studio, templateImage };
  });

  // Fit the template into the available space; zoom multiplies on top of that.
  useEffect(() => {
    if (!templateImage || !containerRef.current) return;
    const container = containerRef.current;
    const update = () => {
      // Usable width = the scroll box minus its padding and the frame border around the stage.
      const wrap = wrapRef.current ?? container;
      const cs = getComputedStyle(wrap);
      const padding = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      const maxWidth = Math.max(160, wrap.clientWidth - padding - 2);
      const maxHeight = Math.max(240, window.innerHeight - 300);
      const fit = Math.min(maxWidth / templateImage.width, maxHeight / templateImage.height, 1.8);
      setScale(Math.max(0.05, Math.min(fit * zoom, 3)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [templateImage, zoom]);

  // Attach resize handles to the selected image / QR / barcode field.
  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? null;
  const selectedIsMedia = !!selectedField && !isTextField(selectedField);
  useEffect(() => {
    const tr = trRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;
    if (selectedIsMedia && selectedFieldId) {
      const node = stage.findOne(`#${CSS.escape(selectedFieldId)}`);
      tr.nodes(node ? [node] : []);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedFieldId, selectedIsMedia, fields, scale]);

  /* ---- handlers (stable identity so memoized nodes don't re-render) ---- */

  const handleSelect = useCallback((e: Konva.KonvaEventObject<Event>) => {
    latest.current.studio.setSelectedFieldId(e.currentTarget.id());
  }, []);

  const handleDragStart = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const id = node.id();
    const { studio: s, fields: fs, templateImage: tpl } = latest.current;
    s.setSelectedFieldId(id);

    const layer = node.getLayer();
    const xs: number[] = [];
    const ys: number[] = [];
    if (tpl) {
      xs.push(0, tpl.width / 2, tpl.width);
      ys.push(0, tpl.height / 2, tpl.height);
    }
    if (layer) {
      fs.forEach((f) => {
        if (f.id === id) return;
        const other = layer.getChildren().find((n) => n.id() === f.id);
        if (!other) return;
        const r = other.getClientRect({ relativeTo: layer });
        xs.push(r.x, r.x + r.width / 2, r.x + r.width);
        ys.push(r.y, r.y + r.height / 2, r.y + r.height);
      });
    }
    snapTargets.current = { xs, ys };
  }, []);

  const handleDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const { snapEnabled: snap, scale: sc } = latest.current;
    if (!snap) return;
    const node = e.target;
    const layer = node.getLayer();
    if (!layer) return;
    const threshold = SNAP_PX / sc;
    const r = node.getClientRect({ relativeTo: layer });

    const best = (points: number[], targets: number[]) => {
      let delta: number | null = null;
      let line: number | null = null;
      points.forEach((p) =>
        targets.forEach((t) => {
          const d = t - p;
          if (Math.abs(d) <= threshold && (delta === null || Math.abs(d) < Math.abs(delta))) {
            delta = d;
            line = t;
          }
        })
      );
      return { delta, line };
    };

    const bx = best([r.x, r.x + r.width / 2, r.x + r.width], snapTargets.current.xs);
    const by = best([r.y, r.y + r.height / 2, r.y + r.height], snapTargets.current.ys);
    if (bx.delta !== null) node.x(node.x() + bx.delta);
    if (by.delta !== null) node.y(node.y() + by.delta);
    setGuides((g) => (g.x === bx.line && g.y === by.line ? g : { x: bx.line, y: by.line }));
  }, []);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const id = e.target.id();
    const x = Math.round(e.target.x() * 10) / 10;
    const y = Math.round(e.target.y() * 10) / 10;
    latest.current.studio.setFields((prev) => prev.map((f) => (f.id === id ? { ...f, x, y } : f)));
    setGuides({ x: null, y: null });
  }, []);

  const handleTransformEnd = useCallback((e: Konva.KonvaEventObject<Event>) => {
    const node = e.target;
    const id = node.id();
    const sx = node.scaleX();
    const sy = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    const field = latest.current.fields.find((f) => f.id === id);
    if (!field) return;
    const box = fieldBox(field);
    const patch: Partial<CanvasField> = {
      x: Math.round(node.x()),
      y: Math.round(node.y()),
      width: Math.max(8, Math.round(box.w * sx)),
      height: Math.max(8, Math.round(box.h * sy)),
    };
    latest.current.studio.setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const handlers: Handlers = useMemo(
    () => ({
      onSelect: handleSelect,
      onDragStart: handleDragStart,
      onDragMove: handleDragMove,
      onDragEnd: handleDragEnd,
    }),
    [handleSelect, handleDragStart, handleDragMove, handleDragEnd]
  );

  /* ---- drop from the palette (desktop drag-and-drop) ---- */

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData(FIELD_DND_TYPE);
    if (!raw) return;
    let spec: FieldSpec;
    try {
      spec = (JSON.parse(raw) as FieldDragPayload).spec;
    } catch {
      return;
    }
    if (!spec) return;
    const rect = e.currentTarget.getBoundingClientRect();
    studio.addField(spec, { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale });
  };

  /* ---- zoom ---- */

  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 100) / 100));
  const touchDistance = (t: React.TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  if (!templateImage) return null;
  const stageW = templateImage.width * scale;
  const stageH = templateImage.height * scale;
  const lineWidth = 1 / scale;

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="mb-3 flex items-center justify-center gap-1.5">
        <button
          onClick={() => setZoom((z) => clampZoom(z - 0.25))}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-sm transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
          disabled={zoom <= MIN_ZOOM}
          aria-label="Zoom out"
          title="Zoom out"
          type="button"
        >
          <Minus size={16} strokeWidth={2} />
        </button>
        <button
          onClick={() => setZoom(1)}
          className="flex h-11 min-w-[92px] items-center justify-center gap-1.5 rounded-full border border-line bg-surface px-3 text-xs font-semibold tabular-nums text-ink shadow-sm transition-colors hover:border-accent hover:text-accent"
          title="Fit to screen"
          aria-label="Fit to screen"
          type="button"
        >
          <Maximize2 size={14} strokeWidth={2} />
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={() => setZoom((z) => clampZoom(z + 0.25))}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-sm transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
          disabled={zoom >= MAX_ZOOM}
          aria-label="Zoom in"
          title="Zoom in"
          type="button"
        >
          <Plus size={16} strokeWidth={2} />
        </button>
      </div>

      <div ref={wrapRef} className="canvas-touch w-full overflow-auto rounded-2xl bg-page/60 p-2 sm:p-4">
        <div
          className="mx-auto overflow-hidden rounded-xl border border-line bg-surface shadow-soft"
          style={{ width: stageW, height: stageH }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onTouchStart={(e) => {
            if (e.touches.length === 2) pinchRef.current = { dist: touchDistance(e.touches), zoom };
          }}
          onTouchMove={(e) => {
            const p = pinchRef.current;
            if (p && e.touches.length === 2 && p.dist > 0) setZoom(clampZoom(p.zoom * (touchDistance(e.touches) / p.dist)));
          }}
          onTouchEnd={(e) => {
            if (e.touches.length < 2) pinchRef.current = null;
          }}
        >
          <Stage
            ref={stageRef}
            width={stageW}
            height={stageH}
            scaleX={scale}
            scaleY={scale}
            onClick={(e) => {
              if (e.target === e.target.getStage()) studio.setSelectedFieldId(null);
            }}
            onTap={(e) => {
              if (e.target === e.target.getStage()) studio.setSelectedFieldId(null);
            }}
          >
            <Layer listening={false}>
              <KonvaImage image={templateImage} width={templateImage.width} height={templateImage.height} />
            </Layer>
            <Layer>
              {fields.map((field) => {
                const selected = selectedFieldId === field.id;
                if (!isTextField(field)) {
                  return (
                    <MediaFieldNode
                      key={field.id}
                      field={field}
                      row={row}
                      assets={assetIndex}
                      selected={selected}
                      handlers={handlers}
                      onTransformEnd={handleTransformEnd}
                    />
                  );
                }
                if (field.segments) {
                  return <CombinedFieldNode key={field.id} field={field} row={row} selected={selected} handlers={handlers} />;
                }
                return <TextFieldNode key={field.id} field={field} row={row} selected={selected} handlers={handlers} />;
              })}
              <Transformer
                ref={trRef}
                rotateEnabled={false}
                flipEnabled={false}
                keepRatio={selectedField ? selectedField.kind === 'qr' || selectedField.lockRatio !== false : true}
                enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
                anchorSize={Math.max(10, 18 / scale)}
                anchorCornerRadius={4}
                borderStroke={SELECT_COLOR}
                anchorStroke={SELECT_COLOR}
                boundBoxFunc={(oldBox, newBox) => (newBox.width < 8 || newBox.height < 8 ? oldBox : newBox)}
              />
            </Layer>
            {snapEnabled && (guides.x !== null || guides.y !== null) && (
              <Layer listening={false}>
                {guides.x !== null && (
                  <Line points={[guides.x, 0, guides.x, templateImage.height]} stroke="#ec4899" strokeWidth={lineWidth} dash={[6 / scale, 4 / scale]} />
                )}
                {guides.y !== null && (
                  <Line points={[0, guides.y, templateImage.width, guides.y]} stroke="#ec4899" strokeWidth={lineWidth} dash={[6 / scale, 4 / scale]} />
                )}
              </Layer>
            )}
          </Stage>
        </div>
      </div>
    </div>
  );
}
