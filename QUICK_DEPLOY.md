# Quick Deploy - Docker + GitHub Pages

**Step-by-step guide to deploy in 10 minutes**

## Overview

- **Backend**: Self-hosted with Docker (your server)
- **Frontend**: GitHub Pages (free hosting)
- **Security**: API keys stay on your server, never exposed

---

## Step 1: Prepare Environment (2 minutes)

```bash
# Create production environment file
cp .env.production.example .env.production

# Edit it
nano .env.production
```

Update these values:
```bash
POSTGRES_PASSWORD=change_this_password
API_AUTH_TOKEN=change_this_token
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
ALLOWED_ORIGINS=https://yourusername.github.io
```

Save and exit (Ctrl+X, Y, Enter)

---

## Step 2: Start Docker Services (2 minutes)

```bash
# Use the helper script
./deploy-docker.sh

# Select option 1 (Start services)
```

Or manually:
```bash
docker-compose -f docker-compose.production.yml --env-file .env.production up -d
```

**Verify it's running:**
```bash
# Check health
curl http://localhost:3001/health

# Should return:
# {"status":"ok",...}
```

---

## Step 3: Configure GitHub Repository (3 minutes)

### A. Create Repository

1. Go to [github.com/new](https://github.com/new)
2. Name: `nutrient-extract-data` (or your choice)
3. Public or Private
4. Create repository

### B. Push Code

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit"

# Add your repository
git remote add origin https://github.com/yourusername/nutrient-extract-data.git
git branch -M main
git push -u origin main
```

---

## Step 4: Configure GitHub Secrets (2 minutes)

1. Go to your repository on GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add two secrets:

**Secret 1:**
- Name: `VITE_API_URL`
- Value: `http://YOUR_SERVER_IP:3001` (replace with your server IP or domain)

**Secret 2:**
- Name: `VITE_BASE_PATH`
- Value: `/nutrient-extract-data/` (use your repo name)
  - Or `/` if using custom domain

**Find your server IP:**
```bash
curl ifconfig.me
```

---

## Step 5: Enable GitHub Pages (1 minute)

1. Go to **Settings** → **Pages**
2. Under **Source**, select: **GitHub Actions**
3. Save

---

## Step 6: Deploy! (1 minute)

The GitHub Action will automatically run on push.

**Watch deployment:**
1. Go to **Actions** tab
2. Click on the running workflow
3. Wait for green checkmark ✓

**Access your app:**
- Visit: `https://yourusername.github.io/nutrient-extract-data/`

---

## Troubleshooting

### ❌ "Cannot connect to backend"

**Check backend is running:**
```bash
docker-compose -f docker-compose.production.yml ps
```

**Check logs:**
```bash
docker-compose -f docker-compose.production.yml logs backend
```

**Test backend directly:**
```bash
curl http://localhost:3001/health
```

### ❌ CORS errors

**Update ALLOWED_ORIGINS in .env.production:**
```bash
ALLOWED_ORIGINS=https://yourusername.github.io
```

**Restart backend:**
```bash
docker-compose -f docker-compose.production.yml restart backend
```

### ❌ GitHub Action fails

**Check secrets are set:**
- Go to Settings → Secrets → Actions
- Verify `VITE_API_URL` and `VITE_BASE_PATH` exist

**Check Actions logs:**
- Go to Actions tab
- Click on failed workflow
- Read error message

### ❌ 404 on GitHub Pages

**Wrong base path:**
- If URL is `https://username.github.io/repo-name/`
- `VITE_BASE_PATH` should be `/repo-name/` (with slashes!)

### ❌ "Port already in use"

**Stop existing services:**
```bash
docker-compose -f docker-compose.production.yml down
```

Or check what's using port 3001:
```bash
lsof -i :3001
```

---

## Management Commands

### View logs
```bash
docker-compose -f docker-compose.production.yml logs -f
```

### Restart backend
```bash
docker-compose -f docker-compose.production.yml restart backend
```

### Stop all services
```bash
docker-compose -f docker-compose.production.yml down
```

### Update backend code
```bash
git pull
docker-compose -f docker-compose.production.yml up -d --build backend
```

### Update frontend
```bash
git add .
git commit -m "Update frontend"
git push
# GitHub Actions automatically deploys
```

---

## Security Checklist

- [ ] Changed `POSTGRES_PASSWORD` from default
- [ ] Changed `API_AUTH_TOKEN` from default
- [ ] Set real `ANTHROPIC_API_KEY`
- [ ] Set `ALLOWED_ORIGINS` to your GitHub Pages URL
- [ ] Confirmed `.env.production` is in `.gitignore`
- [ ] Never committed API keys to git

---

## Next Steps

**For production:**
1. Set up SSL/HTTPS (use reverse proxy with Let's Encrypt)
2. Add rate limiting (see DEPLOYMENT.md)
3. Set up monitoring
4. Configure automated backups
5. Use a domain name instead of IP

**Optional improvements:**
- Custom domain for GitHub Pages
- CDN for faster frontend delivery
- Database backups schedule
- Log aggregation

---

## Need Help?

- **Full guide**: See `DOCKER_GITHUB_DEPLOYMENT.md`
- **Security**: See `DEPLOYMENT.md`
- **Issues**: File a GitHub issue

---

## Quick Reference

| Component | URL | Notes |
|-----------|-----|-------|
| Backend API | `http://YOUR_IP:3001` | Your server |
| Frontend | `https://username.github.io/repo/` | GitHub Pages |
| Health Check | `http://YOUR_IP:3001/health` | Test backend |
| Document Engine | `http://localhost:5000` | Internal only |
| PostgreSQL | `localhost:5432` | Internal only |

**Your API key is safe!** It's only on your server, never in the frontend code or GitHub.

Happy deploying! 🚀
