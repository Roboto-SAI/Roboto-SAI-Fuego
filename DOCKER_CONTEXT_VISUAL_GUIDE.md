# Render Docker Context Visual Guide

## The Problem (BEFORE FIX)

```
Repository Root /
??? backend/
?   ??? Dockerfile          ? Render uses THIS
?   ??? requirements.txt    ? File is HERE
?   ??? main.py
??? src/
??? render.yaml

render.yaml says:
  dockerfilePath: ./backend/Dockerfile
  dockerContext: ? MISSING! Defaults to "/"

Docker looks in "/" for:
  requirements.txt ? NOT FOUND! File is in /backend/
```

## The Solution (AFTER FIX)

```
Repository Root /
??? backend/                ? dockerContext points HERE
?   ??? Dockerfile          ? Render uses this
?   ??? requirements.txt    ? File is HERE
?   ??? main.py
??? src/
??? render.yaml

render.yaml says:
  dockerfilePath: ./backend/Dockerfile
  dockerContext: ./backend   ? ADDED THIS!

Docker looks in "/backend/" for:
  requirements.txt ? FOUND! ?
```

## Why This Matters

### Without dockerContext:
```yaml
dockerfilePath: ./backend/Dockerfile  # Render finds Dockerfile here
# dockerContext defaults to repository root "/"

# Dockerfile says: COPY requirements.txt ./
# Docker looks in: / (root)
# File location: /backend/requirements.txt
# Result: ERROR - not found ?
```

### With dockerContext:
```yaml
dockerfilePath: ./backend/Dockerfile  # Render finds Dockerfile here
dockerContext: ./backend              # Docker uses THIS as root

# Dockerfile says: COPY requirements.txt ./
# Docker looks in: /backend/ (context root)
# File location: /backend/requirements.txt
# Result: SUCCESS - found ?
```

## Visual File Resolution

### Scenario 1: dockerContext = "/" (root) - WRONG
```
Repository Structure:
/
??? backend/
?   ??? requirements.txt  ? File is here
?   ??? Dockerfile

Dockerfile command:
COPY requirements.txt ./

Docker resolution:
/ + requirements.txt = /requirements.txt ? NOT FOUND ?
```

### Scenario 2: dockerContext = "./backend" - CORRECT
```
Repository Structure:
/
??? backend/              ? Context starts here
?   ??? requirements.txt  ? File is here
?   ??? Dockerfile

Dockerfile command:
COPY requirements.txt ./

Docker resolution:
./backend + requirements.txt = ./backend/requirements.txt ? FOUND ?
```

## The Fix in render.yaml

```yaml
services:
  - type: web
    name: roboto-sai-backend
    runtime: docker
    dockerfilePath: ./backend/Dockerfile    # Path to Dockerfile
    dockerContext: ./backend                # ? ADD THIS LINE
    
    # Now Docker can find files relative to ./backend/
```

## Both Services Configuration

```yaml
services:
  # Backend Service
  - type: web
    name: roboto-sai-backend
    dockerfilePath: ./backend/Dockerfile
    dockerContext: ./backend     ? Files in backend/ directory
    
  # Frontend Service  
  - type: web
    name: roboto-sai-frontend
    dockerfilePath: ./Dockerfile
    dockerContext: .             ? Files in root directory
```

## Common Mistakes to Avoid

### ? WRONG - Missing dockerContext
```yaml
dockerfilePath: ./backend/Dockerfile
# Docker will look in repository root
```

### ? WRONG - Incorrect path
```yaml
dockerfilePath: ./backend/Dockerfile
dockerContext: .  # Still looking in root!
```

### ? CORRECT - Matching context
```yaml
dockerfilePath: ./backend/Dockerfile
dockerContext: ./backend  # Context matches Dockerfile location
```

## Testing the Fix

### Before pushing to Render, test locally:

```bash
# Navigate to backend directory
cd backend

# Build with Docker (simulates Render)
docker build -t test-backend .

# If successful, you'll see:
# ? Successfully copied requirements.txt
# ? Successfully installed dependencies
# ? Container ready
```

## Quick Reference Table

| File Location | dockerContext | COPY Command | Works? |
|--------------|---------------|--------------|--------|
| /backend/requirements.txt | not set (/) | COPY requirements.txt | ? No |
| /backend/requirements.txt | ./backend | COPY requirements.txt | ? Yes |
| /requirements.txt | not set (/) | COPY requirements.txt | ? Yes |
| /backend/requirements.txt | . | COPY backend/requirements.txt | ? Yes (but wrong pattern) |

## The Golden Rule

**Always match dockerContext to the directory containing your source files**

```
If Dockerfile is in:     Set dockerContext to:
./backend/Dockerfile  ?  ./backend
./Dockerfile          ?  .
./services/api/       ?  ./services/api
```

## Verification Checklist

After setting dockerContext, verify:
- [ ] Dockerfile location matches context path
- [ ] COPY commands are relative to context
- [ ] Build succeeds locally with docker build
- [ ] Render build logs show successful COPY operations
- [ ] No "file not found" errors in logs

---

**Remember**: `dockerContext` is WHERE Docker looks for files, `dockerfilePath` is WHERE the Dockerfile IS.

Match them correctly and your builds will succeed! ??
