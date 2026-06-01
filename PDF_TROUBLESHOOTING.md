# PDF Troubleshooting Guide

If you're experiencing issues loading PDF templates, this guide will help you resolve them.

## Common Issues & Solutions

### Issue 1: "Failed to fetch dynamically imported module" Error

**Symptoms:**
- Error message mentions `pdf.worker.min.js` or `pdf.worker.mjs`
- PDF fails to load immediately
- Console shows CDN fetch errors

**Causes:**
- Network connectivity issues
- CDN blocked by firewall/proxy
- Browser security settings
- Ad blockers interfering

**Solutions:**

1. **Check Internet Connection**
   - Ensure you have active internet connection
   - PDF.js worker loads from CDN on first use

2. **Disable Ad Blockers**
   - Temporarily disable ad blockers
   - Whitelist the application domain
   - Try in incognito/private mode

3. **Check Firewall/Proxy**
   - Ensure CDN domains are not blocked:
     - `cdnjs.cloudflare.com`
     - `unpkg.com`
     - `cdn.jsdelivr.net`

4. **Try Different Browser**
   - Chrome/Edge (recommended)
   - Firefox
   - Safari

5. **Clear Browser Cache**
   ```
   Chrome: Ctrl+Shift+Delete
   Firefox: Ctrl+Shift+Delete
   Safari: Cmd+Option+E
   ```

6. **Alternative: Convert to Image**
   - Open PDF in any PDF viewer
   - Export/Save as PNG or JPG
   - Upload the image instead

### Issue 2: "Failed to load PDF" - Corrupted or Unsupported

**Symptoms:**
- Specific PDF won't load
- Other PDFs work fine
- Error mentions corruption or format

**Causes:**
- PDF is password-protected
- PDF uses unsupported features
- PDF is actually corrupted
- PDF version too new/old

**Solutions:**

1. **Remove Password Protection**
   ```
   - Open PDF in Adobe Acrobat
   - File → Properties → Security
   - Change to "No Security"
   - Save and try again
   ```

2. **Re-save PDF**
   ```
   - Open in PDF viewer
   - Print → Save as PDF
   - This creates a clean copy
   - Upload the new PDF
   ```

3. **Check PDF Version**
   - Very old PDFs (pre-1.4) may not work
   - Very new PDFs with advanced features may fail
   - Re-save as PDF 1.7 for best compatibility

4. **Simplify PDF**
   - Remove complex elements:
     - 3D objects
     - Multimedia
     - JavaScript
     - Forms with complex logic
   - Keep only static content

5. **Convert to Image**
   - Most reliable solution
   - Open PDF in viewer
   - Export first page as PNG (300 DPI)
   - Upload PNG instead

### Issue 3: PDF Loads But Looks Wrong

**Symptoms:**
- PDF loads successfully
- But text/images appear incorrect
- Colors are wrong
- Layout is broken

**Causes:**
- Missing embedded fonts
- Color space issues
- Complex PDF features
- Transparency problems

**Solutions:**

1. **Embed All Fonts**
   ```
   In design software:
   - Illustrator: File → Save As → PDF → Embed All Fonts
   - InDesign: Export → PDF → Embed Fonts
   - Word: Save As PDF → Options → Embed Fonts
   ```

2. **Flatten Transparency**
   ```
   - In Illustrator: Object → Flatten Transparency
   - In Acrobat: Print Production → Flattener Preview
   ```

3. **Convert Colors**
   ```
   - Use RGB color space (not CMYK)
   - Avoid spot colors
   - Convert to sRGB for web use
   ```

4. **Export at Higher Quality**
   ```
   - Increase DPI/resolution
   - Use "High Quality Print" preset
   - Disable compression
   ```

### Issue 4: PDF Takes Too Long to Load

**Symptoms:**
- PDF eventually loads
- But takes 10+ seconds
- Browser becomes unresponsive

**Causes:**
- Very large PDF file
- Complex graphics
- Many embedded images
- High resolution

**Solutions:**

1. **Reduce File Size**
   ```
   - Compress images in PDF
   - Reduce resolution to 150-300 DPI
   - Remove unnecessary pages
   - Use PDF optimizer tools
   ```

2. **Simplify Design**
   ```
   - Reduce number of objects
   - Flatten layers
   - Rasterize complex vectors
   - Remove hidden elements
   ```

3. **Use Image Instead**
   ```
   - Export PDF as PNG (2x size)
   - Optimize PNG with tools like TinyPNG
   - Upload optimized image
   ```

## Best Practices for PDF Templates

### ✅ DO:
- Use simple, clean designs
- Embed all fonts
- Use RGB color space
- Keep file size under 5MB
- Test with a simple PDF first
- Save as PDF 1.7 or lower
- Use standard page sizes (A4, Letter)

### ❌ DON'T:
- Use password protection
- Include forms or JavaScript
- Use very high resolution (>300 DPI)
- Include multiple pages (only first is used)
- Use CMYK or spot colors
- Include 3D or multimedia
- Use non-standard fonts without embedding

## Recommended Workflow

### For Best Results:

1. **Design in Your Preferred Software**
   - Illustrator, InDesign, Figma, Canva, etc.

2. **Export Settings**
   - Format: PDF 1.7
   - Color: RGB
   - Fonts: Embedded
   - Resolution: 150-300 DPI
   - Compression: Medium

3. **Test the PDF**
   - Open in multiple PDF viewers
   - Verify it looks correct
   - Check file size (<5MB ideal)

4. **Upload to Application**
   - If it works: Great!
   - If it fails: Follow troubleshooting steps

5. **Fallback: Export as Image**
   - Open PDF in viewer
   - Export/Print as PNG
   - Resolution: 2x your template size
   - Upload PNG instead

## Alternative: Use Images Instead

If PDF continues to cause issues, images are more reliable:

### PNG (Recommended)
- **Pros**: Lossless, supports transparency, reliable
- **Cons**: Larger file size
- **Best for**: Designs with text, logos, sharp edges

### JPG
- **Pros**: Smaller file size, universal support
- **Cons**: Lossy compression, no transparency
- **Best for**: Photo-based templates, backgrounds

### Export Settings:
```
Resolution: 300 DPI (print) or 150 DPI (screen)
Color: RGB
Format: PNG-24 or JPG (90% quality)
Size: Match your final document size
```

## Testing Checklist

Before reporting a bug, please test:

- [ ] Internet connection is working
- [ ] Other PDFs load successfully
- [ ] PDF opens in Adobe Reader/other viewers
- [ ] PDF is not password-protected
- [ ] File size is reasonable (<10MB)
- [ ] Tried in different browser
- [ ] Tried with ad blockers disabled
- [ ] Checked browser console for errors
- [ ] Tried converting to PNG/JPG

## Getting Help

If you've tried everything and PDF still won't load:

1. **Check Browser Console**
   - Press F12
   - Go to Console tab
   - Copy any error messages

2. **Try the Image Workaround**
   - Export PDF as PNG
   - Upload PNG instead
   - This works 100% of the time

3. **Report Issue**
   - Include browser name/version
   - Include error messages
   - Describe what you tried
   - Mention if images work fine

## Technical Details

### How PDF Loading Works:

1. **File Upload**: PDF file is read as ArrayBuffer
2. **Worker Load**: PDF.js worker loads from CDN
3. **PDF Parse**: PDF structure is parsed
4. **Page Extract**: First page is extracted
5. **Render**: Page rendered to canvas at 2x scale
6. **Convert**: Canvas converted to PNG image
7. **Display**: Image used as template

### Fallback Mechanism:

The application tries multiple CDN sources:
1. Cloudflare CDN (primary)
2. unpkg CDN (fallback 1)
3. jsDelivr CDN (fallback 2)
4. No-worker mode (fallback 3)

If all fail, the error is shown.

### Browser Requirements:

- Modern browser (2020+)
- JavaScript enabled
- Canvas API support
- Fetch API support
- Internet connection (for worker)

## Summary

**Most Reliable Solution**: Export PDF as PNG and upload the image instead.

**Why?**
- 100% compatibility
- Faster loading
- No worker issues
- No CDN dependencies
- Simpler processing

**How?**
1. Open PDF in any viewer
2. File → Export → PNG
3. Choose 300 DPI
4. Save and upload

This eliminates all PDF-related issues while maintaining quality.
