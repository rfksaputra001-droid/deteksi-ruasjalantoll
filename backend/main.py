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
from app.routes import auth, admin, deteksi, histori, dashboard, perhitungan
from app.utils.logger import logger
from app.core.socket import socket_manager

# Lifespan handler for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events"""
    # Startup
    logger.info("🚀 Starting YOLO Detection Backend...")
    
    # Connect to MongoDB
    await connect_db()
    
    # Test Cloudinary connection
    await test_cloudinary_connection()
    
    # Create necessary directories
    os.makedirs("/tmp/uploads", exist_ok=True)
    os.makedirs("/tmp/temp", exist_ok=True)
    
    logger.info("✅ Server startup complete!")
    
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

# Setup CORS
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "https://deteksi-ruasjalantoll.vercel.app",
]

# Add configured URLs
if os.getenv("CLIENT_URL"):
    allowed_origins.append(os.getenv("CLIENT_URL"))
if os.getenv("FRONTEND_URL"):
    allowed_origins.append(os.getenv("FRONTEND_URL"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if os.getenv("NODE_ENV") == "production" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Socket.IO
socket_manager.mount_to(app)

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

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(deteksi.router, prefix="/api/deteksi", tags=["Detection"])
app.include_router(histori.router, prefix="/api/histori", tags=["History"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(perhitungan.router, prefix="/api/perhitungan", tags=["Calculation"])


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
