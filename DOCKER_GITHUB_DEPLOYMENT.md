# Docker + GitHub Pages Deployment Guide

Complete guide to self-hosting the backend with Docker Compose and deploying the frontend to GitHub Pages.

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│         GitHub Pages (Frontend)             │
│   https://username.github.io/repo-name/     │
│                                             │
│   - Static React app                        │
│   - No API keys exposed                     │
│   - Free hosting                            │
└──────────────────┬──────────────────────────┘
                   │ API Calls
                   ↓
┌─────────────────────────────────────────────┐
│      Your Server (Docker Compose)           │
│   http://your-server-ip:3001                │
│                                             │
│   ┌─────────────────────────────────────┐  │
│   │  Backend (Express)                  │  │
│   │  - JWT generation                   │  │
│   │  - Document upload                  │  │
│   │  - Text extraction with AI          │  │
│   │  - Anthropic API key (secure)       │  │
│   └─────────────────────────────────────┘  │
│                   │                          │
│   ┌─────────────────────────────────────┐  │
│   │  Document Engine                    │  │
│   │  - PDF processing                   │  │
│   │  - Real-time collaboration          │  │
│   └─────────────────────────────────────┘  │
│                   │                          │
│   ┌─────────────────────────────────────┐  │
│   │  PostgreSQL                         │  │
│   │  - Document storage                 │  │
│   └─────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## Prerequisites

- Docker and Docker Compose installed
- A server with public IP (VPS, home server, etc.)
- GitHub account
- Domain name (optional, can use IP address)

---

## Part 1: Self-Host Backend with Docker

### Step 1: Prepare Environment Variables

```bash
# Copy the example file
cp .env.production.example .env.production

# Edit with your values
nano .env.production
```

Set these values in `.env.production`:

```bash
# Strong password for PostgreSQL
POSTGRES_PASSWORD=your_super_secure_password_here

# Secret token for Document Engine API
API_AUTH_TOKEN=your_secret_api_token_here

# Your Anthropic API key
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here

# Disable dashboard in production
DASHBOARD_ENABLED=false

# CORS - Your GitHub Pages URL
ALLOWED_ORIGINS=https://yourusername.github.io
```

### Step 2: Verify JWT Keys Exist

```bash
# Check if keys exist
ls -la server/keys/

# If not, generate them
mkdir -p server/keys
openssl genpkey -algorithm RSA -out server/keys/private_key.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in server/keys/private_key.pem -out server/keys/public_key.pem
```

### Step 3: Start Docker Services

```bash
# Start all services
docker-compose -f docker-compose.production.yml --env-file .env.production up -d

# Check logs
docker-compose -f docker-compose.production.yml logs -f

# Check status
docker-compose -f docker-compose.production.yml ps
```

You should see:
```
nutrient-postgres          running
nutrient-document-engine   running
nutrient-backend          running
```

### Step 4: Test Backend

```bash
# Health check
curl http://localhost:3001/health

# Should return:
# {"status":"ok","documentEngineUrl":"http://document-engine:5000","jwtKeysLoaded":true,"timestamp":"..."}
```

### Step 5: Configure Firewall (Important!)

```bash
# Allow backend API port (adjust for your firewall)
# For ufw (Ubuntu):
sudo ufw allow 3001/tcp

# For firewalld (CentOS/RHEL):
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

### Step 6: Get Your Server URL

```bash
# Find your public IP
curl ifconfig.me

# Your backend URL will be:
# http://YOUR_PUBLIC_IP:3001
```

**Optional: Set up a domain and SSL**

For production, use a reverse proxy (nginx/Traefik) with SSL:

```bash
# Example nginx config
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Part 2: Deploy Frontend to GitHub Pages

### Step 1: Create GitHub Repository

```bash
# Initialize git (if not already)
git init

# Add remote (replace with your repo)
git remote add origin https://github.com/yourusername/your-repo-name.git

# Add all files
git add .
git commit -m "Initial commit"
git push -u origin main
```

### Step 2: Configure GitHub Secrets

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these secrets:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `VITE_API_URL` | Your backend URL | `http://your-server-ip:3001` or `https://api.yourdomain.com` |
| `VITE_BASE_PATH` | GitHub Pages path | `/your-repo-name/` or `/` for custom domain |

**Important:**
- If deploying to `https://yourusername.github.io/repo-name/`, use `/repo-name/`
- If using a custom domain, use `/`

### Step 3: Enable GitHub Pages

1. Go to **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. Save

### Step 4: Update Base Path in Code

The workflow will automatically use `VITE_BASE_PATH`, but you can also hardcode it:

```javascript
// vite.config.js - already configured!
base: process.env.VITE_BASE_PATH || '/',
```

### Step 5: Deploy

```bash
# Push to main branch to trigger deployment
git add .
git commit -m "Configure for GitHub Pages"
git push
```

Go to **Actions** tab to watch the deployment progress.

### Step 6: Access Your App

Once deployed, visit:
- **With repo path**: `https://yourusername.github.io/your-repo-name/`
- **Custom domain**: `https://yourdomain.com/`

---

## Testing the Full Setup

### 1. Test Frontend Access
```bash
# Open in browser
https://yourusername.github.io/your-repo-name/
```

### 2. Test Backend Connection

Open browser console (F12) and check:
```javascript
// Should show your backend URL
console.log('API URL:', import.meta.env.VITE_API_URL);
```

Upload a PDF and watch the network tab - requests should go to your backend.

### 3. Test Document Upload

1. Click "Choose PDF File"
2. Select a PDF
3. Watch for success message
4. PDF should load in viewer

### 4. Test Text Extraction

1. Click "Extract Text" button
2. AI cleanup should run (using your Anthropic key)
3. Extracted text appears on right side

---

## Docker Management Commands

### View Logs
```bash
# All services
docker-compose -f docker-compose.production.yml logs -f

# Specific service
docker-compose -f docker-compose.production.yml logs -f backend
docker-compose -f docker-compose.production.yml logs -f document-engine
```

### Restart Services
```bash
# Restart all
docker-compose -f docker-compose.production.yml restart

# Restart specific service
docker-compose -f docker-compose.production.yml restart backend
```

### Update Backend Code
```bash
# Pull latest code
git pull

# Rebuild and restart backend
docker-compose -f docker-compose.production.yml up -d --build backend
```

### Stop Services
```bash
# Stop all
docker-compose -f docker-compose.production.yml down

# Stop and remove volumes (⚠️ deletes database!)
docker-compose -f docker-compose.production.yml down -v
```

### Backup Database
```bash
# Backup PostgreSQL
docker exec nutrient-postgres pg_dump -U postgres document-engine > backup.sql

# Restore
cat backup.sql | docker exec -i nutrient-postgres psql -U postgres document-engine
```

---

## Security Best Practices

### 1. Secure Your API Keys

```bash
# NEVER commit .env.production
echo ".env.production" >> .gitignore

# Set proper permissions
chmod 600 .env.production
chmod 600 server/keys/*.pem
```

### 2. Use HTTPS (Production)

Set up SSL with Let's Encrypt:

```bash
# Install certbot
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d api.yourdomain.com

# Update nginx/traefik config to use cert
```

### 3. Configure CORS Properly

In `.env.production`:
```bash
# Only allow your frontend
ALLOWED_ORIGINS=https://yourusername.github.io
```

Update `server/server.js` to use this:
```javascript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));
```

### 4. Add Rate Limiting

Install package:
```bash
cd server
pnpm add express-rate-limit
```

Add to `server.js`:
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 5. Monitor Logs

Set up log rotation:
```bash
# Add to docker-compose.production.yml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

---

## Troubleshooting

### Backend not accessible from frontend

**Problem:** CORS errors in browser console

**Solution:**
```bash
# Check ALLOWED_ORIGINS in .env.production
ALLOWED_ORIGINS=https://yourusername.github.io

# Restart backend
docker-compose -f docker-compose.production.yml restart backend
```

### "Cannot connect to backend"

**Problem:** Network connection refused

**Solutions:**
1. Check firewall: `sudo ufw status`
2. Check backend is running: `docker-compose -f docker-compose.production.yml ps`
3. Check backend logs: `docker-compose -f docker-compose.production.yml logs backend`
4. Verify `VITE_API_URL` in GitHub secrets matches your server IP

### Document Engine fails to start

**Problem:** PostgreSQL connection errors

**Solutions:**
```bash
# Check PostgreSQL is running
docker-compose -f docker-compose.production.yml ps db

# Check PostgreSQL logs
docker-compose -f docker-compose.production.yml logs db

# Restart database
docker-compose -f docker-compose.production.yml restart db
```

### GitHub Pages deployment fails

**Problem:** Build errors in Actions tab

**Solutions:**
1. Check `VITE_API_URL` secret is set
2. Verify `VITE_BASE_PATH` is correct (include leading/trailing slashes)
3. Check Actions logs for specific error
4. Ensure Pages is enabled: Settings → Pages → Source: GitHub Actions

### 404 on GitHub Pages after reload

**Problem:** React Router paths return 404

**Solution:** This is already handled by the nginx config. If using GitHub Pages directly, add a `404.html` that redirects to `index.html`:

```bash
# Copy index.html to 404.html before deploying
cp dist/index.html dist/404.html
```

Or add this to your build script in `package.json`:
```json
"build": "vite build && cp dist/index.html dist/404.html"
```

---

## Cost Breakdown

- **GitHub Pages**: Free (public repos)
- **Server**: $5-20/month (VPS from DigitalOcean, Linode, Hetzner, etc.)
- **Anthropic API**: Pay per use (~$0.25 per 1M tokens for Haiku)
- **Domain** (optional): $10-15/year

**Total monthly cost:** $5-20 + API usage

---

## Updating Your Deployment

### Update Frontend (GitHub Pages)
```bash
# Make changes
git add .
git commit -m "Update frontend"
git push

# GitHub Actions automatically deploys
```

### Update Backend (Docker)
```bash
# Pull changes
git pull

# Rebuild backend
docker-compose -f docker-compose.production.yml up -d --build backend
```

### Update Environment Variables
```bash
# Edit .env.production
nano .env.production

# Restart services to apply
docker-compose -f docker-compose.production.yml restart
```

---

## Next Steps

1. ✅ Set up monitoring (Uptime Robot, Prometheus, etc.)
2. ✅ Configure automated backups
3. ✅ Set up SSL certificates (Let's Encrypt)
4. ✅ Add custom domain to GitHub Pages
5. ✅ Set up error tracking (Sentry, etc.)
6. ✅ Configure log aggregation

---

## Support

- GitHub Issues: File an issue in your repository
- Docker Compose Docs: https://docs.docker.com/compose/
- GitHub Pages Docs: https://docs.github.com/pages
- Nutrient Docs: https://nutrient.io/guides/web/

Your app is now deployed with:
- ✅ Backend API keys safely on your server
- ✅ Frontend hosted for free on GitHub Pages
- ✅ Full Docker orchestration
- ✅ Production-ready setup

Happy deploying! 🚀
