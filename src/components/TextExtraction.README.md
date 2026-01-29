# TextExtraction Component

A React component for extracting and displaying structured text from PDF documents with full accessibility support for screen readers.

## Features

- ✅ **Structured Text Extraction** - Extracts text with paragraph and heading detection
- ✅ **Semantic HTML** - Proper heading levels (H1-H6) and paragraph tags
- ✅ **Accessibility** - ARIA labels, roles, and proper document structure
- ✅ **Page Navigation** - Browse through multi-page documents
- ✅ **Word-Level Detail** - Each word with bounding box information
- ✅ **Statistics** - View document statistics (pages, elements, headings, paragraphs)
- ✅ **Beautiful UI** - Clean, modern interface with proper typography
- ✅ **Screen Reader Support** - Announces content types and navigation

## Usage

```jsx
import TextExtraction from './components/TextExtraction';

function MyComponent() {
  const [documentId, setDocumentId] = useState('abc123');

  return (
    <TextExtraction documentId={documentId} />
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `documentId` | `string` | Yes | The Document Engine document ID to extract text from |

## How It Works

### 1. Text Extraction Flow

```
User clicks "Extract Text"
    ↓
Frontend sends POST to /api/documents/:id/extract
    ↓
Backend fetches document from Document Engine
    ↓
Backend calls /api/build with json-content output
    ↓
Document Engine processes PDF with OCR
    ↓
Backend correlates words with paragraphs
    ↓
Backend detects headings using heuristics
    ↓
Frontend receives structured data
    ↓
Component renders with semantic HTML
```

### 2. Data Structure

The extracted text is organized as:

```javascript
{
  pages: [
    {
      pageIndex: 0,
      plainText: "Full page text...",
      elements: [
        {
          type: "heading",        // or "paragraph"
          level: 1,               // 1-6 for headings, false for paragraphs
          text: "Title text",
          bbox: { left, top, width, height },
          words: [
            {
              value: "word",
              bbox: { ... },
              characters: [...],
              isFromDictionary: true
            }
          ],
          lineCount: 1
        }
      ]
    }
  ]
}
```

### 3. Heading Detection

The backend uses heuristics to detect headings:

- **Short text**: < 100 characters
- **Few words**: < 15 words
- **No ending punctuation**: No period, exclamation, or question mark
- **Few lines**: 1-2 lines only

Heading levels are assigned based on word count:
- **H1**: ≤ 5 words (e.g., "Document Title")
- **H2**: 6-8 words (e.g., "Introduction to the Topic")
- **H3**: 9-12 words (e.g., "A Longer Section Heading Goes Here")
- **H4**: 13-15 words (longer but still short)

## Accessibility Features

### Semantic HTML

```jsx
// Headings rendered with proper level
<h1>Document Title</h1>
<h2>Section Heading</h2>
<h3>Subsection</h3>

// Paragraphs with word spans
<p>
  <span>Each</span> <span>word</span> <span>individually</span>
</p>
```

### ARIA Attributes

```jsx
// Document role
<div role="document" aria-label="Extracted document text">

// Heading with explicit level
<h2 role="heading" aria-level="2">Section Title</h2>

// Live regions for status updates
<div role="status" aria-live="polite">
  Page 1 of 5
</div>

// Alert for errors
<div role="alert">
  Error: Failed to extract text
</div>
```

### Screen Reader Support

The component provides:
- **Document structure** - Screen readers can navigate by headings
- **Page navigation** - Announces current page and total
- **Content types** - Identifies headings vs paragraphs
- **Status updates** - Loading and error states announced
- **Keyboard navigation** - All interactive elements accessible via keyboard

## Styling

The component uses inline styles for portability. Key style features:

- **Responsive layout** - Adapts to different screen sizes
- **Typography** - Clear hierarchy with proper font sizes
- **Spacing** - Comfortable reading with appropriate margins
- **Colors** - Accessible contrast ratios
- **Focus indicators** - Visible keyboard focus states

## Backend API

The component calls:

```bash
POST http://localhost:3001/api/documents/:documentId/extract
Content-Type: application/json

{
  "language": "english"
}
```

Response format documented in `server/README.md`.

## State Management

| State | Type | Description |
|-------|------|-------------|
| `extractedText` | `object \| null` | Extracted text data from backend |
| `loading` | `boolean` | Whether extraction is in progress |
| `error` | `string \| null` | Error message if extraction fails |
| `selectedPage` | `number` | Current page index (0-based) |

## Examples

### Basic Usage

```jsx
<TextExtraction documentId="abc123" />
```

### With Document Upload

```jsx
function App() {
  const [documentId, setDocumentId] = useState(null);

  return (
    <div>
      {!documentId ? (
        <DocumentUpload onUploaded={(data) => setDocumentId(data.documentId)} />
      ) : (
        <TextExtraction documentId={documentId} />
      )}
    </div>
  );
}
```

### With Tab Switching

```jsx
function App() {
  const [tab, setTab] = useState('viewer');
  const [documentId, setDocumentId] = useState('abc123');

  return (
    <div>
      <Tabs value={tab} onChange={setTab}>
        <Tab value="viewer">PDF Viewer</Tab>
        <Tab value="text">Extracted Text</Tab>
      </Tabs>

      {tab === 'viewer' ? (
        <PDFViewer documentId={documentId} />
      ) : (
        <TextExtraction documentId={documentId} />
      )}
    </div>
  );
}
```

## Limitations

- **Heading detection is heuristic-based** - May not always be accurate
- **No styling information** - Font size, color, weight not preserved
- **OCR accuracy** - Depends on document quality and language
- **Processing time** - Large documents may take time to process
- **Memory usage** - Large documents with many words may use significant memory

## Future Enhancements

Possible improvements:

1. **Manual heading marking** - Allow users to mark headings manually
2. **Export options** - Export to Markdown, HTML, plain text
3. **Search functionality** - Search within extracted text
4. **Copy to clipboard** - Copy text or specific sections
5. **Text-to-speech** - Read extracted text aloud
6. **Font information** - Preserve and display font styling
7. **Layout preservation** - Better preserve original document layout
8. **Multi-language support** - Better handling of RTL languages
9. **Table detection** - Detect and structure table data
10. **Image detection** - Identify and note image locations

## Troubleshooting

### "No document loaded" Message

**Cause**: `documentId` prop is null or undefined

**Solution**: Ensure you pass a valid document ID from Document Engine

### "Extraction failed" Error

**Possible causes**:
1. Backend server not running
2. Document Engine not accessible
3. Invalid document ID
4. Document Engine build API error

**Solution**:
- Check backend is running: `curl http://localhost:3001/health`
- Check Document Engine: `curl http://localhost:5000/health`
- Verify document ID exists in Document Engine

### No Text Displayed

**Possible causes**:
1. Document is image-only (scanned PDF)
2. OCR not enabled or failed
3. Document is empty

**Solution**:
- Check if `plainText` field has content in API response
- Verify OCR is configured in backend (language parameter)
- Try with a different document

### Incorrect Heading Detection

**Cause**: Heuristics don't match document structure

**Solution**:
- Adjust heuristics in `server/server.js:detectHeading()`
- Consider adding manual heading detection UI

## Performance Tips

1. **Lazy loading** - Only extract text when tab is opened
2. **Caching** - Cache extracted text to avoid re-processing
3. **Pagination** - Show one page at a time (already implemented)
4. **Debouncing** - Debounce re-extraction requests
5. **Web Workers** - Process large documents in background

## Related Components

- `DocumentUpload.jsx` - Upload documents to Document Engine
- `App.jsx` - Main application with tab switching
- Backend: `server/server.js` - Text extraction endpoint
