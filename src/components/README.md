# Components

## DocumentUpload

A React component for uploading PDF documents to Nutrient Document Engine.

### Features

- **File validation**: Checks file type and size before upload
- **Progress feedback**: Shows loading state during upload
- **Error handling**: Displays user-friendly error messages
- **Drag and drop**: Visual file picker with clear instructions

### Props

| Prop | Type | Description |
|------|------|-------------|
| `onDocumentUploaded` | `(data: UploadedDocument) => void` | Callback function called when a document is successfully uploaded |

### UploadedDocument Type

```typescript
interface UploadedDocument {
  documentId: string;           // Document ID in Document Engine
  jwt: string;                  // JWT token for authentication
  documentEngineUrl: string;    // Document Engine URL
  filename: string;             // Original filename
}
```

### Usage

```jsx
import DocumentUpload from './components/DocumentUpload';

function MyComponent() {
  const handleDocumentUploaded = (data) => {
    console.log('Document uploaded:', data.documentId);
    console.log('JWT:', data.jwt);

    // Load document in viewer
    window.NutrientViewer.load({
      container: document.getElementById('viewer'),
      documentId: data.documentId,
      serverUrl: data.documentEngineUrl,
      authPayload: { jwt: data.jwt },
      instant: true,
    });
  };

  return (
    <DocumentUpload onDocumentUploaded={handleDocumentUploaded} />
  );
}
```

### Validation Rules

- **File type**: Only PDF files are accepted (`application/pdf`)
- **File size**: Maximum 50MB
- **Backend**: Requires backend server running on `http://localhost:3001`
- **Document Engine**: Requires Document Engine running and accessible

### Error Handling

The component handles various error scenarios:

- Invalid file type
- File too large
- Backend connection errors
- Document Engine upload failures

Errors are displayed to the user with clear messages.

### Styling

The component uses inline styles for simplicity and portability. All styles are self-contained and don't require external CSS files.

### Backend Endpoint

The component sends POST requests to:

```
POST http://localhost:3001/api/documents/upload
Content-Type: multipart/form-data

Body:
  file: [PDF file]
```

Expected response:

```json
{
  "documentId": "abc123",
  "jwt": "eyJhbGc...",
  "documentEngineUrl": "http://localhost:5000",
  "filename": "document.pdf"
}
```

### Example Implementation

See `src/App.jsx` for a complete implementation that:
1. Shows the upload component when no document is loaded
2. Uploads the document to Document Engine
3. Loads the document in the Nutrient viewer
4. Allows switching between documents
