# 🚀 PANDUAN DEPLOYMENT KE RENDER.COM

## ✅ Masalah yang Sudah Diperbaiki:

1. **"Deteksi gagal: Python script failed with code 1"** - Fixed ✅
2. **ModuleNotFoundError OpenCV** - Fixed ✅  
3. **Cookie CORS errors** - Fixed ✅
4. **Python environment issues** - Fixed ✅

## 🔧 Perbaikan yang Dilakukan:

### 1. Docker Configuration
- ✅ Multi-stage build untuk efisiensi
- ✅ Semua system dependencies untuk OpenCV
- ✅ Non-root user untuk keamanan
- ✅ Environment variables yang tepat

### 2. Python Script Fixes
- ✅ Dynamic Python executable detection
- ✅ Proper environment variables passing
- ✅ Enhanced error handling untuk OpenCV/YOLO
- ✅ Directory creation dengan permissions

### 3. Startup Verification
- ✅ Comprehensive dependency checking
- ✅ YOLO model preloading
- ✅ System resource validation
- ✅ Directory setup automation

## 🚀 Cara Deploy ke Render:

### Step 1: Render Dashboard Setup
1. Login ke [Render.com](https://render.com)
2. Klik **"New +"** → **"Web Service"**
3. Connect GitHub repository: `deteksi-ruasjalantoll`
4. Pilih branch: `main`

### Step 2: Configuration
```
Name: yolo-detection-api
Runtime: Docker
Region: Singapore
Plan: Starter ($7/month) atau Standard ($25/month)

Root Directory: (kosongkan)
Dockerfile Path: backend/Dockerfile  
Docker Context: backend
Docker Command: (kosongkan, akan auto-detect)
```

### Step 3: Environment Variables
Set di Render dashboard (sebagai **Secret**):

```bash
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname

# JWT Secret  
JWT_SECRET=your-super-secret-jwt-key-here-min-32-chars

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345  
CLOUDINARY_API_SECRET=your-api-secret-key
```

### Step 4: Deploy
1. Klik **"Create Web Service"**
2. Wait for build (15-20 minutes first time)
3. Monitor logs untuk errors

## 📊 Expected Build Output:

```
✅ OpenCV 4.11.0 installed successfully
✅ NumPy 1.26.3 installed successfully  
✅ YOLO installed successfully
✅ PyTorch 2.1.2+cpu installed successfully
✅ All checks passed! Ready to start server...
```

## 🔍 Troubleshooting:

### Build Failed?
```bash
# Check logs for:
- "System dependencies missing" → System packages issue
- "OpenCV import failed" → Library linkage problem  
- "YOLO model download failed" → Network/disk space
- "Permission denied" → User/directory permissions
```

### Runtime Errors?
```bash
# Check application logs:
- Python script failures → Check environment variables
- Connection timeouts → Check MongoDB URI
- CORS errors → Update frontend API URLs
```

### Performance Issues?
```bash
# Upgrade plan:
- Starter: 0.5 CPU, 512MB RAM
- Standard: 1 CPU, 2GB RAM (recommended for YOLO)
```

## 🌐 URLs After Deployment:

```
Backend API: https://yolo-detection-api.onrender.com
Health Check: https://yolo-detection-api.onrender.com/health
API Docs: https://yolo-detection-api.onrender.com/docs

Frontend: https://deteksi-ruasjalantoll.vercel.app
```

## 🔗 Update Frontend Config:

Update `frontend/.env.production`:
```
VITE_API_BASE_URL=https://yolo-detection-api.onrender.com
```

Redeploy frontend di Vercel setelah backend ready.

## 📝 Post-Deployment Checklist:

- [ ] Health check returns 200 OK
- [ ] Frontend can login successfully  
- [ ] Video upload works without errors
- [ ] YOLO detection processing completes
- [ ] Socket.IO real-time updates working
- [ ] Video results can be viewed

## 🆘 Support:

Jika masih ada masalah, cek:
1. Render build logs
2. Application logs  
3. Browser console errors
4. Network tab untuk API calls

## 🎉 Success Indicators:

- No "Python script failed with code 1" 
- Video upload progress bars working
- Detection results showing properly
- No CORS errors in browser console

const API_BASE_URL = 'https://deteksi-ruasjalantoll.onrender.com';