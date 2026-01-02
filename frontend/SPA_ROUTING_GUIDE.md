# Vercel SPA Routing Configuration
# ==================================
# This file explains how SPA routing works with Vercel

## Problem
When users directly access URLs like `/deteksi`, `/login`, or `/admin`:
- Vercel looks for physical files at those paths
- Files don't exist because React Router handles routing client-side
- Results in 404 NOT_FOUND error

## Solution: vercel.json rewrites

### 1. API Proxy (First Priority)
```json
{
  "source": "/api/(.*)",
  "destination": "https://deteksi-ruasjalantoll.onrender.com/api/$1"
}
```
- Proxies all `/api/*` requests to backend
- Maintains authentication headers
- Avoids CORS issues

### 2. SPA Fallback (Second Priority)  
```json
{
  "source": "/((?!api|_next|_static|favicon.ico|.*\\.).*)(.*)$",
  "destination": "/index.html"
}
```
- Matches all routes EXCEPT api, static assets, and files with extensions
- Serves `index.html` so React Router can handle routing
- Preserves static files (images, CSS, JS) normal serving

### Regex Breakdown:
- `(?!api|_next|_static|favicon.ico|.*\\.)` = Negative lookahead, excludes:
  - `/api/*` routes → handled by API proxy
  - `/_next/*` → Next.js assets (if any)  
  - `/_static/*` → Static assets
  - `favicon.ico` → Favicon
  - `.*\\..*` → Files with extensions (CSS, JS, images)
- `(.*)(.*)$` = Captures everything else → SPA routes

## Build Process
1. `npm run build` → Generates `dist/` folder
2. Vercel deploys `dist/` as static files
3. `vercel.json` rules apply at CDN level
4. React Router handles client-side routing

## Testing
- ✅ `/` → index.html (home)
- ✅ `/deteksi` → index.html → React Router → DeteksiPage 
- ✅ `/login` → index.html → React Router → LoginPage
- ✅ `/api/auth/login` → Proxied to backend
- ✅ `/assets/logo.png` → Served as static file

## Security
- API requests go through proper CORS
- Static assets served normally  
- No sensitive routes exposed
- Authentication headers preserved