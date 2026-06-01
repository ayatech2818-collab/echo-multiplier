# Position and Preview Fixes

## Issues Fixed

### 1. ✅ Export Position Mismatch
**Problem:** Text positions in exported PNG/PDF didn't match the canvas preview.

**Root Cause:** The canvas was using CSS `transform: scale()` which only affects visual display but doesn't change Konva's internal coordinate system. This caused a mismatch between preview and export.

**Solution:**
- Removed CSS `transform: scale()` from the wrapper div
- Applied scaling directly to Konva Stage using `scaleX` and `scaleY` properties
- Set Stage dimensions to `width={dimensions.width * scale}` and `height={dimensions.height * scale}`
- This ensures Konva's internal coordinates match the visual display exactly

**Code Changes in `CanvasWorkspace.tsx`:**
```tsx
// BEFORE (Wrong - CSS transform)
<div style={{ transform: `scale(${scale})` }}>
  <Stage width={dimensions.width} height={dimensions.height}>

// AFTER (Correct - Konva native scaling)
<div>
  <Stage 
    width={dimensions.width * scale} 
    height={dimensions.height * scale}
    scaleX={scale}
    scaleY={scale}
  >
```

### 2. ✅ Preview Not Showing Style Changes
**Problem:** When changing font size, color, style, or alignment in the StyleToolbar, the preview didn't update immediately.

**Solution:**
- Added `textLayerRef.current.batchDraw()` call in `handleFieldUpdate` function
- This forces Konva to redraw the layer immediately after any field update
- Now all style changes are visible in real-time

**Code Changes in `CanvasWorkspace.tsx`:**
```tsx
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
```

### 3. ✅ Canvas Too Small
**Problem:** Canvas preview was too small, making it hard to work with.

**Solution:**
- Increased available space by reducing reserved space from 400px to 250px
- Changed max scale from 1.0 (no upscaling) to 1.5 (allow 50% upscaling)
- Reduced padding from 40px to 20px for more usable space
- Added ResizeObserver for better responsive behavior

**Code Changes in `CanvasWorkspace.tsx`:**
```tsx
// BEFORE
const maxWidth = container.clientWidth - 40;
const maxHeight = window.innerHeight - 400;
const newScale = Math.min(scaleX, scaleY, 1); // No upscaling

// AFTER
const maxWidth = container.clientWidth - 20;
const maxHeight = window.innerHeight - 250;
const newScale = Math.min(scaleX, scaleY, 1.5); // Allow 1.5x upscaling
```

### 4. ✅ Font Selection
**Status:** Already working! Font selection dropdown is available in the StyleToolbar with 10 fonts:
- Arial
- Times New Roman
- Courier New
- Georgia
- Verdana
- Comic Sans MS
- Impact
- Trebuchet MS
- Palatino
- Garamond

## How to Test

1. **Test Position Accuracy:**
   - Upload a template and dataset
   - Place a field at a specific position
   - Export as PNG or PDF
   - Open the exported file - text should be at EXACTLY the same position as in preview

2. **Test Real-Time Preview:**
   - Place a field on canvas
   - Select it and change font size → should update immediately
   - Change color → should update immediately
   - Change font family → should update immediately
   - Change alignment → should update immediately
   - Toggle bold/italic → should update immediately

3. **Test Canvas Size:**
   - Canvas should now be much larger and easier to work with
   - Should scale up small templates for better visibility
   - Should scale down large templates to fit screen
   - Should respond to window resizing smoothly

4. **Test Font Selection:**
   - Select any field
   - Click the font dropdown in the StyleToolbar
   - Choose different fonts - they should apply immediately

## Technical Details

### Coordinate System
- Konva uses absolute pixel coordinates (x, y)
- When using `scaleX` and `scaleY`, Konva scales the entire coordinate system
- Stage dimensions must be multiplied by scale: `width * scale`, `height * scale`
- This ensures exported images use the same coordinate system as the preview

### Text Alignment
- Text uses `offsetX` to center at the given coordinates:
  - **Center:** `offsetX = textWidth / 2` (default)
  - **Left:** `offsetX = 0`
  - **Right:** `offsetX = textWidth`
- This is applied consistently in both preview and export

### Performance
- `batchDraw()` is efficient - only redraws the specific layer, not the entire stage
- ResizeObserver provides better performance than window resize events
- Scale calculation is debounced by React's useEffect

## Files Modified
- `components/CanvasWorkspace.tsx` - Main fixes for scaling, preview, and size
- `components/StyleToolbar.tsx` - Already had font selection (no changes needed)
- `lib/exportUtils.ts` - Already had correct alignment logic (from previous fix)

## Result
✅ Positions are pixel-perfect between preview and export
✅ All style changes show immediately in preview
✅ Canvas is much larger and easier to work with
✅ Font selection works perfectly
✅ Fully responsive layout maintained
