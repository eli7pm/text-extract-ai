# Deployment Guide - Secure Production Setup

This guide shows you how to deploy your app **without exposing your Anthropic API keys**.

## ✅ Current Security Status

Your architecture is already secure:
- ✓ API key is stored in **backend server only** (not in frontend code)
- ✓ Anthropic API is called from **Express server** (server-side)
- ✓ Frontend makes requests to **your backend**, not directly to Anthropic

## 🚀 Deployment Options

### Option 1: Render (Recommended - Free Tier Available)

**Why Render?** Easy setup, free tier, built-in secrets management.

#### Backend Deployment

1. Create account at [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repo
4. Configure:
   ```
   Name: nutrient-backend
   Root Directory: server
   Build Command: pnpm install
   Start Command: node server.js
   ```

5. Add Environment Variables in Render dashboard:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-xxx...
   DOCUMENT_ENGINE_URL=https://your-document-engine.com
   API_AUTH_TOKEN=your-secret-token
   PORT=3001
   NODE_ENV=production
   ALLOWED_ORIGINS=https://your-frontend-url.com
   ```

6. Deploy! Copy the backend URL (e.g., `https://nutrient-backend.onrender.com`)

#### Frontend Deployment

1. Click "New +" → "Static Site"
2. Connect your GitHub repo
3. Configure:
   ```
   Build Command: pnpm install && pnpm build
   Publish Directory: dist
   ```

4. Add Environment Variable:
   ```
   VITE_API_URL=https://nutrient-backend.onrender.com
   ```

5. Deploy!

---

### Option 2: Vercel (Great for Frontend) + Render (Backend)

#### Backend: Deploy on Render (see above)

#### Frontend: Deploy on Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login and deploy:
   ```bash
   vercel login
   vercel
   ```

3. Set environment variable:
   ```bash
   vercel env add VITE_API_URL
   # Enter: https://your-backend.onrender.com
   ```

4. Redeploy:
   ```bash
   vercel --prod
   ```

---

### Option 3: Railway (All-in-One)

1. Create account at [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Add two services:
   - **Backend Service**:
     - Root Directory: `server`
     - Start Command: `pnpm install && node server.js`
     - Add environment variables (see above)

   - **Frontend Service**:
     - Build Command: `pnpm install && pnpm build`
     - Start Command: `pnpm preview`
     - Environment: `VITE_API_URL=https://backend-service-url.railway.app`

---

### Option 4: Docker Compose (Self-Hosted)

Deploy all services together using Docker:

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  document-engine:
    # Your existing Document Engine config
    # ...

  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - DOCUMENT_ENGINE_URL=http://document-engine:5000
      - API_AUTH_TOKEN=${API_AUTH_TOKEN}
      - NODE_ENV=production
    depends_on:
      - document-engine

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
      args:
        - VITE_API_URL=https://your-domain.com/api
    ports:
      - "80:80"
    depends_on:
      - backend
```

---

## 🔒 Security Enhancements

### 1. Add Rate Limiting (Already Installed)

Update `server/server.js` to add rate limiting:

```javascript
import rateLimit from 'express-rate-limit';

// Add after app initialization
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to all routes
app.use('/api/', limiter);

// Stricter limit for AI text extraction
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit to 20 AI cleanups per hour
  message: 'AI cleanup rate limit exceeded. Try again later.',
});

app.use('/api/documents/:documentId/extract', aiLimiter);
```

### 2. Add CORS Restrictions

Update `server/server.js`:

```javascript
// Replace generic cors() with specific origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS policy violation'), false);
    }
    return callback(null, true);
  },
  credentials: true,
}));
```

### 3. Add Request Authentication (Optional but Recommended)

Generate an API key for your frontend:

```bash
# Generate a secure API key
openssl rand -hex 32
```

Add to backend `.env`:
```
FRONTEND_API_KEY=your-generated-key-here
```

Add middleware to `server/server.js`:

```javascript
// API key middleware
function authenticateFrontend(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.FRONTEND_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

// Protect your routes
app.post('/api/documents/upload', authenticateFrontend, upload.single('file'), async (req, res) => {
  // ... existing code
});
```

Update frontend to send API key:

```javascript
// In DocumentUpload.jsx and TextExtraction.jsx
const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'X-API-Key': import.meta.env.VITE_FRONTEND_API_KEY || '',
  },
  // ... rest of config
});
```

### 4. Monitor API Usage

Add logging to track Anthropic API usage:

```javascript
// In server.js, after Anthropic initialization
let anthropicCallCount = 0;

async function cleanTextWithAI(rawText, pageIndex) {
  anthropicCallCount++;
  console.log(`Anthropic API call #${anthropicCallCount} - Page ${pageIndex}`);

  // ... existing code
}

// Endpoint to check usage
app.get('/api/usage', (req, res) => {
  res.json({
    anthropicCalls: anthropicCallCount,
    // Add more metrics as needed
  });
});
```

---

## 🔐 Environment Variables Checklist

### Backend (.env - NEVER commit this)

```bash
# Core
ANTHROPIC_API_KEY=sk-ant-api03-xxx...    # Keep this SECRET!
DOCUMENT_ENGINE_URL=https://...
API_AUTH_TOKEN=your-secret-token
PORT=3001
NODE_ENV=production

# Security (add these)
ALLOWED_ORIGINS=https://your-frontend.com,https://www.your-frontend.com
FRONTEND_API_KEY=your-generated-key      # Optional but recommended

# JWT
JWT_PRIVATE_KEY_PATH=./keys/private_key.pem
JWT_ALGORITHM=RS256
```

### Frontend (Set in hosting platform)

```bash
VITE_API_URL=https://your-backend.com
VITE_FRONTEND_API_KEY=your-generated-key  # Optional
```

---

## ✅ Pre-Deployment Checklist

- [ ] `.env` is in `.gitignore` (already done)
- [ ] API URLs use environment variables, not hardcoded localhost
- [ ] Rate limiting is configured
- [ ] CORS is restricted to your domain
- [ ] Frontend API key authentication is added (optional)
- [ ] Environment variables are set in hosting platform
- [ ] JWT keys are generated and securely stored
- [ ] Document Engine is deployed and accessible
- [ ] Test the deployed app thoroughly
- [ ] Monitor API usage after deployment

---

## 🎯 Quick Start: Deploy to Render (5 minutes)

1. **Prepare your repo:**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push
   ```

2. **Deploy backend on Render:**
   - Go to render.com → New Web Service
   - Connect repo → Root: `server`
   - Add environment variables from checklist above
   - Deploy

3. **Deploy frontend on Render:**
   - New Static Site
   - Connect repo → Build: `pnpm install && pnpm build`
   - Add `VITE_API_URL=<your-backend-url>`
   - Deploy

4. **Done!** Your app is live and secure. API keys are never exposed.

---

## 🚨 Common Mistakes to Avoid

1. ❌ **NEVER** put API keys in frontend code or environment variables that start with `VITE_*`
2. ❌ **NEVER** commit `.env` files to Git
3. ❌ **NEVER** hardcode API URLs - use environment variables
4. ❌ **DON'T** skip rate limiting - you'll get surprise API bills
5. ❌ **DON'T** allow CORS from `*` in production

---

## 📊 Cost Optimization

The Anthropic API is used for text cleanup. To minimize costs:

1. **Make AI cleanup optional:**
   - Already implemented: `useAI` parameter in extract endpoint
   - Add a toggle in the UI to disable AI cleanup

2. **Add caching:**
   - Cache cleaned text results by document hash
   - Avoid re-cleaning the same documents

3. **Set usage limits:**
   - Use rate limiting (already covered)
   - Add per-user quotas if you have authentication

4. **Monitor usage:**
   - Use the `/api/usage` endpoint (from section 4 above)
   - Set up alerts for high usage

---

## 🆘 Troubleshooting

### "CORS error" after deployment
- Check `ALLOWED_ORIGINS` includes your frontend URL
- Ensure VITE_API_URL points to correct backend

### "401 Unauthorized" from Anthropic
- Verify `ANTHROPIC_API_KEY` is set in backend environment
- Check the key is valid at console.anthropic.com

### "Cannot connect to backend"
- Verify backend is running (check hosting platform logs)
- Confirm `VITE_API_URL` is correct in frontend build
- Check CORS settings

### High API costs
- Enable rate limiting
- Add AI cleanup toggle in UI
- Monitor usage with `/api/usage` endpoint

---

## 📝 Next Steps

1. Implement rate limiting (code provided above)
2. Update components to use `src/config.js` for API URL
3. Add CORS restrictions
4. Choose a deployment platform
5. Set up environment variables
6. Deploy and test!

Your API keys will remain safe on the server. Users will never see them in the browser.