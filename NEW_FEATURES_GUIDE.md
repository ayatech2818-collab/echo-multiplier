# New Features Guide

## 1. 🎨 Enhanced Color Picker

### What's New:
The color picker for text fields is now **larger and easier to use**!

### How to Use:
1. **Place a field** on the canvas
2. **Click the field** to select it
3. **Style toolbar appears** above the field
4. **Click the color square** to open color picker
5. **Or type hex code** directly (e.g., #FF0000)

### Features:
- ✅ Larger color picker (10x10px, easier to click)
- ✅ Visual color preview
- ✅ Hex code input with validation
- ✅ Real-time color updates
- ✅ Supports all hex colors (#000000 to #FFFFFF)

### Tips:
- Use the color picker for visual selection
- Use hex input for precise colors
- Common colors:
  - Black: `#000000`
  - White: `#FFFFFF`
  - Red: `#FF0000`
  - Blue: `#0066CC`
  - Green: `#00FF00`

---

## 2. 📝 Smart Filename Template Builder

### What's New:
No more typing `{{Field Name}}` manually! Click to select fields from a dropdown.

### How to Use:

#### Step 1: Open Field Selector
- Look for the **+ button** next to the filename template input
- Click it to open the dropdown

#### Step 2: Select Fields
- Dropdown shows **all available fields** from your dataset
- Click any field to insert it
- Field is automatically wrapped in `{{}}` syntax

#### Step 3: Build Your Template
- Insert multiple fields
- Add text between fields
- Example: `{{Student Name}} - Certificate - {{Date}}`

### Features:
- ✅ Visual field selection (no typing!)
- ✅ Automatic `{{}}` syntax
- ✅ Smart cursor positioning
- ✅ Click outside to close
- ✅ Validation shows missing fields
- ✅ Scrollable list for many fields

### Examples:

**Simple:**
```
{{Student Name}}
Result: John Doe.png
```

**With Text:**
```
Certificate - {{Student Name}}
Result: Certificate - John Doe.png
```

**Multiple Fields:**
```
{{Student Name}} - {{Class}} - {{Date}}
Result: John Doe - Grade 10 - June 1 2026.png
```

**Complex:**
```
{{Achievement}} Award - {{Student Name}} ({{Class}})
Result: Excellence in Mathematics Award - John Doe (Grade 10).png
```

### Tips:
- **Use unique identifiers** to avoid duplicate filenames
- **Keep it short** (under 100 characters)
- **Avoid special characters** (/ \ : * ? " < > |)
- **Test with preview** before batch export

---

## 3. 📄 Reliable PDF Support

### What's New:
PDFs now load **without network errors** using a local worker file!

### How It Works:
- PDF.js worker is **bundled locally** (no CDN dependency)
- Loads from `/pdf.worker.mjs` in your app
- Works **offline** after first load
- No more "Failed to fetch" errors

### Supported PDFs:
- ✅ Simple PDFs (text and images)
- ✅ Vector PDFs (from Illustrator, Figma)
- ✅ Exported PDFs (from Word, Canva)
- ✅ Multi-page PDFs (first page used)

### Not Supported:
- ❌ Password-protected PDFs
- ❌ Corrupted PDFs
- ❌ PDFs with JavaScript/forms

### How to Use:

#### Upload PDF:
1. Click "Upload Template (Image/PDF)"
2. Select your PDF file
3. First page is automatically extracted
4. Rendered at 2x scale for quality
5. Converted to image for canvas

#### If PDF Fails:
1. Check if password-protected (remove password)
2. Try re-saving PDF (Print → Save as PDF)
3. **Fallback**: Export as PNG/JPG instead

### Tips:
- **Use simple PDFs** for best results
- **Embed fonts** in your PDF
- **Use RGB colors** (not CMYK)
- **Keep file size** under 5MB
- **Test first** with a simple PDF

---

## Quick Reference

### Color Picker Shortcuts:
- Click color square → Visual picker
- Type hex code → Precise color
- Common colors: Black (#000000), White (#FFFFFF), Blue (#0066CC)

### Filename Template Shortcuts:
- Click + button → Select field
- Type manually → `{{Field Name}}`
- Multiple fields → Separate with text

### PDF Upload Tips:
- Simple PDFs work best
- First page only
- Export as PNG if issues
- 2x scale for quality

---

## Troubleshooting

### Color Picker Not Showing?
1. Click the field on canvas
2. Toolbar appears above field
3. Look for color square on right side

### Field Selector Not Opening?
1. Upload dataset first (Excel/CSV)
2. Look for + button next to input
3. Click + to open dropdown

### PDF Still Failing?
1. Check if password-protected
2. Try different PDF
3. Export as PNG/JPG instead
4. See PDF_TROUBLESHOOTING.md

---

## Video Tutorials (Coming Soon)

- [ ] How to use the color picker
- [ ] Building filename templates
- [ ] Working with PDF templates
- [ ] Complete workflow demo

---

## Feedback

Found a bug or have a suggestion?
- Check browser console (F12)
- Try in different browser
- Clear cache and retry
- Report issue with details

---

## What's Next?

Upcoming features:
- Color presets/favorites
- Field search in dropdown
- Template preview
- Multi-page PDF support
- Drag-and-drop field insertion

Stay tuned for updates!
