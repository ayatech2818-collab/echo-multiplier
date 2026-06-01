# Quick Start Guide

Get Echo-Multiplier running in 3 minutes.

## Prerequisites

- Node.js 18+ installed
- A template image (PNG/JPG)
- A dataset (Excel or CSV file)

## Installation & Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:3000

## Your First Batch

### Step 1: Prepare Your Files

**Template Image**: Any PNG, JPG, or PDF file. Examples:
- Certificate background with decorative borders
- ID card layout with your logo
- Blank form or document template
- PDF certificate template (first page will be used)

**Dataset**: Excel or CSV with headers in the first row:
```csv
Student Name,Class,Date,Achievement
John Doe,Grade 10,June 1 2026,Excellence in Mathematics
Jane Smith,Grade 11,June 1 2026,Outstanding Science Project
```

### Step 2: Upload Files

1. Drag your template image into the "Upload Template Image" box
2. Drag your dataset into the "Upload Dataset" box
3. Available fields appear as blue chips

### Step 3: Design Your Document

1. Drag a field chip (e.g., "Student Name") onto the template
2. Position it where you want the text to appear
3. Click the placed field to open the style toolbar
4. Adjust:
   - Font size (e.g., 36 for large text)
   - Color (click the color picker or enter hex code)
   - Style (bold/italic buttons)
5. Repeat for all fields you want to include

### Step 4: Preview

1. Click "Preview On" button
2. The canvas shows how the first row of data will look
3. Adjust positioning and styling as needed
4. Click "Preview Off" to return to editing mode

### Step 5: Export

1. Set filename template: `{{Student Name}} - {{Achievement}}`
2. Choose format: PNG or PDF
3. Click "Export All Documents"
4. Wait for processing (progress shown)
5. Download the ZIP file containing all documents

## Tips for Best Results

### Template Design
- Use high-resolution images (1920x1080 or higher)
- Leave clear space for text placement
- Ensure good contrast between background and text areas

### Data Preparation
- Remove empty rows from your spreadsheet
- Use consistent formatting (dates, names, etc.)
- Test with 2-3 rows before running full batch

### Field Placement
- Start with the most important field (e.g., name)
- Use larger font sizes for primary information
- Align fields visually for professional appearance
- You can place the same field multiple times

### Filename Templates
- Use unique identifiers: `{{ID}} - {{Name}}`
- Avoid special characters: / \ : * ? " < > |
- Keep filenames under 100 characters

## Common Use Cases

### Certificate of Achievement
```csv
Recipient Name,Achievement,Date,Instructor
John Doe,Excellence in Mathematics,June 1 2026,Dr. Smith
```

### Employee ID Card
```csv
Employee Name,ID Number,Department,Photo URL
Jane Smith,EMP-001,Engineering,photo1.jpg
```

### Event Name Tag
```csv
Attendee Name,Company,Title,Table Number
Michael Johnson,Tech Corp,CEO,Table 5
```

## Troubleshooting

**Fields not appearing?**
- Ensure your CSV/Excel has headers in the first row
- Check that the file uploaded successfully

**Text looks blurry?**
- Use a higher resolution template image
- Increase font size for better clarity

**Export taking too long?**
- Large datasets (1000+ rows) may take several minutes
- PDF export is slower than PNG
- Don't close the browser during export

**Filename errors?**
- Remove special characters from template
- Ensure all referenced headers exist in your data

## Next Steps

- Experiment with different font sizes and colors
- Try placing multiple fields on one line
- Create templates for different document types
- Share your templates with your team

## Need Help?

Check the main README.md for detailed documentation or open an issue on GitHub.
