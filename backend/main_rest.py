"""
=============================================================================
YOLO Detection Backend - REST API Only (No WebSocket)
Simple polling-based progress tracking for Render + Vercel
=============================================================================
"""

import os
import sys
import asyncio
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.database import connect_db, close_db
from app.config.cloudinary import test_cloudinary_connection
from app.routes import auth, admin, histori, dashboard, perhitungan, dashboard_backend, status_dashboard
from app.routes.deteksi_rest import router as deteksi_router  # Use REST-only routes
from app.utils.logger import logger


# Lifespan handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events"""
    logger.info("🚀 Starting YOLO Detection Backend (REST API)...")
    
    try:
        await connect_db()
        await test_cloudinary_connection()
        
        os.makedirs("/tmp/uploads", exist_ok=True)
        os.makedirs("/tmp/temp", exist_ok=True)
        os.makedirs("/tmp/models", exist_ok=True)
        
        logger.info("✅ Server startup complete!")
        
    except Exception as e:
        logger.error(f"❌ Startup error: {e}")
        logger.info("⚠️  Continuing with limited functionality")
    
    yield
    
    logger.info("🛑 Shutting down server...")
    await close_db()
    logger.info("👋 Server shutdown complete!")


# Create FastAPI app
app = FastAPI(
    title="YOLO Detection API",
    description="Backend API for YOLO Traffic Detection - REST Only",
    version="3.0.0",
    lifespan=lifespan
)


# CORS Configuration - Simple and Direct
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "https://deteksi-ruasjalantoll.vercel.app",
        os.getenv("CLIENT_URL", ""),
        os.getenv("FRONTEND_URL", ""),
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",  # All Vercel deployments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Length", "Content-Range", "X-Total-Count"],
)

logger.info("🌐 CORS configured for Vercel + localhost")


# Root endpoint - health check
@app.get("/")
async def root():
    """Root endpoint for health check"""
    import datetime
    return {
        "status": "online",
        "message": "🚀 YOLO Detection Backend API (REST)",
        "version": "3.0.0",
        "mode": "REST-only (no WebSocket)",
        "endpoints": {
            "health": "/health",
            "api": "/api",
            "docs": "/docs",
            "upload": "/api/deteksi/upload",
            "status": "/api/deteksi/status/{tracking_id}"
        },
        "timestamp": datetime.datetime.utcnow().isoformat()
    }


@app.get("/health")
async def health_check():
    """Comprehensive health check"""
    import datetime
    
    try:
        from app.config.database import get_collection
        users = get_collection("users")
        db_status = "✅ Connected"
        try:
            await users.find_one({}, {"_id": 1})
        except:
            db_status = "❌ Connection Failed"
        
        from app.services.video_detection_rest import video_detection_rest_service
        model_status = "✅ Loaded" if video_detection_rest_service.model else "⏳ Not Loaded (lazy)"
        
        return {
            "status": "healthy",
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "database": db_status,
            "yolo_model": model_status,
            "active_processing": len(video_detection_rest_service.processing_tasks),
            "mode": "REST-only"
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.datetime.utcnow().isoformat()
        }


@app.get("/api")
async def api_info():
    """API information"""
    return {
        "status": "success",
        "message": "YOLO Detection API - REST Only",
        "version": "3.0.0",
        "endpoints": {
            "auth": "/api/auth",
            "admin": "/api/admin",
            "deteksi": "/api/deteksi",
            "histori": "/api/histori",
            "dashboard": "/api/dashboard",
            "perhitungan": "/api/perhitungan"
        },
        "notes": {
            "detection_flow": [
                "1. POST /api/deteksi/upload - Upload video, get tracking_id",
                "2. GET /api/deteksi/status/{tracking_id} - Poll every 2s for progress",
                "3. Status will be: queued → processing → uploading → completed",
                "4. When status=completed, result contains processed video URL"
            ]
        }
    }


# Include routers
try:
    app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
    app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
    app.include_router(deteksi_router, prefix="/api/deteksi", tags=["Detection"])
    app.include_router(histori.router, prefix="/api/histori", tags=["History"])
    app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
    app.include_router(perhitungan.router, prefix="/api/perhitungan", tags=["Calculation"])
    app.include_router(dashboard_backend.router, tags=["Backend Info"])
    app.include_router(status_dashboard.router, tags=["System Status"])
    logger.info("✅ All API routes registered")
except Exception as e:
    logger.error(f"❌ Route registration error: {e}")
    raise


if __name__ == "__main__":
    PORT = int(os.getenv("PORT", 3000))
    
    print("\n")
    print("╔═══════════════════════════════════════════════════╗")
    print("║    🚀 YOLO BACKEND SERVER - REST API ONLY 🚀      ║")
    print("╚═══════════════════════════════════════════════════╝")
    print(f"\n📍 Server: http://localhost:{PORT}")
    print("🔄 Mode: REST API with polling (NO WebSocket)")
    print("\n✅ Server starting...\n")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=PORT,
        reload=os.getenv("NODE_ENV") != "production",
        log_level="info"
    )
