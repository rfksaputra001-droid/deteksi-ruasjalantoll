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

**Frontend Endpoints**:
- `${API_BASE_URL}/api/histori/list` ✅ Now works
- `${API_BASE_URL}/api/histori/detail/${id}` ✅ Already works

### 3. Socket.IO WSS Connection Failed
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

## Deployment Status
- Commit: `50d92b7` - All fixes applied
- Status: Auto-deployed to Render
- Frontend: Should connect properly to backend API + Socket.IO