"""
Database Configuration - MongoDB with Motor (async driver)
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient
from app.utils.logger import logger

# Global database client
client: AsyncIOMotorClient = None
db = None


async def connect_db():
    """Connect to MongoDB"""
    global client, db
    
    mongodb_uri = os.getenv("MONGODB_URI")
    
    if not mongodb_uri:
        logger.warning("⚠️  MONGODB_URI not set - using fallback or skipping database")
        # In production, this should be set in Render environment variables
        # For now, we'll create a placeholder to prevent startup failure
        logger.warning("⚠️  Database connection will be skipped for this startup")
        return
    
    try:
        client = AsyncIOMotorClient(mongodb_uri)
        
        # Get database name from URI or use default
        db_name = os.getenv("DB_NAME", "yolo_detection")
        db = client[db_name]
        
        # Test connection
        await client.admin.command('ping')
        
        logger.info(f"✅ MongoDB Connected: {client.HOST}")
        logger.info(f"📊 Database: {db_name}")
        
        # Create indexes
        await create_indexes()
        
    except Exception as e:
        logger.error(f"❌ MongoDB connection failed: {str(e)}")
        raise


async def create_indexes():
    """Create database indexes for performance"""
    try:
        # User indexes
        await db.users.create_index("emailUser", unique=True)
        await db.users.create_index("role")
        await db.users.create_index("isActive")
        
        # DeteksiYOLO indexes
        await db.deteksi.create_index("userId")
        await db.deteksi.create_index("status")
        await db.deteksi.create_index([("createdAt", -1)])
        
        # Histori indexes
        await db.histori.create_index([("idUser", 1), ("tanggal", -1)])
        await db.histori.create_index([("actionType", 1), ("tanggal", -1)])
        
        # Perhitungan indexes
        await db.perhitungan.create_index("userId")
        await db.perhitungan.create_index([("createdAt", -1)])
        
        logger.info("✅ Database indexes created")
        
    except Exception as e:
        logger.warning(f"⚠️ Index creation warning: {str(e)}")


async def close_db():
    """Close MongoDB connection"""
    global client
    if client:
        client.close()
        logger.info("✅ MongoDB connection closed")


def get_database():
    """Get database instance"""
    return db


def get_collection(name: str):
    """Get a specific collection with fallback handling"""
    if db is None:
        logger.warning(f"⚠️  Database not connected, cannot access collection '{name}'")
        from fastapi import HTTPException
        # Return a mock collection that throws descriptive errors
        class MockCollection:
            async def find_one(self, *args, **kwargs):
                raise HTTPException(status_code=503, detail={"success": False, "message": "Database not available"})
            async def find(self, *args, **kwargs):
                raise HTTPException(status_code=503, detail={"success": False, "message": "Database not available"})
            async def insert_one(self, *args, **kwargs):
                raise HTTPException(status_code=503, detail={"success": False, "message": "Database not available"})
            async def update_one(self, *args, **kwargs):
                raise HTTPException(status_code=503, detail={"success": False, "message": "Database not available"})
            async def delete_one(self, *args, **kwargs):
                raise HTTPException(status_code=503, detail={"success": False, "message": "Database not available"})
            async def count_documents(self, *args, **kwargs):
                raise HTTPException(status_code=503, detail={"success": False, "message": "Database not available"})
        
        return MockCollection()
    
    return db[name]
