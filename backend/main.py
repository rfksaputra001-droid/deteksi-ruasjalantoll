"""
=============================================================================
YOLO Detection Backend - Pure Python with FastAPI
Converted from Node.js to Python for seamless YOLO integration
=============================================================================
"""

import os
import sys
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config.database import connect_db, close_db
from app.config.cloudinary import test_cloudinary_connection
from app.routes import auth, admin, deteksi, histori, dashboard, perhitungan, dashboard_backend
from app.utils.logger import logger
from app.core.socket import socket_manager

# Lifespan handler for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events"""
    # Startup
    logger.info("🚀 Starting YOLO Detection Backend...")
    
    try:
        # Connect to MongoDB
        await connect_db()
        
        # Test Cloudinary connection
        await test_cloudinary_connection()
        
        # Create necessary directories
        os.makedirs("/tmp/uploads", exist_ok=True)
        os.makedirs("/tmp/temp", exist_ok=True)
        os.makedirs("/tmp/models", exist_ok=True)
        
        # Verify YOLO model availability
        model_path = "/tmp/models/yolov8n.pt"
        if not os.path.exists(model_path):
            logger.info("📥 Downloading YOLO model...")
            # YOLO will auto-download on first use
        
        logger.info("✅ Server startup complete!")
        
    except Exception as e:
        logger.error(f"❌ Startup error: {e}")
        # Don't crash, just log the error
        logger.info("⚠️  Continuing startup with limited functionality")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down server...")
    await close_db()
    logger.info("👋 Server shutdown complete!")


# Create FastAPI app
app = FastAPI(
    title="YOLO Detection API",
    description="Backend API for YOLO Traffic Detection System",
    version="2.0.0",
    lifespan=lifespan
)

# Setup CORS - Allow all Vercel preview deployments
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:5174", 
    "http://localhost:3000",
    "https://deteksi-ruasjalantoll.vercel.app",
    "https://deteksi-ruasjalantoll-ehl0of5sj-rfksaputra001-droids-projects.vercel.app",
]

# Add configured URLs
if os.getenv("CLIENT_URL"):
    allowed_origins.append(os.getenv("CLIENT_URL"))
if os.getenv("FRONTEND_URL"):
    allowed_origins.append(os.getenv("FRONTEND_URL"))

# Log CORS configuration for debugging
logger.info(f"🌐 CORS allowed origins: {allowed_origins}")
logger.info(f"🔧 NODE_ENV: {os.getenv('NODE_ENV', 'development')}")

# Custom CORS middleware to handle Vercel preview URLs dynamically
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

class DynamicCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        origin = request.headers.get("origin", "")
        
        # Check if origin is allowed (including Vercel preview URLs)
        is_allowed = (
            origin in allowed_origins or
            origin.endswith(".vercel.app") or  # Allow all Vercel deployments
            origin.startswith("http://localhost")  # Allow all localhost
        )
        
        # Handle preflight OPTIONS request
        if request.method == "OPTIONS":
            response = Response(status_code=200)
            if is_allowed:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH"
                response.headers["Access-Control-Allow-Headers"] = "Accept, Accept-Language, Content-Language, Content-Type, Authorization, X-Requested-With, Origin"
            return response
        
        # Process the request
        response = await call_next(request)
        
        # Add CORS headers to response
        if is_allowed:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
        
        return response

# Add custom CORS middleware
app.add_middleware(DynamicCORSMiddleware)

# Also add standard CORS middleware as fallback
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins as fallback
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Mount Socket.IO
socket_manager.mount_to(app)

# Root endpoint - for Render health check
@app.get("/")
async def root():
    """Root endpoint for health check"""
    import datetime
    return {
        "status": "online",
        "message": "🚀 YOLO Detection Backend API",
        "version": "2.0.0",
        "endpoints": {
            "health": "/health",
            "api": "/api", 
            "docs": "/docs",
            "dashboard": "/backend-info"
        },
        "timestamp": datetime.datetime.utcnow().isoformat()
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    import datetime
    
    # Check environment variables
    env_status = {
        "MONGODB_URI": "✅ Set" if os.getenv("MONGODB_URI") else "❌ Missing",
        "CLOUDINARY_CLOUD_NAME": "✅ Set" if os.getenv("CLOUDINARY_CLOUD_NAME") else "❌ Missing",
        "DATABASE_NAME": os.getenv("DATABASE_NAME", "yolo_detection"),
        "PORT": os.getenv("PORT", "3000")
    }
    
    return {
        "status": "success",
        "message": "Server is running",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "version": "2.0.0",
        "environment": env_status,
        "python_version": sys.version
    }

# API info endpoint
@app.get("/api")
async def api_info():
    """API information endpoint"""
    return {
        "status": "success",
        "message": "YOLO Detection API - Python Backend",
        "version": "2.0.0",
        "endpoints": {
            "auth": "/api/auth",
            "admin": "/api/admin",
            "deteksi": "/api/deteksi",
            "histori": "/api/histori",
            "dashboard": "/api/dashboard",
            "perhitungan": "/api/perhitungan"
        }
    }

# Include routers with proper error handling
try:
    app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
    app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
    app.include_router(deteksi.router, prefix="/api/deteksi", tags=["Detection"])
    app.include_router(histori.router, prefix="/api/histori", tags=["History"])
    app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
    app.include_router(perhitungan.router, prefix="/api/perhitungan", tags=["Calculation"])
    app.include_router(dashboard_backend.router, tags=["Backend Info"])
    logger.info("✅ All API routes registered successfully")
except Exception as e:
    logger.error(f"❌ Error registering routes: {e}")
    raise


if __name__ == "__main__":
    PORT = int(os.getenv("PORT", 3000))
    
    print("\n")
    print("╔═══════════════════════════════════════════════════╗")
    print("║       🚀 YOLO PYTHON BACKEND SERVER 🚀            ║")
    print("╚═══════════════════════════════════════════════════╝")
    print(f"\n📍 Server: http://localhost:{PORT}")
    print(f"⚡ Environment: {os.getenv('NODE_ENV', 'development')}")
    print("🐍 Pure Python + FastAPI + YOLO")
    print("\n✅ Server starting...\n")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=PORT,
        reload=os.getenv("NODE_ENV") != "production",
        log_level="info"
    )
