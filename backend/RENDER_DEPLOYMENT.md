# Render Deployment Guide

## Quick Deploy to Render

1. **Create New Web Service**:
   - Connect your GitHub repository
   - Select "Build and deploy from a Git repository"
   - Choose this repository and the `backend` folder

2. **Environment Variables** (required):
   ```
   NODE_ENV=production
   MONGODB_URI=your-mongodb-atlas-connection-string
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   CLIENT_URL=your-frontend-domain
   ```

3. **Build Settings**:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Root Directory**: `backend`

4. **Additional Render Settings**:
   - **Runtime**: Node.js
   - **Auto-Deploy**: Yes
   - **Health Check Path**: `/api/info/health` (optional)

## Environment Variables Configuration

Copy these environment variables to your Render service:

### Required Variables
- `NODE_ENV`: Set to "production"
- `MONGODB_URI`: Your MongoDB Atlas connection string
- `JWT_SECRET`: A secure secret key (minimum 32 characters)
- `CLOUDINARY_CLOUD_NAME`: Your Cloudinary cloud name
- `CLOUDINARY_API_KEY`: Your Cloudinary API key  
- `CLOUDINARY_API_SECRET`: Your Cloudinary API secret

### Optional Variables (with defaults)
- `CLIENT_URL`: Your frontend domain (for CORS)
- `CLOUDINARY_FOLDER`: Folder name in Cloudinary (default: "yolo-deteksi")
- `MAX_VIDEO_SIZE`: Maximum video file size in bytes (default: 5GB)
- `JWT_EXPIRE`: JWT expiration time (default: "7d")

## Post-Deployment Steps

1. **Update Frontend API URL**: 
   Update your frontend's `src/config/api.js` with the new Render URL

2. **Test the API**:
   - Health check: `https://your-app.onrender.com/api/info/health`
   - API info: `https://your-app.onrender.com/api/info`

3. **Admin Account**:
   Create your first admin account via the `/auth/register-admin` endpoint

## Troubleshooting

### Common Issues:
1. **Python/YOLO Issues**: Render may need additional Python setup
2. **Memory Limits**: Video processing might hit memory limits
3. **File Upload**: Large video uploads might timeout

### Solutions:
- For Python issues, add a `requirements.txt` in the backend folder
- Consider using Render's paid plans for more memory
- Implement chunked upload for large videos

## Health Check Endpoint

The backend provides a health check at `/api/info/health` that returns:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "database": "connected",
  "cloudinary": "configured"
}
```

## Architecture

```
Frontend (React/Vite) → Backend API (Node.js/Express) → MongoDB Atlas
                     ↳ Cloudinary (Video Storage)
                     ↳ Python YOLO (Detection)
```

## API Endpoints

- `POST /auth/login` - User authentication
- `POST /auth/register` - User registration  
- `GET /dashboard` - Dashboard data
- `POST /deteksi/process` - Video processing
- `GET /histori` - Detection history
- `GET /admin/users` - User management (Admin only)

## Support

For deployment issues, check:
1. Render build logs
2. Application logs in Render dashboard  
3. Environment variables configuration
4. MongoDB Atlas network access settings