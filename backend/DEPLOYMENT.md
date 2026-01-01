# YOLO Detection Backend - Python FastAPI

🚀 **Pure Python backend dengan FastAPI + YOLO untuk deteksi kendaraan**

## Features
- ✅ FastAPI + Uvicorn (Pure Python, no Node.js)
- ✅ YOLO v8 vehicle detection (trained model)
- ✅ MongoDB + Motor (async)
- ✅ Cloudinary integration
- ✅ Socket.IO real-time updates
- ✅ JWT authentication
- ✅ Ready for Render deployment

## Quick Start

### Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn main:app --reload --host 0.0.0.0 --port 3000
```

### Environment Variables
Create `.env` file:
```bash
PORT=3000
MONGODB_URI=your_mongodb_connection
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
JWT_SECRET=your_jwt_secret
```

## Model Configuration
Using the trained YOLO model with optimized parameters:
- **Confidence:** 0.2 (from count_video.py)
- **IOU:** 0.3 (from count_video.py) 
- **Tracker:** botsort.yaml (from count_video.py)
- **Classes:** mobil, bus, truk

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user

### Detection
- `POST /api/deteksi/upload` - Upload video for detection
- `GET /api/deteksi/history` - Get detection history
- `GET /api/deteksi/status/{id}` - Get detection status

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - User management

## Default Login
- Email: `admin@yolo.com`
- Password: `Admin123!`

## Deployment

### Render.com
1. Connect your GitHub repo
2. Set environment variables
3. Use `render.yaml` configuration

### Environment Variables for Production
```
MONGODB_URI=your_production_mongodb
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
JWT_SECRET=your_production_jwt_secret
```

## Project Structure
```
backend/
├── app/
│   ├── config/         # Database, Cloudinary config
│   ├── models/         # Pydantic models
│   ├── routes/         # API routes
│   ├── middleware/     # Auth middleware
│   ├── services/       # YOLO detection service
│   ├── core/           # Socket.IO manager
│   └── utils/          # Utilities
├── models/             # YOLO model files
│   └── vehicle-night-yolo/
│       └── runs/detect/vehicle_night2/weights/best.pt
├── main.py             # FastAPI app
├── requirements.txt    # Dependencies
└── render.yaml         # Deployment config
```

## Technologies
- **FastAPI** - Modern Python web framework
- **Ultralytics** - YOLO v8 implementation
- **OpenCV** - Computer vision (headless)
- **Motor** - Async MongoDB driver
- **Cloudinary** - Video storage
- **Socket.IO** - Real-time communication