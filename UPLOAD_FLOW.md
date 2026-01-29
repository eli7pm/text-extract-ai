# Document Upload Flow

This document explains how the document upload and viewing flow works in the application.

## Architecture Overview

```
┌─────────────────┐
│   React App     │
│  (Port 5173)    │
└────────┬────────┘
         │
         │ 1. User selects PDF
         │
    ┌────▼────────────────┐
    │ DocumentUpload.jsx  │
    │  - Validates file   │
    │  - Shows progress   │
    └────┬────────────────┘
         │
         │ 2. POST /api/documents/upload
         │    (multipart/form-data)
         │
    ┌────▼────────────────┐
    │  Express Backend    │
    │   (Port 3001)       │
    │  - Receives file    │
    │  - Uploads to DE    │
    │  - Generates JWT    │
    └────┬────────────────┘
         │
         │ 3. POST /api/documents
         │    (file data)
         │
    ┌────▼────────────────┐
    │ Document Engine     │
    │   (Port 5000)       │
    │  - Stores PDF       │
    │  - Returns doc ID   │
    └────┬────────────────┘
         │
         │ 4. Returns:
         │    { documentId, jwt, url }
         │
    ┌────▼────────────────┐
    │  Express Backend    │
    └────┬────────────────┘
         │
         │ 5. Returns to frontend:
         │    { documentId, jwt, url, filename }
         │
    ┌────▼────────────────┐
    │     App.jsx         │
    │  - Receives data    │
    │  - Calls load()     │
    └────┬────────────────┘
         │
         │ 6. NutrientViewer.load({
         │      documentId,
         │      serverUrl,
         │      authPayload: { jwt },
         │      instant: true
         │    })
         │
    ┌────▼────────────────┐
    │ Nutrient Web SDK    │
    │  - Authenticates    │
    │  - Loads from DE    │
    │  - Shows viewer     │
    └─────────────────────┘
```

## Detailed Step-by-Step Flow

### 1. User Selects File

- User opens the application
- Sees upload interface (no document loaded)
- Clicks "Choose PDF File" button
- Selects a PDF from their computer

**Component**: `DocumentUpload.jsx`

### 2. File Validation

The upload component validates:
- File type must be `application/pdf`
- File size must be ≤ 50MB
- If validation fails, shows error message

**Component**: `DocumentUpload.jsx:handleFileSelect()`

### 3. Upload to Backend

```javascript
const formData = new FormData();
formData.append('file', file);

const response = await fetch('http://localhost:3001/api/documents/upload', {
  method: 'POST',
  body: formData,
});
```

**Endpoint**: `POST /api/documents/upload`

### 4. Backend Processes Upload

The Express server:

1. Receives the file via `multer` middleware
2. Creates FormData for Document Engine
3. Uploads to Document Engine at `/api/documents`
4. Receives document ID from Document Engine
5. Generates JWT using private key
6. Returns all data to frontend

**File**: `server/server.js:110-161`

**Key code**:
```javascript
// Upload to Document Engine
const response = await fetch(`${DOCUMENT_ENGINE_URL}/api/documents`, {
  method: 'POST',
  body: formData,
});

const data = await response.json();
const documentId = data.data.id;

// Generate JWT
const token = generateJWT(documentId);

// Return to frontend
res.json({
  documentId,
  jwt: token,
  documentEngineUrl: DOCUMENT_ENGINE_URL,
  filename: req.file.originalname,
});
```

### 5. Document Engine Stores Document

Document Engine:
- Receives the PDF file
- Stores it in PostgreSQL
- Generates a unique document ID
- Returns the ID in response

**Response format**:
```json
{
  "data": {
    "id": "abc123...",
    "type": "document"
  }
}
```

### 6. Frontend Loads Document

The App component:

1. Receives upload response via callback
2. Calls `loadDocument()` function
3. Configures Nutrient Web SDK
4. Loads document with authentication

**File**: `src/App.jsx:20-62`

**Key code**:
```javascript
const loadedInstance = await window.NutrientViewer.load({
  container,
  documentId,
  serverUrl: documentEngineUrl,
  authPayload: { jwt },
  instant: true,
  autoSaveMode: window.NutrientViewer.AutoSaveMode.INTELLIGENT,
});
```

### 7. Nutrient Web SDK Authenticates

Web SDK:
- Connects to Document Engine
- Sends JWT for authentication
- Document Engine validates JWT using public key
- If valid, returns document data
- Viewer renders PDF

### 8. Document Ready

- PDF viewer displays the document
- Toolbar shows document info
- Instant sync is enabled for real-time collaboration
- Auto-save is configured for changes
- User can annotate, edit, and collaborate

## JWT Authentication Flow

```
Backend                    Document Engine
   │                              │
   │  1. Generate JWT with        │
   │     document_id claim        │
   │     (signed with private key)│
   │                              │
   │  2. Frontend sends JWT ──────┤
   │                              │
   │                              │ 3. Verify JWT
   │                              │    (using public key)
   │                              │
   │                              │ 4. Extract document_id
   │                              │    from claims
   │                              │
   │                              │ 5. Authorize access
   │                              │    based on permissions
   │                              │
   │  ◄────────── 6. Return ──────┤
   │     document data            │
```

## State Management

The App component manages these states:

| State | Type | Description |
|-------|------|-------------|
| `currentDocument` | `object \| null` | Current loaded document data |
| `instance` | `Instance \| null` | Nutrient viewer instance |
| `loading` | `boolean` | Whether document is loading |
| `error` | `string \| null` | Error message if any |

**State transitions**:

```
Initial State
  currentDocument: null
  instance: null
  loading: false
  error: null
       │
       │ User uploads file
       ▼
Uploading
  currentDocument: null
  instance: null
  loading: false  (upload component handles this)
  error: null
       │
       │ Upload succeeds
       ▼
Loading Document
  currentDocument: null
  instance: null
  loading: true
  error: null
       │
       │ Load succeeds
       ▼
Document Loaded
  currentDocument: { documentId, jwt, ... }
  instance: Instance
  loading: false
  error: null
       │
       │ User clicks "Upload New Document"
       ▼
Back to Initial State
```

## Error Handling

Errors can occur at multiple points:

### 1. File Validation Errors

**Location**: `DocumentUpload.jsx`

**Handled errors**:
- Invalid file type
- File too large

**Display**: Red error message in upload component

### 2. Upload Errors

**Location**: Backend or Document Engine

**Handled errors**:
- Backend server not running
- Document Engine not accessible
- Network errors
- Document Engine rejection

**Display**: Error message in upload component

### 3. Loading Errors

**Location**: Nutrient Web SDK

**Handled errors**:
- Invalid JWT
- Document not found
- Permission denied
- Network timeout

**Display**: Error page with troubleshooting steps

## Security Considerations

### JWT Token

- Generated server-side only
- Signed with private key (never exposed to client)
- Contains document ID and permissions
- Expires after 1 hour (configurable)
- Validated by Document Engine using public key

### File Upload

- File type validation (PDF only)
- File size limit (50MB)
- Processed in memory (no disk storage on backend)
- Immediately forwarded to Document Engine

### Document Access

- All access requires valid JWT
- JWT contains specific document ID
- Cannot access other documents with same JWT
- Permissions enforced by Document Engine

## Performance Considerations

### Upload

- Files are streamed (not loaded into memory fully)
- FormData with Buffer for efficient transfer
- Progress feedback to user
- No intermediate storage

### Viewer Loading

- Document streamed from Document Engine
- Lazy loading of pages
- Efficient caching
- Optimized for large PDFs

### State Management

- Minimal re-renders
- Proper cleanup of viewer instances
- Efficient state updates
- Loading states prevent multiple operations

## Extending the Application

### Add Document List

Show all uploaded documents:

1. Add GET endpoint: `/api/documents` (queries Document Engine)
2. Create `DocumentList.jsx` component
3. Display list with thumbnails
4. Click to load document

### Add User Authentication

Integrate user auth:

1. Add user authentication to backend
2. Include user ID in JWT claims
3. Filter documents by user
4. Implement document sharing

### Add Collaboration Features

Enhance collaboration:

1. Add user presence indicators
2. Show who's viewing/editing
3. Add comment notifications
4. Implement permission levels

### Add Export Options

Allow document export:

1. Add export endpoint to backend
2. Call Document Engine export APIs
3. Support multiple formats (PDF, PDF/A, images)
4. Handle download in frontend
