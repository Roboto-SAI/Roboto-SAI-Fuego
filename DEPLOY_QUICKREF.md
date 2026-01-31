# Roboto SAI Render Deployment - Quick Reference

## ? Critical Configuration

### render.yaml - Backend Service
```yaml
- type: web
  name: roboto-sai-backend
  runtime: docker
  dockerfilePath: ./backend/Dockerfile
  dockerContext: ./backend  # ?? MUST HAVE THIS LINE
  envVars:
    - key: PYTHONPATH
      value: "/app"  # NOT /app/backend
```

### render.yaml - Frontend Service
```yaml
- type: web
  name: roboto-sai-frontend
  runtime: docker
  dockerfilePath: ./Dockerfile
  dockerContext: .  # Root directory for frontend
```

## ?? Required Environment Variables

### Backend (Set in Render Dashboard)
- `XAI_API_KEY` - Your xAI Grok API key
- `SUPABASE_URL` - https://yourproject.supabase.co
- `SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `FRONTEND_ORIGIN` - https://roboto-sai-frontend.onrender.com
- `FRONTEND_HASH_ROUTER` - true
- `PYTHON_ENV` - production
- `COOKIE_SECURE` - true
- `COOKIE_SAMESITE` - none

### Frontend (Set in Render Dashboard)
- `VITE_API_BASE_URL` - https://roboto-sai-backend.onrender.com
- `VITE_SUPABASE_URL` - https://yourproject.supabase.co
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

## ?? Deploy Command
```bash
git add .
git commit -m "Deploy with dockerContext fix"
git push origin main
```

## ? Health Checks
- Backend: https://roboto-sai-backend.onrender.com/health
- Frontend: https://roboto-sai-frontend.onrender.com

## ?? Common Errors & Quick Fixes

| Error | Quick Fix |
|-------|-----------|
| "requirements.txt not found" | Add `dockerContext: ./backend` to render.yaml |
| "Module not found" | Set `PYTHONPATH=/app` (not `/app/backend`) |
| CORS errors | Verify `FRONTEND_ORIGIN` matches frontend URL |
| Auth fails | Run Supabase migration, check RLS policies |
| Build timeout | Check for large dependencies, optimize Dockerfile |

## ?? Pre-Deploy Checklist
- [ ] `dockerContext: ./backend` in render.yaml
- [ ] All env vars set in Render Dashboard
- [ ] Supabase migration executed
- [ ] Backend health endpoint exists
- [ ] Frontend builds locally (`npm run build`)
- [ ] TypeScript compiles (`npx tsc --noEmit`)

## ?? Verify Deployment
```bash
# Backend health
curl https://roboto-sai-backend.onrender.com/health

# Frontend
curl -I https://roboto-sai-frontend.onrender.com

# CORS
curl -H "Origin: https://roboto-sai-frontend.onrender.com" \
     https://roboto-sai-backend.onrender.com/health
```

## ?? Full Documentation
- Complete Guide: `DEPLOYMENT.md`
- Troubleshooting: `DEPLOYMENT_COMPLETE_GUIDE.md`
- Fixes Applied: `RENDER_DEPLOYMENT_FIXES.md`
