# ========================================
# COMPLETE PRODUCTION ENVIRONMENT SETUP
# ========================================

## BACKEND (Render) Environment Variables

### 1. Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/yolo_detection?retryWrites=true&w=majority
DATABASE_NAME=yolo_detection

### 2. Authentication & Security
JWT_SECRET=your_super_secure_jwt_secret_key_at_least_32_characters_long
JWT_EXPIRES_IN=7d

### 3. Cloud Storage (Cloudinary)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

### 4. Server Configuration  
PORT=10000
NODE_ENV=production
PYTHON_VERSION=3.11.9

## FRONTEND (Vercel) Environment Variables

### 1. API Configuration
VITE_API_BASE_URL=https://your-backend-service.onrender.com

## ========================================
# DEPLOYMENT CHECKLIST
## ========================================

### ✅ Render Backend Deployment
1. Set all backend environment variables in Render Dashboard
2. Verify render.yaml configuration
3. Check Python 3.11.9 is used
4. Confirm all dependencies install successfully
5. Test health check endpoint: /health
6. Verify Socket.IO endpoint: /socket.io/
7. Test API endpoints with authentication

### ✅ Vercel Frontend Deployment  
1. Set VITE_API_BASE_URL environment variable
2. Verify vercel.json rewrites configuration
3. Test SPA routing (direct URL access)
4. Verify API proxy functionality
5. Test Socket.IO connection to backend
6. Confirm authentication flow

### ✅ Database Setup (MongoDB Atlas)
1. Create MongoDB Atlas cluster
2. Set up database user and password
3. Configure IP whitelist (0.0.0.0/0 for simplicity)
4. Create database: yolo_detection
5. Create collections: users, deteksi, histori, perhitungan

### ✅ Cloud Storage Setup (Cloudinary)
1. Create Cloudinary account
2. Get cloud name, API key, and API secret
3. Configure upload presets for videos
4. Set up folders: deteksi/, results/

## ========================================
# TESTING & VERIFICATION
## ========================================

### 🔍 Health Checks
- Backend: https://your-service.onrender.com/health
- Frontend: https://your-app.vercel.app/
- Socket.IO: Check browser dev tools for connection

### 🔍 API Testing
- Authentication: POST /api/auth/login
- File Upload: POST /api/deteksi/upload
- Detection List: GET /api/deteksi/list
- History: GET /api/histori/list

### 🔍 Real-time Testing  
- Upload a video file
- Monitor Socket.IO events in browser console
- Verify progress updates appear in real-time
- Check final results are stored properly

## ========================================
# TROUBLESHOOTING
## ========================================

### Common Issues & Solutions

1. **503 Database Error**
   - Check MONGODB_URI format
   - Verify MongoDB Atlas IP whitelist
   - Check database user permissions

2. **Socket.IO Connection Failed**
   - Verify VITE_API_BASE_URL includes https://
   - Check Render service is running
   - Verify /socket.io/ path is accessible

3. **File Upload Errors**
   - Check file size limits (50MB)
   - Verify Cloudinary credentials
   - Check /tmp directory permissions

4. **Authentication Issues**
   - Verify JWT_SECRET is set
   - Check token expiry settings
   - Verify user data in database

5. **YOLO Model Loading Failed**
   - Check internet connectivity on Render
   - Verify /tmp/models directory exists
   - Check sufficient memory allocation

## ========================================
# MONITORING & LOGGING
## ========================================

### Backend Logs (Render)
- View real-time logs in Render dashboard
- Monitor startup messages
- Check for error patterns
- Monitor memory/CPU usage

### Frontend Errors (Vercel)
- Check Vercel deployment logs
- Monitor browser console for errors
- Check Network tab for API failures
- Verify environment variables

### Database Monitoring
- MongoDB Atlas monitoring dashboard
- Check connection counts
- Monitor query performance
- Verify data integrity

## ========================================
# SECURITY CONSIDERATIONS
## ========================================

### Production Security
- Use strong JWT secrets (32+ characters)
- Enable HTTPS everywhere
- Implement rate limiting
- Sanitize file uploads
- Validate all input data
- Monitor for suspicious activity
- Regular security updates
- Backup database regularly