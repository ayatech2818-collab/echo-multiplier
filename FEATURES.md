# Feature Documentation

Complete feature list and technical implementation details for Echo-Multiplier.

## Core Features

### 1. File Upload System
- **Drag & Drop Interface**: Intuitive dropzones for template images and datasets
- **Supported Formats**:
  - Images: PNG, JPG, JPEG
  - Templates: PDF (first page converted to image)
  - Data: Excel (.xlsx, .xls), CSV
- **Visual Feedback**: Hover states and upload confirmation
- **Error Handling**: Graceful failure with user-friendly messages
- **PDF Processing**: Automatic conversion of PDF first page to high-resolution image (2x scale)

### 2. Interactive Canvas Editor (react-konva)
- **Template Display**: High-fidelity rendering of uploaded images
- **Drag & Drop Field Placement**: Click and drag data fields onto template
- **Multi-Field Support**: Place unlimited fields, including duplicates
- **Visual Selection**: Blue stroke indicator for selected fields
- **Real-time Updates**: Immediate visual feedback on all changes

### 3. Typography Controls
- **Font Size**: Adjustable from 8px to 200px with number input
- **Font Color**: 
  - Visual color picker
  - Hex code input (#000000 format)
  - Real-time preview
- **Font Style**:
  - Bold toggle
  - Italic toggle
  - Combined bold+italic support
- **Floating Toolbar**: Context-sensitive positioning above selected field

### 4. Live Preview System
- **Toggle Control**: One-click preview activation
- **Data Injection**: Shows first row of dataset on template
- **Alignment Verification**: Confirm positioning before batch export
- **Keyboard Shortcut**: Press 'P' to toggle

### 5. Dynamic Filename Generation
- **Template Syntax**: Use `{{Header Name}}` placeholders
- **Real-time Validation**: Checks for missing headers
- **Error Display**: Visual feedback for invalid templates
- **Auto-sanitization**: Removes invalid filename characters
- **Example**: `{{Student Name}} - {{Class}}` → "John Doe - Grade 10.png"

### 6. Batch Export Engine
- **Format Options**:
  - PNG (High-resolution, 2x pixel ratio)
  - PDF (Auto-orientation based on dimensions)
- **Progress Tracking**: Real-time counter during export
- **ZIP Packaging**: All documents bundled in single download
- **Unique Filenames**: Dynamic naming prevents overwrites

### 7. Keyboard Shortcuts
- **P**: Toggle preview mode
- **Cmd/Ctrl + E**: Export all documents
- **Delete/Backspace**: Remove selected field
- **Escape**: Deselect current field

### 8. Statistics Dashboard
- **Total Records**: Count of rows in dataset
- **Fields Placed**: Number of fields on canvas
- **Output Format**: Current export format selection

## Design System Implementation

### Color Palette
```css
--primary: #0066cc      /* Action Blue - All interactive elements */
--canvas: #ffffff       /* Pure White - Content areas */
--parchment: #f5f5f7    /* Off-white - Background sections */
--ink: #1d1d1f          /* Near-Black - Primary text */
--surface-black: #000000 /* Top navigation only */
```

### Typography System
- **Font Family**: `system-ui, -apple-system, sans-serif` (SF Pro on macOS)
- **Body Text**: 17px, 400 weight, 1.47 line-height
- **Headlines**: 600 weight, -0.02em letter-spacing
- **Small Text**: 15px for secondary information
- **Micro Text**: 13px for hints and metadata

### Component Styling
- **Primary Buttons**: 
  - Pill-shaped (`border-radius: 9999px`)
  - 11px vertical, 22px horizontal padding
  - Active state: `scale(0.95)`
  - No hover effects (Apple-style)
- **Cards**: 
  - 18px border radius
  - 1px solid #e0e0e0 border
  - No shadows (except canvas)
- **Canvas Shadow**: 
  - `rgba(0, 0, 0, 0.22) 3px 5px 30px`
  - Only shadow in entire application
  - Creates "paper on desk" effect

### Spacing & Layout
- **Max Width**: 1400px for main content
- **Grid Gaps**: 6 (24px) for major sections
- **Card Padding**: 6 (24px) for content cards
- **Section Margins**: 8 (32px) between major sections

## Technical Architecture

### State Management
```typescript
// Core application state
templateImage: HTMLImageElement | null
excelHeaders: string[]
excelData: ExcelRow[]
canvasFields: CanvasField[]
selectedFieldId: string | null
outputFormat: 'image' | 'pdf'
filenameTemplate: string
previewMode: boolean
```

### Data Flow
1. **Upload** → File parsing → State update
2. **Field Placement** → Canvas interaction → State update
3. **Style Changes** → Toolbar interaction → State update
4. **Export** → Batch processing → ZIP generation → Download

### Component Hierarchy
```
App (page.tsx)
├── FileUpload (x2)
├── HeaderChip (dynamic)
├── CanvasWorkspace
│   ├── Konva Stage
│   │   ├── Image Layer (template)
│   │   └── Text Layer (fields)
│   └── StyleToolbar (conditional)
├── ExportControls
└── KeyboardShortcuts
```

### File Structure
```
app/
├── page.tsx              # Main application logic
├── layout.tsx            # Root layout & metadata
└── globals.css           # Design system & Tailwind

components/
├── CanvasWorkspace.tsx   # Konva canvas & interactions
├── ExportControls.tsx    # Export settings panel
├── FileUpload.tsx        # Drag-drop uploader
├── HeaderChip.tsx        # Draggable field chips
├── StyleToolbar.tsx      # Typography controls
└── KeyboardShortcuts.tsx # Keyboard event handler

lib/
├── fileParser.ts         # CSV/Excel parsing
├── exportUtils.ts        # Batch export & ZIP
└── utils.ts              # Validation & helpers

types/
└── index.ts              # TypeScript definitions
```

## Performance Optimizations

### Canvas Rendering
- **Batch Drawing**: `layer.batchDraw()` for efficient updates
- **Pixel Ratio**: 2x for high-DPI displays
- **Layer Separation**: Background and text on separate layers

### Export Processing
- **Async Operations**: Non-blocking batch processing
- **Progress Callbacks**: Real-time user feedback
- **Memory Management**: Cleanup after each document

### File Parsing
- **Streaming**: PapaParse streaming for large CSVs
- **Binary Reading**: XLSX binary mode for Excel files
- **Error Boundaries**: Graceful failure handling

## Browser Compatibility

### Fully Supported
- Chrome 90+
- Edge 90+
- Firefox 88+
- Safari 14+

### Partial Support
- Mobile browsers (limited canvas interaction)
- Older browsers (may need polyfills)

## Security Considerations

### File Handling
- Client-side only processing (no server uploads)
- File type validation
- Size limit recommendations (handled by browser)

### Data Privacy
- No data transmission to external servers
- All processing happens in browser
- No analytics or tracking

## Accessibility Features

### Keyboard Navigation
- Full keyboard shortcut support
- Focus indicators on interactive elements
- Escape key for modal dismissal

### Visual Design
- High contrast text (WCAG AA compliant)
- Clear focus states
- Readable font sizes (17px minimum)

### Screen Readers
- Semantic HTML structure
- ARIA labels on interactive elements
- Alt text for icons

## Future Enhancement Opportunities

### Potential Features
- [ ] Undo/Redo functionality
- [ ] Field alignment guides
- [ ] Text alignment options (left/center/right)
- [ ] Font family selection
- [ ] Image field support (not just text)
- [ ] Multi-page templates
- [ ] Template saving/loading
- [ ] Batch preview (not just first row)
- [ ] Custom canvas dimensions
- [ ] Background color/transparency options

### Technical Improvements
- [ ] Web Workers for export processing
- [ ] IndexedDB for template persistence
- [ ] Progressive Web App (PWA) support
- [ ] Internationalization (i18n)
- [ ] Unit test coverage
- [ ] E2E test suite

## Known Limitations

1. **Large Datasets**: Processing 10,000+ rows may be slow
2. **Mobile Experience**: Touch interactions are limited
3. **Font Rendering**: Limited to system fonts
4. **Image Size**: Very large templates (>10MB) may cause performance issues
5. **Browser Memory**: Large batch exports may hit browser memory limits

## Support & Troubleshooting

### Common Issues

**Fields not dragging?**
- Ensure JavaScript is enabled
- Try refreshing the page
- Check browser console for errors

**Export fails?**
- Verify all template placeholders match headers
- Check browser console for errors
- Try smaller batch size first

**Blurry output?**
- Use higher resolution template image
- Increase font sizes
- Export as PDF for vector text

**Slow performance?**
- Reduce template image size
- Limit number of fields
- Close other browser tabs
