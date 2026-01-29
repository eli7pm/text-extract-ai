# Nutrient Backend Server

A Node.js/Express backend server for integrating with Nutrient Document Engine.

## Features

- JWT token generation for Document Engine authentication
- Document upload endpoint
- CORS enabled for frontend integration
- Environment-based configuration

## Setup

### 1. Generate JWT Key Pair

The backend requires RSA keys for JWT signing. Generate them using OpenSSL:

```bash
# Create keys directory
mkdir -p server/keys

# Generate private key
openssl genpkey -algorithm RSA -out server/keys/private_key.pem -pkeyopt rsa_keygen_bits:2048

# Generate public key from private key
openssl rsa -pubout -in server/keys/private_key.pem -out server/keys/public_key.pem
```

### 2. Configure Environment Variables

Copy the example environment file and update it:

```bash
cp server/.env.example .env
```

Edit `.env` and update:
- `DOCUMENT_ENGINE_URL` - URL of your Document Engine instance
- JWT key paths (if different from defaults)

### 3. Update Docker Compose

Edit `docker-compose.yml` and:

1. Replace `REPLACE_WITH_YOUR_PUBLIC_KEY` with the contents of `server/keys/public_key.pem` (without the header/footer lines)
2. Replace `YOUR_LICENSE_KEY_HERE` with your Nutrient license key from https://my.nutrient.io/

Example public key format:
```yaml
JWT_PUBLIC_KEY: |
  -----BEGIN PUBLIC KEY-----
  MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
  (your actual key content here)
  -----END PUBLIC KEY-----
```

### 4. Install Dependencies

```bash
cd server
pnpm install
```

### 5. Start Document Engine

Start the Document Engine Docker containers:

```bash
# From the project root
docker-compose up -d
```

Check if Document Engine is running:
- Document Engine: http://localhost:5000
- Dashboard (if enabled): http://localhost:5000/dashboard

### 6. Start the Backend Server

```bash
cd server
pnpm start

# Or use watch mode for development
pnpm dev
```

The server will start on http://localhost:3001

## API Endpoints

### Health Check
```bash
GET /health
```

Returns server status and configuration.

### Generate JWT
```bash
POST /api/jwt
Content-Type: application/json

{
  "documentId": "your-document-id",
  "layer": "default",  // optional
  "permissions": ["read-document", "write", "download"]  // optional
}
```

Returns:
```json
{
  "jwt": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "documentId": "your-document-id",
  "documentEngineUrl": "http://localhost:5000"
}
```

### Upload Document
```bash
POST /api/documents/upload
Content-Type: multipart/form-data

file: [PDF file]
```

This endpoint:
1. Accepts a PDF file via multipart/form-data
2. Uploads it to Document Engine at `/api/documents`
3. Receives the document ID from Document Engine
4. Generates a JWT for the document
5. Returns both the document ID and JWT

Returns:
```json
{
  "documentId": "generated-id",
  "jwt": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "documentEngineUrl": "http://localhost:5000",
  "filename": "document.pdf"
}
```

**Example using curl:**
```bash
curl -X POST http://localhost:3001/api/documents/upload \
  -F "file=@/path/to/document.pdf"
```

**Example using JavaScript:**
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('http://localhost:3001/api/documents/upload', {
  method: 'POST',
  body: formData,
});

const data = await response.json();
console.log('Document ID:', data.documentId);
console.log('JWT:', data.jwt);
```

### Extract Structured Text
```bash
POST /api/documents/:documentId/extract
Content-Type: application/json

{
  "language": "english"  // optional
}
```

This endpoint:
1. Fetches the document from Document Engine
2. Calls the `/api/build` endpoint with `json-content` output type
3. Extracts structured text with paragraphs, lines, words, and characters
4. Correlates words with paragraphs
5. Detects headings using heuristics
6. Returns processed, structured text data

Returns:
```json
{
  "documentId": "abc123",
  "extractedText": {
    "pages": [
      {
        "pageIndex": 0,
        "plainText": "Lorem ipsum...",
        "elements": [
          {
            "type": "heading",
            "level": 1,
            "text": "Document Title",
            "bbox": { "left": 0, "top": 0, "width": 100, "height": 20 },
            "words": [...],
            "lineCount": 1
          },
          {
            "type": "paragraph",
            "level": false,
            "text": "This is paragraph text...",
            "bbox": { ... },
            "words": [...],
            "lineCount": 3
          }
        ]
      }
    ]
  },
  "pageCount": 1
}
```

**Example using curl:**
```bash
curl -X POST http://localhost:3001/api/documents/abc123/extract \
  -H "Content-Type: application/json" \
  -d '{"language":"english"}'
```

**Heading Detection:**
The endpoint uses heuristics to detect headings:
- Short text (< 100 characters)
- Few words (< 15 words)
- No ending punctuation
- Single or two lines
- Heading levels 1-4 based on word count

### Demo JWT
```bash
GET /api/demo-jwt
```

Returns a JWT for a demo document (for testing purposes).

## Frontend Integration

Update your React frontend to use the backend:

```javascript
// Fetch JWT from backend
const response = await fetch('http://localhost:3001/api/jwt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ documentId: 'your-document-id' })
});

const { jwt, documentEngineUrl } = await response.json();

// Load document in Nutrient Web SDK
window.NutrientViewer.load({
  container: document.getElementById('viewer'),
  documentId: 'your-document-id',
  serverUrl: documentEngineUrl,
  authPayload: { jwt },
  instant: true,  // Enable real-time collaboration
});
```

## Troubleshooting

### JWT Key Issues

If you see "Failed to load private key", ensure:
1. Keys are generated and in `server/keys/`
2. Paths in `.env` are correct
3. File permissions allow reading

### Document Engine Connection

If the backend can't connect to Document Engine:
1. Verify Docker containers are running: `docker-compose ps`
2. Check Document Engine logs: `docker-compose logs document-engine`
3. Ensure port 5000 is not in use by another application

### Public Key in Docker Compose

The public key in `docker-compose.yml` must match your generated key. Copy the entire contents including the BEGIN/END lines.

## License

ISC