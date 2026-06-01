# Echo-Multiplier

A sophisticated Next.js application for generating multiple documents by merging tabular data (Excel/CSV) with image templates. Perfect for creating certificates, ID cards, badges, and other personalized documents at scale.

## Features

- **Interactive Canvas Editor**: Drag and drop data fields onto your template with pixel-perfect positioning
- **PDF & Image Support**: Upload templates as PNG, JPG, or PDF (first page automatically converted)
- **Live Preview**: See how your first record will look before generating the entire batch
- **Typography Controls**: Customize font size, color, and style (bold/italic) for each field
- **Multi-Field Support**: Place the same field multiple times or combine different fields
- **Flexible Export**: Generate documents as PNG images or PDF files
- **Dynamic Naming**: Use template syntax to create unique filenames from your data
- **Batch Processing**: Generate hundreds or thousands of documents in one click
- **Apple-Inspired Design**: Clean, minimal interface that stays out of your way

## Tech Stack

- **Framework**: Next.js 16 (App Router, React 19)
- **Styling**: Tailwind CSS 4 with custom design system
- **Canvas Engine**: react-konva & konva
- **Data Parsing**: papaparse (CSV) & xlsx (Excel)
- **Export**: jszip, file-saver, jspdf
- **Icons**: lucide-react

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## How to Use

### 1. Upload Template Image
- Click or drag-and-drop a PNG/JPG image or PDF that will serve as your document template
- For PDFs, the first page will be used as the template
- This could be a certificate background, ID card design, or any document layout

### 2. Upload Dataset
- Upload an Excel (.xlsx, .xls) or CSV file containing your data
- The first row should contain column headers
- Each subsequent row represents one document to generate

### 3. Place Fields
- Available fields (column headers) appear as blue chips
- Drag any field onto the template to position it
- Click a placed field to open the style toolbar
- Adjust font size, color, and style as needed
- Place the same field multiple times if needed

### 4. Preview
- Toggle "Preview On" to see how the first row of data will look
- Verify alignment and styling before batch export

### 5. Configure Export
- Set a filename template using `{{Header Name}}` syntax
  - Example: `{{Student Name}} - {{Class}}` → "John Doe - Grade 10.png"
- Choose output format: PNG or PDF
- Click "Export All Documents"

### 6. Download
- All documents are packaged into a single ZIP file
- Extract and use your generated documents

## Design System

The application follows a strict Apple-inspired design system:

### Colors
- **Primary**: `#0066cc` - All interactive elements
- **Canvas**: `#ffffff` - Main content areas
- **Parchment**: `#f5f5f7` - Background sections
- **Ink**: `#1d1d1f` - Primary text
- **Surface Black**: `#000000` - Top navigation

### Typography
- **Font**: System UI (SF Pro on macOS)
- **Headlines**: 600 weight, -0.02em tracking
- **Body**: 17px, 400 weight, 1.47 line height

### Components
- **Buttons**: Pill-shaped, 11px/22px padding, active scale 0.95
- **Cards**: 18px radius, 1px solid border, no shadow
- **Canvas**: Single drop-shadow for depth (the only shadow in the app)

## Project Structure

```
echo-multiplier/
├── app/
│   ├── page.tsx              # Main application page
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Design system & Tailwind
├── components/
│   ├── CanvasWorkspace.tsx   # Interactive Konva canvas
│   ├── ExportControls.tsx    # Export settings panel
│   ├── FileUpload.tsx        # Drag-and-drop uploader
│   ├── HeaderChip.tsx        # Draggable field chips
│   └── StyleToolbar.tsx      # Typography controls
├── lib/
│   ├── fileParser.ts         # CSV/Excel parsing utilities
│   └── exportUtils.ts        # Batch export & ZIP generation
└── types/
    └── index.ts              # TypeScript definitions
```

## Example Use Cases

- **Certificates**: Award certificates, completion certificates, diplomas
- **ID Cards**: Employee badges, student IDs, membership cards
- **Name Tags**: Conference badges, event name tags
- **Invitations**: Personalized event invitations
- **Labels**: Product labels, shipping labels
- **Tickets**: Event tickets, raffle tickets

## Tips

1. **High-Resolution Templates**: Use high-quality images (300 DPI) for print-ready output
2. **PDF Templates**: PDFs are automatically rendered at 2x scale for high quality
3. **Test First**: Always preview with a small dataset before generating thousands of documents
3. **Filename Templates**: Use unique identifiers in filenames to avoid overwrites
4. **Font Sizing**: Start with larger font sizes (24-36px) and adjust down as needed
5. **Color Contrast**: Ensure text color contrasts well with template background

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile: Limited (desktop recommended for best experience)

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
