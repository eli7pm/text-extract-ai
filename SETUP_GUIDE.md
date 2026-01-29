# Complete Setup Guide for Nutrient Document Engine

This guide walks you through setting up the complete stack: React frontend, Express backend, and Document Engine.

## Overview

The architecture consists of three components:

1. **React Frontend** (port 5173) - Nutrient Web SDK via CDN
2. **Express Backend** (port 3001) - JWT generation and document management
3. **Document Engine** (port 5000) - PDF processing and storage (Docker)

## Step-by-Step Setup

### Step 1: Install Dependencies

Install frontend and backend dependencies:

```bash
# Frontend
pnpm install

# Backend
cd server
pnpm install
cd ..
```

### Step 2: Generate JWT Keys

Generate RSA key pair for JWT authentication:

```bash
mkdir -p server/keys

# Generate private key
openssl genpkey -algorithm RSA -out server/keys/private_key.pem -pkeyopt rsa_keygen_bits:2048

# Generate public key
openssl rsa -pubout -in server/keys/private_key.pem -out server/keys/public_key.pem

# Verify keys were created
ls -l server/keys/
```

You should see:
- `private_key.pem` - Used by Express backend to sign JWTs
- `public_key.pem` - Used by Document Engine to verify JWTs

### Step 3: Get Your License Key

1. Visit https://my.nutrient.io/
2. Sign up or log in
3. Create a trial or purchase a license
4. Copy your license key

### Step 4: Configure Document Engine

Edit `docker-compose.yml`:

1. **Add Public Key**: Copy the contents of `server/keys/public_key.pem` and paste into `JWT_PUBLIC_KEY` field:

```bash
# Display your public key
cat server/keys/public_key.pem
```

Then update in `docker-compose.yml`:

```yaml
JWT_PUBLIC_KEY: |
  -----BEGIN PUBLIC KEY-----
  MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
  (paste your full public key here)
  -----END PUBLIC KEY-----
```

2. **Add License Key**: Replace `YOUR_LICENSE_KEY_HERE` with your actual license:

```yaml
ACTIVATION_KEY: your-actual-license-key-from-nutrient
```

### Step 5: Configure Backend Environment

```bash
cp server/.env.example .env
```

The default configuration should work for local development. The `.env` file contains:

```env
DOCUMENT_ENGINE_URL=http://localhost:5000
JWT_ALGORITHM=RS256
JWT_PRIVATE_KEY_PATH=./server/keys/private_key.pem
JWT_PUBLIC_KEY_PATH=./server/keys/public_key.pem
PORT=3001
NODE_ENV=development
```

### Step 6: Start Document Engine

Start Docker containers:

```bash
docker-compose up -d
```

Verify containers are running:

```bash
docker-compose ps
```

You should see:
- `nutrient-document-engine` (running on port 5000)
- `nutrient-postgres` (running on port 5432)

Check if Document Engine is ready:

```bash
curl http://localhost:5000/health
```

Visit the dashboard (if enabled): http://localhost:5000/dashboard

### Step 7: Start Backend Server

In one terminal:

```bash
pnpm run server:dev
```

You should see:

```
✓ Private key loaded successfully
🚀 Backend server running on http://localhost:3001
📄 Document Engine URL: http://localhost:5000
```

Test the backend:

```bash
curl http://localhost:3001/health
```

### Step 8: Start Frontend

In another terminal:

```bash
pnpm dev
```

Frontend will be available at http://localhost:5173

## Testing the Integration

### Option 1: Use the Upload Interface (Recommended)

The application now includes a user-friendly upload interface:

1. Open your browser at http://localhost:5173
2. You'll see an upload screen with a "Choose PDF File" button
3. Click the button and select a PDF file from your computer
4. The document will automatically:
   - Upload to Document Engine
   - Generate a JWT token
   - Load in the PDF viewer
   - Enable Instant sync for collaboration
5. Use the "Upload New Document" button to switch documents

This is the easiest way to test the full integration!

### Option 2: Upload via Command Line

Upload a PDF to Document Engine using curl:

```bash
curl -X POST http://localhost:3001/api/documents/upload \
  -F "file=@/path/to/your/document.pdf"
```

Response:

```json
{
  "documentId": "generated-id",
  "jwt": "eyJhbGciOiJSUzI1...",
  "documentEngineUrl": "http://localhost:5000",
  "filename": "document.pdf"
}
```

You can then use the returned `documentId` and `jwt` in your custom integrations.

## Verifying Everything Works

### 1. Check Document Engine
```bash
curl http://localhost:5000/health
```

Expected: `200 OK` with health status

### 2. Check Backend
```bash
curl http://localhost:3001/health
```

Expected: JSON with status and timestamp

### 3. Generate a Test JWT
```bash
curl -X POST http://localhost:3001/api/jwt \
  -H "Content-Type: application/json" \
  -d '{"documentId":"test-doc-123"}'
```

Expected: JSON with JWT token

### 4. View Frontend
Open http://localhost:5173

Expected: PDF viewer displaying a document

## Common Issues

### Issue: "Failed to load private key"

**Solution**: Ensure JWT keys are generated:

```bash
ls -l server/keys/
# Should show private_key.pem and public_key.pem
```

If missing, regenerate keys (see Step 2).

### Issue: "Document Engine upload failed"

**Possible causes**:
1. Document Engine not running
2. Invalid license key
3. JWT public key mismatch

**Solution**:

```bash
# Check containers
docker-compose ps

# Check logs
docker-compose logs document-engine

# Verify public key matches in docker-compose.yml and server/keys/public_key.pem
diff <(cat server/keys/public_key.pem) \
     <(grep -A 10 "JWT_PUBLIC_KEY:" docker-compose.yml | tail -n +2)
```

### Issue: Frontend shows "Connection refused"

**Solution**: Ensure all services are running:

1. Document Engine: `docker-compose ps`
2. Backend: `curl http://localhost:3001/health`
3. Check CORS settings if accessing from different domain

### Issue: "JWT signature verification failed"

**Possible causes**:
1. Public key in Docker Compose doesn't match private key
2. Wrong JWT algorithm configured

**Solution**:

1. Verify key pair matches:

```bash
# Extract public key from private key
openssl rsa -in server/keys/private_key.pem -pubout

# Compare with your public_key.pem
cat server/keys/public_key.pem
```

2. Ensure both backend and Document Engine use `RS256` algorithm

3. Restart Document Engine after updating keys:

```bash
docker-compose restart document-engine
```

## Architecture Diagram

```
┌─────────────────┐
│  React Frontend │ :5173
│  (Vite + React) │
└────────┬────────┘
         │ HTTP
         │
    ┌────▼────────────┐
    │ Express Backend │ :3001
    │  (JWT signing)  │
    └────┬────────────┘
         │ HTTP + JWT
         │
    ┌────▼──────────────┐
    │ Document Engine   │ :5000
    │ (Docker)          │
    └───────────────────┘
         │
    ┌────▼──────────────┐
    │ PostgreSQL        │ :5432
    │ (Docker)          │
    └───────────────────┘
```

## Next Steps

Once everything is running:

1. **Explore the API**: Check `server/README.md` for all available endpoints
2. **Enable Instant Sync**: Use `AppWithDocumentEngine.jsx` as your main component
3. **Customize the viewer**: See Nutrient Web SDK docs for configuration options
4. **Add authentication**: Implement user authentication in your backend
5. **Deploy**: See deployment guides for production setup

## Resources

- [Nutrient Web SDK Documentation](https://www.nutrient.io/guides/web/)
- [Document Engine Documentation](https://www.nutrient.io/guides/document-engine/)
- [JWT Authentication Guide](https://www.nutrient.io/guides/web/instant-synchronization/authentication/)
- [API Reference](https://www.nutrient.io/api/web/)

## Getting Help

If you encounter issues:

1. Check logs: `docker-compose logs document-engine`
2. Verify configuration: `cat .env` and `docker-compose.yml`
3. Test each component independently (see "Verifying Everything Works" section)
4. Review Nutrient's troubleshooting guides