# Complete Render Deployment Fix Guide

## Critical Fix Applied

### Issue: Docker Build Can't Find requirements.txt

**Problem**: 
```
ERROR: failed to calculate checksum: "/requirements.txt": not found
```

**Root Cause**: Missing `dockerContext` in render.yaml caused Docker to use root directory as build context instead of `backend/` directory.

**Solution**: Added `dockerContext: ./backend` to backend service in render.yaml

## All Changes Made

### 1. render.yaml
```yaml
# Added this line to backend service:
dockerContext: ./backend

# Also updated:
PYTHONPATH: /app  # Changed from /app/backend
```

### 2. backend/Dockerfile
- Removed `constraints.txt` dependency
- Simplified dependency installation
- Fixed working directory duplication

## Complete Deployment Checklist

### Pre-Deployment

- [ ] **Verify files exist in backend/**
  ```bash
  ls backend/requirements.txt  # Should exist
  ls backend/main.py          # Should exist
  ls backend/Dockerfile       # Should exist
  ```

- [ ] **Check render.yaml configuration**
  ```yaml
  dockerfilePath: ./backend/Dockerfile  ?
  dockerContext: ./backend              ? CRITICAL
  ```

- [ ] **Set environment variables in Render Dashboard**
  - Backend: XAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
  - Frontend: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

### Deployment

1. **Commit all changes**
   ```bash
   git add render.yaml backend/Dockerfile DEPLOYMENT.md
   git commit -m "Fix: Add dockerContext to prevent build failures"
   git push origin main
   ```

2. **Monitor Render Build**
   - Go to Render Dashboard > Backend Service > Logs
   - Watch for successful Docker build
   - Verify health check passes

3. **Test Endpoints**
   ```bash
   # Backend health check
   curl https://roboto-sai-backend.onrender.com/health
   
   # Frontend
   curl https://roboto-sai-frontend.onrender.com
   ```

## Common Deployment Issues & Solutions

### Issue 1: "requirements.txt not found"
**Solution**: Ensure `dockerContext: ./backend` is set in render.yaml ? FIXED

### Issue 2: "constraints.txt not found"
**Solution**: Updated Dockerfile to not require constraints.txt ? FIXED

### Issue 3: Module Import Errors
**Cause**: Wrong PYTHONPATH
**Solution**: Set `PYTHONPATH=/app` (not `/app/backend`) ? FIXED

### Issue 4: SDK Installation Fails
**Cause**: `roboto-sai-sdk` requires GitHub access
**Solution**: SDK is now optional - build continues without it ? FIXED

### Issue 5: CORS Errors
**Solution**: Verify these settings in backend:
```
FRONTEND_ORIGIN=https://roboto-sai-frontend.onrender.com
COOKIE_SECURE=true
COOKIE_SAMESITE=none
```

### Issue 6: Authentication Fails
**Solution**: 
1. Run Supabase migration: `supabase/migrations/001_knowledge_base_schema.sql`
2. Verify RLS policies are enabled
3. Check Supabase connection in logs

### Issue 7: Health Check Fails
**Solution**: 
- Verify `/api/health` endpoint exists in backend/main.py ? EXISTS
- Check `healthCheckPath: /api/health` in render.yaml ? SET

## Future-Proofing

### To Prevent Future Build Issues:

1. **Always set dockerContext**
   - For backend: `dockerContext: ./backend`
   - For frontend: `dockerContext: .`

2. **Use explicit paths in Dockerfile**
   - ? `COPY requirements.txt ./` (works when context is correct)
   - ? `COPY . /app/` (copies all files)

3. **Make dependencies optional**
   - ? SDK installation wrapped in try/except
   - ? Routers loaded with graceful fallback

4. **Environment variables**
   - ? All required vars documented in DEPLOYMENT.md
   - ? Sensitive vars use `sync: false` in render.yaml

5. **Health checks**
   - ? Multiple health endpoints: `/health` and `/api/health`
   - ? Returns proper JSON response

## Verification Steps

After deployment, verify:

```bash
# 1. Backend is running
curl https://roboto-sai-backend.onrender.com/health
# Expected: {"status":"healthy",...}

# 2. Frontend is accessible
curl -I https://roboto-sai-frontend.onrender.com
# Expected: HTTP/1.1 200 OK

# 3. CORS is working
curl -H "Origin: https://roboto-sai-frontend.onrender.com" \
     https://roboto-sai-backend.onrender.com/health
# Expected: Should include Access-Control-Allow-Origin header

# 4. Supabase connection
# Check Render logs for "Database initialized" message
```

## Emergency Rollback

If deployment fails:
```bash
# Revert to previous working commit
git log --oneline  # Find last working commit
git revert HEAD    # Or specific commit hash
git push origin main
```

## Support Resources

- Render Logs: Dashboard > Service > Logs
- Supabase Logs: Supabase Dashboard > Logs
- Health Check: https://roboto-sai-backend.onrender.com/health
- GitHub Issues: Report deployment issues with full error logs
