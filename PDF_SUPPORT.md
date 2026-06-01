# PDF Template Support

Echo-Multiplier now supports PDF files as templates in addition to PNG and JPG images.

## How It Works

### PDF Processing
1. **Upload**: Drag and drop or select a PDF file as your template
2. **Conversion**: The first page of the PDF is automatically converted to a high-resolution image
3. **Rendering**: PDF is rendered at 2x scale (retina quality) for crisp output
4. **Usage**: The converted image is used exactly like a regular image template

### Technical Details

**Library**: PDF.js (Mozilla's PDF rendering library)
- Industry-standard PDF rendering
- Client-side processing (no server upload required)
- High-quality canvas rendering

**Quality Settings**:
- Scale: 2x (for retina displays)
- Format: PNG (lossless)
- Resolution: Matches original PDF dimensions × 2

**Performance**:
- Dynamic import (only loads when needed)
- Client-side only (no SSR issues)
- Fast conversion (typically < 2 seconds)

## Supported Formats

### Template Files
- ✅ PNG (Portable Network Graphics)
- ✅ JPG/JPEG (Joint Photographic Experts Group)
- ✅ PDF (Portable Document Format) - **NEW**

### Limitations
- **Multi-page PDFs**: Only the first page is used
- **Interactive PDFs**: Forms and interactive elements are flattened
- **Vector Quality**: PDF is rasterized to bitmap (2x scale for quality)

## Use Cases

### Perfect For:
1. **Certificate Templates**: Professional PDF certificates from design software
2. **Official Documents**: Government or corporate templates in PDF format
3. **Print-Ready Designs**: High-quality PDF exports from Adobe Illustrator, InDesign, etc.
4. **Existing Templates**: Reuse PDF templates without converting to images

### Example Workflow:
```
1. Design certificate in Adobe Illustrator
2. Export as PDF (high quality)
3. Upload PDF to Echo-Multiplier
4. Add data fields
5. Generate batch with original PDF quality
```

## Quality Comparison

### PDF Template (2x scale)
- **Pros**: 
  - Maintains design fidelity
  - No manual conversion needed
  - High resolution (2x native)
  - Preserves colors and gradients
- **Cons**: 
  - Slightly larger file size
  - Conversion time (~1-2 seconds)

### Image Template (PNG/JPG)
- **Pros**: 
  - Instant loading
  - Smaller file size
  - Direct rendering
- **Cons**: 
  - May need manual export from design software
  - Quality depends on export settings

## Best Practices

### For Best Results:
1. **Use Vector PDFs**: PDFs created from vector software (Illustrator, InDesign) render better than scanned PDFs
2. **Single Page**: Ensure your template is on the first page
3. **Standard Size**: Use standard document sizes (A4, Letter, etc.)
4. **Test First**: Upload and preview before batch processing

### Optimization Tips:
1. **File Size**: Keep PDFs under 10MB for faster processing
2. **Complexity**: Simpler designs render faster
3. **Fonts**: Embedded fonts work best
4. **Images**: Optimize embedded images in PDF

## Troubleshooting

### PDF Won't Load
**Problem**: "Failed to load PDF" error

**Solutions**:
- Ensure PDF is not password-protected
- Check file is not corrupted
- Try re-exporting from source software
- Verify file size is reasonable (<10MB)

### Blurry Output
**Problem**: PDF looks pixelated

**Solutions**:
- PDF is already rendered at 2x scale
- Check original PDF quality
- Ensure PDF is vector-based, not scanned
- Try exporting PDF at higher quality

### Slow Processing
**Problem**: PDF takes long to load

**Solutions**:
- Reduce PDF file size
- Simplify PDF design
- Remove unnecessary embedded images
- Use image format instead if faster loading needed

### Wrong Page Displayed
**Problem**: Not showing the desired page

**Solution**:
- Only first page is used
- Rearrange PDF pages in PDF editor
- Or export specific page as separate PDF

## Technical Implementation

### Code Structure
```typescript
// Dynamic import (client-side only)
const pdfjsLib = await import('pdfjs-dist');

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Load and render
const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
const page = await pdf.getPage(1);
const viewport = page.getViewport({ scale: 2 });

// Render to canvas
const canvas = document.createElement('canvas');
canvas.width = viewport.width;
canvas.height = viewport.height;
await page.render({ canvasContext: context, viewport }).promise;

// Convert to image
const img = new Image();
img.src = canvas.toDataURL('image/png');
```

### Browser Compatibility
- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ❌ IE 11 (not supported)

### Dependencies
- `pdfjs-dist`: ^4.x (Mozilla PDF.js)
- CDN Worker: Cloudflare CDN for PDF.js worker

## Security

### Client-Side Processing
- ✅ No server upload required
- ✅ PDF processed entirely in browser
- ✅ No data leaves your computer
- ✅ Privacy-friendly

### File Validation
- File type checking
- Error handling for corrupted files
- Graceful failure with user feedback

## Future Enhancements

### Potential Features:
- [ ] Multi-page PDF support (select page)
- [ ] PDF page preview before selection
- [ ] Batch processing of multi-page PDFs
- [ ] PDF metadata extraction
- [ ] Custom scale settings
- [ ] PDF optimization before rendering

## Examples

### Supported PDF Types:
1. **Certificates**: Award certificates, diplomas
2. **ID Cards**: Employee badges, student IDs
3. **Invitations**: Event invitations, wedding cards
4. **Tickets**: Event tickets, boarding passes
5. **Labels**: Product labels, shipping labels
6. **Forms**: Application forms, registration forms

### Design Software Compatibility:
- ✅ Adobe Illustrator
- ✅ Adobe InDesign
- ✅ Figma (export to PDF)
- ✅ Canva (download as PDF)
- ✅ Microsoft Word (save as PDF)
- ✅ Google Docs (download as PDF)
- ✅ Affinity Designer
- ✅ CorelDRAW

## FAQ

**Q: Can I use multi-page PDFs?**
A: Currently only the first page is used. Split your PDF or rearrange pages if needed.

**Q: Will my PDF fonts be preserved?**
A: Yes, embedded fonts are rendered correctly. Non-embedded fonts may fall back to system fonts.

**Q: Is there a file size limit?**
A: No hard limit, but keep under 10MB for best performance.

**Q: Can I use scanned PDFs?**
A: Yes, but vector PDFs render better. Scanned PDFs are already rasterized.

**Q: Does it work offline?**
A: The PDF.js worker is loaded from CDN, so internet connection is required for first load.

**Q: Can I use password-protected PDFs?**
A: No, remove password protection before uploading.

## Support

For issues with PDF templates:
1. Check browser console for errors
2. Try converting PDF to PNG as alternative
3. Verify PDF is not corrupted
4. Test with a simple PDF first
5. Open GitHub issue with details

## Changelog

### v1.1.0 - PDF Support Added
- ✅ PDF template upload
- ✅ First page extraction
- ✅ 2x scale rendering
- ✅ Dynamic PDF.js loading
- ✅ Error handling
- ✅ Documentation

---

**Note**: PDF support is a client-side feature. All processing happens in your browser for maximum privacy and security.
