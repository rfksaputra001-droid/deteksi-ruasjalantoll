# API Troubleshooting Guide
# Last Updated: January 2, 2026

## Issues Fixed

### 1. HTTP 401 (Unauthorized) - History Endpoints
**Problem**: Frontend calls `/api/histori/list` but backend only has `/api/histori/`
**Solution**: Added alias route `/list` in histori.py that calls the same function

**Backend Routes Added**:
```python
@router.get("/list")
async def get_history_list(...):
    return await get_history(page, limit, actionType, user)
```

### 2. HTTP 404 (Not Found) - Route Mismatch  
**Problem**: Frontend and backend endpoint naming inconsistency
**Solution**: Added compatibility aliases for all critical endpoints

### 3. HTTP 404 (Not Found) - Root Endpoint Missing
**Problem**: Render health check fails - no root `/` endpoint
**Solution**: Added root endpoint for health check and service discovery

**Root Endpoint Added**:
```python
@app.get("/")
async def root():
    """Root endpoint for health check"""
    return {
        "status": "online",
        "message": "🚀 YOLO Detection Backend API", 
        "version": "2.0.0",
        "endpoints": {...}
    }
```

### 4. CORS Header Missing - Production Deployment  
**Problem**: 'Access-Control-Allow-Origin' missing on Render deployment
**Solution**: Enhanced CORS configuration with explicit headers and origins

**CORS Issues Fixed**:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # Always use specific origins
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
    allow_headers=["Accept", "Content-Type", "Authorization", ...],
    expose_headers=["Access-Control-Allow-Origin", ...],
)
```

### 5. Socket.IO WSS Connection Failed
**Problem**: Frontend trying to connect to WS/WSS when should use HTTP/HTTPS
**Solution**: Let Socket.IO client handle protocol conversion automatically

**Before**:
```javascript
// Wrong - manual protocol conversion
const SOCKET_URL = baseUrl.replace('https://', 'wss://');
```

**After**:
```javascript  
// Correct - let Socket.IO handle it
const SOCKET_URL = baseUrl; // Keep original HTTP/HTTPS
```

**Socket.IO Options**:
```javascript
io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  upgrade: true,
  rememberUpgrade: true,
  path: '/socket.io/',
  timeout: 20000
})
```

## Authentication Flow
1. Frontend stores JWT token in localStorage
2. `getAuthHeaders()` adds `Authorization: Bearer ${token}` 
3. Backend `get_current_user()` validates token via HTTPBearer
4. User data returned for authorized requests

## Expected Results
- ✅ History page loads without 401/404 errors
- ✅ Socket.IO connects via WSS on HTTPS (Render)
- ✅ Real-time detection progress works
- ✅ All API endpoints respond correctly
- ✅ CORS headers properly configured for production
- ✅ Root endpoint resolves 404 health check issues

## Deployment Status
- **Latest Commit**: `ba36763` - Root endpoint + CORS fixes applied
- **Status**: Auto-deployed to Render  
- **CORS**: Enhanced configuration with explicit headers
- **Frontend**: Should connect properly to backend API + Socket.IO
- **Health Check**: Root endpoint added for Render monitoring