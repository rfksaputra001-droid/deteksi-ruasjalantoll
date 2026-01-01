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
        logger.error("❌ MONGODB_URI not set in environment variables")
        raise ValueError("MONGODB_URI is required")
    
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
    """Get a specific collection"""
    return db[name]
